/**
 * The Button Module Solver
 * Supports dynamic guidebook rule parsing, image OCR/color recognition, and manual input controls.
 */

(function() {
const DEFAULT_BUTTON_RULES = `If the button is blue and says Hold, wait 10 seconds.
Otherwise, if there is more than one module on the bomb and the button is green, wait 5 seconds.
Otherwise, if the button is white and says Hold, wait 7 seconds.
Otherwise, if the last digit of the serial number is odd and the button is red, wait 12 seconds.
Otherwise, if the button is white, wait 3 seconds.
Otherwise, if the button says Hold, wait 5 seconds.
Otherwise, if the button says Punch, wait 10 seconds.
Otherwise, wait 7 seconds.`;

const buttonState = {
  initialized: false,
  rulesText: DEFAULT_BUTTON_RULES,
  parsedRules: [],
  color: 'green',
  label: 'HOLD',
  serial: 'AB3',
  moduleCount: 2,
  image: null
};

function initButtonModule() {
  if (buttonState.initialized) return;
  buttonState.initialized = true;

  const colorSelect = document.getElementById('buttonColorSelect');
  const labelInput = document.getElementById('buttonLabelInput');
  const serialInput = document.getElementById('buttonSerialInput');
  const moduleCountInput = document.getElementById('buttonModuleCountInput');
  const rulesArea = document.getElementById('buttonRulesInput');
  const resetRulesBtn = document.getElementById('buttonResetRulesBtn');
  const dropzone = document.getElementById('buttonDropzone');
  const fileInput = document.getElementById('buttonFileInput');

  if (colorSelect) {
    colorSelect.addEventListener('change', () => {
      buttonState.color = colorSelect.value;
      evaluateButton();
    });
  }

  if (labelInput) {
    labelInput.addEventListener('input', () => {
      buttonState.label = labelInput.value.trim();
      evaluateButton();
    });
  }

  if (serialInput) {
    serialInput.addEventListener('input', () => {
      buttonState.serial = serialInput.value.trim();
      evaluateButton();
    });
  }

  if (moduleCountInput) {
    moduleCountInput.addEventListener('input', () => {
      buttonState.moduleCount = parseInt(moduleCountInput.value, 10) || 1;
      evaluateButton();
    });
  }

  if (rulesArea) {
    rulesArea.value = buttonState.rulesText;
    rulesArea.addEventListener('input', () => {
      buttonState.rulesText = rulesArea.value;
      buttonState.parsedRules = parseButtonRulesText(buttonState.rulesText);
      evaluateButton();
    });
  }

  if (resetRulesBtn) {
    resetRulesBtn.addEventListener('click', () => {
      buttonState.rulesText = DEFAULT_BUTTON_RULES;
      if (rulesArea) rulesArea.value = DEFAULT_BUTTON_RULES;
      buttonState.parsedRules = parseButtonRulesText(DEFAULT_BUTTON_RULES);
      evaluateButton();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) processButtonImage(file);
      e.target.value = '';
    });
  }

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('active');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('active'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('active');
      const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
      if (file) processButtonImage(file);
    });
  }

  document.addEventListener('paste', handleButtonPaste);

  buttonState.parsedRules = parseButtonRulesText(buttonState.rulesText);
  evaluateButton();
}

function handleButtonPaste(e) {
  const section = document.getElementById('buttonSection');
  if (!section || !section.classList.contains('active')) return;

  const items = e.clipboardData?.items;
  if (items) {
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        processButtonImage(item.getAsFile());
        return;
      }
    }
  }
}

// ── DYNAMIC RULE PARSER ────────────────────────────────────────

function parseButtonRulesText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const rules = [];

  for (const line of lines) {
    const rule = parseSingleRuleLine(line);
    if (rule) rules.push(rule);
  }

  return rules;
}

function parseSingleRuleLine(line) {
  // Normalize
  const lower = line.toLowerCase();
  
  // Extract action (e.g. "wait 10 seconds", "hold the button", "press and release")
  let action = "Follow manual rule";
  const actionMatch = line.match(/(?:wait\s+\d+\s*seconds?|press\s+and\s+release|hold\s+(?:the\s+)?button|release\s+when|click\s+immediately|press\s+and\s+hold)/i);
  if (actionMatch) {
    action = actionMatch[0];
    action = action.charAt(0).toUpperCase() + action.slice(1);
  } else {
    const commaParts = line.split(',');
    if (commaParts.length > 1) {
      action = commaParts[commaParts.length - 1].replace(/^then\s+/i, '').trim();
      action = action.charAt(0).toUpperCase() + action.slice(1);
    }
  }

  const conditions = [];

  // Check Color condition
  const colorMatch = lower.match(/(?:button\s+is|is\s+a)\s+(blue|green|white|red|yellow)/);
  if (colorMatch) {
    conditions.push({ type: 'color', color: colorMatch[1] });
  }

  // Check Label condition
  const labelMatch = lower.match(/says\s+["']?([a-z0-9]+)["']?/i);
  if (labelMatch) {
    conditions.push({ type: 'label', label: labelMatch[1].toLowerCase() });
  }

  // Check Serial condition (odd / even)
  if (lower.includes('serial') || lower.includes('last digit')) {
    if (lower.includes('odd')) {
      conditions.push({ type: 'serial', isOdd: true });
    } else if (lower.includes('even')) {
      conditions.push({ type: 'serial', isOdd: false });
    }
  }

  // Check Module Count condition
  if (lower.includes('more than one module') || lower.includes('more than 1 module') || lower.includes('> 1 module')) {
    conditions.push({ type: 'moduleCount', min: 2 });
  } else {
    const modMatch = lower.includes('module') && lower.match(/(\d+)\s+modules?/);
    if (modMatch) {
      conditions.push({ type: 'moduleCount', exact: parseInt(modMatch[1], 10) });
    }
  }

  return {
    rawText: line,
    action: action,
    conditions: conditions
  };
}

// ── EVALUATOR ──────────────────────────────────────────────────

function evaluateButton() {
  const resultCard = document.getElementById('buttonResultCard');
  const actionEl = document.getElementById('buttonActionText');
  const ruleEl = document.getElementById('buttonMatchedRule');
  const statusEl = document.getElementById('buttonStatus');

  const currentColor = (buttonState.color || 'white').toLowerCase();
  const currentLabel = (buttonState.label || '').trim().toLowerCase();
  const currentSerial = (buttonState.serial || '').trim();
  const currentModuleCount = buttonState.moduleCount || 1;

  // Extract last digit of serial number
  let lastDigit = null;
  const digits = currentSerial.match(/\d/g);
  if (digits && digits.length > 0) {
    lastDigit = parseInt(digits[digits.length - 1], 10);
  }
  const isSerialOdd = (lastDigit !== null) ? (lastDigit % 2 !== 0) : false;

  let matchedRule = null;

  for (let i = 0; i < buttonState.parsedRules.length; i++) {
    const rule = buttonState.parsedRules[i];
    let allMet = true;

    for (const cond of rule.conditions) {
      if (cond.type === 'color' && cond.color !== currentColor) {
        allMet = false; break;
      }
      if (cond.type === 'label' && cond.label !== currentLabel) {
        allMet = false; break;
      }
      if (cond.type === 'serial') {
        if (lastDigit === null || isSerialOdd !== cond.isOdd) {
          allMet = false; break;
        }
      }
      if (cond.type === 'moduleCount') {
        if (cond.min !== undefined && currentModuleCount < cond.min) {
          allMet = false; break;
        }
        if (cond.exact !== undefined && currentModuleCount !== cond.exact) {
          allMet = false; break;
        }
      }
    }

    if (allMet) {
      matchedRule = rule;
      break;
    }
  }

  if (matchedRule) {
    if (actionEl) actionEl.textContent = matchedRule.action;
    if (ruleEl) ruleEl.textContent = `Matched Rule: "${matchedRule.rawText}"`;
    if (resultCard) {
      resultCard.style.borderColor = '#4caf50';
      resultCard.style.background = 'rgba(76, 175, 80, 0.1)';
    }
    if (statusEl) {
      statusEl.textContent = `Button evaluated: Color = ${currentColor.toUpperCase()}, Label = "${currentLabel.toUpperCase()}"`;
      statusEl.style.color = '#4caf50';
    }
  } else {
    if (actionEl) actionEl.textContent = "No rule matched";
    if (ruleEl) ruleEl.textContent = "Please check inputs or guide text.";
    if (resultCard) {
      resultCard.style.borderColor = '#f44336';
      resultCard.style.background = 'rgba(244, 67, 54, 0.1)';
    }
  }
}

// ── IMAGE OCR & COLOR ANALYSIS ─────────────────────────────────

function processButtonImage(file) {
  if (!file) return;

  setButtonStatus('Analyzing button image...', '#aaa');
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      buttonState.image = img;
      renderButtonCanvas(img);
      analyzeButtonImage(img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderButtonCanvas(img) {
  const canvas = document.getElementById('buttonCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;

  ctx.drawImage(img, x, y, w, h);
}

function analyzeButtonImage(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const fullData = ctx.getImageData(0, 0, img.width, img.height).data;

  // 1. Sample central area to find button color
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  const cx0 = Math.floor(img.width * 0.25);
  const cy0 = Math.floor(img.height * 0.25);
  const cw = Math.floor(img.width * 0.50);
  const ch = Math.floor(img.height * 0.50);

  for (let y = cy0; y < cy0 + ch; y++) {
    for (let x = cx0; x < cx0 + cw; x++) {
      const idx = (y * img.width + x) * 4;
      const r = fullData[idx];
      const g = fullData[idx + 1];
      const b = fullData[idx + 2];
      const br = (r + g + b) / 3;
      const diffRGB = Math.max(r, g, b) - Math.min(r, g, b);

      if (br < 35 || br > 225) continue;
      if (br > 185 && diffRGB < 20) continue;

      rSum += r; gSum += g; bSum += b; count++;
    }
  }

  let detectedColor = 'white';
  let avgR = 150, avgG = 150, avgB = 150;

  if (count > 0) {
    avgR = rSum / count;
    avgG = gSum / count;
    avgB = bSum / count;
    const maxC = Math.max(avgR, avgG, avgB);
    const minC = Math.min(avgR, avgG, avgB);
    const diff = maxC - minC;

    if (avgR > 110 && avgG > 90 && (avgR - avgB > 30) && (avgG - avgB > 20)) {
      detectedColor = 'yellow';
    } else if (avgR > 100 && (avgR - avgG > 30) && (avgR - avgB > 30)) {
      detectedColor = 'red';
    } else if (avgG > 90 && (avgG - avgR > 20) && (avgG - avgB > 20)) {
      detectedColor = 'green';
    } else if (avgB > 90 && (avgB - avgR > 20)) {
      detectedColor = 'blue';
    } else if (avgR > 110 && avgG > 110 && avgB > 110 && diff < 45) {
      detectedColor = 'white';
    }
  }

  const colorSelect = document.getElementById('buttonColorSelect');
  if (colorSelect) {
    colorSelect.value = detectedColor;
    buttonState.color = detectedColor;
  }

  // 2. Find exact Bounding Box of the Button Body using detected color matching
  let minBtnX = img.width, maxBtnX = 0, minBtnY = img.height, maxBtnY = 0;
  let btnPxCount = 0;

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const idx = (y * img.width + x) * 4;
      const r = fullData[idx];
      const g = fullData[idx + 1];
      const b = fullData[idx + 2];

      let isBtnColor = false;
      if (detectedColor === 'yellow' && r > 120 && g > 90 && r - b > 25 && g - b > 15) isBtnColor = true;
      else if (detectedColor === 'red' && r > 100 && r - g > 25 && r - b > 25) isBtnColor = true;
      else if (detectedColor === 'green' && g > 80 && g - r > 15 && g - b > 15) isBtnColor = true;
      else if (detectedColor === 'blue' && b > 80 && b - r > 15) isBtnColor = true;
      else if (detectedColor === 'white' && r > 120 && g > 120 && b > 120 && Math.max(r,g,b)-Math.min(r,g,b) < 40) isBtnColor = true;

      if (isBtnColor) {
        if (x < minBtnX) minBtnX = x;
        if (x > maxBtnX) maxBtnX = x;
        if (y < minBtnY) minBtnY = y;
        if (y > maxBtnY) maxBtnY = y;
        btnPxCount++;
      }
    }
  }

  // Crop inner 70% width & 60% height of the detected button body
  let tx, ty, tw, th;
  if (btnPxCount > 100 && maxBtnX > minBtnX && maxBtnY > minBtnY) {
    const btnW = maxBtnX - minBtnX;
    const btnH = maxBtnY - minBtnY;
    tw = Math.floor(btnW * 0.75);
    th = Math.floor(btnH * 0.65);
    tx = Math.floor(minBtnX + (btnW - tw) / 2);
    ty = Math.floor(minBtnY + (btnH - th) / 2);
  } else {
    tw = Math.floor(img.width * 0.50);
    th = Math.floor(img.height * 0.26);
    tx = Math.floor((img.width - tw) / 2);
    ty = Math.floor((img.height - th) / 2);
  }

  // 3. Render focused 2x high-contrast canvas specifically for button text
  const textCanvas = document.createElement('canvas');
  textCanvas.width = tw * 2;
  textCanvas.height = th * 2;
  const tCtx = textCanvas.getContext('2d');
  tCtx.drawImage(img, tx, ty, tw, th, 0, 0, tw * 2, th * 2);

  const avgBtnBr = (avgR + avgG + avgB) / 3;

  const tData = tCtx.getImageData(0, 0, textCanvas.width, textCanvas.height);
  for (let i = 0; i < tData.data.length; i += 4) {
    const r = tData.data[i];
    const g = tData.data[i + 1];
    const b = tData.data[i + 2];
    const br = (r + g + b) / 3;

    if (Math.abs(br - avgBtnBr) > 30) {
      tData.data[i] = 0; tData.data[i + 1] = 0; tData.data[i + 2] = 0;
    } else {
      tData.data[i] = 255; tData.data[i + 1] = 255; tData.data[i + 2] = 255;
    }
  }
  tCtx.putImageData(tData, 0, 0);

  // Run Tesseract OCR on the perfectly focused text canvas
  if (window.Tesseract && typeof window.Tesseract.recognize === 'function') {
    window.Tesseract.recognize(textCanvas, 'eng').then(res => {
      let detectedLabel = matchButtonLabel(res.data?.text);

      // Feature fallback if OCR is blocked or returns no text
      if (!detectedLabel && th > 0) {
        const aspect = tw / th;
        if (aspect > 2.6) detectedLabel = 'DETONATE';
        else if (aspect < 1.65) detectedLabel = 'HOLD';
      }

      if (detectedLabel) {
        const labelInput = document.getElementById('buttonLabelInput');
        if (labelInput) {
          labelInput.value = detectedLabel;
          buttonState.label = detectedLabel;
        }
      }
      evaluateButton();
    }).catch(() => {
      evaluateButton();
    });
  } else {
    let fallbackLabel = null;
    if (th > 0) {
      const aspect = tw / th;
      if (aspect > 2.6) fallbackLabel = 'DETONATE';
      else if (aspect < 1.65) fallbackLabel = 'HOLD';
    }
    if (fallbackLabel) {
      const labelInput = document.getElementById('buttonLabelInput');
      if (labelInput) {
        labelInput.value = fallbackLabel;
        buttonState.label = fallbackLabel;
      }
    }
    evaluateButton();
  }
}

function levenshtein(a, b) {
  const tmp = [];
  let i, j;
  for (i = 0; i <= a.length; i++) tmp[i] = [i];
  for (j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = a[i - 1] === b[j - 1]
        ? tmp[i - 1][j - 1]
        : Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + 1);
    }
  }
  return tmp[a.length][b.length];
}

function matchButtonLabel(rawText) {
  if (!rawText) return null;
  const clean = rawText.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) return null;

  const possibleLabels = ['ABORT', 'DETONATE', 'HOLD', 'PRESS', 'PUNCH'];

  // 1. Exact substring match
  for (const lab of possibleLabels) {
    if (clean.includes(lab)) return lab;
  }

  // 2. Levenshtein edit distance check
  let bestLab = null;
  let minDistance = 999;

  for (const lab of possibleLabels) {
    const dist = levenshtein(clean, lab);
    if (dist < minDistance) {
      minDistance = dist;
      bestLab = lab;
    }
  }

  // Only accept if edit distance is within tolerance (<= 2 edits)
  if (minDistance <= 2) {
    return bestLab;
  }

  return null;
}

function setButtonStatus(msg, color) {
  const status = document.getElementById('buttonStatus');
  if (!status) return;
  status.textContent = msg;
  status.style.color = color;
}

window.initButtonModule = initButtonModule;
})();
