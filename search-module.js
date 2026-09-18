/**
 * Search Solver Module for Keep Talking and Nobody Explains
 * 
 * Features:
 * 1. Computer Vision 5x5 Grid Scanner (non-destructive grayscale inverted composite).
 * 2. Automatic Stage Detection from indicator lights on the right (Stage 1, 2, 3).
 * 3. Pre-populated & Editable Word Lists (Search #1, Search #2, custom stage words).
 * 4. Multi-word detection across all 8 directions, listing all matching words.
 * 5. Interactive 5x5 grid with cell editing and neon green word path highlighting.
 */

(function() {
  const DEFAULT_WORDS_TEXT = `Search #1, Stage 1:
RAFT LOAD TASK POND VENT POET PART DESK SIZE LOOK SEAT USED REEL NORM MESS PACE BODY FEEL FAIR LOFT

Search #1, Stage 2:
HOOK BALL IRON MUST DOVE CELL VERB DICE MOON WARN WINK BOOK FISH MEET VERY WHAT THAT LOSE SNOW FAIR

Search #1, Stage 3:
HOST GOOD RACE WORD MISS RUST LEAN LOST NICE ACID ROPE EASY TILE STEW GOAL TYPE YOUR PICK EPIC HARP

Search #2, Stage 1:
KEEP TILE REST CUBE MAZE CELL SURF PAST BANK CAST SLAM BODY BOLD FREE SENT SOAK KISS ITEM HAWK PORT

Search #2, Stage 2:
GAME BELT OVER YEAR FEEL PLAN SWIM LIST JUST COLD RELY CAKE FELT TENT FEED ACID WIFE NEAT RACE ATOM

Search #2, Stage 3:
NOON SWAN BODY COAT TYPO NUMB COOL PINE MEAL PUSH OKAY FLOW DUTY CLAY DICE PEAK VENT FEEL FOAM SENT`;

  const DIRS = [
    { dr: -1, dc: 0, name: 'Up', arrow: '↑' },
    { dr: 1, dc: 0, name: 'Down', arrow: '↓' },
    { dr: 0, dc: -1, name: 'Left', arrow: '←' },
    { dr: 0, dc: 1, name: 'Right', arrow: '→' },
    { dr: -1, dc: -1, name: 'Up-Left', arrow: '↖' },
    { dr: -1, dc: 1, name: 'Up-Right', arrow: '↗' },
    { dr: 1, dc: -1, name: 'Down-Left', arrow: '↙' },
    { dr: 1, dc: 1, name: 'Down-Right', arrow: '↘' }
  ];

  const COLS = ['A', 'B', 'C', 'D', 'E'];
  const ROWS = ['1', '2', '3', '4', '5'];

  const searchState = {
    initialized: false,
    stage: 1, // 1, 2, or 3
    autoDetectedStage: null,
    grid: Array.from({ length: 5 }, () => Array(5).fill('')),
    rawWordsText: DEFAULT_WORDS_TEXT,
    wordEntries: [], // { word, label, stage }
    foundWords: [],  // list of all matched words
    selectedWordIndex: 0,
    image: null
  };

  function coord(r, c) {
    return `${COLS[c]}${ROWS[r]}`;
  }

  // ── DYNAMIC WORD LIST PARSER ──────────────────────────────
  function parseWordListText(raw) {
    searchState.rawWordsText = raw;
    const lines = raw.split('\n');
    const entries = [];
    let currentLabel = 'Custom List';
    let currentStage = 1;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Check if line is a header like "Search #1, Stage 2:"
      const headerMatch = line.match(/(?:Search\s*#?([12])\s*,\s*)?Stage\s*([123])/i);
      if (headerMatch) {
        const searchNum = headerMatch[1] ? `Search #${headerMatch[1]}` : 'Search';
        currentStage = parseInt(headerMatch[2], 10);
        currentLabel = `${searchNum}, Stage ${currentStage}`;
        continue;
      }

      // Extract uppercase words (3 to 6 letters)
      const words = line.match(/[A-Za-z]{3,6}/g);
      if (words) {
        for (let w of words) {
          const upper = w.toUpperCase();
          if (!entries.some(e => e.word === upper && e.stage === currentStage && e.label === currentLabel)) {
            entries.push({
              word: upper,
              label: currentLabel,
              stage: currentStage
            });
          }
        }
      }
    }

    searchState.wordEntries = entries;
  }

  // ── COMPUTER VISION & STAGE DETECTION ─────────────────────
  function detectStageFromImage(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const W = img.width;
    const H = img.height;

    // Relative light positions on right indicator pill:
    // x ~ 0.741 * W (326 in 440)
    // Stage 1 y ~ 0.427 * H (188 in 440)
    // Stage 2 y ~ 0.545 * H (240 in 440)
    // Stage 3 y ~ 0.666 * H (293 in 440)
    const lightX = Math.round(W * 0.741);
    const lightYs = [
      Math.round(H * 0.427),
      Math.round(H * 0.545),
      Math.round(H * 0.666)
    ];

    let activeStage = 1;

    for (let i = 0; i < 3; i++) {
      const y = lightYs[i];
      const p = ctx.getImageData(lightX - 3, y - 3, 7, 7).data;
      let sumR = 0, sumG = 0, sumB = 0, cnt = 0;
      for (let j = 0; j < p.length; j += 4) {
        sumR += p[j];
        sumG += p[j+1];
        sumB += p[j+2];
        cnt++;
      }
      const r = sumR / cnt;
      const g = sumG / cnt;
      const b = sumB / cnt;

      // Orange active light: R > 200, G in 140..210, B < 150
      if (r > 190 && g > 130 && b < 160 && r > g) {
        activeStage = i + 1;
        break;
      }
    }

    return activeStage;
  }

  function createCompositeLetterGridCanvas(img) {
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = img.width;
    srcCanvas.height = img.height;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(img, 0, 0);

    const W = img.width;
    const H = img.height;

    // Create 350x350 composite image for high-accuracy OCR
    const compCanvas = document.createElement('canvas');
    compCanvas.width = 350;
    compCanvas.height = 350;
    const compCtx = compCanvas.getContext('2d');
    compCtx.fillStyle = '#ffffff';
    compCtx.fillRect(0, 0, 350, 350);

    const srcData = srcCtx.getImageData(0, 0, W, H).data;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cx = Math.round(W * (0.267 + c * 0.0909));
        const cy = Math.round(H * (0.365 + r * 0.0905));
        const rw = Math.round(W * 0.075);
        const rh = Math.round(H * 0.075);

        const x0 = Math.max(0, cx - Math.floor(rw / 2));
        const y0 = Math.max(0, cy - Math.floor(rh / 2));

        const patchCanvas = document.createElement('canvas');
        patchCanvas.width = rw;
        patchCanvas.height = rh;
        const patchCtx = patchCanvas.getContext('2d');
        const patchData = patchCtx.createImageData(rw, rh);

        for (let py = 0; py < rh; py++) {
          for (let px = 0; px < rw; px++) {
            const sIdx = ((y0 + py) * W + (x0 + px)) * 4;
            const pIdx = (py * rw + px) * 4;

            const pr = srcData[sIdx];
            const pg = srcData[sIdx + 1];
            const pb = srcData[sIdx + 2];
            const gray = (pr + pg + pb) / 3;

            // Invert: white letters on dark background -> black letters on white
            const inv = 255 - gray;
            // Contrast enhance
            const enhanced = Math.min(255, Math.max(0, (inv - 40) * 1.4));

            patchData.data[pIdx] = enhanced;
            patchData.data[pIdx + 1] = enhanced;
            patchData.data[pIdx + 2] = enhanced;
            patchData.data[pIdx + 3] = 255;
          }
        }
        patchCtx.putImageData(patchData, 0, 0);

        // Paste into composite canvas
        compCtx.drawImage(patchCanvas, c * 65 + 15, r * 65 + 15, 50, 50);
      }
    }

    return compCanvas;
  }

  // ── OCR RECOGNITION ───────────────────────────────────────
  async function runOcrOnSearchImage() {
    const statusEl = document.getElementById('searchOcrStatus');
    if (!searchState.image) return;

    // Detect stage from lights
    const detectedStage = detectStageFromImage(searchState.image);
    searchState.autoDetectedStage = detectedStage;
    searchState.stage = detectedStage;
    updateStageButtons();

    if (statusEl) {
      statusEl.innerHTML = `<span style="color:#ffd875;">⏳ Detected Stage ${detectedStage}. Reading letters with OCR...</span>`;
    }

    if (typeof Tesseract === 'undefined') {
      if (statusEl) statusEl.innerHTML = `<span style="color:#ffd875;">Stage ${detectedStage} detected. Tesseract not ready; verify grid manually.</span>`;
      solveSearch();
      return;
    }

    try {
      const compCanvas = createCompositeLetterGridCanvas(searchState.image);

      // Show preview
      const previewCanvas = document.getElementById('searchOcrPreviewCanvas');
      const previewLabel = document.getElementById('searchOcrPreviewLabel');
      if (previewCanvas) {
        previewCanvas.width = 175;
        previewCanvas.height = 175;
        const pCtx = previewCanvas.getContext('2d');
        pCtx.drawImage(compCanvas, 0, 0, 175, 175);
        previewCanvas.style.display = 'inline-block';
        if (previewLabel) previewLabel.style.display = 'block';
      }

      let worker = null;
      if (typeof Tesseract.createWorker === 'function') {
        worker = await Tesseract.createWorker('eng');
        await worker.setParameters({
          tessedit_pageseg_mode: '6', // uniform block of text
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ \n'
        });
      }

      let recognizedLines = [];
      if (worker && typeof worker.recognize === 'function') {
        const res = await worker.recognize(compCanvas);
        if (res && res.data && res.data.text) {
          recognizedLines = res.data.text
            .toUpperCase()
            .split('\n')
            .map(l => l.replace(/[^A-Z]/g, ''))
            .filter(l => l.length > 0);
        }
        await worker.terminate();
      }

      // Check if we extracted 5 lines of 5 letters
      let success = false;
      if (recognizedLines.length >= 5) {
        let valid = true;
        for (let r = 0; r < 5; r++) {
          const line = recognizedLines[r];
          if (line.length < 5) {
            valid = false;
            break;
          }
        }
        if (valid) {
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
              searchState.grid[r][c] = recognizedLines[r][c];
            }
          }
          success = true;
        }
      }

      // Fallback: If block OCR was imperfect, recognize individual cell crops
      if (!success) {
        const W = searchState.image.width;
        const H = searchState.image.height;
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = W;
        srcCanvas.height = H;
        const sCtx = srcCanvas.getContext('2d');
        sCtx.drawImage(searchState.image, 0, 0);
        const sData = sCtx.getImageData(0, 0, W, H).data;

        const cellWorker = await Tesseract.createWorker('eng');
        await cellWorker.setParameters({
          tessedit_pageseg_mode: '10', // single character
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        });

        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            const cx = Math.round(W * (0.267 + c * 0.0909));
            const cy = Math.round(H * (0.365 + r * 0.0905));
            const rw = Math.round(W * 0.075);
            const rh = Math.round(H * 0.075);

            const cCanv = document.createElement('canvas');
            cCanv.width = 60;
            cCanv.height = 60;
            const cCtx = cCanv.getContext('2d');
            cCtx.fillStyle = '#fff';
            cCtx.fillRect(0, 0, 60, 60);

            // Draw inverted
            const cData = cCtx.createImageData(rw, rh);
            const x0 = cx - Math.floor(rw/2);
            const y0 = cy - Math.floor(rh/2);

            for (let py = 0; py < rh; py++) {
              for (let px = 0; px < rw; px++) {
                const sIdx = ((y0 + py) * W + (x0 + px)) * 4;
                const pIdx = (py * rw + px) * 4;
                const inv = 255 - ((sData[sIdx] + sData[sIdx+1] + sData[sIdx+2]) / 3);
                const enh = Math.min(255, Math.max(0, (inv - 40) * 1.4));
                cData.data[pIdx] = enh;
                cData.data[pIdx+1] = enh;
                cData.data[pIdx+2] = enh;
                cData.data[pIdx+3] = 255;
              }
            }
            const tmp = document.createElement('canvas');
            tmp.width = rw;
            tmp.height = rh;
            tmp.getContext('2d').putImageData(cData, 0, 0);
            cCtx.drawImage(tmp, 5, 5, 50, 50);

            const cellRes = await cellWorker.recognize(cCanv);
            const ch = (cellRes.data.text || '').toUpperCase().replace(/[^A-Z]/g, '')[0];
            if (ch) searchState.grid[r][c] = ch;
          }
        }
        await cellWorker.terminate();
      }

      updateGridInputs();
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#22c55e;">✓ Stage ${detectedStage} scanned successfully!</span>`;
      }
      solveSearch();
    } catch (err) {
      console.error("Search OCR error:", err);
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#ff5f57;">⚠️ OCR error. You can type letters directly into the grid.</span>`;
      }
      solveSearch();
    }
  }

  // ── MULTI-WORD SEARCH ALGORITHM ───────────────────────────
  function solveSearch() {
    const grid = searchState.grid;
    const activeStage = searchState.stage;
    const matches = [];

    // Filter words: prioritize active stage, but check all entries
    const wordsToCheck = searchState.wordEntries;

    for (const entry of wordsToCheck) {
      const word = entry.word;
      const L = word.length;
      if (L < 3 || L > 5) continue;

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (grid[r][c] !== word[0]) continue;

          for (const dir of DIRS) {
            let matched = true;
            const cells = [];

            for (let i = 0; i < L; i++) {
              const nr = r + dir.dr * i;
              const nc = c + dir.dc * i;

              if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5 || grid[nr][nc] !== word[i]) {
                matched = false;
                break;
              }
              cells.push({ r: nr, c: nc });
            }

            if (matched) {
              const startCoord = coord(r, c);
              const endCoord = coord(r + dir.dr * (L - 1), c + dir.dc * (L - 1));

              // Avoid duplicates
              const alreadyFound = matches.some(m =>
                m.word === word && m.startCoord === startCoord && m.dirName === dir.name
              );

              if (!alreadyFound) {
                matches.push({
                  word: word,
                  label: entry.label,
                  stage: entry.stage,
                  isCurrentStage: entry.stage === activeStage,
                  dirName: dir.name,
                  arrow: dir.arrow,
                  startCoord,
                  endCoord,
                  cells
                });
              }
            }
          }
        }
      }
    }

    // Sort matches: current stage matches first, then longer words
    matches.sort((a, b) => {
      if (a.isCurrentStage && !b.isCurrentStage) return -1;
      if (!a.isCurrentStage && b.isCurrentStage) return 1;
      return b.word.length - a.word.length;
    });

    searchState.foundWords = matches;
    searchState.selectedWordIndex = 0;

    renderAnswerCard();
    highlightSelectedWordOnGrid();
  }

  // ── UI RENDERING & STYLES ─────────────────────────────────
  function injectStyles() {
    if (document.getElementById('searchSolverStyles')) return;
    const css = `
    .sr-shell {
      max-width: 1040px;
      margin: 0 auto 30px;
      background: #0d0f22;
      border: 1.5px solid #202448;
      border-radius: 18px;
      padding: 24px;
      color: #e2e8f0;
      font-family: 'Inter', system-ui, sans-serif;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
    }
    .sr-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #1c2042;
    }
    .sr-title {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #ffd875;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sr-stage-pills {
      display: flex;
      gap: 6px;
      background: #070814;
      padding: 4px;
      border-radius: 10px;
      border: 1px solid #1c2042;
    }
    .sr-stage-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-weight: 800;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .sr-stage-btn.active {
      background: #ffd875;
      color: #080914;
      box-shadow: 0 0 10px rgba(255, 216, 117, 0.3);
    }
    .sr-layout {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .sr-layout { grid-template-columns: 1fr; }
    }
    .sr-card {
      background: #070814;
      border: 1px solid #1c2042;
      border-radius: 14px;
      padding: 18px;
    }
    .sr-card-title {
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 800;
      color: #ffd875;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sr-dropzone {
      border: 2px dashed #343864;
      border-radius: 12px;
      padding: 22px 14px;
      text-align: center;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.015);
      transition: all 0.2s;
      margin-bottom: 14px;
    }
    .sr-dropzone:hover, .sr-dropzone.dragover {
      border-color: #ffd875;
      background: rgba(255, 216, 117, 0.06);
    }
    .sr-grid-container {
      display: grid;
      grid-template-columns: repeat(5, 52px);
      grid-template-rows: repeat(5, 52px);
      gap: 8px;
      justify-content: center;
      margin: 12px 0;
    }
    .sr-grid-cell {
      width: 52px;
      height: 52px;
      background: #151833;
      border: 2px solid #282d5c;
      border-radius: 10px;
      color: #fff;
      font-family: 'Outfit', monospace, sans-serif;
      font-size: 24px;
      font-weight: 900;
      text-align: center;
      text-transform: uppercase;
      outline: none;
      transition: all 0.15s;
    }
    .sr-grid-cell:focus {
      border-color: #ffd875;
      box-shadow: 0 0 12px rgba(255, 216, 117, 0.3);
      background: #1b2046;
    }
    .sr-grid-cell.highlight-start {
      background: #2a220a !important;
      border: 2.5px solid #ffd875 !important;
      color: #ffd875 !important;
      box-shadow: 0 0 16px rgba(255, 216, 117, 0.6) !important;
      transform: scale(1.05);
      z-index: 2;
    }
    .sr-grid-cell.highlight-word {
      background: #064e3b !important;
      border: 2.5px solid #22c55e !important;
      color: #4ade80 !important;
      box-shadow: 0 0 16px rgba(34, 197, 94, 0.5) !important;
      transform: scale(1.05);
      z-index: 2;
    }
    .sr-match-card {
      background: #11142e;
      border: 1.5px solid #222956;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 10px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.15s;
    }
    .sr-match-card:hover {
      border-color: #ffd875;
      background: #171b3e;
      transform: translateY(-1px);
    }
    .sr-match-card.selected {
      background: rgba(34, 197, 94, 0.12);
      border-color: #22c55e;
      box-shadow: 0 0 18px rgba(34, 197, 94, 0.25);
    }
    .sr-word-badge {
      font-size: 32px;
      font-weight: 900;
      color: #22c55e;
      font-family: 'Outfit', monospace, sans-serif;
      letter-spacing: 2px;
    }
    .sr-word-dir {
      font-size: 15px;
      font-weight: 800;
      color: #ffd875;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sr-textarea {
      width: 100%;
      background: #090a16;
      border: 1px solid #222956;
      color: #ffd875;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.5;
      padding: 10px;
      border-radius: 8px;
      outline: none;
      resize: vertical;
      box-sizing: border-box;
    }
    .sr-textarea:focus {
      border-color: #ffd875;
    }
    .sr-btn {
      background: #1c2042;
      border: 1px solid #343864;
      color: #e2e8f0;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .sr-btn:hover {
      background: #282e5c;
      border-color: #ffd875;
      color: #fff;
    }
    .sr-btn.primary {
      background: #ffd875;
      border-color: #ffd875;
      color: #080914;
      font-weight: 800;
    }
    `;
    const style = document.createElement('style');
    style.id = 'searchSolverStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderUI() {
    const section = document.getElementById('searchSection');
    if (!section) return;

    parseWordListText(searchState.rawWordsText);

    section.innerHTML = `
      <div class="sr-shell">
        <div class="sr-head">
          <div class="sr-title">
            <span>🔍</span> Search Solver
            <span style="font-size:13px; font-weight:600; color:#94a3b8; background:#181b36; padding:3px 10px; border-radius:99px; border:1px solid #282d58;">
              5×5 Grid · 8 Directions
            </span>
          </div>

          <!-- Stage Selection Pills -->
          <div class="sr-stage-pills">
            <span style="font-size:11px; font-weight:800; color:#64748b; padding:6px 6px; text-transform:uppercase;">Stage:</span>
            <button class="sr-stage-btn active" id="srStageBtn1" onclick="window.setSearchStage(1)">Stage 1</button>
            <button class="sr-stage-btn" id="srStageBtn2" onclick="window.setSearchStage(2)">Stage 2</button>
            <button class="sr-stage-btn" id="srStageBtn3" onclick="window.setSearchStage(3)">Stage 3</button>
          </div>
        </div>

        <div class="sr-layout">
          <!-- Left Column: Upload & Word Lists -->
          <div>
            <!-- Image Dropzone -->
            <div class="sr-card" style="margin-bottom:18px;">
              <div class="sr-card-title">
                <span>Upload / Paste Screenshot</span>
                <button class="sr-btn" style="padding:4px 8px; font-size:11px;" onclick="window.resetSearchGrid()">Clear</button>
              </div>

              <div id="srDropzone" class="sr-dropzone" onclick="window.openSearchFileDialog()">
                <input type="file" id="srFileInput" accept="image/*" style="display:none;" onchange="window.handleSearchFile(this)">
                <div style="font-size:32px; margin-bottom:6px;">📷</div>
                <div style="font-weight:700; font-size:14px; color:#fff; margin-bottom:2px;">Click to Upload Screenshot</div>
                <div style="font-size:12px; color:#94a3b8;">or press <kbd style="background:#1e2246; padding:2px 6px; border-radius:4px; color:#ffd875;">Ctrl+V</kbd> anywhere to paste</div>
              </div>

              <div id="srPreviewWrapper" style="display:none; text-align:center; margin-bottom:10px;">
                <canvas id="searchImageCanvas" style="max-width:100%; border-radius:8px; border:1px solid #282d58; max-height:180px;"></canvas>
                <div id="searchOcrPreviewLabel" style="font-size:11px; color:#94a3b8; margin-top:6px; display:none;">Enhanced OCR View:</div>
                <canvas id="searchOcrPreviewCanvas" style="max-width:100%; border-radius:6px; border:1px solid #333; display:none; margin-top:4px;"></canvas>
              </div>

              <div id="searchOcrStatus" style="font-size:13px; font-weight:700; text-align:center;"></div>
            </div>

            <!-- Possible Words / Manual Stage Wordlists Input (Like Password Module) -->
            <div class="sr-card">
              <div class="sr-card-title">
                <span>Possible Words List</span>
                <button class="sr-btn" style="padding:4px 8px; font-size:11px;" onclick="window.resetSearchWords()">Reset Words</button>
              </div>
              <div style="font-size:11px; color:#94a3b8; margin-bottom:8px;">
                Paste or edit current stage words below (Search #1 & #2 preloaded):
              </div>
              <textarea id="searchWordsTextarea" class="sr-textarea" rows="8" oninput="window.handleWordsTextareaChange(this)">${searchState.rawWordsText}</textarea>
            </div>
          </div>

          <!-- Right Column: Answer Display & 5x5 Grid -->
          <div>
            <!-- Answer Card -->
            <div id="searchAnswerContainer" style="margin-bottom:18px;"></div>

            <!-- 5x5 Grid Board -->
            <div class="sr-card" style="text-align:center;">
              <div class="sr-card-title" style="justify-content:center; gap:10px;">
                <span>5×5 Letter Grid</span>
              </div>
              <div style="font-size:12px; color:#94a3b8; margin-bottom:10px;">
                Automatically filled by OCR or type letters directly:
              </div>

              <div class="sr-grid-container" id="srGridWrapper"></div>

              <div style="margin-top:14px; display:flex; justify-content:center; gap:10px;">
                <button class="sr-btn primary" onclick="window.solveSearchManual()">⚡ Find Words</button>
                <button class="sr-btn" onclick="window.clearSearchLetters()">Clear Letters</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    setupDropzone();
    setupGlobalPaste();
    renderGridInputs();
    solveSearch();
  }

  function setupDropzone() {
    const dropzone = document.getElementById('srDropzone');
    if (!dropzone) return;

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
      if (file) processSearchImageFile(file);
    });
  }

  function setupGlobalPaste() {
    document.addEventListener('paste', (e) => {
      const section = document.getElementById('searchSection');
      if (!section || !section.classList.contains('active')) return;

      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processSearchImageFile(file);
          break;
        }
      }
    });
  }

  function processSearchImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        searchState.image = img;

        const previewWrapper = document.getElementById('srPreviewWrapper');
        const canvas = document.getElementById('searchImageCanvas');
        if (previewWrapper && canvas) {
          previewWrapper.style.display = 'block';
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
        }

        runOcrOnSearchImage();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderGridInputs() {
    const wrapper = document.getElementById('srGridWrapper');
    if (!wrapper) return;

    let html = '';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const val = searchState.grid[r][c] || '';
        html += `
          <input type="text" class="sr-grid-cell" id="srCell-${r}-${c}" data-r="${r}" data-c="${c}" maxlength="1" value="${val}" autocomplete="off" spellcheck="false" oninput="window.handleCellInput(this, ${r}, ${c})" onkeydown="window.handleCellKey(event, ${r}, ${c})">
        `;
      }
    }
    wrapper.innerHTML = html;
  }

  function updateGridInputs() {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const el = document.getElementById(`srCell-${r}-${c}`);
        if (el) el.value = searchState.grid[r][c] || '';
      }
    }
  }

  function renderAnswerCard() {
    const container = document.getElementById('searchAnswerContainer');
    if (!container) return;

    const matches = searchState.foundWords;

    if (!matches || matches.length === 0) {
      container.innerHTML = `
        <div style="background:rgba(255,216,117,0.06); border:1.5px solid #282d58; border-radius:14px; padding:18px; text-align:center; color:#94a3b8;">
          <div style="font-size:16px; font-weight:700; color:#ffd875; margin-bottom:4px;">No words found yet</div>
          <div style="font-size:12px;">Upload a screenshot or verify letters and word list.</div>
        </div>
      `;
      return;
    }

    const selectedIdx = Math.min(searchState.selectedWordIndex, matches.length - 1);
    const primary = matches[selectedIdx];

    let html = `
      <div style="background:linear-gradient(135deg, rgba(34,197,94,0.14) 0%, rgba(16,185,129,0.06) 100%); border:2px solid #22c55e; border-radius:16px; padding:20px; box-shadow:0 0 30px rgba(34,197,94,0.2); margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
          <div style="font-size:11px; font-weight:800; color:#ffd875; letter-spacing:1.5px; text-transform:uppercase;">
            ${primary.isCurrentStage ? '★ CURRENT STAGE WORD TO SUBMIT' : 'MATCHED WORD'}
          </div>
          <span style="font-size:12px; font-weight:700; color:#cbd5e1; background:#112d22; padding:3px 10px; border-radius:6px; border:1px solid #22c55e;">
            ${primary.label}
          </span>
        </div>

        <div style="display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:14px;">
          <div>
            <div class="sr-word-badge">${primary.word}</div>
            <div style="font-size:15px; font-weight:700; color:#cbd5e1; margin-top:4px;">
              Starts at <strong style="color:#ffd875; text-decoration:underline; font-size:17px;">${primary.startCoord}</strong>
              ➔ Goes <span style="color:#22c55e; font-weight:800; font-size:17px;">${primary.dirName} ${primary.arrow}</span>
              ➔ Ends at <strong style="color:#ffd875; text-decoration:underline;">${primary.endCoord}</strong>
            </div>
          </div>
          <button class="sr-btn" style="background:#133824; border-color:#22c55e; color:#4ade80; font-weight:800; padding:10px 16px;" onclick="navigator.clipboard.writeText('${primary.word}'); this.textContent='✓ Copied!'; setTimeout(()=>this.textContent='📋 Copy Word', 1500);">
            📋 Copy Word
          </button>
        </div>
      </div>
    `;

    // If multiple words found, list all of them
    if (matches.length > 1) {
      html += `
        <div style="margin-top:12px;">
          <div style="font-size:12px; font-weight:800; color:#ffd875; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px;">
            All Matched Words (${matches.length} found):
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px;">
      `;

      matches.forEach((m, idx) => {
        const isSel = idx === selectedIdx;
        html += `
          <div class="sr-match-card ${isSel ? 'selected' : ''}" onclick="window.selectMatchedWord(${idx})">
            <div>
              <div style="font-size:20px; font-weight:900; color:${isSel ? '#22c55e' : '#fff'}; font-family:'Outfit', monospace;">
                ${m.word}
              </div>
              <div style="font-size:11px; color:#94a3b8;">${m.label}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:13px; font-weight:800; color:#ffd875;">${m.startCoord} ${m.arrow}</div>
              <div style="font-size:10px; color:#64748b;">${m.dirName}</div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  function highlightSelectedWordOnGrid() {
    // Clear all previous highlights
    document.querySelectorAll('.sr-grid-cell').forEach(cell => {
      cell.classList.remove('highlight-start', 'highlight-word');
    });

    const matches = searchState.foundWords;
    if (!matches || matches.length === 0) return;

    const selectedIdx = Math.min(searchState.selectedWordIndex, matches.length - 1);
    const selected = matches[selectedIdx];

    selected.cells.forEach((pos, i) => {
      const cellEl = document.getElementById(`srCell-${pos.r}-${pos.c}`);
      if (cellEl) {
        if (i === 0) {
          cellEl.classList.add('highlight-start');
        } else {
          cellEl.classList.add('highlight-word');
        }
      }
    });
  }

  function updateStageButtons() {
    for (let s = 1; s <= 3; s++) {
      const btn = document.getElementById(`srStageBtn${s}`);
      if (btn) {
        btn.classList.toggle('active', s === searchState.stage);
      }
    }
  }

  // ── GLOBAL CONTROLLER FUNCTIONS ───────────────────────────
  window.openSearchFileDialog = function() {
    const input = document.getElementById('srFileInput');
    if (input) input.click();
  };

  window.handleSearchFile = function(input) {
    const file = input.files && input.files[0];
    if (file) processSearchImageFile(file);
    input.value = '';
  };

  window.setSearchStage = function(s) {
    searchState.stage = s;
    updateStageButtons();
    solveSearch();
  };

  window.handleWordsTextareaChange = function(textarea) {
    parseWordListText(textarea.value);
    solveSearch();
  };

  window.resetSearchWords = function() {
    const textarea = document.getElementById('searchWordsTextarea');
    if (textarea) textarea.value = DEFAULT_WORDS_TEXT;
    parseWordListText(DEFAULT_WORDS_TEXT);
    solveSearch();
  };

  window.selectMatchedWord = function(idx) {
    searchState.selectedWordIndex = idx;
    renderAnswerCard();
    highlightSelectedWordOnGrid();
  };

  window.handleCellInput = function(input, r, c) {
    const val = input.value.toUpperCase().replace(/[^A-Z]/g, '');
    input.value = val;
    searchState.grid[r][c] = val;

    // Move to next cell
    if (val) {
      if (c < 4) {
        const next = document.getElementById(`srCell-${r}-${c+1}`);
        if (next) next.focus();
      } else if (r < 4) {
        const next = document.getElementById(`srCell-${r+1}-0`);
        if (next) next.focus();
      }
    }
    solveSearch();
  };

  window.handleCellKey = function(e, r, c) {
    if (e.key === 'Backspace' && !e.target.value) {
      if (c > 0) {
        const prev = document.getElementById(`srCell-${r}-${c-1}`);
        if (prev) prev.focus();
      } else if (r > 0) {
        const prev = document.getElementById(`srCell-${r-1}-4`);
        if (prev) prev.focus();
      }
    } else if (e.key === 'ArrowRight' && c < 4) {
      document.getElementById(`srCell-${r}-${c+1}`)?.focus();
    } else if (e.key === 'ArrowLeft' && c > 0) {
      document.getElementById(`srCell-${r}-${c-1}`)?.focus();
    } else if (e.key === 'ArrowDown' && r < 4) {
      document.getElementById(`srCell-${r+1}-${c}`)?.focus();
    } else if (e.key === 'ArrowUp' && r > 0) {
      document.getElementById(`srCell-${r-1}-${c}`)?.focus();
    }
  };

  window.clearSearchLetters = function() {
    searchState.grid = Array.from({ length: 5 }, () => Array(5).fill(''));
    updateGridInputs();
    solveSearch();
  };

  window.resetSearchGrid = function() {
    searchState.grid = Array.from({ length: 5 }, () => Array(5).fill(''));
    searchState.foundWords = [];
    searchState.image = null;

    const preview = document.getElementById('srPreviewWrapper');
    if (preview) preview.style.display = 'none';
    const status = document.getElementById('searchOcrStatus');
    if (status) status.textContent = '';

    updateGridInputs();
    renderAnswerCard();
  };

  window.solveSearchManual = function() {
    solveSearch();
  };

  window.initSearchModule = function() {
    injectStyles();
    renderUI();
    searchState.initialized = true;
  };

})();
