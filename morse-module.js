/**
 * Morse Code Solver Module
 * Dynamically tracks blinking lights from videos/GIFs and decodes them to Keep Talking Morse words.
 * Includes a built-in LZW GIF frame parser for native browser animated GIF decoding support.
 */

(function() {
const MORSE_WORDS = [
  { word: "beats", freq: "3.600" },
  { word: "bombs", freq: "3.565" },
  { word: "break", freq: "3.572" },
  { word: "brick", freq: "3.575" },
  { word: "flick", freq: "3.555" },
  { word: "halls", freq: "3.515" },
  { word: "leaks", freq: "3.542" },
  { word: "shell", freq: "3.505" },
  { word: "sting", freq: "3.592" },
  { word: "trick", freq: "3.532" }
];

const MORSE_CODE_MAP = {
  '.-': 'a', '-...': 'b', '-.-.': 'c', '-..': 'd', '.': 'e',
  '..-.': 'f', '--.': 'g', '....': 'h', '..': 'i', '.---': 'j',
  '-.-': 'k', '.-..': 'l', '--': 'm', '-.': 'n', '---': 'o',
  '.--.': 'p', '--.-': 'q', '.-.': 'r', '...': 's', '-': 't',
  '..-': 'u', '...-': 'v', '.--': 'w', '-..-': 'x', '-.--': 'y',
  '--..': 'z'
};

const morseState = {
  initialized: false,
  sourceType: null, // 'video' or 'gif'
  sourceEl: null,   // HTMLVideoElement (for videos) or parsed GIF object (for GIFs)
  canvas: null,
  ctx: null,
  graphCanvas: null,
  graphCtx: null,

  // Tracking
  trackingX: 240,
  trackingY: 180,
  isTracking: false,

  // GIF playback state
  gifCurrentFrame: 0,
  gifLastFrameTime: 0,

  // Auto-tracking variables
  autoTrackFrames: 0,
  autoTrackMaxFrames: 60,
  autoTrackAccumulator: null, // Grid for variance tracking

  // Signal processing
  brightnessTimeline: [], // [{time, val}]
  maxTimelineLength: 300, // ~10 seconds at 30fps

  lastState: 'OFF',
  lastStateChangeTime: 0,
  ignoreFirstTransition: false,
  stateSegments: [], // [{type, duration}]

  // Decoded status
  decodedLetters: "",
  loopTimeoutId: null
};

// ── LZW GIF DECODER ENGINE ─────────────────────────────────

function lzwDecode(minCodeSize, dataBytes, pixelCount) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let codeMask = (1 << codeSize) - 1;

  const dict = [];
  function resetDict() {
    dict.length = 0;
    for (let i = 0; i < clearCode; i++) {
      dict[i] = [i];
    }
    dict[clearCode] = [];
    dict[endCode] = null;
  }
  resetDict();

  const pixels = new Uint8Array(pixelCount);
  let pixelIdx = 0;

  let bitBuffer = 0;
  let bitCount = 0;
  let dataIdx = 0;
  let prevCode = null;

  function getCode() {
    while (bitCount < codeSize) {
      if (dataIdx >= dataBytes.length) return null;
      bitBuffer |= dataBytes[dataIdx++] << bitCount;
      bitCount += 8;
    }
    const val = bitBuffer & codeMask;
    bitBuffer >>>= codeSize;
    bitCount -= codeSize;
    return val;
  }

  while (pixelIdx < pixelCount) {
    const code = getCode();
    if (code === null || code === endCode) break;

    if (code === clearCode) {
      codeSize = minCodeSize + 1;
      codeMask = (1 << codeSize) - 1;
      resetDict();
      prevCode = null;
      continue;
    }

    let entry;
    if (code < dict.length) {
      entry = dict[code];
    } else if (code === dict.length) {
      if (prevCode === null) break;
      const prevEntry = dict[prevCode];
      entry = prevEntry.concat(prevEntry[0]);
    } else {
      break;
    }

    for (let p of entry) {
      if (pixelIdx < pixelCount) {
        pixels[pixelIdx++] = p;
      }
    }

    if (prevCode !== null) {
      const prevEntry = dict[prevCode];
      dict.push(prevEntry.concat(entry[0]));
      if (dict.length > codeMask && codeSize < 12) {
        codeSize++;
        codeMask = (1 << codeSize) - 1;
      }
    }
    prevCode = code;
  }

  return pixels;
}

function parseGif(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);

  let offset = 0;
  const sig = String.fromCharCode(...bytes.slice(0, 6));
  if (sig !== 'GIF87a' && sig !== 'GIF89a') {
    throw new Error('Not a valid GIF file');
  }
  offset += 6;

  const width = view.getUint16(offset, true);
  const height = view.getUint16(offset + 2, true);
  const packed = bytes[offset + 4];
  offset += 7;

  const hasGlobalTable = (packed & 0x80) !== 0;
  const globalTableSize = 1 << ((packed & 0x07) + 1);
  let globalColorTable = null;
  if (hasGlobalTable) {
    globalColorTable = bytes.slice(offset, offset + 3 * globalTableSize);
    offset += 3 * globalTableSize;
  }

  const frames = [];
  let gceDelay = 10;
  let gceTransparentIdx = -1;
  let gceHasTransparent = false;
  let gceDisposal = 0;

  while (offset < bytes.length) {
    const blockType = bytes[offset++];

    if (blockType === 0x3b) break; // Trailer

    if (blockType === 0x21) {
      // Extension
      const extType = bytes[offset++];
      if (extType === 0xf9) {
        // Graphic Control
        const size = bytes[offset++];
        const gcePacked = bytes[offset];
        gceDisposal = (gcePacked >>> 2) & 0x07;
        gceHasTransparent = (gcePacked & 0x01) !== 0;
        gceDelay = view.getUint16(offset + 1, true);
        if (gceDelay < 2) gceDelay = 10;
        gceTransparentIdx = bytes[offset + 3];
        offset += size;
        offset++; // terminator
      } else {
        // Skip sub-blocks
        let subBlockSize = bytes[offset++];
        while (subBlockSize > 0) {
          offset += subBlockSize;
          subBlockSize = bytes[offset++];
        }
      }
    } else if (blockType === 0x2c) {
      // Image Descriptor
      const left = view.getUint16(offset, true);
      const top = view.getUint16(offset + 2, true);
      const fWidth = view.getUint16(offset + 4, true);
      const fHeight = view.getUint16(offset + 6, true);
      const fPacked = bytes[offset + 8];
      offset += 9;

      const hasLocalTable = (fPacked & 0x80) !== 0;
      const localTableSize = 1 << ((fPacked & 0x07) + 1);
      let activeColorTable = globalColorTable;
      if (hasLocalTable) {
        activeColorTable = bytes.slice(offset, offset + 3 * localTableSize);
        offset += 3 * localTableSize;
      }

      const lzwMinCodeSize = bytes[offset++];

      const dataBlocks = [];
      let subBlockSize = bytes[offset++];
      while (subBlockSize > 0) {
        dataBlocks.push(bytes.slice(offset, offset + subBlockSize));
        offset += subBlockSize;
        subBlockSize = bytes[offset++];
      }

      let totalLength = dataBlocks.reduce((a, b) => a + b.length, 0);
      const lzwData = new Uint8Array(totalLength);
      let writeOffset = 0;
      for (let block of dataBlocks) {
        lzwData.set(block, writeOffset);
        writeOffset += block.length;
      }

      const pixelIndices = lzwDecode(lzwMinCodeSize, lzwData, fWidth * fHeight);

      frames.push({
        left, top, width: fWidth, height: fHeight,
        pixels: pixelIndices,
        colorTable: activeColorTable,
        delay: gceDelay * 10, // delay in ms
        disposal: gceDisposal,
        hasTransparent: gceHasTransparent,
        transparentIdx: gceTransparentIdx
      });

      gceTransparentIdx = -1;
      gceHasTransparent = false;
      gceDisposal = 0;
    } else {
      break;
    }
  }

  return { width, height, frames };
}

function drawGifFrame(canvas, ctx, gif, frameIndex) {
  const frame = gif.frames[frameIndex];
  if (!frame) return;

  // Create virtual compositing canvas if it doesn't exist
  if (!gif.compositeCanvas) {
    gif.compositeCanvas = document.createElement('canvas');
    gif.compositeCanvas.width = gif.width;
    gif.compositeCanvas.height = gif.height;
    gif.compositeCtx = gif.compositeCanvas.getContext('2d');

    // Fill background with standard dark color initially
    gif.compositeCtx.fillStyle = '#181826';
    gif.compositeCtx.fillRect(0, 0, gif.width, gif.height);
  }

  const compCanvas = gif.compositeCanvas;
  const compCtx = gif.compositeCtx;

  // Handle disposal of the PREVIOUS frame
  if (frameIndex === 0) {
    // Reset background for the first frame
    compCtx.fillStyle = '#181826';
    compCtx.fillRect(0, 0, gif.width, gif.height);
  } else {
    const prevFrame = gif.frames[frameIndex - 1];
    if (prevFrame.disposal === 2) {
      // Restore to background color: clear the previous frame's area
      compCtx.clearRect(prevFrame.left, prevFrame.top, prevFrame.width, prevFrame.height);
      compCtx.fillStyle = '#181826';
      compCtx.fillRect(prevFrame.left, prevFrame.top, prevFrame.width, prevFrame.height);
    } else if (prevFrame.disposal === 3) {
      // Restore to previous frame state
      if (gif.disposalBackup) {
        compCtx.putImageData(gif.disposalBackup, 0, 0);
      }
    }
  }

  // If CURRENT frame disposal is 3 (restore to previous), take backup before drawing
  if (frame.disposal === 3) {
    gif.disposalBackup = compCtx.getImageData(0, 0, gif.width, gif.height);
  }

  // Create image data for the current sub-frame
  const imgData = compCtx.createImageData(frame.width, frame.height);
  const data = imgData.data;

  const ct = frame.colorTable;
  const pixels = frame.pixels;
  const hasTrans = frame.hasTransparent;
  const transIdx = frame.transparentIdx;

  for (let i = 0; i < pixels.length; i++) {
    const colorIdx = pixels[i];
    const dataIdx = i * 4;

    if (hasTrans && colorIdx === transIdx) {
      data[dataIdx + 3] = 0; // Transparent
    } else {
      const ctIdx = colorIdx * 3;
      if (ct && ctIdx + 2 < ct.length) {
        data[dataIdx] = ct[ctIdx];
        data[dataIdx + 1] = ct[ctIdx + 1];
        data[dataIdx + 2] = ct[ctIdx + 2];
        data[dataIdx + 3] = 255;
      } else {
        data[dataIdx + 3] = 0;
      }
    }
  }

  // Draw current sub-frame onto the compositing canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = frame.width;
  tempCanvas.height = frame.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imgData, 0, 0);

  compCtx.drawImage(tempCanvas, frame.left, frame.top);

  // Clear main visible canvas and draw the composited frame stretched
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(compCanvas, 0, 0, canvas.width, canvas.height);
}

// ── DYNAMIC STYLE INJECTION ───────────────────────────────

function injectMorseStyles() {
  const css = `
  .morse-shell {
    max-width: 1100px;
    margin: auto;
    background: #12122a;
    padding: 24px;
    border-radius: 12px;
    border: 1px solid #222;
  }
  .morse-grid {
    display: grid;
    grid-template-columns: 480px 1fr;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 820px) {
    .morse-grid {
      grid-template-columns: 1fr;
    }
  }
  .morse-dropzone {
    border: 2px dashed #444;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    background: #101025;
    cursor: pointer;
    transition: border-color 0.2s;
    margin-bottom: 16px;
  }
  .morse-dropzone:hover, .morse-dropzone.active {
    border-color: #f5c542;
  }
  .morse-word-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 14px;
  }
  .morse-word-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: #0a0a1a;
    border: 1px solid #222;
    border-radius: 6px;
    font-size: 13px;
    transition: all 0.2s;
  }
  .morse-word-item.match {
    border-color: #4caf50;
    background: rgba(76, 175, 80, 0.08);
  }
  .morse-word-item.match .word {
    color: #4caf50;
    font-weight: bold;
  }
  .morse-word-item.no-match {
    opacity: 0.35;
  }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

function initMorseModule() {
  if (morseState.initialized) return;
  morseState.initialized = true;

  injectMorseStyles();

  morseState.canvas = document.getElementById('morseCanvas');
  if (morseState.canvas) {
    morseState.ctx = morseState.canvas.getContext('2d', { willReadFrequently: true });
    morseState.canvas.addEventListener('click', handleMorseCanvasClick);
  }

  morseState.graphCanvas = document.getElementById('morseGraphCanvas');
  if (morseState.graphCanvas) {
    morseState.graphCtx = morseState.graphCanvas.getContext('2d');
  }

  const dropzone = document.getElementById('morseDropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('active');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('active'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('active');
      if (window.BombDragDrop) {
        window.BombDragDrop.handleDataTransfer(e.dataTransfer, (file) => {
          if (file) handleMorseFileLoad(file);
          else setMorseStatus("Unsupported file type. Please drop an animated GIF or Video.", '#ff5c5c');
        });
      } else {
        const file = [...(e.dataTransfer?.files || [])].find(f =>
          f.type.startsWith('video/') ||
          f.type === 'image/gif' ||
          f.name.toLowerCase().endsWith('.gif') ||
          /\.(mp4|webm|ogg|mov|avi|wmv|m4v)$/i.test(f.name)
        );
        if (file) {
          handleMorseFileLoad(file);
        } else {
          setMorseStatus("Unsupported file type. Please drop an animated GIF or Video.", '#ff5c5c');
        }
      }
    });
  }

  renderMorseWordList();
  drawMorseCanvasPlaceholder();
  drawMorseGraphPlaceholder();
}

function drawMorseCanvasPlaceholder() {
  const ctx = morseState.ctx;
  const canvas = morseState.canvas;
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0f0f1c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#8f92b0';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Drag & Drop Video or GIF here', canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = '11px monospace';
  ctx.fillStyle = '#666';
  ctx.fillText('Click blinking light to track or click Auto-Track', canvas.width / 2, canvas.height / 2 + 15);
}

function drawMorseGraphPlaceholder() {
  const ctx = morseState.graphCtx;
  const canvas = morseState.graphCanvas;
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#070712';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
}

function openMorseFileDialog() {
  const fileInput = document.getElementById('morseFileInput');
  if (fileInput) fileInput.click();
}

function handleMorseFileSelect(input) {
  const file = input.files && input.files[0];
  if (file) handleMorseFileLoad(file);
  input.value = '';
}

function handleMorseFileLoad(file) {
  setMorseStatus(`Loading file: ${file.name}...`, '#aaa');

  if (morseState.loopTimeoutId) {
    clearTimeout(morseState.loopTimeoutId);
    morseState.loopTimeoutId = null;
  }

  morseState.brightnessTimeline = [
    { time: performance.now() - 2000, val: 40 },
    { time: performance.now() - 1000, val: 220 }
  ];
  morseState.stateSegments = [];
  morseState.lastState = 'OFF';
  morseState.lastStateChangeTime = 0;
  morseState.ignoreFirstTransition = false;
  morseState.decodedLetters = "";
  document.getElementById('morseDecodedString').textContent = "";
  document.getElementById('morseReconstructedWord').textContent = "";
  document.getElementById('morseFrequencyOutput').textContent = "---";
  document.getElementById('morseFrequencyOutput').style.color = '#444';
  renderMorseWordList();

  const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
  if (isGif) {
    morseState.sourceType = 'gif';
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const gif = parseGif(e.target.result);
        morseState.sourceEl = gif;
        morseState.gifCurrentFrame = 0;
        morseState.gifLastFrameTime = performance.now();
        setMorseStatus("GIF loaded. Starting analysis...", '#aaa');
        startMorseProcessLoop();
        triggerAutoTrack();
      } catch (err) {
        setMorseStatus(`Failed to parse GIF: ${err.message}`, '#ff5c5c');
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    // Video
    morseState.sourceType = 'video';
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      morseState.sourceEl = video;
      startMorseProcessLoop();
      triggerAutoTrack();
    };
    video.onerror = () => {
      setMorseStatus("Failed to load video file. Make sure it is a valid video format.", '#ff5c5c');
    };
  }
}

function startMorseProcessLoop() {
  if (morseState.loopTimeoutId) clearTimeout(morseState.loopTimeoutId);

  function tick() {
    if (!morseState.sourceEl) return;

    let nextDelay = 33; // 30 FPS default delay

    if (morseState.sourceType === 'gif') {
      const gif = morseState.sourceEl;
      const frame = gif.frames[morseState.gifCurrentFrame];
      if (frame) {
        drawGifFrame(morseState.canvas, morseState.ctx, gif, morseState.gifCurrentFrame);
        nextDelay = frame.delay;

        // If in auto-tracking phase
        if (morseState.autoTrackFrames > 0) {
          runAutoTrackStep();
        } else {
          // Normal processing
          drawTrackerOverlays();
          processCurrentFramePixels();
        }

        // Advance frame
        morseState.gifCurrentFrame = (morseState.gifCurrentFrame + 1) % gif.frames.length;
      }
    } else {
      // Video
      drawVideoFrameAndProcess();
    }

    morseState.loopTimeoutId = setTimeout(tick, nextDelay);
  }

  tick();
}

function drawVideoFrameAndProcess() {
  const ctx = morseState.ctx;
  const canvas = morseState.canvas;
  const src = morseState.sourceEl;
  if (!ctx || !canvas || !src) return;

  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);

  if (morseState.autoTrackFrames > 0) {
    runAutoTrackStep();
    return;
  }

  drawTrackerOverlays();
  processCurrentFramePixels();
}

function drawTrackerOverlays() {
  const ctx = morseState.ctx;
  if (!ctx) return;

  ctx.strokeStyle = '#00d2ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(morseState.trackingX, morseState.trackingY, 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(morseState.trackingX - 12, morseState.trackingY);
  ctx.lineTo(morseState.trackingX + 12, morseState.trackingY);
  ctx.moveTo(morseState.trackingX, morseState.trackingY - 12);
  ctx.lineTo(morseState.trackingX, morseState.trackingY + 12);
  ctx.stroke();
}

function processCurrentFramePixels() {
  const ctx = morseState.ctx;
  if (!ctx) return;

  try {
    const imgData = ctx.getImageData(Math.round(morseState.trackingX), Math.round(morseState.trackingY), 1, 1).data;
    const r = imgData[0];
    const g = imgData[1];
    const b = imgData[2];
    const brightness = (r + g + b) / 3;

    processBrightnessSignal(brightness);
    drawSignalGraph();
  } catch (e) {
    console.error("Error reading pixel brightness", e);
  }
}

function handleMorseCanvasClick(e) {
  if (!morseState.sourceEl) return;
  const rect = morseState.canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * morseState.canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * morseState.canvas.height;

  morseState.trackingX = x;
  morseState.trackingY = y;

  morseState.brightnessTimeline = [];
  morseState.stateSegments = [];
  morseState.decodedLetters = "";
  document.getElementById('morseDecodedString').textContent = "";
  document.getElementById('morseReconstructedWord').textContent = "";

  setMorseStatus(`Manual tracking coordinate set to (${Math.round(x)}, ${Math.round(y)})`, '#00d2ff');
}

// ── AUTO-TRACKER ──────────────────────────────────────────

function autoTrackGif(gif) {
  const gridW = 80;
  const gridH = 60;
  const N = gif.frames.length;
  if (N === 0) {
    setMorseStatus("Error: GIF has no frames.", '#ff5c5c');
    return;
  }

  const acc = new Float32Array(gridW * gridH * 2);

  // Composite frames and draw them to an 80x60 canvas
  const compCanvas = document.createElement('canvas');
  compCanvas.width = gif.width;
  compCanvas.height = gif.height;
  const compCtx = compCanvas.getContext('2d');

  const offCanvas = document.createElement('canvas');
  offCanvas.width = gridW;
  offCanvas.height = gridH;
  const offCtx = offCanvas.getContext('2d');

  let disposalBackup = null;
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  for (let f = 0; f < N; f++) {
    const frame = gif.frames[f];

    // Compositing logic same as drawGifFrame
    if (f === 0) {
      compCtx.fillStyle = '#181826';
      compCtx.fillRect(0, 0, gif.width, gif.height);
    } else {
      const prevFrame = gif.frames[f - 1];
      if (prevFrame.disposal === 2) {
        compCtx.clearRect(prevFrame.left, prevFrame.top, prevFrame.width, prevFrame.height);
        compCtx.fillStyle = '#181826';
        compCtx.fillRect(prevFrame.left, prevFrame.top, prevFrame.width, prevFrame.height);
      } else if (prevFrame.disposal === 3) {
        if (disposalBackup) {
          compCtx.putImageData(disposalBackup, 0, 0);
        }
      }
    }

    if (frame.disposal === 3) {
      disposalBackup = compCtx.getImageData(0, 0, gif.width, gif.height);
    }

    const imgData = compCtx.createImageData(frame.width, frame.height);
    const data = imgData.data;
    const ct = frame.colorTable;
    const pixels = frame.pixels;
    const hasTrans = frame.hasTransparent;
    const transIdx = frame.transparentIdx;

    for (let i = 0; i < pixels.length; i++) {
      const colorIdx = pixels[i];
      const dataIdx = i * 4;
      if (hasTrans && colorIdx === transIdx) {
        data[dataIdx + 3] = 0;
      } else {
        const ctIdx = colorIdx * 3;
        if (ct && ctIdx + 2 < ct.length) {
          data[dataIdx] = ct[ctIdx];
          data[dataIdx + 1] = ct[ctIdx + 1];
          data[dataIdx + 2] = ct[ctIdx + 2];
          data[dataIdx + 3] = 255;
        } else {
          data[dataIdx + 3] = 0;
        }
      }
    }

    tempCanvas.width = frame.width;
    tempCanvas.height = frame.height;
    tempCtx.putImageData(imgData, 0, 0);

    compCtx.drawImage(tempCanvas, frame.left, frame.top);

    // Draw onto 80x60 offscreen canvas
    offCtx.clearRect(0, 0, gridW, gridH);
    offCtx.drawImage(compCanvas, 0, 0, gridW, gridH);

    const smallImgData = offCtx.getImageData(0, 0, gridW, gridH).data;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const idx = (y * gridW + x) * 4;
        const r = smallImgData[idx];
        const g = smallImgData[idx + 1];
        const b = smallImgData[idx + 2];
        const brightness = (r + g + b) / 3;

        const accIdx = (y * gridW + x) * 2;
        acc[accIdx] += brightness;
        acc[accIdx + 1] += brightness * brightness;
      }
    }
  }

  let maxVar = -1;
  let bestX = gridW / 2;
  let bestY = gridH / 2;

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const accIdx = (y * gridW + x) * 2;
      const sum = acc[accIdx];
      const sumSq = acc[accIdx + 1];

      const mean = sum / N;
      const variance = (sumSq / N) - (mean * mean);

      if (variance > maxVar) {
        maxVar = variance;
        bestX = x;
        bestY = y;
      }
    }
  }

  morseState.trackingX = (bestX + 0.5) * (morseState.canvas.width / gridW);
  morseState.trackingY = (bestY + 0.5) * (morseState.canvas.height / gridH);

  if (maxVar < 15) {
    setMorseStatus("Warning: No clear blinking light detected. Click on the blinker manually.", '#ff9800');
  } else {
    setMorseStatus(`Auto-track locks onto coordinates (${Math.round(morseState.trackingX)}, ${Math.round(morseState.trackingY)})`, '#4caf50');
  }
}

function triggerAutoTrack() {
  if (!morseState.sourceEl) return;

  if (morseState.sourceType === 'gif') {
    // Reset playback and decode states so we start clean from frame 0
    morseState.gifCurrentFrame = 0;
    morseState.brightnessTimeline = [
      { time: performance.now() - 2000, val: 40 },
      { time: performance.now() - 1000, val: 220 }
    ];
    morseState.stateSegments = [];
    morseState.decodedLetters = "";
    morseState.lastState = 'OFF';
    morseState.lastStateChangeTime = 0; // set to 0 so first frame initializes state
    morseState.ignoreFirstTransition = false;

    const decodedStrEl = document.getElementById('morseDecodedString');
    if (decodedStrEl) decodedStrEl.textContent = "---";

    const reconWordEl = document.getElementById('morseReconstructedWord');
    if (reconWordEl) reconWordEl.textContent = "---";

    const freqOutEl = document.getElementById('morseFrequencyOutput');
    if (freqOutEl) {
      freqOutEl.textContent = "---";
      freqOutEl.style.color = '#444';
    }

    renderMorseWordList();

    setMorseStatus("Auto-tracking blinking light (GIF)...", '#f5c542');
    setTimeout(() => {
      autoTrackGif(morseState.sourceEl);
    }, 50);
    return;
  }

  setMorseStatus("Auto-tracking blinking light... Please wait.", '#f5c542');

  const gridW = 80;
  const gridH = 60;
  morseState.autoTrackFrames = morseState.autoTrackMaxFrames;
  morseState.autoTrackAccumulator = new Float32Array(gridW * gridH * 2);
}

function runAutoTrackStep() {
  const canvas = morseState.canvas;
  const ctx = morseState.ctx;
  if (!canvas || !ctx) return;

  const gridW = 80;
  const gridH = 60;

  const offCanvas = document.createElement('canvas');
  offCanvas.width = gridW;
  offCanvas.height = gridH;
  const offCtx = offCanvas.getContext('2d');
  offCtx.drawImage(canvas, 0, 0, gridW, gridH);

  const imgData = offCtx.getImageData(0, 0, gridW, gridH).data;
  const acc = morseState.autoTrackAccumulator;

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const idx = (y * gridW + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const brightness = (r + g + b) / 3;

      const accIdx = (y * gridW + x) * 2;
      acc[accIdx] += brightness;
      acc[accIdx + 1] += brightness * brightness;
    }
  }

  // Draw loading overlay
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Calibrating Blinker: ${Math.round((1 - morseState.autoTrackFrames / morseState.autoTrackMaxFrames) * 100)}%`, canvas.width / 2, canvas.height / 2);

  morseState.autoTrackFrames--;

  if (morseState.autoTrackFrames === 0) {
    finalizeAutoTrack();
  }
}

function finalizeAutoTrack() {
  const gridW = 80;
  const gridH = 60;
  const acc = morseState.autoTrackAccumulator;
  const N = morseState.autoTrackMaxFrames;

  let maxVar = -1;
  let bestX = gridW / 2;
  let bestY = gridH / 2;

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const accIdx = (y * gridW + x) * 2;
      const sum = acc[accIdx];
      const sumSq = acc[accIdx + 1];

      const mean = sum / N;
      const variance = (sumSq / N) - (mean * mean);

      if (variance > maxVar) {
        maxVar = variance;
        bestX = x;
        bestY = y;
      }
    }
  }

  morseState.trackingX = (bestX + 0.5) * (morseState.canvas.width / gridW);
  morseState.trackingY = (bestY + 0.5) * (morseState.canvas.height / gridH);
  morseState.autoTrackAccumulator = null;

  if (maxVar < 15) {
    setMorseStatus("Warning: No clear blinking light detected. Click on the blinker manually.", '#ff9800');
  } else {
    setMorseStatus(`Auto-track locks onto coordinates (${Math.round(morseState.trackingX)}, ${Math.round(morseState.trackingY)})`, '#4caf50');
  }
}

// ── SIGNAL DECODER ────────────────────────────────────────

function processBrightnessSignal(val) {
  const now = performance.now();
  morseState.brightnessTimeline.push({ time: now, val: val });

  if (morseState.brightnessTimeline.length > morseState.maxTimelineLength) {
    morseState.brightnessTimeline.shift();
  }

  const vals = morseState.brightnessTimeline.map(t => t.val);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min;

  if (range < 20) return;

  const threshold = (min + max) / 2;
  const currentState = val >= threshold ? 'ON' : 'OFF';

  if (morseState.lastStateChangeTime === 0) {
    morseState.lastStateChangeTime = now;
    morseState.lastState = currentState;
    return;
  }

  if (currentState !== morseState.lastState) {
    const duration = now - morseState.lastStateChangeTime;

    // Ignore glitches
    if (duration > 60) {
      if (morseState.ignoreFirstTransition) {
        morseState.ignoreFirstTransition = false;
      } else {
        morseState.stateSegments.push({ type: morseState.lastState, duration: duration });

        if (morseState.stateSegments.length > 50) {
          morseState.stateSegments.shift();
        }
      }

      morseState.lastState = currentState;
      morseState.lastStateChangeTime = now;

      decodeMorseFromSegments();
    }
  }
}

function decodeMorseFromSegments() {
  if (morseState.stateSegments.length < 2) return;

  const onSegments = morseState.stateSegments.filter(s => s.type === 'ON' && s.duration > 80);
  if (onSegments.length === 0) return;

  const onDurations = onSegments.map(s => s.duration);
  const unitTime = Math.min(...onDurations);

  const unitThresh = unitTime * 2.2;
  const spaceThresh = unitTime * 5.0;

  let currentLetterSymbols = "";
  let lettersDecoded = [];

  for (let seg of morseState.stateSegments) {
    if (seg.type === 'ON') {
      if (seg.duration < unitThresh) {
        currentLetterSymbols += ".";
      } else {
        currentLetterSymbols += "-";
      }
    } else {
      if (seg.duration >= unitThresh && seg.duration < spaceThresh) {
        if (currentLetterSymbols) {
          const char = MORSE_CODE_MAP[currentLetterSymbols] || '?';
          lettersDecoded.push(char);
          currentLetterSymbols = "";
        }
      } else if (seg.duration >= spaceThresh) {
        if (currentLetterSymbols) {
          const char = MORSE_CODE_MAP[currentLetterSymbols] || '?';
          lettersDecoded.push(char);
          currentLetterSymbols = "";
        }
        if (lettersDecoded.length > 0 && lettersDecoded[lettersDecoded.length - 1] !== ' ') {
          lettersDecoded.push(' ');
        }
      }
    }
  }

  if (currentLetterSymbols) {
    const char = MORSE_CODE_MAP[currentLetterSymbols] || '?';
    lettersDecoded.push(char);
  }

  const decodedWord = lettersDecoded.join('').trim().toLowerCase();
  const cleanWord = decodedWord.replace(/\?/g, '');
  if (cleanWord && cleanWord !== morseState.decodedLetters) {
    morseState.decodedLetters = cleanWord;
    document.getElementById('morseDecodedString').textContent = lettersDecoded.join('');
    matchMorseWord(cleanWord);
  }
}

function matchMorseWord(str) {
  const parts = str.split(' ');
  const activeLetters = parts.reduce((a, b) => a.length > b.length ? a : b, "");

  document.getElementById('morseReconstructedWord').textContent = activeLetters.toUpperCase();

  let matches = [];

  if (activeLetters.length >= 2) {
    MORSE_WORDS.forEach(mw => {
      const doubleWord = mw.word + mw.word;
      if (doubleWord.includes(activeLetters)) {
        matches.push(mw);
      }
    });
  } else {
    matches = [...MORSE_WORDS];
  }

  const container = document.getElementById('morseWordListContainer');
  if (!container) return;

  const items = container.querySelectorAll('.morse-word-item');
  items.forEach(item => {
    const word = item.dataset.word;
    item.className = 'morse-word-item';

    if (activeLetters.length >= 2) {
      const isMatch = matches.some(m => m.word === word);
      item.classList.add(isMatch ? 'match' : 'no-match');
    }
  });

  const freqOutput = document.getElementById('morseFrequencyOutput');
  if (matches.length === 1 && activeLetters.length >= 2) {
    const winner = matches[0];
    freqOutput.textContent = winner.freq + " MHz";
    freqOutput.style.color = '#4caf50';
    setMorseStatus(`Match Found! Word: "${winner.word.toUpperCase()}" -> Freq: ${winner.freq} MHz`, '#4caf50');
  } else if (matches.length > 1 && activeLetters.length >= 2) {
    freqOutput.textContent = "AMBIGUOUS";
    freqOutput.style.color = '#ff9800';
  } else {
    freqOutput.textContent = "---";
    freqOutput.style.color = '#444';
  }
}

function renderMorseWordList() {
  const container = document.getElementById('morseWordListContainer');
  if (!container) return;
  container.innerHTML = '';

  MORSE_WORDS.forEach(mw => {
    const item = document.createElement('div');
    item.className = 'morse-word-item';
    item.dataset.word = mw.word;
    item.innerHTML = `<span class="word">${mw.word}</span><span style="font-family:monospace; color:#ccc;">${mw.freq} MHz</span>`;
    container.appendChild(item);
  });
}

function drawSignalGraph() {
  const canvas = morseState.graphCanvas;
  const ctx = morseState.graphCtx;
  if (!canvas || !ctx || morseState.brightnessTimeline.length < 2) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#070712';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const vals = morseState.brightnessTimeline.map(t => t.val);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = Math.max(1, max - min);
  const threshold = (min + max) / 2;

  ctx.strokeStyle = '#18182f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < canvas.width; i += 30) {
    ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
  }
  for (let i = 0; i < canvas.height; i += 20) {
    ctx.moveTo(0, i); ctx.lineTo(canvas.width, i);
  }
  ctx.stroke();

  const threshY = canvas.height - ((threshold - min) / range) * (canvas.height - 16) - 8;
  ctx.strokeStyle = 'rgba(245, 199, 36, 0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, threshY);
  ctx.lineTo(canvas.width, threshY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = '#00d2ff';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const N = morseState.brightnessTimeline.length;
  const step = canvas.width / (morseState.maxTimelineLength - 1);
  const offset = morseState.maxTimelineLength - N;

  for (let i = 0; i < N; i++) {
    const x = (offset + i) * step;
    const y = canvas.height - ((vals[i] - min) / range) * (canvas.height - 16) - 8;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function setMorseStatus(msg, color) {
  const status = document.getElementById('morseTrackStatus');
  if (status) {
    status.textContent = msg;
    status.style.color = color;
  }
}

function resetMorseSolver() {
  if (morseState.sourceType === 'gif') {
    morseState.gifCurrentFrame = 0;
  } else if (morseState.sourceType === 'video' && morseState.sourceEl) {
    morseState.sourceEl.currentTime = 0;
  }

  morseState.brightnessTimeline = [
    { time: performance.now() - 2000, val: 40 },
    { time: performance.now() - 1000, val: 220 }
  ];
  morseState.stateSegments = [];
  morseState.decodedLetters = "";
  morseState.lastState = 'OFF';
  morseState.lastStateChangeTime = 0; // set to 0 so first frame initializes state
  morseState.ignoreFirstTransition = false;

  const decodedStrEl = document.getElementById('morseDecodedString');
  if (decodedStrEl) decodedStrEl.textContent = "---";

  const reconWordEl = document.getElementById('morseReconstructedWord');
  if (reconWordEl) reconWordEl.textContent = "---";

  const freqOutEl = document.getElementById('morseFrequencyOutput');
  if (freqOutEl) {
    freqOutEl.textContent = "---";
    freqOutEl.style.color = '#444';
  }

  renderMorseWordList();
  setMorseStatus(morseState.sourceEl ? "Solver reset. Playback restarted." : "No file loaded. Drag & drop a blinking GIF or Video.", '#aaa');
}

// Attach to window
window.initMorseModule = initMorseModule;
window.openMorseFileDialog = openMorseFileDialog;
window.handleMorseFileSelect = handleMorseFileSelect;
window.toggleMorseAutoTrack = triggerAutoTrack;
window.resetMorseSolver = resetMorseSolver;
})();
