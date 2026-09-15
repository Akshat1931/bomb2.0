/**
 * complex-wires-module.js — KTaNE Complex Wires Solver
 * Solves 4-ellipse Venn diagram complex wires with customizable/OCR-scanned rule letters (C, D, S, P, B).
 */
(function () {
  "use strict";

  window.initComplexWiresModule = function () {
    if (window.__complexWiresInitialized) return;
    window.__complexWiresInitialized = true;

    // ── 16 Regions Definition & Relative Coordinates ───────────────
    // Normalized to 710x640 reference Venn diagram geometry
    const REGIONS = [
      { id: 'Star+LED', label: 'Star + LED', nx: 196 / 710, ny: 109 / 640, r: 0, b: 0, s: 1, l: 1 },
      { id: 'Red+LED', label: 'Red + LED', nx: 357 / 710, ny: 115 / 640, r: 1, b: 0, s: 0, l: 1 },
      { id: 'Red', label: 'Red only', nx: 445 / 710, ny: 85 / 640, r: 1, b: 0, s: 0, l: 0 },
      { id: 'Red+Star+LED', label: 'Red + Star + LED', nx: 252 / 710, ny: 164 / 640, r: 1, b: 0, s: 1, l: 1 },
      { id: 'Star', label: 'Star only', nx: 93 / 710, ny: 212 / 640, r: 0, b: 0, s: 1, l: 0 },
      { id: 'Red+Blue+LED', label: 'Red + Blue + LED', nx: 466 / 710, ny: 214 / 640, r: 1, b: 1, s: 0, l: 1 },
      { id: 'Red+Star', label: 'Red + Star', nx: 137 / 710, ny: 295 / 640, r: 1, b: 0, s: 1, l: 0 },
      { id: 'Red+Blue+Star+LED', label: 'Red + Blue + Star + LED', nx: 333 / 710, ny: 304 / 640, r: 1, b: 1, s: 1, l: 1 },
      { id: 'Blue+LED', label: 'Blue + LED', nx: 510 / 710, ny: 305 / 640, r: 0, b: 1, s: 0, l: 1 },
      { id: 'Red+Blue+Star', label: 'Red + Blue + Star', nx: 190 / 710, ny: 370 / 640, r: 1, b: 1, s: 1, l: 0 },
      { id: 'LED', label: 'LED only', nx: 552 / 710, ny: 395 / 640, r: 0, b: 0, s: 0, l: 1 },
      { id: 'Red+Blue', label: 'Red + Blue', nx: 143 / 710, ny: 436 / 640, r: 1, b: 1, s: 0, l: 0 },
      { id: 'Blue+Star+LED', label: 'Blue + Star + LED', nx: 419 / 710, ny: 430 / 640, r: 0, b: 1, s: 1, l: 1 },
      { id: 'Blue+Star', label: 'Blue + Star', nx: 330 / 710, ny: 479 / 640, r: 0, b: 1, s: 1, l: 0 },
      { id: 'Blue', label: 'Blue only', nx: 258 / 710, ny: 538 / 640, r: 0, b: 1, s: 0, l: 0 },
      { id: 'None', label: 'None (White wire, no star/LED)', nx: 659 / 710, ny: 571 / 640, r: 0, b: 0, s: 0, l: 0 }
    ];

    // Presets extracted from your game guidebook variants
    const PRESETS = {
      preset1: {
        name: 'Variant 1 (Outside P)',
        rules: {
          'None': 'P', 'Red': 'S', 'Blue': 'D', 'Star': 'B', 'LED': 'B',
          'Red+Blue': 'C', 'Red+Star': 'C', 'Red+LED': 'D', 'Blue+Star': 'B',
          'Blue+LED': 'P', 'Star+LED': 'S', 'Red+Blue+Star': 'S', 'Red+Blue+LED': 'S',
          'Red+Star+LED': 'P', 'Blue+Star+LED': 'C', 'Red+Blue+Star+LED': 'D'
        }
      },
      preset2: {
        name: 'Variant 2 (Outside D)',
        rules: {
          'None': 'D', 'Red': 'D', 'Blue': 'S', 'Star': 'C', 'LED': 'P',
          'Red+Blue': 'C', 'Red+Star': 'C', 'Red+LED': 'P', 'Blue+Star': 'B',
          'Blue+LED': 'S', 'Star+LED': 'S', 'Red+Blue+Star': 'B', 'Red+Blue+LED': 'B',
          'Red+Star+LED': 'S', 'Blue+Star+LED': 'D', 'Red+Blue+Star+LED': 'P'
        }
      },
      preset3: {
        name: 'Variant 3 (Outside C)',
        rules: {
          'None': 'C', 'Red': 'P', 'Blue': 'C', 'Star': 'D', 'LED': 'P',
          'Red+Blue': 'C', 'Red+Star': 'S', 'Red+LED': 'B', 'Blue+Star': 'S',
          'Blue+LED': 'P', 'Star+LED': 'P', 'Red+Blue+Star': 'S', 'Red+Blue+LED': 'D',
          'Red+Star+LED': 'S', 'Blue+Star+LED': 'B', 'Red+Blue+Star+LED': 'B'
        }
      },
      preset4: {
        name: 'Variant 4 (Outside S)',
        rules: {
          'None': 'S', 'Red': 'D', 'Blue': 'S', 'Star': 'D', 'LED': 'B',
          'Red+Blue': 'S', 'Red+Star': 'P', 'Red+LED': 'D', 'Blue+Star': 'B',
          'Blue+LED': 'P', 'Star+LED': 'S', 'Red+Blue+Star': 'C', 'Red+Blue+LED': 'C',
          'Red+Star+LED': 'P', 'Blue+Star+LED': 'P', 'Red+Blue+Star+LED': 'C'
        }
      }
    };

    // Active rule letter mapping
    let activeRules = Object.assign({}, PRESETS.preset1.rules);

    // Edgework State
    let edgework = {
      serial: '',
      serialEven: false,
      hasNeedy: false,
      totalModulesGTE5: true
    };

    // 6 Wires State
    // color: 'white' | 'red' | 'blue' | 'striped'
    let wires = [
      { active: true, color: 'striped', star: true, led: false },
      { active: true, color: 'blue', star: true, led: true },
      { active: true, color: 'blue', star: false, led: true },
      { active: true, color: 'striped', star: false, led: true },
      { active: true, color: 'red', star: true, led: false },
      { active: true, color: 'striped', star: false, led: false }
    ];

    // ── Letter Templates for OCR ────────────────────────────────────
    const CANDIDATES = ['C', 'D', 'S', 'P', 'B'];

    function createLetterTemplates() {
      const tmpls = {};
      const cv = document.createElement('canvas');
      cv.width = 24; cv.height = 28;
      const ctx = cv.getContext('2d');
      CANDIDATES.forEach(ch => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 24, 28);
        ctx.fillStyle = '#000000';
        ctx.font = '900 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ch, 12, 14);
        const idata = ctx.getImageData(0, 0, 24, 28).data;
        const bin = new Uint8Array(24 * 28);
        for (let i = 0; i < 24 * 28; i++) bin[i] = idata[i * 4] < 128 ? 1 : 0;
        tmpls[ch] = bin;
      });
      return tmpls;
    }

    const TEMPLATES = createLetterTemplates();

    function matchPatch(patchBin, pw, ph) {
      let bestChar = 'C', bestScore = -1;
      CANDIDATES.forEach(ch => {
        const tmpl = TEMPLATES[ch];
        let score = 0, total = 0;
        for (let y = 0; y < 28; y++) {
          for (let x = 0; x < 24; x++) {
            const px = Math.min(pw - 1, Math.floor(x * pw / 24));
            const py = Math.min(ph - 1, Math.floor(y * ph / 28));
            const val = patchBin[py * pw + px];
            const tval = tmpl[y * 24 + x];
            if (val === tval) score++;
            total++;
          }
        }
        const acc = score / total;
        if (acc > bestScore) {
          bestScore = acc;
          bestChar = ch;
        }
      });
      return bestChar;
    }

    // ── Process Diagram Image ───────────────────────────────────────
    function processDiagramImage(img) {
      const cv = document.createElement('canvas');
      cv.width = img.naturalWidth || img.width;
      cv.height = img.naturalHeight || img.height;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      const W = cv.width, H = cv.height;
      const idata = ctx.getImageData(0, 0, W, H).data;

      const recognized = {};
      REGIONS.forEach(reg => {
        const cx = Math.round(reg.nx * W);
        const cy = Math.round(reg.ny * H);
        const hw = Math.max(10, Math.round(W * 0.024));
        const hh = Math.max(12, Math.round(H * 0.028));

        const x0 = Math.max(0, cx - hw), x1 = Math.min(W, cx + hw);
        const y0 = Math.max(0, cy - hh), y1 = Math.min(H, cy + hh);
        const pw = x1 - x0, ph = y1 - y0;

        const patchBin = new Uint8Array(pw * ph);
        for (let y = 0; y < ph; y++) {
          for (let x = 0; x < pw; x++) {
            const idx = ((y0 + y) * W + (x0 + x)) * 4;
            const r = idata[idx], g = idata[idx + 1], b = idata[idx + 2];
            const isDark = (r < 75 && g < 75 && b < 75) || ((r + g + b) / 3 < 85);
            patchBin[y * pw + x] = isDark ? 1 : 0;
          }
        }
        recognized[reg.id] = matchPatch(patchBin, pw, ph);
      });

      activeRules = Object.assign({}, recognized);
      updateRuleGridUI();
      renderWireDecisions();
      showDiagramStatus('✅ Diagram analyzed! All 16 rule letters auto-mapped. Review or tweak below.');
    }

    function showDiagramStatus(msg) {
      const el = document.getElementById('cwDiagramStatus');
      if (el) {
        el.textContent = msg;
        el.style.display = 'block';
      }
    }

    // ── Build Interactive Rule Grid UI ──────────────────────────────
    function updateRuleGridUI() {
      const container = document.getElementById('cwRuleGrid');
      if (!container) return;
      container.innerHTML = '';

      REGIONS.forEach(reg => {
        const curLetter = activeRules[reg.id] || 'C';
        const box = document.createElement('div');
        box.className = 'cw-rule-box';

        const label = document.createElement('div');
        label.className = 'cw-rule-label';
        label.textContent = reg.label;
        box.appendChild(label);

        const sel = document.createElement('select');
        sel.className = 'cw-rule-select';
        CANDIDATES.forEach(ch => {
          const opt = document.createElement('option');
          opt.value = ch;
          opt.textContent = ch;
          if (ch === curLetter) opt.selected = true;
          sel.appendChild(opt);
        });

        sel.onchange = () => {
          activeRules[reg.id] = sel.value;
          renderWireDecisions();
        };

        box.appendChild(sel);
        container.appendChild(box);
      });
    }

    // ── Evaluate Single Wire ────────────────────────────────────────
    function getWireKey(w) {
      const isRed = (w.color === 'red' || w.color === 'striped');
      const isBlue = (w.color === 'blue' || w.color === 'striped');
      const isStar = !!w.star;
      const isLED = !!w.led;

      const feats = [];
      if (isRed) feats.push('Red');
      if (isBlue) feats.push('Blue');
      if (isStar) feats.push('Star');
      if (isLED) feats.push('LED');
      return feats.length ? feats.join('+') : 'None';
    }

    function evaluateWire(w) {
      const key = getWireKey(w);
      const letter = activeRules[key] || 'D';
      let cut = false, reason = '';

      switch (letter) {
        case 'C':
          cut = true;
          reason = "Rule C: Always cut.";
          break;
        case 'D':
          cut = false;
          reason = "Rule D: Always leave intact.";
          break;
        case 'S':
          cut = edgework.serialEven;
          reason = edgework.serialEven
            ? "Rule S: Rightmost serial digit is even → CUT."
            : "Rule S: Rightmost serial digit is odd/none → LEAVE.";
          break;
        case 'P':
          cut = edgework.hasNeedy;
          reason = edgework.hasNeedy
            ? "Rule P: Bomb has needy module(s) → CUT."
            : "Rule P: No needy modules present → LEAVE.";
          break;
        case 'B':
          cut = edgework.totalModulesGTE5;
          reason = edgework.totalModulesGTE5
            ? "Rule B: Bomb has ≥ 5 modules → CUT."
            : "Rule B: Bomb has fewer than 5 modules → LEAVE.";
          break;
        default:
          cut = false;
          reason = `Unknown rule letter '${letter}'.`;
      }

      return { key, letter, cut, reason };
    }

    // ── Render Results ──────────────────────────────────────────────
    function renderWireDecisions() {
      const outList = document.getElementById('cwDecisionsList');
      const summaryEl = document.getElementById('cwSummaryBanner');
      if (!outList) return;

      outList.innerHTML = '';
      const toCut = [], toLeave = [];

      wires.forEach((w, idx) => {
        if (!w.active) return;
        const num = idx + 1;
        const res = evaluateWire(w);
        if (res.cut) toCut.push(num);
        else toLeave.push(num);

        const card = document.createElement('div');
        card.className = `cw-decision-card ${res.cut ? 'cut' : 'leave'}`;

        const badge = document.createElement('div');
        badge.className = `cw-action-badge ${res.cut ? 'cut' : 'leave'}`;
        badge.innerHTML = res.cut ? `✂️ CUT WIRE ${num}` : `🚫 LEAVE WIRE ${num}`;

        const details = document.createElement('div');
        details.className = 'cw-decision-details';

        const colorText = w.color === 'striped' ? 'Red+Blue Striped' : (w.color[0].toUpperCase() + w.color.slice(1));
        const tags = [colorText];
        if (w.star) tags.push('★ Star');
        if (w.led) tags.push('💡 Lit LED');

        details.innerHTML = `
          <div class="cw-dec-feats">${tags.join(' · ')} &nbsp;→&nbsp; <span class="cw-letter-badge">${res.letter}</span> (${res.key})</div>
          <div class="cw-dec-reason">${res.reason}</div>
        `;

        card.appendChild(badge);
        card.appendChild(details);
        outList.appendChild(card);
      });

      if (summaryEl) {
        if (toCut.length === 0) {
          summaryEl.className = 'cw-summary-banner leave';
          summaryEl.innerHTML = `<strong>🚫 DO NOT CUT ANY WIRES!</strong> Leave all ${toLeave.length} wires intact.`;
        } else {
          summaryEl.className = 'cw-summary-banner cut';
          summaryEl.innerHTML = `
            <strong>✂️ CUT:</strong> Wire${toCut.length > 1 ? 's' : ''} <b>${toCut.join(', ')}</b> in any order.
            ${toLeave.length ? ` &nbsp;·&nbsp; <strong>🚫 LEAVE:</strong> Wire${toLeave.length > 1 ? 's' : ''} ${toLeave.join(', ')}.` : ''}
          `;
        }
      }
    }

    // ── Build Wire Input Slots ──────────────────────────────────────
    function renderWireInputs() {
      const container = document.getElementById('cwWiresContainer');
      if (!container) return;
      container.innerHTML = '';

      wires.forEach((w, idx) => {
        const slot = document.createElement('div');
        slot.className = `cw-wire-slot ${w.active ? '' : 'inactive'}`;

        // Header with position & enable toggle
        const head = document.createElement('div');
        head.className = 'cw-wire-head';
        head.innerHTML = `<span>Wire ${idx + 1}</span>`;

        const togActive = document.createElement('button');
        togActive.type = 'button';
        togActive.className = `cw-mini-btn ${w.active ? 'active' : ''}`;
        togActive.textContent = w.active ? 'Active' : 'Empty';
        togActive.onclick = () => {
          w.active = !w.active;
          renderWireInputs();
          renderWireDecisions();
        };
        head.appendChild(togActive);
        slot.appendChild(head);

        if (!w.active) {
          container.appendChild(slot);
          return;
        }

        // Visual Wire Preview Bar
        const preview = document.createElement('div');
        preview.className = `cw-wire-preview ${w.color}`;
        slot.appendChild(preview);

        // Color selector
        const colLabel = document.createElement('div');
        colLabel.className = 'cw-sublabel';
        colLabel.textContent = 'Wire Color:';
        slot.appendChild(colLabel);

        const colGroup = document.createElement('div');
        colGroup.className = 'cw-btn-group';

        const colors = [
          { key: 'white', label: 'White' },
          { key: 'red', label: 'Red' },
          { key: 'blue', label: 'Blue' },
          { key: 'striped', label: 'R/B Striped' }
        ];

        colors.forEach(c => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `cw-color-btn ${c.key} ${w.color === c.key ? 'selected' : ''}`;
          btn.textContent = c.label;
          btn.onclick = () => {
            w.color = c.key;
            renderWireInputs();
            renderWireDecisions();
          };
          colGroup.appendChild(btn);
        });
        slot.appendChild(colGroup);

        // Star and LED Toggles
        const featGroup = document.createElement('div');
        featGroup.className = 'cw-feat-group';

        const starBtn = document.createElement('button');
        starBtn.type = 'button';
        starBtn.className = `cw-feat-btn ${w.star ? 'on' : ''}`;
        starBtn.innerHTML = `★ Star: <b>${w.star ? 'YES' : 'NO'}</b>`;
        starBtn.onclick = () => {
          w.star = !w.star;
          renderWireInputs();
          renderWireDecisions();
        };

        const ledBtn = document.createElement('button');
        ledBtn.type = 'button';
        ledBtn.className = `cw-feat-btn led ${w.led ? 'on' : ''}`;
        ledBtn.innerHTML = `💡 LED: <b>${w.led ? 'LIT' : 'OFF'}</b>`;
        ledBtn.onclick = () => {
          w.led = !w.led;
          renderWireInputs();
          renderWireDecisions();
        };

        featGroup.appendChild(starBtn);
        featGroup.appendChild(ledBtn);
        slot.appendChild(featGroup);

        container.appendChild(slot);
      });
    }

    // ── Edgework Bindings ───────────────────────────────────────────
    function bindEdgework() {
      const serialInput = document.getElementById('cwSerialInput');
      const serialEvenBtn = document.getElementById('cwSerialEvenBtn');
      const serialOddBtn = document.getElementById('cwSerialOddBtn');
      const needyBtn = document.getElementById('cwNeedyBtn');
      const modsBtn = document.getElementById('cwModsBtn');

      function updateSerialUI() {
        if (serialEvenBtn) serialEvenBtn.classList.toggle('active', edgework.serialEven);
        if (serialOddBtn) serialOddBtn.classList.toggle('active', !edgework.serialEven);
      }

      if (serialInput) {
        serialInput.addEventListener('input', () => {
          const val = serialInput.value.trim();
          edgework.serial = val;
          const digits = val.match(/\d/g);
          if (digits && digits.length) {
            const lastDigit = parseInt(digits[digits.length - 1], 10);
            edgework.serialEven = (lastDigit % 2 === 0);
          }
          updateSerialUI();
          renderWireDecisions();
        });
      }

      if (serialEvenBtn) {
        serialEvenBtn.onclick = () => {
          edgework.serialEven = true;
          updateSerialUI();
          renderWireDecisions();
        };
      }

      if (serialOddBtn) {
        serialOddBtn.onclick = () => {
          edgework.serialEven = false;
          updateSerialUI();
          renderWireDecisions();
        };
      }

      if (needyBtn) {
        needyBtn.onclick = () => {
          edgework.hasNeedy = !edgework.hasNeedy;
          needyBtn.classList.toggle('active', edgework.hasNeedy);
          needyBtn.textContent = edgework.hasNeedy ? 'Needy Module: YES' : 'Needy Module: NO';
          renderWireDecisions();
        };
      }

      if (modsBtn) {
        modsBtn.onclick = () => {
          edgework.totalModulesGTE5 = !edgework.totalModulesGTE5;
          modsBtn.classList.toggle('active', edgework.totalModulesGTE5);
          modsBtn.textContent = edgework.totalModulesGTE5 ? 'Total Modules ≥ 5: YES' : 'Total Modules ≥ 5: NO';
          renderWireDecisions();
        };
      }

      updateSerialUI();
    }

    // ── Diagram Import & Dropzone ───────────────────────────────────
    function bindDiagramImporter() {
      const dropzone = document.getElementById('cwDiagramDropzone');
      const fileInput = document.getElementById('cwDiagramFileInput');
      const presetSelect = document.getElementById('cwPresetSelect');

      function handleFile(f) {
        if (!f || !f.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload = () => processDiagramImage(img);
          img.src = e.target.result;
        };
        reader.readAsDataURL(f);
      }

      if (dropzone && fileInput) {
        dropzone.onclick = () => fileInput.click();
        fileInput.onchange = e => {
          if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
          fileInput.value = '';
        };

        ['dragover', 'dragenter'].forEach(ev => dropzone.addEventListener(ev, e => {
          e.preventDefault();
          dropzone.classList.add('active');
        }));

        ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, e => {
          e.preventDefault();
          dropzone.classList.remove('active');
        }));

        dropzone.addEventListener('drop', e => {
          if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        });
      }

      if (presetSelect) {
        presetSelect.onchange = () => {
          const p = PRESETS[presetSelect.value];
          if (p) {
            activeRules = Object.assign({}, p.rules);
            updateRuleGridUI();
            renderWireDecisions();
            showDiagramStatus(`Loaded ${p.name}!`);
          }
        };
      }

      // Paste listener for diagram
      window.addEventListener('paste', e => {
        const isSecActive = document.getElementById('complexWiresSection')?.classList.contains('active');
        if (!isSecActive) return;

        const items = [...((e.clipboardData || {}).items || [])];
        const it = items.find(i => i.type.startsWith('image/'));
        if (it) {
          e.preventDefault();
          handleFile(it.getAsFile());
        }
      });
    }

    // ── Init Module ─────────────────────────────────────────────────
    updateRuleGridUI();
    renderWireInputs();
    bindEdgework();
    bindDiagramImporter();
    renderWireDecisions();
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (document.getElementById('complexWiresSection')?.classList.contains('active')) {
      window.initComplexWiresModule();
    }
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('complexWiresSection')?.classList.contains('active')) {
        window.initComplexWiresModule();
      }
    });
  }
})();
