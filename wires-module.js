/**
 * Wire Sequences Module Solver
 * Supports 5 sequential panels, cumulative occurrence tracking across stages,
 * image recognition, manual input controls, and dynamic guidebook rule parsing.
 */

(function () {
  // Universal table from the image manual (22 Nov 2026), written out in the text format below
  const DEFAULT_WIRE_RULES = `Red
first red occurrence: cut if connected to A, B or C.
second red occurrence: cut if connected to A.
third red occurrence: cut if connected to B.
fourth red occurrence: cut if connected to C.
fifth red occurrence: cut if connected to A, B or C.
sixth red occurrence: cut if connected to B or C.
seventh red occurrence: cut if connected to B or C.
eighth red occurrence: cut if connected to A or B.
ninth red occurrence: cut if connected to C.

Blue
first blue occurrence: cut if connected to A.
second blue occurrence: cut if connected to A or C.
third blue occurrence: cut if connected to A or B.
fourth blue occurrence: cut if connected to B.
fifth blue occurrence: cut if connected to C.
sixth blue occurrence: cut if connected to A or C.
seventh blue occurrence: cut if connected to B.
eighth blue occurrence: cut if connected to A or B.
ninth blue occurrence: cut if connected to A or B.

Black
first black occurrence: cut if connected to A or B.
second black occurrence: cut if connected to B.
third black occurrence: cut if connected to A.
fourth black occurrence: cut if connected to B.
fifth black occurrence: cut if connected to A or B.
sixth black occurrence: cut if connected to A, B or C.
seventh black occurrence: cut if connected to A, B or C.
eighth black occurrence: cut if connected to A or C.
ninth black occurrence: cut if connected to C.`;

  const wireState = {
    initialized: false,
    activeStage: 1, // 1 to 5
    rulesText: DEFAULT_WIRE_RULES,
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
        wireState.rulesText = rulesArea.value;
        wireState.parsedRules = parseWireRulesText(wireState.rulesText);
        evaluateWireSequences();
      });
    }
    if (resetRulesBtn) {
      resetRulesBtn.addEventListener('click', () => {
        wireState.rulesText = DEFAULT_WIRE_RULES;
        if (rulesArea) rulesArea.value = DEFAULT_WIRE_RULES;
        wireState.parsedRules = parseWireRulesText(DEFAULT_WIRE_RULES);
        evaluateWireSequences();
      });
    }

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

  // ── bomb_boomed/src/modules/wireseq/wireseqRules.js ─────────
  const WS_ORD = {first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9};

  function wsParseManual(text) {
    const out = {};
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim().replace(/^[*\u2022\-]+/, '').trim().toLowerCase();
      const m = line.match(/^(\w+)\s+(red|blue|black)\s+occurrence:.*connected to\s+(.+?)\.?$/);
      if (!m || !(m[1] in WS_ORD)) continue;
      const letters = new Set((m[3].match(/\b[abc]\b/g) || []).map(s => s.toUpperCase()));
      (out[m[2]] = out[m[2]] || {})[WS_ORD[m[1]]] = letters;
    }
    return out;
  }

  /**
   * Solve every stage in order. Occurrence counts carry across stages, so fixing an
   * earlier stage automatically re-flows all later ones.
   */
  function wsSolveAll(stages, rules) {
    const counts = { red: 0, blue: 0, black: 0 };
    return stages.map(stage => stage.map((w, i) => {
      if (!w.c || !w.d) return { i, state: 'empty' };
      counts[w.c]++;
      const n = counts[w.c];
      const rule = rules[w.c] && rules[w.c][n];
      if (!rule) return { i, w, n, state: 'norule' };
      return { i, w, n, state: rule.has(w.d) ? 'cut' : 'skip' };
    }));
  }

  /**
   * Screenshot reader: follows each possible wire curve from slots 1-3 to A-C and picks
   * the colour/destination with the best coverage; reads the stage from the pager dots.
   * img = ImageData-like {data,width,height}. Ported from the original app.
   */
  function wsReadImage(img) {
    const { data: d, width: W, height: H } = img;
    const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const lum = [];
    for (let y = Math.floor(H * 0.35); y <= Math.floor(H * 0.65); y += 3) {
      for (let x = Math.floor(W * 0.35); x <= Math.floor(W * 0.65); x += 3) {
        const [r, g, b] = px(x, y), av = (r + g + b) / 3, ch = Math.max(r, g, b) - Math.min(r, g, b);
        if (av >= 15 && av <= 75 && ch < 20) lum.push(av);
      }
    }
    lum.sort((a, b) => a - b);
    const darkMed = lum.length ? lum[Math.floor(lum.length / 2)] : 40;
    const kind = (r, g, b) => {
      const av = (r + g + b) / 3, ch = Math.max(r, g, b) - Math.min(r, g, b);
      if (r > 105 && r - g > 25 && r - b > 25) return 'red';
      if (b > 85 && b - r > 18 && b - g > 10) return 'blue';
      if (av < darkMed - 6 && av < 50 && ch < 22) return 'black';
      return null;
    };
    const LX = 0.234 * W, RX = 0.764 * W;
    const Y = [0.3136, 0.507, 0.702].map(f => f * H);
    const tol = Math.max(2, Math.round(W / 160));
    const bez = t => t * t * (3 - 2 * t);
    const stage = [];
    for (let p = 0; p < 3; p++) {
      const best = { c: null, d: null, f: 0 };
      for (let dst = 0; dst < 3; dst++) {
        const hit = { red: 0, blue: 0, black: 0 };
        const N = 60; let tot = 0;
        for (let k = 4; k <= N - 4; k++) {
          const t = k / N, x = LX + (RX - LX) * t, y = Y[p] + (Y[dst] - Y[p]) * bez(t);
          tot++;
          const seen = {};
          for (let dy = -tol; dy <= tol; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = Math.round(x + dx), YY = Math.round(y + dy);
            if (X < 0 || X >= W || YY < 0 || YY >= H) continue;
            const kd = kind(...px(X, YY)); if (kd) seen[kd] = 1;
          }
          for (const kd in seen) hit[kd]++;
        }
        for (const kd of ['red', 'blue', 'black']) {
          const f = hit[kd] / tot;
          if (f > best.f) Object.assign(best, { c: kd, d: 'ABC'[dst], f });
        }
      }
      stage.push(best.f >= 0.55 ? { c: best.c, d: best.d } : { c: null, d: null });
    }
    // Stage number from the 5 pager dots (the lit one is orange). Orange pixels are binned to the
    // nearest dot position instead of averaged: one global centroid mixed stray wire / reflection
    // pixels with the dot and pulled stage 1 towards stage 3 (fix from the standalone wireseq.html).
    const dotXs = [0.40, 0.45, 0.50, 0.55, 0.60];
    const bins = [0, 0, 0, 0, 0];
    for (let y = Math.floor(H * 0.77); y <= Math.floor(H * 0.88); y++) {
      for (let x = Math.floor(W * 0.33); x <= Math.floor(W * 0.67); x++) {
        const [r, g, b] = px(x, y);
        if (r > 200 && g > 140 && g < 215 && b < 150 && r - b > 70) {
          const xf = x / W;
          let bd = Infinity, bi = -1;
          for (let s = 0; s < 5; s++) { const dd = Math.abs(xf - dotXs[s]); if (dd < 0.024 && dd < bd) { bd = dd; bi = s; } }
          if (bi >= 0) bins[bi]++;
        }
      }
    }
    let stageNo = null, maxCount = 0;
    bins.forEach((n, s) => { if (n > maxCount) { maxCount = n; stageNo = s + 1; } });
    if (maxCount < 6) stageNo = null;
    return { wires: stage, stageNo };
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
      if (activeActions.length > 0) {
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
        try {
          const t = analyzeWireImage(img, hint);
          traces.push(t);
          hint = Math.min(4, t.stageIdx + 1);
          URL.revokeObjectURL(img.src);
        } catch (e) {}
      }
      if (!traces.length) {
        if (status) { status.textContent = 'Could not read that image — enter the wires by hand.'; status.style.color = '#f44336'; }
        return;
      }
      applyWireTraces(traces);
    })();
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
})();
