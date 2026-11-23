/**
 * Who's on First Module for Keep Talking and Nobody Explains
 * Supports:
 * 1. Dynamic Manual Rules parsing (paste Step 1 and Step 2 manual rules text)
 * 2. Exact Bounding Box Cropped OCR (Display Box + 6 Button Boxes cropped precisely by percentage bounds)
 * 3. File Upload / Clipboard Paste (Ctrl+V) / Base64 Data URL Fetch for direct local file:// support
 * 4. Full manual dropdown input & real-time solution calculation
 */

(function() {
  // Rules text, parser, OCR reader and solver are bomb_boomed's (window.BombLogic.wof, bomb-logic.js).
  const W = window.BombLogic.wof;
  const DEFAULT_MANUAL_TEXT = W.DEFAULT_RULES;

  const POSITIONS = ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"];
  const POS_LABELS = {
    "top-left": "Top-Left",
    "top-right": "Top-Right",
    "middle-left": "Middle-Left",
    "middle-right": "Middle-Right",
    "bottom-left": "Bottom-Left",
    "bottom-right": "Bottom-Right"
  };

  const whosState = {
    initialized: false,
    rules: null,
    busy: false,
    image: null,
    rawManualText: DEFAULT_MANUAL_TEXT
  };

  // ── DYNAMIC MANUAL RULES PARSER ───────────────────────────
  function parseManualRulesText(text) {
    whosState.rules = W.parseRules(text);
  }

  // ── DYNAMIC STYLE INJECTION ───────────────────────────────
  function injectStyles() {
    if (document.getElementById('whosOnFirstStyles')) return;
    const css = `
    .whos-shell {
      max-width: 950px;
      margin: auto;
      background: #12122a;
      padding: 24px;
      border-radius: 14px;
      border: 1px solid #222;
    }
    .whos-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 820px) {
      .whos-layout {
        grid-template-columns: 1fr;
      }
    }
    .whos-card {
      background: #0f0f1c;
      border: 2px solid #25253f;
      border-radius: 12px;
      padding: 20px;
    }
    .whos-card-title {
      font-family: 'Outfit', Arial, sans-serif;
      font-size: 16px;
      font-weight: bold;
      color: #ffd875;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #25253f;
      padding-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .whos-dropzone {
      border: 2px dashed #3a3a5c;
      border-radius: 10px;
      padding: 20px 16px;
      text-align: center;
      background: #0a0a18;
      cursor: pointer;
      transition: all 0.2s;
    }
    .whos-dropzone:hover, .whos-dropzone.active {
      border-color: #ffd875;
      background: rgba(255, 216, 117, 0.05);
    }
    .whos-dropzone-icon {
      font-size: 30px;
      margin-bottom: 6px;
    }
    .whos-dropzone-text {
      color: #ccc;
      font-weight: bold;
      font-size: 13px;
    }
    .whos-dropzone-sub {
      color: #777;
      font-size: 11px;
      margin-top: 4px;
    }
    .whos-url-bar {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    .whos-url-input {
      flex: 1;
      background: #0a0a18;
      border: 1px solid #3a3a5c;
      color: #ffd875;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
    }
    .whos-url-input:focus {
      border-color: #ffd875;
    }
    .whos-url-btn {
      padding: 8px 14px;
      background: #ffd875;
      color: #08080f;
      border: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .whos-url-btn:hover {
      background: #ffe599;
    }
    .whos-display-box {
      background: #000;
      border: 2px solid #00ff66;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      margin-bottom: 16px;
    }
    .whos-display-label {
      font-size: 11px;
      color: #00ff66;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .whos-display-select {
      background: #0a0a18;
      color: #00ff66;
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      font-weight: 900;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 6px 12px;
      width: 100%;
      text-align: center;
      text-align-last: center;
      outline: none;
      cursor: pointer;
    }
    .whos-button-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .whos-btn-cell {
      background: #18182e;
      border: 1px solid #333355;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      transition: all 0.2s;
    }
    .whos-warn { border-color: #f5c542 !important; box-shadow: 0 0 0 2px rgba(245,197,66,0.35); }
    .whos-answer { color: #00ff66; font-size: 28px; cursor: pointer; }
    .whos-btn-cell.target-btn {
      border: 2px solid #ffd875;
      box-shadow: 0 0 12px rgba(255, 216, 117, 0.3);
      background: #222244;
    }
    .whos-btn-cell.press-btn {
      border: 2px solid #00ff66;
      box-shadow: 0 0 14px rgba(0, 255, 102, 0.4);
      background: #12301c;
    }
    .whos-btn-label {
      font-size: 10px;
      color: #8888aa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .whos-btn-select {
      width: 100%;
      background: #0a0a18;
      color: #fff;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      border: 1px solid #3a3a5c;
      border-radius: 6px;
      padding: 6px;
      text-align: center;
      text-align-last: center;
      outline: none;
      cursor: pointer;
    }
    .whos-btn-select:focus {
      border-color: #ffd875;
    }
    .whos-solution-box {
      background: #0a0a18;
      border: 2px solid #333355;
      border-radius: 12px;
      padding: 20px;
      margin-top: 20px;
    }
    .whos-sol-step {
      font-size: 13px;
      color: #aaa;
      margin-bottom: 8px;
    }
    .whos-sol-highlight {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 900;
      color: #00ff66;
      letter-spacing: 1px;
    }
    .whos-sol-sub {
      font-size: 12px;
      color: #ffd875;
      margin-top: 4px;
    }
    .whos-action-btn {
      padding: 6px 12px;
      background: transparent;
      border: 1px solid #f44336;
      color: #f44336;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }
    .whos-action-btn:hover {
      background: rgba(244, 67, 54, 0.1);
    }
    .whos-manual-textarea {
      width: 100%;
      background: #0a0a1a;
      border: 1px solid #3a3a5c;
      color: #ffd875;
      padding: 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.4;
      resize: vertical;
      outline: none;
      margin-top: 6px;
    }
    .whos-manual-textarea:focus {
      border-color: #ffd875;
    }
    `;
    const style = document.createElement('style');
    style.id = 'whosOnFirstStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── RENDER MODULE HTML ────────────────────────────────────
  function renderUI() {
    const container = document.getElementById('whosSection');
    if (!container) return;

    parseManualRulesText(whosState.rawManualText);

    container.innerHTML = `
      <div class="whos-shell">
        <div class="whos-layout">

          <!-- Left Side: Image Upload, Image Link & OCR + Manual Rules Textarea -->
          <div style="display:flex; flex-direction:column; gap:20px;">
            <div class="whos-card">
              <div class="whos-card-title">
                <span>1. Screenshot Upload & Image Link OCR</span>
                <button type="button" class="whos-action-btn" onclick="clearWhosModule()">Reset</button>
              </div>

              <!-- Dropzone for Upload & Paste -->
              <div id="whosDropzone" class="whos-dropzone" onclick="openWhosFileDialog()">
                <div class="whos-dropzone-icon">📷</div>
                <div class="whos-dropzone-text">Drop Who's on First screenshot here</div>
                <div class="whos-dropzone-sub">or click to browse / paste from clipboard (Ctrl+V)</div>
                <input type="file" id="whosFileInput" accept="image/*" style="display:none" onchange="handleWhosFileSelect(this)">
              </div>

              <!-- Image URL Link Input Field -->
              <div class="whos-url-bar">
                <input type="text" id="whosUrlInput" class="whos-url-input" placeholder="Paste image URL (Discord CDN link, etc)..." onkeypress="if(event.key==='Enter') fetchWhosImageUrl()">
                <button type="button" class="whos-url-btn" onclick="fetchWhosImageUrl()">Load URL</button>
              </div>

              <div id="whosImageContainer" style="display:none; text-align:center; margin-top:12px;">
                <canvas id="whosImageCanvas" style="max-width:100%; height:auto; border-radius:8px; border:1px solid #333;"></canvas>
                <div style="margin-top:8px;">
                  <button type="button" class="whos-action-btn" onclick="clearWhosImage()">Remove Image</button>
                </div>
              </div>

              <div id="whosOcrStatus" style="margin-top:12px; font-size:13px; text-align:center;"></div>
            </div>

            <!-- Dynamic Manual Rules Input Card -->
            <div class="whos-card">
              <div class="whos-card-title">
                <span>Dynamic Manual Rules</span>
                <button type="button" class="whos-action-btn" style="border-color:#666; color:#aaa;" onclick="resetWhosManualRules()">Reset Rules</button>
              </div>
              <div style="font-size:11px; color:#aaa;">Paste current round's manual rules text below. Selectors update dynamically in real time:</div>
              <textarea id="whosManualRulesArea" class="whos-manual-textarea" rows="8" oninput="handleWhosManualRulesChange(this)">${whosState.rawManualText}</textarea>
            </div>
          </div>

          <!-- Right Side: Display & 6 Buttons Manual Selectors -->
          <div class="whos-card">
            <div class="whos-card-title">
              <span>2. Module Words Input</span>
            </div>

            <!-- Display Word Box -->
            <div class="whos-display-box">
              <div class="whos-display-label">DISPLAY WORD</div>
              <select id="whosDisplaySelect" class="whos-display-select" onchange="handleWhosInputChange()">
                ${getDisplaySelectOptionsHtml()}
              </select>
            </div>

            <!-- 6 Button Labels Grid -->
            <div class="whos-button-grid">
              ${POSITIONS.map(pos => `
                <div id="whosCell-${pos}" class="whos-btn-cell">
                  <div class="whos-btn-label">${POS_LABELS[pos]}</div>
                  <select id="whosSelect-${pos}" class="whos-btn-select" onchange="handleWhosInputChange()">
                    ${getButtonSelectOptionsHtml()}
                  </select>
                </div>
              `).join('')}
            </div>

            <!-- Solution Box -->
            <div id="whosSolutionBox" class="whos-solution-box" style="display:none;">
              <div id="whosStep1Text" class="whos-sol-step"></div>
              <div id="whosStep2Text" class="whos-sol-step"></div>
              <div id="whosFinalText" class="whos-sol-highlight"></div>
              <div id="whosPriorityListText" class="whos-sol-sub"></div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  function getDisplaySelectOptionsHtml() {
    let html = `<option value="">-- Select Display Word --</option>`;
    (whosState.rules?.displayWords || []).forEach(word => {
      html += `<option value="${esc(word)}">${esc(word)}</option>`;
    });
    return html;
  }

  function getButtonSelectOptionsHtml() {
    let html = `<option value="">-- Not set --</option>`;
    [...(whosState.rules?.buttonLabels || [])].sort().forEach(label => {
      html += `<option value="${esc(label)}">${esc(label)}</option>`;
    });
    return html;
  }

  function updateAllSelectDropdowns() {
    const displayEl = document.getElementById('whosDisplaySelect');
    if (displayEl) {
      const curVal = displayEl.value;
      displayEl.innerHTML = getDisplaySelectOptionsHtml();
      displayEl.value = curVal;
    }
    POSITIONS.forEach(pos => {
      const btnEl = document.getElementById(`whosSelect-${pos}`);
      if (btnEl) {
        const curVal = btnEl.value;
        btnEl.innerHTML = getButtonSelectOptionsHtml();
        btnEl.value = curVal;
      }
    });
  }

  // ── EVENT LISTENERS FOR DRAG/DROP/PASTE ───────────────────
  function setupUploadEvents() {
    const dropzone = document.getElementById('whosDropzone');
    if (!dropzone) return;

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('active');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('active');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('active');
      if (window.BombDragDrop) {
        window.BombDragDrop.handleDataTransfer(e.dataTransfer, (file) => {
          if (file) processWhosImage(file);
        });
      } else {
        const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
        if (file) processWhosImage(file);
      }
    });

    document.addEventListener('paste', (e) => {
      const whosSection = document.getElementById('whosSection');
      if (!whosSection || !whosSection.classList.contains('active')) return;

      if (window.BombDragDrop) {
        window.BombDragDrop.handleDataTransfer(e.clipboardData, (file) => {
          if (file) processWhosImage(file);
        });
        return;
      }

      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processWhosImage(file);
          break;
        }
      }
    });
  }

  // ── FETCH IMAGE DIRECTLY FROM URL LINK ─────────
  window.fetchWhosImageUrl = function() {
    const input = document.getElementById('whosUrlInput');
    if (!input) return;
    let url = input.value.trim();
    if (!url) return;

    const statusEl = document.getElementById('whosOcrStatus');
    if (statusEl) statusEl.innerHTML = `<span style="color:#ffd875;">⏳ Loading image from link...</span>`;

    const img = new Image();
    img.onload = () => {
      whosState.image = img;
      renderImageCanvas();
      document.getElementById('whosDropzone').style.display = 'none';
      document.getElementById('whosImageContainer').style.display = 'block';
      runOcrOnRegions();
    };

    img.onerror = () => {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#f44336;">❌ Unable to load image from link. Try pasting screenshot directly (Ctrl+V).</span>`;
      }
    };

    img.src = url;
  };

  // ── IMAGE PROCESSING & PRECISE REGION-CROPPED OCR ────────────────
  function processWhosImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        whosState.image = img;
        renderImageCanvas();
        document.getElementById('whosDropzone').style.display = 'none';
        document.getElementById('whosImageContainer').style.display = 'block';
        runOcrOnRegions();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderImageCanvas() {
    const canvas = document.getElementById('whosImageCanvas');
    if (!canvas || !whosState.image) return;
    canvas.width = whosState.image.width;
    canvas.height = whosState.image.height;
    const ctx = canvas.getContext('2d');
    try {
      ctx.drawImage(whosState.image, 0, 0);
    } catch(err) {
      console.warn("Canvas render fallback:", err);
    }
  }

  // bomb_boomed's reader: display + 6 buttons read side by side, each snapped to the closest word
  // in the rules; slots read with low confidence get a gold border.
  async function runOcrOnRegions() {
    const statusEl = document.getElementById('whosOcrStatus');
    if (!statusEl || !whosState.image) return;
    const say = (html) => { statusEl.innerHTML = html; };
    if (whosState.busy) { say(`<span style="color:#ffd875;">Still reading the last screenshot — paste again in a moment.</span>`); return; }
    whosState.busy = true;
    try {
      const r = await W.wofReadImage(whosState.image, whosState.rules, (t) => say(`<span style="color:#ffd875;">⏳ ${t}</span>`));
      const dEl = document.getElementById('whosDisplaySelect');
      if (dEl) {
        dEl.value = r.disp || '';
        dEl.classList.toggle('whos-warn', !!r.warnDisp);
      }
      POSITIONS.forEach((pos, i) => {
        const el = document.getElementById(`whosSelect-${pos}`);
        if (!el) return;
        el.value = r.btns[i] || '';
        el.classList.toggle('whos-warn', !!r.warnBtn[i]);
      });
      solveModule();
      const anyWarn = r.warnDisp || r.warnBtn.some(Boolean);
      say(anyWarn
        ? `<span style="color:#ffd875;">✅ OCR done — ⚠️ gold-bordered slots were read with low confidence, double-check them.</span>`
        : `<span style="color:#00ff66;">✅ OCR done — all slots read confidently.</span>`);
    } catch (err) {
      say(`<span style="color:#f44336;">⚠️ ${esc(err.message)} — pick the words from the dropdowns instead.</span>`);
    } finally {
      whosState.busy = false;
    }
  }

  // ── SOLVER ENGINE (bomb_boomed's solveCore) ───────────────
  function solveModule() {
    const displayEl = document.getElementById('whosDisplaySelect');
    if (!displayEl) return;

    const disp = displayEl.value;
    const btns = POSITIONS.map(pos => document.getElementById(`whosSelect-${pos}`)?.value || '');

    const solBox = document.getElementById('whosSolutionBox');
    const step1El = document.getElementById('whosStep1Text');
    const step2El = document.getElementById('whosStep2Text');
    const finalEl = document.getElementById('whosFinalText');
    const listEl = document.getElementById('whosPriorityListText');

    POSITIONS.forEach(pos => {
      const cell = document.getElementById(`whosCell-${pos}`);
      if (cell) cell.classList.remove('target-btn', 'press-btn');
    });

    const res = W.solveCore(whosState.rules, disp, btns);
    whosState.answer = res.ok ? res.ans : '';
    if (res.look === undefined) {
      solBox.style.display = disp ? 'block' : 'none';
      step1El.innerHTML = '';
      step2El.innerHTML = '';
      finalEl.textContent = disp ? res.msg : '';
      listEl.textContent = '';
      return;
    }
    solBox.style.display = 'block';

    const lookPos = POSITIONS[res.look];
    document.getElementById(`whosCell-${lookPos}`)?.classList.add('target-btn');
    step1El.innerHTML = `Step 1: Display <strong>"${esc(disp)}"</strong> ➔ Read <strong>${POS_LABELS[lookPos]}</strong> button label: <strong>"${esc(btns[res.look] || '?')}"</strong>`;

    if (!res.ok) {
      step2El.innerHTML = res.label ? `Step 2: Priority list for <strong>"${esc(res.label)}"</strong>` : '';
      finalEl.textContent = res.msg;
      listEl.textContent = res.list ? `List: ${res.list.join(', ')}` : '';
      return;
    }

    const hitPos = POSITIONS[res.hit];
    document.getElementById(`whosCell-${hitPos}`)?.classList.add('press-btn');
    step2El.innerHTML = `Step 2: Priority list for <strong>"${esc(res.label)}"</strong> finds match on <strong>${POS_LABELS[hitPos]}</strong> button.`;
    finalEl.innerHTML = `👉 PRESS: <span class="whos-answer" title="Click to copy" onclick="window.copyWhosAnswer(this)">"${esc(res.ans)}"</span> (${POS_LABELS[hitPos]})`;
    listEl.innerHTML = `Priority Order: ${res.list.map(w => w === res.ans ? `<strong style="color:#00ff66;">[${esc(w)}]</strong>` : esc(w)).join(', ')}`;
  }

  window.copyWhosAnswer = function (el) {
    const t = whosState.answer;
    if (!t) return;
    try {
      navigator.clipboard.writeText(t).then(() => {
        const was = el.textContent;
        el.textContent = '✓ Copied';
        setTimeout(() => { el.textContent = was; }, 1200);
      }).catch(() => {});
    } catch (e) {}
  };

  // ── GLOBAL CONTROLLER FUNCTIONS ───────────────────────────
  window.handleWhosInputChange = function() {
    // a slot changed by hand is no longer a doubtful read
    const el = document.activeElement;
    if (el && el.classList) el.classList.remove('whos-warn');
    solveModule();
  };

  window.handleWhosManualRulesChange = function(textarea) {
    whosState.rawManualText = textarea.value;
    parseManualRulesText(whosState.rawManualText);
    updateAllSelectDropdowns();
    solveModule();
  };

  window.resetWhosManualRules = function() {
    whosState.rawManualText = DEFAULT_MANUAL_TEXT;
    const area = document.getElementById('whosManualRulesArea');
    if (area) area.value = DEFAULT_MANUAL_TEXT;
    parseManualRulesText(DEFAULT_MANUAL_TEXT);
    updateAllSelectDropdowns();
    solveModule();
  };

  window.openWhosFileDialog = function() {
    const input = document.getElementById('whosFileInput');
    if (input) input.click();
  };

  window.handleWhosFileSelect = function(input) {
    const file = input.files && input.files[0];
    if (file) processWhosImage(file);
    input.value = '';
  };

  window.clearWhosImage = function() {
    whosState.image = null;
    document.getElementById('whosDropzone').style.display = 'block';
    document.getElementById('whosImageContainer').style.display = 'none';
    document.getElementById('whosOcrStatus').textContent = '';
    const urlInput = document.getElementById('whosUrlInput');
    if (urlInput) urlInput.value = '';
  };

  window.clearWhosModule = function() {
    clearWhosImage();
    const displayEl = document.getElementById('whosDisplaySelect');
    if (displayEl) { displayEl.value = ""; displayEl.classList.remove('whos-warn'); }
    POSITIONS.forEach(pos => {
      const el = document.getElementById(`whosSelect-${pos}`);
      if (el) { el.value = ""; el.classList.remove('whos-warn'); }
    });
    solveModule();
  };

  window.initWhosModule = function() {
    injectStyles();
    renderUI();
    setupUploadEvents();
    whosState.initialized = true;
  };

})();
