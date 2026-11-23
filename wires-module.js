/**
 * Wire Sequences Module Solver
 * Supports 5 sequential panels, cumulative occurrence tracking across stages,
 * image recognition, manual input controls, and dynamic guidebook rule parsing.
 */

(function () {
  // The Red / Blue / Black table changes every game (the 22 Nov table was not the next game's), so
  // nothing is built in: last game's table would give confident wrong answers. It is read from the
  // manual picture (or typed) and remembered for the game.
  const MANUAL_KEY = 'ktane_wireseq_manual'; // { text, at, picture }
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v) localStorage.setItem(k, JSON.stringify(v)); else localStorage.removeItem(k); } catch (e) {} };
  const savedManual = lsGet(MANUAL_KEY);

  // Manual picture reader, rules parser, solver and wire screenshot reader are bomb_boomed's
  // (window.BombLogic.wireseq, bomb-logic.js — regenerate it to sync, don't copy code here).
  const { readWireManual, wireManualText, wsParseManual, wsSolveAll, wsReadImage } = window.BombLogic.wireseq;

  const wireState = {
    initialized: false,
    activeStage: 1, // 1 to 5
    rulesText: savedManual ? savedManual.text : '',
    manual: savedManual,
    manualMsg: '',
    manualCells: null,
    parsedRules: null,
    stages: [
      [{ color: 'none', to: 'none' }, { color: 'none', to: 'none' }, { color: 'none', to: 'none' }], // Stage 1
      [{ color: 'none', to: 'none' }, { color: 'none', to: 'none' }, { color: 'none', to: 'none' }], // Stage 2
      [{ color: 'none', to: 'none' }, { color: 'none', to: 'none' }, { color: 'none', to: 'none' }], // Stage 3
      [{ color: 'none', to: 'none' }, { color: 'none', to: 'none' }, { color: 'none', to: 'none' }], // Stage 4
      [{ color: 'none', to: 'none' }, { color: 'none', to: 'none' }, { color: 'none', to: 'none' }]  // Stage 5
    ]
  };

  function initWiresModule() {
    if (wireState.initialized) return;
    wireState.initialized = true;

    wireState.parsedRules = parseWireRulesText(wireState.rulesText);

    // Bind Stage buttons
    for (let s = 1; s <= 5; s++) {
      const btn = document.getElementById(`wireStageBtn-${s}`);
      if (btn) {
        btn.addEventListener('click', () => {
          setWireActiveStage(s);
        });
      }
    }

    // Bind Reset button
    const resetBtn = document.getElementById('wireResetAllBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        for (let s = 0; s < 5; s++) {
          wireState.stages[s] = [
            { color: 'none', to: 'none' },
            { color: 'none', to: 'none' },
            { color: 'none', to: 'none' }
          ];
        }
        updateWireStageControlsUI();
        evaluateWireSequences();
      });
    }

    // Bind 3 Wire Inputs for current stage
    for (let slot = 1; slot <= 3; slot++) {
      const colSel = document.getElementById(`wireColorSelect-${slot}`);
      const toSel = document.getElementById(`wireToSelect-${slot}`);

      if (colSel) {
        colSel.addEventListener('change', () => {
          const sIdx = wireState.activeStage - 1;
          wireState.stages[sIdx][slot - 1].color = colSel.value;
          syncQuickInputFromSlots();
          evaluateWireSequences();
        });
      }
      if (toSel) {
        toSel.addEventListener('change', () => {
          const sIdx = wireState.activeStage - 1;
          wireState.stages[sIdx][slot - 1].to = toSel.value;
          syncQuickInputFromSlots();
          evaluateWireSequences();
        });
      }
    }

    // Bind Quick Text Input
    const quickInput = document.getElementById('wireQuickInput');
    const quickApplyBtn = document.getElementById('wireQuickApplyBtn');
    const quickClearBtn = document.getElementById('wireQuickClearBtn');
    const quickNextStageBtn = document.getElementById('wireQuickNextStageBtn');

    if (quickApplyBtn) {
      quickApplyBtn.addEventListener('click', () => {
        if (quickInput) applyQuickWireInput(quickInput.value);
      });
    }

    if (quickInput) {
      quickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey || e.ctrlKey) {
            // Shift+Enter or Ctrl+Enter: Apply and advance to next stage
            applyQuickWireInput(quickInput.value);
            if (wireState.activeStage < 5) {
              setWireActiveStage(wireState.activeStage + 1);
              setTimeout(() => quickInput.focus(), 50);
            }
          } else {
            // Normal Enter: Apply and solve
            applyQuickWireInput(quickInput.value);
          }
        }
      });
    }

    if (quickClearBtn) {
      quickClearBtn.addEventListener('click', () => {
        const sIdx = wireState.activeStage - 1;
        wireState.stages[sIdx] = [
          { color: 'none', to: 'none' },
          { color: 'none', to: 'none' },
          { color: 'none', to: 'none' }
        ];
        if (quickInput) quickInput.value = '';
        const feedbackEl = document.getElementById('wireQuickFeedback');
        if (feedbackEl) {
          feedbackEl.textContent = `✓ Cleared all wires for Stage ${wireState.activeStage}.`;
          feedbackEl.style.color = '#81c784';
        }
        updateWireStageControlsUI();
        evaluateWireSequences();
      });
    }

    if (quickNextStageBtn) {
      quickNextStageBtn.addEventListener('click', () => {
        if (wireState.activeStage < 5) {
          setWireActiveStage(wireState.activeStage + 1);
        } else {
          setWireActiveStage(1);
        }
        if (quickInput) setTimeout(() => quickInput.focus(), 50);
      });
    }

    window.applyWireShortcut = function(text) {
      if (quickInput) quickInput.value = text;
      applyQuickWireInput(text);
    };

    // Bind Rules Textarea
    const rulesArea = document.getElementById('wireRulesInput');
    const resetRulesBtn = document.getElementById('wireResetRulesBtn');
    if (rulesArea) {
      rulesArea.value = wireState.rulesText;
      rulesArea.addEventListener('input', () => {
        setWireManual(rulesArea.value, false);
      });
    }
    if (resetRulesBtn) {
      resetRulesBtn.addEventListener('click', () => forgetWireManual());
    }
    setupWireManualPicture();
    renderWireManualState();

    // Bind Dropzone & File Input
    const dropzone = document.getElementById('wireDropzone');
    const fileInput = document.getElementById('wireFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const files = [...(e.target.files || [])];
        if (files.length) processWireImage(files);
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
        e.stopPropagation();
        dropzone.classList.remove('active');
        const many = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith('image/'));
        if (many.length > 1) { processWireImage(many); return; } // several stages at once
        if (window.BombDragDrop) {
          window.BombDragDrop.handleDataTransfer(e.dataTransfer, (file) => {
            if (file) processWireImage(file);
          });
        } else {
          const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
          if (file) processWireImage(file);
        }
      });
    }

    document.addEventListener('paste', handleWirePaste);

    setWireActiveStage(1);
  }

  function setWireActiveStage(s) {
    wireState.activeStage = s;
    for (let i = 1; i <= 5; i++) {
      const btn = document.getElementById(`wireStageBtn-${i}`);
      if (btn) {
        const isActive = (i === s);
        btn.classList.toggle('active', isActive);
        if (isActive) {
          btn.style.background = '#f5c542';
          btn.style.color = '#0e0e1e';
          btn.style.borderColor = '#f5c542';
          btn.style.fontWeight = 'bold';
          btn.style.boxShadow = '0 0 14px rgba(245, 197, 66, 0.7)';
          btn.style.transform = 'scale(1.06)';
        } else {
          btn.style.background = '#131328';
          btn.style.color = '#aaa';
          btn.style.borderColor = '#2d2d54';
          btn.style.fontWeight = 'normal';
          btn.style.boxShadow = 'none';
          btn.style.transform = 'scale(1.0)';
        }
      }
    }
    const titleEl = document.getElementById('wireCurrentStageTitle');
    if (titleEl) titleEl.textContent = `Stage ${s} / 5 Inputs`;

    updateWireStageControlsUI();
    evaluateWireSequences();
  }

  function syncQuickInputFromSlots() {
    const sIdx = wireState.activeStage - 1;
    const currentSlotState = wireState.stages[sIdx];
    const quickInput = document.getElementById('wireQuickInput');
    if (quickInput && document.activeElement !== quickInput) {
      const parts = [];
      for (let s = 0; s < 3; s++) {
        const w = currentSlotState[s];
        if (w.color !== 'none' && w.to !== 'none') {
          parts.push(`${s + 1}${w.color.toUpperCase()}${w.to}`);
        }
      }
      quickInput.value = parts.join(' ');
    }
  }

  function updateWireStageControlsUI() {
    const sIdx = wireState.activeStage - 1;
    const currentSlotState = wireState.stages[sIdx];

    for (let slot = 1; slot <= 3; slot++) {
      const colSel = document.getElementById(`wireColorSelect-${slot}`);
      const toSel = document.getElementById(`wireToSelect-${slot}`);
      if (colSel) colSel.value = currentSlotState[slot - 1].color;
      if (toSel) toSel.value = currentSlotState[slot - 1].to;
    }

    const quickInput = document.getElementById('wireQuickInput');
    if (quickInput && document.activeElement !== quickInput) {
      const parts = [];
      for (let s = 0; s < 3; s++) {
        const w = currentSlotState[s];
        if (w.color !== 'none' && w.to !== 'none') {
          parts.push(`${s + 1}${w.color.toUpperCase()}${w.to}`);
        }
      }
      quickInput.value = parts.join(' ');
    }
  }

  function parseWireQuickInput(inputStr) {
    if (!inputStr || typeof inputStr !== 'string') {
      return { success: false, message: 'Please enter wire details (e.g. 1REDA 2REDB 3BLUEC or 1BLACKC).' };
    }

    const trimmed = inputStr.trim();
    if (!trimmed) {
      return { success: false, message: 'Please enter wire details (e.g. 1REDA 2REDB 3BLUEC or 1BLACKC).' };
    }

    if (/^(CLEAR|RESET|NONE|EMPTY)$/i.test(trimmed)) {
      return { success: true, isClearAll: true };
    }

    const tokens = trimmed.split(/[\s,;]+/).filter(Boolean);
    if (tokens.length === 0) {
      return { success: false, message: 'No wire tokens found.' };
    }

    const parsedWires = [];
    let autoSlot = 1;

    for (const rawToken of tokens) {
      const token = rawToken.trim().toUpperCase();
      if (!token) continue;

      const clearSlotMatch = token.match(/^([123])[-:]?(NONE|CLEAR|EMPTY)$/i);
      if (clearSlotMatch) {
        parsedWires.push({
          slot: parseInt(clearSlotMatch[1], 10),
          color: 'none',
          to: 'none'
        });
        continue;
      }

      let slot = null;
      let remainder = token;
      const slotPrefix = token.match(/^([123])[-:\/]*(.*)$/);
      if (slotPrefix) {
        slot = parseInt(slotPrefix[1], 10);
        remainder = slotPrefix[2];
      }

      remainder = remainder.replace(/^[^A-Z0-9]+/, '');

      const targetMatch = remainder.match(/^(.*?)[-:\sTO]*([ABC])$/i);
      if (!targetMatch) {
        continue;
      }

      const rawCol = targetMatch[1].replace(/[^A-Z]/g, '');
      const target = targetMatch[2].toUpperCase();

      let color = null;
      if (rawCol === 'RED' || rawCol === 'R') {
        color = 'red';
      } else if (rawCol === 'BLACK' || rawCol === 'BK' || rawCol === 'BLK' || rawCol === 'K') {
        color = 'black';
      } else if (rawCol === 'BLUE' || rawCol === 'BL' || rawCol === 'BLU' || rawCol === 'U' || rawCol === 'B') {
        color = 'blue';
      }

      if (!color) {
        continue;
      }

      if (slot === null) {
        slot = autoSlot++;
      }

      if (slot >= 1 && slot <= 3) {
        parsedWires.push({ slot, color, to: target });
      }
    }

    if (parsedWires.length === 0) {
      return {
        success: false,
        message: 'Could not parse wires. Formats: 1REDA 2REDB 3BLUEC | 1RA 2RB 3BC | 1BLACKC'
      };
    }

    return { success: true, wires: parsedWires };
  }

  function applyQuickWireInput(text) {
    const sIdx = wireState.activeStage - 1;
    const feedbackEl = document.getElementById('wireQuickFeedback');
    const parsed = parseWireQuickInput(text);

    if (!parsed.success) {
      if (feedbackEl) {
        feedbackEl.textContent = '⚠️ ' + parsed.message;
        feedbackEl.style.color = '#ff9800';
      }
      return false;
    }

    if (parsed.isClearAll) {
      wireState.stages[sIdx] = [
        { color: 'none', to: 'none' },
        { color: 'none', to: 'none' },
        { color: 'none', to: 'none' }
      ];
      updateWireStageControlsUI();
      evaluateWireSequences();
      if (feedbackEl) {
        feedbackEl.textContent = `✓ Cleared all wires for Stage ${wireState.activeStage}.`;
        feedbackEl.style.color = '#81c784';
      }
      return true;
    }

    // Reset current stage slots before applying new configuration
    wireState.stages[sIdx] = [
      { color: 'none', to: 'none' },
      { color: 'none', to: 'none' },
      { color: 'none', to: 'none' }
    ];

    const appliedDesc = [];
    for (const w of parsed.wires) {
      if (w.slot >= 1 && w.slot <= 3) {
        wireState.stages[sIdx][w.slot - 1] = { color: w.color, to: w.to };
        if (w.color !== 'none') {
          appliedDesc.push(`Slot ${w.slot}: ${w.color.toUpperCase()} ➔ ${w.to}`);
        }
      }
    }

    updateWireStageControlsUI();
    evaluateWireSequences();

    if (feedbackEl) {
      feedbackEl.textContent = `✓ Stage ${wireState.activeStage} updated: ` + (appliedDesc.length > 0 ? appliedDesc.join(' | ') : 'No wires');
      feedbackEl.style.color = '#81c784';
    }
    return true;
  }

  function handleWirePaste(e) {
    const section = document.getElementById('wiresSection');
    if (!section || !section.classList.contains('active')) return;

    if (window.BombDragDrop) {
      window.BombDragDrop.handleDataTransfer(e.clipboardData, (file) => {
        if (file) processWireImage(file);
      });
      return;
    }

    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          processWireImage(item.getAsFile());
          return;
        }
      }
    }
  }

  // his rules box text → { red: { 1: Set(['A','B','C']), … }, … }
  function parseWireRulesText(text) {
    return wsParseManual(text);
  }

  // ── EVALUATOR (ACROSS ALL 5 STAGES) ───────────────────────────

  function evaluateWireSequences() {
    const ordinalNames = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
    const stages = wireState.stages.map(st => st.map(w => ({
      c: w.color !== 'none' ? w.color : null,
      d: w.to !== 'none' ? w.to : null
    })));
    const perStage = wsSolveAll(stages, wireState.parsedRules || {});
    const allResults = perStage.map((rs, sIdx) => ({
      stageNum: sIdx + 1,
      wires: rs.map(r => r.state === 'empty'
        ? { slot: r.i + 1, hasWire: false }
        : {
          slot: r.i + 1,
          hasWire: true,
          color: r.w.c,
          to: r.w.d,
          occNum: r.n,
          ordName: ordinalNames[r.n - 1] || `${r.n}th`,
          shouldCut: r.state === 'cut',
          noRule: r.state === 'norule'
        })
    }));
    renderWireResultsUI(allResults);
  }

  function renderWireResultsUI(allResults) {
    const resultCard = document.getElementById('wireResultCard');
    const actionText = document.getElementById('wireActionText');
    const summaryList = document.getElementById('wireSummaryList');
    const statusEl = document.getElementById('wireStatus');

    const activeStageRes = allResults[wireState.activeStage - 1];

    let html = '';
    let activeActions = [];

    if (activeStageRes) {
      for (const w of activeStageRes.wires) {
        if (!w.hasWire) {
          html += `<div style="padding:10px; border-radius:8px; background:#121224; margin-bottom:8px; border:1px solid #222244; color:#666; font-size:14px;">
          Wire ${w.slot}: <em style="color:#888;">No wire connected</em>
        </div>`;
        } else {
          const cutColor = w.shouldCut ? '#4caf50' : w.noRule ? '#ff9800' : '#f44336';
          const cutBadge = w.shouldCut ? '✂️ CUT WIRE' : w.noRule ? '⚠ NO RULE' : '⛔ LEAVE WIRE';
          const colorUpper = w.color.toUpperCase();

          activeActions.push(w);

          html += `<div style="padding:12px; border-radius:10px; background:${w.shouldCut ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)'}; margin-bottom:10px; border:1px solid ${cutColor}; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="color:#fff; font-weight:600; font-size:15px;">Wire ${w.slot}: <span style="color:#f5c542;">${w.color.toUpperCase()}</span> connected to <span style="color:#f5c542;">${w.to}</span></div>
            <div style="color:#aaa; font-size:12px; margin-top:2px;">Occurrence: <strong>${w.ordName} ${colorUpper}</strong> wire across module</div>
          </div>
          <div style="font-weight:700; font-size:14px; color:${cutColor}; padding:6px 12px; border-radius:6px; background:rgba(0,0,0,0.3); border:1px solid ${cutColor};">
            ${cutBadge}
          </div>
        </div>`;
        }
      }
    }

    if (summaryList) summaryList.innerHTML = html;

    if (actionText) {
      // the answer, as bomb_boomed copies it: "Wire 1 Wire 3", or NONE
      const cuts = activeActions.filter(w => w.shouldCut).map(w => `Wire ${w.slot}`);
      const haveManual = ['red', 'blue', 'black'].some(c => Object.keys((wireState.parsedRules || {})[c] || {}).length);
      if (activeActions.length > 0 && !haveManual) {
        actionText.textContent = "⚠ Paste this game's manual picture first (box 1 above)";
        wireState.answer = '';
      } else if (activeActions.length > 0) {
        actionText.textContent = cuts.length ? `✂️ CUT: ${cuts.join(' ')}` : 'NONE TO CUT';
        wireState.answer = cuts.length ? cuts.join(' ') : 'NONE';
      } else {
        actionText.textContent = "No wires connected on this stage";
        wireState.answer = '';
      }
    }

    if (statusEl) {
      statusEl.textContent = `Stage ${wireState.activeStage} evaluated. Switch stages above to configure all 5 panels.`;
      statusEl.style.color = '#aaa';
    }
  }

  // ── IMAGE RECOGNITION FOR WIRE SEQUENCES ───────────────────────

  // One or more screenshots (read in file-name order). Each goes to the stage its pager dots show;
  // when the dots can't be read, to this stage if it's still empty, else the next empty one.
  function processWireImage(fileOrFiles) {
    const list = (Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles])
      .filter(f => f && (!f.type || f.type.startsWith('image/')))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
    if (!list.length) return;

    const status = document.getElementById('wireStatus');
    if (status) { status.textContent = 'Tracing wire sequences in image...'; status.style.color = '#aaa'; }

    const loadOne = (file) => new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
    (async () => {
      const traces = [];
      let hint = fallbackWireStage();
      for (const f of list) {
        const img = await loadOne(f);
        if (!img) continue;
        if (tryWireManual(img)) { URL.revokeObjectURL(img.src); continue; } // the manual, not a stage
        try {
          const t = analyzeWireImage(img, hint);
          traces.push(t);
          hint = Math.min(4, t.stageIdx + 1);
          URL.revokeObjectURL(img.src);
        } catch (e) {}
      }
      if (!traces.length) {
        if (status && !wireState.manualMsg.startsWith('✓')) { status.textContent = 'Could not read that image — enter the wires by hand.'; status.style.color = '#f44336'; }
        else if (status) { status.textContent = 'Manual read — now paste the stage screenshots.'; status.style.color = '#4caf50'; }
        return;
      }
      applyWireTraces(traces);
    })();
  }

  // ── MANUAL PICTURE ─────────────────────────────────────────
  function setWireManual(text, picture) {
    wireState.rulesText = text;
    wireState.parsedRules = parseWireRulesText(text);
    wireState.manual = text.trim() ? { text, at: Date.now(), picture } : null;
    if (!picture) wireState.manualCells = null;
    lsSet(MANUAL_KEY, wireState.manual);
    const ta = document.getElementById('wireRulesInput');
    if (ta && document.activeElement !== ta) ta.value = text;
    renderWireManualState();
    evaluateWireSequences();
  }

  function forgetWireManual() {
    wireState.manualMsg = '';
    setWireManual('', false);
  }

  /** A picture that is this game's manual → read it; returns false when it isn't the manual. */
  function tryWireManual(img) {
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const r = readWireManual(g.getImageData(0, 0, W, H).data, W, H);
    if (!r.cells || r.cells.length < 20) return false; // not the table
    const count = Object.values(r.rules).reduce((n, c) => n + Object.keys(c).length, 0);
    wireState.manualCells = r.cells;
    wireState.manualMsg = r.ok ? `✓ Read all ${count} cells from the picture — check them against it below`
      : `⚠ Picture not read cleanly (${r.problems.join('; ')}) — check the marked cells and fix them by hand`;
    setWireManual(wireManualText(r.rules), true);
    return true;
  }

  function renderWireManualState() {
    const el = document.getElementById('wireManualState');
    const grid = document.getElementById('wireManualGrid');
    if (!el) return;
    const m = wireState.manual;
    const rules = wireState.parsedRules || {};
    const count = ['red', 'blue', 'black'].reduce((n, c) => n + Object.keys(rules[c] || {}).length, 0);
    let html;
    if (m) {
      const mins = Math.round((Date.now() - m.at) / 60000);
      const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
      html = `<span style="color:${count === 27 ? '#00ff66' : '#ff9800'};">${count === 27 ? '✓' : '⚠'} Manual loaded: ${count}/27 rules</span>
        <span style="color:#888;">· ${m.picture ? 'read from the picture' : 'typed — check it\'s this game\'s'} · ${ago} ·</span>
        <a href="#" style="color:#f44336;" onclick="window.forgetWireManual(); return false;">forget</a>`;
    } else {
      html = `<span style="color:#ff9800; font-weight:600;">⚠ No manual yet — paste this game's manual picture (the table changes every game).</span>`;
    }
    if (wireState.manualMsg) html += `<div style="color:${wireState.manualMsg.startsWith('⚠') ? '#f44336' : '#00ff66'}; margin-top:4px;">${wireState.manualMsg}</div>`;
    el.innerHTML = html;

    // the table as read: same layout as the picture, so it can be checked at a glance
    if (grid) {
      if (!count) { grid.innerHTML = ''; return; }
      const bad = new Set((wireState.manualCells || []).filter(c => !c.sure).map(c => c.color + c.n));
      const ord = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth'];
      const head = { red: '#e53935', blue: '#1e88e5', black: '#111' };
      grid.innerHTML = `<table style="border-collapse:separate; border-spacing:3px; font-size:12px; margin:auto;">
        <tr><td></td>${['red', 'blue', 'black'].map(c => `<td style="background:${head[c]}; color:#fff; font-weight:700; text-align:center; padding:2px 14px; border-radius:5px; border:1px solid #444;">${c[0].toUpperCase() + c.slice(1)}</td>`).join('')}</tr>
        ${ord.map((o, i) => `<tr><td style="color:#ccc; padding:2px 8px; background:#1d1d33; border-radius:5px;">${o}</td>${['red', 'blue', 'black'].map(c => {
          const L = rules[c] && rules[c][i + 1];
          return `<td style="text-align:center; padding:2px 10px; border-radius:5px; background:#1d1d33; color:#f5c542; font-weight:700; ${bad.has(c + (i + 1)) ? 'outline:2px solid #f44336;' : ''}">${L ? [...L].sort().join(', ') : '<span style="color:#f44336;">?</span>'}</td>`;
        }).join('')}</tr>`).join('')}
      </table>`;
    }
  }

  function setupWireManualPicture() {
    const dz = document.getElementById('wireManualDrop');
    const fi = document.getElementById('wireManualFile');
    const readFile = (file) => {
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        if (!tryWireManual(img)) {
          wireState.manualMsg = '⚠ That is not the Wire Sequences manual picture (need the Red / Blue / Black table).';
          renderWireManualState();
        }
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => { wireState.manualMsg = '⚠ Could not open that file as an image.'; renderWireManualState(); };
      img.src = URL.createObjectURL(file);
    };
    if (fi) fi.addEventListener('change', () => { readFile(fi.files && fi.files[0]); fi.value = ''; });
    if (dz) {
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.style.borderColor = '#f5c542'; });
      dz.addEventListener('dragleave', () => { dz.style.borderColor = '#3a3a5e'; });
      dz.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation(); dz.style.borderColor = '#3a3a5e';
        if (window.BombDragDrop) window.BombDragDrop.handleDataTransfer(e.dataTransfer, (f) => readFile(f));
        else readFile([...(e.dataTransfer?.files || [])].find(x => x.type.startsWith('image/')));
      });
    }
  }

  function fallbackWireStage() {
    const isEmpty = (st) => st.every(w => w.color === 'none' && w.to === 'none');
    const a = wireState.activeStage - 1;
    if (isEmpty(wireState.stages[a])) return a;
    for (let i = a + 1; i < 5; i++) if (isEmpty(wireState.stages[i])) return i;
    return Math.min(4, a + 1);
  }

  function renderWireCanvas(img) {
    const canvas = document.getElementById('wireCanvas');
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

  function analyzeWireImage(img, stageHint) {
    const sc = img.naturalWidth > 800 ? 800 / img.naturalWidth : 1;
    const W = Math.max(1, Math.round(img.naturalWidth * sc)), H = Math.max(1, Math.round(img.naturalHeight * sc));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    const res = wsReadImage(g.getImageData(0, 0, W, H));
    const fromDots = res.stageNo >= 1 && res.stageNo <= 5; // ignore a misread dot count
    const stageIdx = Math.max(0, Math.min(4, fromDots ? res.stageNo - 1 : stageHint));
    return { img, stageIdx, fromDots, wires: res.wires };
  }

  function applyWireTraces(traces) {
    traces.forEach(t => {
      wireState.stages[t.stageIdx] = t.wires.map(w => ({ color: w.c || 'none', to: w.d || 'none' }));
    });
    const last = traces[traces.length - 1];
    renderWireCanvas(last.img);
    setWireActiveStage(last.stageIdx + 1); // show the stage just read: its answer is what's needed now

    const found = last.wires.filter(w => w.c).length;
    const desc = last.wires.map((w, i) => `${i + 1} ${w.c ? w.c[0].toUpperCase() + w.c.slice(1) + '→' + w.d : '—'}`).join(', ');
    const status = document.getElementById('wireStatus');
    if (status) {
      status.textContent = traces.length > 1
        ? `Read ${traces.length} screenshots (stages ${traces.map(t => t.stageIdx + 1).join(', ')}). Check each stage above.`
        : `Stage ${last.stageIdx + 1}${last.fromDots ? '' : ' (stage dots not read — used the next empty stage)'}: ${desc}`;
      status.style.color = found > 0 ? '#4caf50' : '#f44336';
    }
  }

  window.initWiresModule = initWiresModule;
  window.forgetWireManual = forgetWireManual;
})();
