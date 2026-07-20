(function() {
const REGION_DEFS_THREE = [
  { key: 'outside', label: 'Outside', notation: "A' n B' n C'" },
  { key: 'A_only', label: 'A', notation: "A n B' n C'" },
  { key: 'B_only', label: 'B', notation: "A' n B n C'" },
  { key: 'C_only', label: 'C', notation: "A' n B' n C" },
  { key: 'AB', label: 'AB', notation: "A n B n C'" },
  { key: 'AC', label: 'AC', notation: "A n B' n C" },
  { key: 'BC', label: 'BC', notation: "A' n B n C" },
  { key: 'ABC', label: 'ABC', notation: 'A n B n C' }
];

const REGION_DEFS_TWO = [
  { key: 'outside', label: 'Outside', notation: "A' n B'" },
  { key: 'A_only', label: 'A', notation: "A n B'" },
  { key: 'B_only', label: 'B', notation: "A' n B" },
  { key: 'AB', label: 'AB', notation: 'A n B' }
];

const vennState = {
  image: null,
  initialized: false,
  manual: {
    mode: 'three',
    labels: { A: 'A', B: 'B', C: 'C' },
    shaded: {}
  }
};

function initVennModule() {
  if (vennState.initialized) return;
  vennState.initialized = true;

  const fileInput = document.getElementById('vennFileInput');
  const copyBtn = document.getElementById('vennCopyBtn');
  const targetMode = document.getElementById('vennTargetMode');
  const dropzone = document.getElementById('vennDropzone');

  window.openVennFileDialog = openVennFileDialog;

  if (fileInput) {
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) processVennImage(file);
      event.target.value = '';
    });
  }

  if (copyBtn) copyBtn.addEventListener('click', copyAnswerToClipboard);
  if (targetMode) targetMode.addEventListener('change', updateDisplayedAnswer);

  if (dropzone) {
    dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropzone.classList.add('active');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('active'));
    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('active');
      const file = [...(event.dataTransfer?.files || [])].find((item) => item.type.startsWith('image/'));
      if (file) processVennImage(file);
    });
  }

  document.addEventListener('paste', handleVennPaste);
  initManualBuilder();
  setVennStatus('Build the scenario below. Outside region counts too.', '#aaa');
}

function openVennFileDialog() {
  const fileInput = document.getElementById('vennFileInput');
  if (fileInput) fileInput.click();
}

function handleVennPaste(event) {
  const vennSection = document.getElementById('vennSection');
  if (!vennSection || !vennSection.classList.contains('active')) return;

  const items = event.clipboardData?.items;
  if (items) {
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        processVennImage(item.getAsFile());
        return;
      }
    }
  }

  const files = [...(event.clipboardData?.files || [])];
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      event.preventDefault();
      processVennImage(file);
      return;
    }
  }

  setVennStatus('Clipboard did not contain an image. Copy the screenshot itself, then press Ctrl+V here.', '#f5c542');
}

function processVennImage(file) {
  if (!file) return;

  setVennStatus('Loading reference image...', '#aaa');
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      vennState.image = img;
      renderReferenceCanvas();
      setVennStatus('Reference image loaded. Recreate the shading in the manual diagram below.', '#4caf50');
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function initManualBuilder() {
  const circleCount = document.getElementById('vennCircleCount');
  const labelA = document.getElementById('vennLabelA');
  const labelB = document.getElementById('vennLabelB');
  const labelC = document.getElementById('vennLabelC');
  const resetBtn = document.getElementById('vennResetManual');
  const manualCanvas = document.getElementById('vennManualCanvas');

  if (circleCount) {
    circleCount.addEventListener('change', () => {
      vennState.manual.mode = circleCount.value === 'two' ? 'two' : 'three';
      if (labelC) labelC.disabled = vennState.manual.mode === 'two';
      resetManualRegions();
      renderManualCanvas();
      updateDisplayedAnswer();
    });
  }

  bindLabelInput(labelA, 'A');
  bindLabelInput(labelB, 'B');
  bindLabelInput(labelC, 'C');

  if (labelA && !labelA.value.trim()) labelA.value = 'A';
  if (labelB && !labelB.value.trim()) labelB.value = 'B';
  if (labelC && !labelC.value.trim()) labelC.value = 'C';
  vennState.manual.labels.A = labelA?.value.trim().toUpperCase() || 'A';
  vennState.manual.labels.B = labelB?.value.trim().toUpperCase() || 'B';
  vennState.manual.labels.C = labelC?.value.trim().toUpperCase() || 'C';

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetManualRegions();
      renderManualCanvas();
      updateDisplayedAnswer();
    });
  }

  if (manualCanvas) manualCanvas.addEventListener('click', handleManualCanvasClick);

  if (labelC) labelC.disabled = false;
  resetManualRegions();
  renderManualCanvas();
  updateDisplayedAnswer();
}

function bindLabelInput(input, key) {
  if (!input) return;
  input.addEventListener('input', () => {
    const value = (input.value || key).trim().toUpperCase().slice(0, 3) || key;
    vennState.manual.labels[key] = value;
    renderManualCanvas();
    updateDisplayedAnswer();
  });
}

function resetManualRegions() {
  vennState.manual.shaded = {};
  for (const region of getRegionDefs(vennState.manual.mode)) {
    vennState.manual.shaded[region.key] = false;
  }
}

function renderReferenceCanvas() {
  const canvas = document.getElementById('vennCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!vennState.image) {
    drawReferencePlaceholder();
    return;
  }

  const fit = fitRect(vennState.image.width, vennState.image.height, canvas.width, canvas.height);
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(vennState.image, fit.x, fit.y, fit.width, fit.height);
}

function drawReferencePlaceholder() {
  const canvas = document.getElementById('vennCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  const r = 62;
  ctx.beginPath(); ctx.arc(235, 170, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(165, 170, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(200, 118, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#7d83a8';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Reference image preview', canvas.width / 2, 258);
}

function renderManualCanvas() {
  const canvas = document.getElementById('vennManualCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const mode = vennState.manual.mode;
  const layout = getManualLayout(canvas, mode);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#181826';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const board = getManualBoardRect(canvas);
  ctx.fillStyle = '#1f222b';
  ctx.fillRect(board.x, board.y, board.width, board.height);

  drawManualRegions(ctx, layout, mode, board);

  ctx.strokeStyle = 'rgba(232,236,245,0.95)';
  ctx.lineWidth = 4;
  for (const circle of Object.values(layout.circles)) {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#f0f2f8';
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (mode === 'two') {
    ctx.fillText(vennState.manual.labels.A || 'A', layout.circles.A.x, layout.circles.A.y - layout.circles.A.r - 28);
    ctx.fillText(vennState.manual.labels.B || 'B', layout.circles.B.x, layout.circles.B.y - layout.circles.B.r - 28);
  } else {
    ctx.fillText(vennState.manual.labels.A || 'A', layout.circles.A.x, layout.circles.A.y - layout.circles.A.r - 24);
    ctx.fillText(vennState.manual.labels.B || 'B', layout.circles.B.x - layout.circles.B.r - 34, layout.circles.B.y + 8);
    ctx.fillText(vennState.manual.labels.C || 'C', layout.circles.C.x + layout.circles.C.r + 34, layout.circles.C.y + 8);
  }
}

function getManualLayout(canvas, mode) {
  if (mode === 'two') {
    return {
      circles: {
        A: { x: canvas.width * 0.37, y: canvas.height * 0.56, r: canvas.width * 0.18 },
        B: { x: canvas.width * 0.63, y: canvas.height * 0.56, r: canvas.width * 0.18 }
      }
    };
  }

  return {
    circles: {
      A: { x: canvas.width * 0.50, y: canvas.height * 0.34, r: canvas.width * 0.18 },
      B: { x: canvas.width * 0.35, y: canvas.height * 0.58, r: canvas.width * 0.18 },
      C: { x: canvas.width * 0.65, y: canvas.height * 0.58, r: canvas.width * 0.18 }
    }
  };
}

function getManualBoardRect(canvas) {
  return {
    x: canvas.width * 0.08,
    y: canvas.height * 0.08,
    width: canvas.width * 0.84,
    height: canvas.height * 0.84
  };
}

function drawManualRegions(ctx, layout, mode, board) {
  const step = 4;
  for (let y = Math.floor(board.y); y < board.y + board.height; y += step) {
    for (let x = Math.floor(board.x); x < board.x + board.width; x += step) {
      const regionKey = getRegionKeyAtPoint(layout, mode, x + step / 2, y + step / 2);
      if (!regionKey) continue;
      ctx.fillStyle = vennState.manual.shaded[regionKey] ? '#6f768a' : '#1f222b';
      ctx.fillRect(x, y, step, step);
    }
  }
}

function getRegionKeyAtPoint(layout, mode, x, y) {
  const inside = {};
  for (const [name, circle] of Object.entries(layout.circles)) {
    const dx = x - circle.x;
    const dy = y - circle.y;
    inside[name] = dx * dx + dy * dy <= circle.r * circle.r;
  }

  if (mode === 'two') {
    if (!inside.A && !inside.B) return 'outside';
    if (inside.A && !inside.B) return 'A_only';
    if (!inside.A && inside.B) return 'B_only';
    if (inside.A && inside.B) return 'AB';
    return null;
  }

  if (!inside.A && !inside.B && !inside.C) return 'outside';
  if (inside.A && !inside.B && !inside.C) return 'A_only';
  if (!inside.A && inside.B && !inside.C) return 'B_only';
  if (!inside.A && !inside.B && inside.C) return 'C_only';
  if (inside.A && inside.B && !inside.C) return 'AB';
  if (inside.A && !inside.B && inside.C) return 'AC';
  if (!inside.A && inside.B && inside.C) return 'BC';
  if (inside.A && inside.B && inside.C) return 'ABC';
  return null;
}

function handleManualCanvasClick(event) {
  const canvas = event.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const layout = getManualLayout(canvas, vennState.manual.mode);
  const regionKey = getRegionKeyAtPoint(layout, vennState.manual.mode, x, y);
  if (!regionKey) return;
  vennState.manual.shaded[regionKey] = !vennState.manual.shaded[regionKey];
  renderManualCanvas();
  updateDisplayedAnswer();
}

function updateDisplayedAnswer() {
  const answerInput = document.getElementById('vennAnswer');
  const targetModeSelect = document.getElementById('vennTargetMode');
  if (!answerInput || !targetModeSelect) return;

  const targetMode = targetModeSelect.value === 'shaded' ? 'shaded' : 'nonShaded';
  const classification = classifyManualRegions();
  const targetRegions = classification[targetMode];
  const answer = buildSetNotation(targetRegions);
  answerInput.value = answer;

  const targetLabel = targetMode === 'shaded' ? 'shaded (grey)' : 'non-shaded (black)';
  setVennStatus(`Answer for ${targetLabel} region: ${answer}`, '#4caf50');
}

function classifyManualRegions() {
  const shaded = [];
  const nonShaded = [];
  for (const region of getRegionDefs(vennState.manual.mode)) {
    if (vennState.manual.shaded[region.key]) shaded.push(region.key);
    else nonShaded.push(region.key);
  }
  return { shaded, nonShaded };
}

function buildSetNotation(regionKeys) {
  const regionDefs = getRegionDefs(vennState.manual.mode);
  if (!regionKeys || regionKeys.length === 0) return 'Null';
  if (regionKeys.length === regionDefs.length) return 'S';

  const ordered = regionDefs
    .filter((region) => regionKeys.includes(region.key))
    .map((region) => `(${formatNotation(region.notation).replace(/\s+/g, '')})`);
  return ordered.join('u');
}

function formatNotation(notation) {
  const labels = vennState.manual.labels;
  return notation.replace(/\b(A|B|C)\b/g, (match) => {
    return labels[match] || match;
  });
}

function getRegionDefs(mode) {
  return mode === 'two' ? REGION_DEFS_TWO : REGION_DEFS_THREE;
}

function fitRect(sourceWidth, sourceHeight, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (maxWidth - width) / 2,
    y: (maxHeight - height) / 2,
    width,
    height
  };
}

function setVennStatus(message, color) {
  const status = document.getElementById('vennStatus');
  if (!status) return;
  status.textContent = message;
  status.style.color = color;
}

async function copyAnswerToClipboard() {
  const answerInput = document.getElementById('vennAnswer');
  if (!answerInput || !answerInput.value) return;

  try {
    await navigator.clipboard.writeText(answerInput.value);
    setVennStatus(`Copied: ${answerInput.value}`, '#4caf50');
  } catch {
    answerInput.select();
    document.execCommand('copy');
    setVennStatus(`Copied: ${answerInput.value}`, '#4caf50');
  }
}

function checkVennAnswer() {
  updateDisplayedAnswer();
}

function redrawVenn() {
  renderReferenceCanvas();
  renderManualCanvas();
}

window.initVennModule = initVennModule;
window.checkVennAnswer = checkVennAnswer;
window.redrawVenn = redrawVenn;
})();
