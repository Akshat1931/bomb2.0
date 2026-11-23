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

    let cwCopyText = 'NONE';

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

    // ── Screenshots: bomb_boomed's readers (window.BombLogic.complexwires, bomb-logic.js) ──
    // A wide picture is the Venn rule diagram (16 letters), a tall/square one the wires panel.
    const CW = window.BombLogic.complexwires;
    let unsureRegions = new Set();

    function processDiagramImage(img) {
      const res = CW.cwReadDiagramImage(img);
      if (res.error) { showDiagramStatus(`⚠️ ${res.error}`, true); return; }
      activeRules = Object.assign({}, res.rules);
      unsureRegions = res.unsure;
      const presetSelect = document.getElementById('cwPresetSelect');
      if (presetSelect) {
        const matchedKey = Object.keys(PRESETS).find(k => Object.keys(PRESETS[k].rules).every(id => PRESETS[k].rules[id] === activeRules[id]));
        if (matchedKey) presetSelect.value = matchedKey;
      }
      updateRuleGridUI();
      renderWireDecisions();
      showDiagramStatus(res.unsure.size
        ? `⚠️ Diagram read (${res.count} letters), but ${res.unsure.size} look unsure — check the gold boxes.`
        : `✅ Diagram read: ${res.count} letters, all matched clearly.`, res.unsure.size > 0);
    }

    function processWiresImage(img) {
      const found = CW.cwReadWiresImage(img);
      if (found.length) {
        wires = Array.from({ length: 6 }, (_, i) => (found[i] ? found[i] : { active: false, color: 'white', star: false, led: false }));
        renderWireInputs();
        renderWireDecisions();
      }
      showDiagramStatus(found.length === 6 ? '✅ Wires read: 6 wires found. Check them below.'
        : found.length ? `⚠️ Found ${found.length} wire(s), expected 6. Extra slots are switched off — fix by hand if needed.`
        : '⚠️ No wires found — set them by hand below.', found.length !== 6);
    }

    function showDiagramStatus(msg, warn) {
      const el = document.getElementById('cwDiagramStatus');
      if (el) {
        el.textContent = msg;
        el.style.color = warn ? '#ffd875' : 'var(--green)';
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
        box.className = 'cw-rule-box' + (unsureRegions.has(reg.id) ? ' cw-unsure' : '');

        const label = document.createElement('div');
        label.className = 'cw-rule-label';
        label.textContent = reg.label;
        box.appendChild(label);

        const sel = document.createElement('select');
        sel.className = 'cw-rule-select';
        CW.CW_LETTERS.forEach(ch => {
          const opt = document.createElement('option');
          opt.value = ch;
          opt.textContent = ch;
          if (ch === curLetter) opt.selected = true;
          sel.appendChild(opt);
        });

        sel.onchange = () => {
          activeRules[reg.id] = sel.value;
          unsureRegions.delete(reg.id);
          box.classList.remove('cw-unsure');
          renderWireDecisions();
        };

        box.appendChild(sel);
        container.appendChild(box);
      });
    }

    // ── Evaluate Single Wire ────────────────────────────────────────
    function evaluateWire(w) {
      const key = CW.cwKey(w);
      const letter = activeRules[key] || 'D';
      const r = CW.cwRuleFor(letter, { even: edgework.serialEven, needy: edgework.hasNeedy, gte5: edgework.totalModulesGTE5 });
      return { key, letter, cut: r.cut, reason: r.why };
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

      // copied as bomb_boomed copies it: "Wire 1 Wire 4", or NONE
      cwCopyText = toCut.length ? toCut.map(n => `Wire ${n}`).join(' ') : 'NONE';
      if (summaryEl) {
        summaryEl.title = `Click to copy: ${cwCopyText}`;
        summaryEl.style.cursor = 'pointer';
        summaryEl.onclick = () => {
          try {
            navigator.clipboard.writeText(cwCopyText).then(() => {
              const was = summaryEl.innerHTML;
              summaryEl.innerHTML = '<strong>✓ Copied</strong> ' + cwCopyText;
              setTimeout(() => { summaryEl.innerHTML = was; }, 1200);
            }).catch(() => {});
          } catch (e) {}
        };
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
        const img = new Image();
        img.onload = () => {
          try {
            if (img.naturalWidth / img.naturalHeight > 1.05) processDiagramImage(img);
            else processWiresImage(img);
          } catch (e) {
            showDiagramStatus('⚠️ Could not read that image.', true);
          }
          URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(f);
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
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('active');
          if (window.BombDragDrop) {
            window.BombDragDrop.handleDataTransfer(e.dataTransfer, (file) => {
              if (file) handleFile(file);
            });
          } else {
            if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }
        });
      }

      if (presetSelect) {
        presetSelect.onchange = () => {
          const p = PRESETS[presetSelect.value];
          if (p) {
            activeRules = Object.assign({}, p.rules);
            unsureRegions = new Set();
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

        if (window.BombDragDrop) {
          window.BombDragDrop.handleDataTransfer(e.clipboardData, (file) => {
            if (file) handleFile(file);
          });
          return;
        }

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
