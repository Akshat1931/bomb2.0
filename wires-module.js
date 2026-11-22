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

  // ── Wire Sequences manual picture reader (new; also goes into bomb_boomed) ──
  const { readWireManual, wireManualText } = (function () {
    // Wire Sequences manual picture: a 3-column table (Red / Blue / Black header buttons) of 9 rows
    // (First … Ninth); each cell lists the sockets to cut for that occurrence ("A, B, C" in yellow).
    // Letters are told apart by their enclosed holes (A 1, B 2, C 0) — no font needed.

    const PAGE = [31, 34, 40];
    const d2 = (data, i, c) => (data[i] - c[0]) ** 2 + (data[i + 1] - c[1]) ** 2 + (data[i + 2] - c[2]) ** 2;
    const isYellow = (r, g, b) => r > 150 && g > 110 && b < 110 && r - b > 90 && g - b > 60;

    function components(mask, w, h) {
      const lab = new Int32Array(w * h), comps = [];
      for (let s = 0; s < w * h; s++) {
        if (!mask[s] || lab[s]) continue;
        const id = comps.length + 1, st = [s];
        lab[s] = id;
        let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
        while (st.length) {
          const p = st.pop(), px = p % w, py = (p / w) | 0;
          n++;
          if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
          for (const q of [p - 1, p + 1, p - w, p + w]) {
            if (q < 0 || q >= w * h) continue;
            if ((q === p - 1 && px === 0) || (q === p + 1 && px === w - 1)) continue;
            if (mask[q] && !lab[q]) { lab[q] = id; st.push(q); }
          }
        }
        comps.push({ id, x0, y0, x1, y1, n, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0 + 1, h: y1 - y0 + 1 });
      }
      return { lab, comps };
    }

    /** Holes in one glyph: background pockets (4-connected) inside its box that don't reach the edge. */
    function holes(lab, id, W, g) {
      const w = g.w + 2, h = g.h + 2, bg = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const X = g.x0 + x - 1, Y = g.y0 + y - 1;
        const inside = x > 0 && y > 0 && x < w - 1 && y < h - 1;
        bg[y * w + x] = inside && lab[Y * W + X] === id ? 0 : 1;
      }
      const { comps } = components(bg, w, h);
      // the outer background touches the padding ring; real holes are a few pixels at least
      return comps.filter(c => c.x0 > 0 && c.y0 > 0 && c.x1 < w - 1 && c.y1 < h - 1 && c.n >= 2).length;
    }

    /**
     * A, B or C. Holes first (A 1, B 2, C 0); a small picture can close a hole, so the outline decides
     * too: A is pointed at the top (narrow top rows), B has a straight full-height left edge.
     */
    function letterOf(lab, g, W) {
      const at = (x, y) => lab[(g.y0 + y) * W + g.x0 + x] === g.id;
      const rowWidth = (y) => { let a = -1, b = -1; for (let x = 0; x < g.w; x++) if (at(x, y)) { if (a < 0) a = x; b = x; } return a < 0 ? 0 : b - a + 1; };
      const band = (y0, y1) => { let s = 0, n = 0; for (let y = y0; y <= y1; y++) { s += rowWidth(y); n++; } return s / (n || 1); };
      const q = Math.max(1, Math.round(g.h * 0.2));
      const pointed = band(0, q - 1) < 0.6 * band(g.h - q, g.h - 1);
      let leftRows = 0;
      const lw = Math.max(1, Math.round(g.w * 0.2));
      for (let y = 0; y < g.h; y++) { for (let x = 0; x < lw; x++) if (at(x, y)) { leftRows++; break; } }
      const straightLeft = leftRows >= g.h * 0.85;
      const h = holes(lab, g.id, W, g);
      if (h >= 2) return 'B';
      if (h === 1) return pointed || !straightLeft ? 'A' : 'B';
      return pointed ? 'A' : 'C';
    }

    /**
     * → { ok, rules: { red: { 1: ['C'], … }, blue, black }, problems: [], cells: [{ color, n, letters, box, sure }] }
     */
    function readWireManual(data, W, H) {
      const problems = [];
      // 1. boxes: everything that isn't page background, as 4-connected blobs
      const ink = new Uint8Array(W * H);
      for (let p = 0; p < W * H; p++) ink[p] = d2(data, p * 4, PAGE) > 120 ? 1 : 0;
      const { comps } = components(ink, W, H);
      const big = comps.filter(c => c.w >= W * 0.08 && c.h >= H * 0.04 && c.n >= c.w * c.h * 0.6);
      if (big.length < 30) return { ok: false, problems: ['not the Wire Sequences manual (table cells not found)'] };

      // mean colour of a box's middle band, to find the coloured headers
      const mean = (b) => {
        const s = [0, 0, 0]; let n = 0;
        for (let y = Math.round(b.y0 + b.h * 0.15); y <= b.y1 - b.h * 0.15; y++) for (let x = b.x0 + 3; x <= b.x1 - 3; x++) {
          const i = (y * W + x) * 4; s[0] += data[i]; s[1] += data[i + 1]; s[2] += data[i + 2]; n++;
        }
        return s.map(v => v / (n || 1));
      };
      big.forEach(b => { b.rgb = mean(b); });
      const pick = (test) => big.filter(b => test(...b.rgb)).sort((a, b) => b.n - a.n)[0];
      const red = pick((r, g, b) => r > 150 && r - g > 80 && r - b > 80);
      const blue = pick((r, g, b) => b > 150 && b - r > 80);
      // black header: dark button (with a light border) on the same row as the other two
      const top = red || blue;
      const black = top && big.filter(b => b !== red && b !== blue && Math.abs(b.cy - top.cy) < top.h * 0.5)
        .filter(b => Math.max(...b.rgb) < 110).sort((a, b) => b.cx - a.cx)[0];
      if (!red || !blue || !black) return { ok: false, problems: ['Red / Blue / Black headers not found'] };
      const cols = [['red', red], ['blue', blue], ['black', black]];

      // 2. cells: boxes under each header (same column), top to bottom = First … Ninth
      const lineY = Math.max(red.y1, blue.y1, black.y1);
      const rules = { red: {}, blue: {}, black: {} }, cells = [];
      const ylab = new Uint8Array(W * H);
      for (let p = 0; p < W * H; p++) ylab[p] = isYellow(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]) ? 1 : 0;
      const { lab, comps: glyphs } = components(ylab, W, H);

      for (const [color, head] of cols) {
        const col = big.filter(b => b.y0 > lineY && Math.abs(b.cx - head.cx) < head.w * 0.4).sort((a, b) => a.y0 - b.y0);
        if (col.length !== 9) problems.push(`${color}: ${col.length} cells (need 9)`);
        col.slice(0, 9).forEach((cell, k) => {
          const inCell = glyphs.filter(g => g.x0 >= cell.x0 && g.x1 <= cell.x1 && g.y0 >= cell.y0 && g.y1 <= cell.y1);
          const tall = Math.max(0, ...inCell.map(g => g.h));
          // letters are full height; commas are small
          const letters = inCell.filter(g => g.h >= tall * 0.7).sort((a, b) => a.x0 - b.x0);
          let read = letters.map(g => letterOf(lab, g, W));
          let sure = true;
          // the manual lists sockets in order, so three letters can only be A, B, C
          if (letters.length === 3) { if (read.join('') !== 'ABC') sure = false; read = ['A', 'B', 'C']; }
          else if (!letters.length || letters.length > 3) { sure = false; problems.push(`${color} ${k + 1}: ${letters.length} letters`); }
          else if (new Set(read).size !== read.length || read.join('') !== [...read].sort().join('')) {
            sure = false; problems.push(`${color} ${k + 1}: read ${read.join(', ')}`);
          }
          rules[color][k + 1] = [...new Set(read)].sort();
          cells.push({ color, n: k + 1, letters: rules[color][k + 1], box: { x0: cell.x0, y0: cell.y0, x1: cell.x1, y1: cell.y1 }, sure });
        });
      }
      return { ok: !problems.length, rules, problems, cells };
    }

    const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];
    /** The rules as the manual text the solver reads ("first red occurrence: cut if connected to A or C."). */
    function wireManualText(rules, stamp = '') {
      const lines = [];
      for (const color of ['red', 'blue', 'black']) {
        lines.push(color[0].toUpperCase() + color.slice(1));
        for (let n = 1; n <= 9; n++) {
          const L = (rules[color] && rules[color][n]) || [];
          if (!L.length) continue;
          const list = L.length === 1 ? L[0] : L.length === 2 ? `${L[0]} or ${L[1]}` : `${L.slice(0, -1).join(', ')} or ${L[L.length - 1]}`;
          lines.push(`* ${ORD[n - 1]} ${color} occurrence: cut if connected to ${list}.`);
        }
        lines.push('');
      }
      return (stamp ? stamp + '\n' : '') + lines.join('\n').trim();
    }
    return { readWireManual, wireManualText };
  })();

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
