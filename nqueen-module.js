/**
 * nqueen-module.js — N-Queens / LinkedIn Queens & Star Battle Solver
 * Comprehensive logic puzzle engine with screenshot OCR and step-by-step hint deduction.
 */
(function () {
  "use strict";

  window.initNQueenModule = function () {
    if (window.__nqueenInitialized) return;
    window.__nqueenInitialized = true;

    const APP_VERSION = 'v1.0';

    const board = document.getElementById('nqBoard');
    if (!board) return;

    const sizeSel = document.getElementById('nqSize');
    const paletteEl = document.getElementById('nqPalette');
    const statusEl = document.getElementById('nqStatus');
    const hintEl = document.getElementById('nqHint');

    // ── Palette Definition ──────────────────────────────────────────
    const PALETTE = [
      { name: 'Sky', hex: '#a9c7e0' },
      { name: 'Rose', hex: '#c46d8e' },
      { name: 'Green', hex: '#3f8a4f' },
      { name: 'Lime', hex: '#a6cf86' },
      { name: 'Orange', hex: '#e6a05a' },
      { name: 'Gold', hex: '#cdab2f' },
      { name: 'Brown', hex: '#9c6b4a' },
      { name: 'Teal', hex: '#4f9aa8' },
      { name: 'Purple', hex: '#8163c9' },
      { name: 'Pink', hex: '#e0a0dd' },
      { name: 'Plum', hex: '#7a4b6b' },
      { name: 'Slate', hex: '#7d8aa0' }
    ];

    function colorName(hex) {
      const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
      if (!m) return hex;
      const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
      if (d < 0.08) return l > 0.8 ? 'White' : l < 0.2 ? 'Black' : 'Gray';
      let h;
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;

      const bands = [
        [16, 'Red'], [42, 'Orange'], [66, 'Yellow'], [100, 'Lime'], [160, 'Green'],
        [200, 'Teal'], [243, 'Blue'], [292, 'Purple'], [345, 'Pink'], [360, 'Red']
      ];
      let base = bands.find(x => h <= x[0])[1];
      const sat = d / (1 - Math.abs(2 * l - 1));
      if (base === 'Orange' && (l < 0.42 || (sat < 0.55 && l < 0.62))) base = 'Brown';
      if (base === 'Red' && l < 0.35) base = 'Maroon';
      return base;
    }

    function assignNames(hexes) {
      const lightOf = h => {
        const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h); if (!m) return 0;
        const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
        return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
      };
      const by = {};
      hexes.forEach(h => {
        const n = (PALETTE.find(p => p.hex === h) || {}).name || colorName(h);
        (by[n] = by[n] || []).push(h);
      });
      const out = new Map();
      Object.keys(by).forEach(n => {
        const g = by[n];
        if (g.length === 1) { out.set(g[0], n); return; }
        g.sort((a, b) => lightOf(b) - lightOf(a));
        const q = g.length === 2 ? ['Light', 'Dark']
          : g.length === 3 ? ['Light', '', 'Dark']
            : g.map((_, i) => i === 0 ? 'Light' : i === g.length - 1 ? 'Dark' : 'Shade ' + i);
        g.forEach((h, i) => out.set(h, q[i] ? q[i] + ' ' + n : n));
      });
      return out;
    }

    let paletteColors = PALETTE.slice();
    let fastImportMode = false;

    let N = 10;
    let starsPer = 1; // 1 = 1 Queen per unit (classic), 2 = 2 Queens per unit (2-star battle)

    const PIECE_GLYPH = { queen: '👑', cat: '🐱', duck: '🦆' };
    const PIECE_WORD = { queen: 'queen', cat: 'cat', duck: 'duck' };
    let pieceIcon = 'queen';

    function pieceText(t) {
      if (!t) return t;
      const w = PIECE_WORD[pieceIcon] || 'queen';
      const W = w[0].toUpperCase() + w.slice(1);
      return t.replace(/\bcats\b/g, w + 's')
        .replace(/\bcat\b/g, w)
        .replace(/\bCats\b/g, W + 's')
        .replace(/\bCat\b/g, W)
        .replace(/🐱/g, PIECE_GLYPH[pieceIcon]);
    }

    function refreshPieceText() {
      document.querySelectorAll('#nqueenSection [data-piecetext]').forEach(el => {
        if (!el.dataset.orig) el.dataset.orig = el.innerHTML;
        el.innerHTML = pieceText(el.dataset.orig);
      });
    }

    let regionOf = [];
    let mark = [];
    let _nameKey = '', _nameMap = new Map();

    function boardNames() {
      const seen = new Set();
      for (let r = 0; r < regionOf.length; r++) {
        for (let c = 0; c < regionOf[r].length; c++) {
          const g = regionOf[r][c]; if (g != null) seen.add(g);
        }
      }
      const hexes = [...seen].sort(), key = hexes.join(',');
      if (key !== _nameKey) { _nameKey = key; _nameMap = assignNames(hexes); }
      return _nameMap;
    }

    const nameOf = h => boardNames().get(h) || (PALETTE.find(p => p.hex === h) || {}).name || colorName(h);
    let tool = 'x';
    let activeColor = PALETTE[0].hex;
    let solutionCells = null;
    let hintCells = { hyp: null, steps: [], doom: [], ring: [], pinch: [], xprev: [] };
    let importReview = [];
    let undoStack = [];
    let editMode = false;
    let tempMark = [];

    function blank() {
      regionOf = Array.from({ length: N }, () => Array(N).fill(null));
      mark = Array.from({ length: N }, () => Array(N).fill(null));
      tempMark = Array.from({ length: N }, () => Array(N).fill(null));
      solutionCells = null;
      clearHintHighlight();
    }

    // ── Rendering ───────────────────────────────────────────────────
    function render() {
      board.style.gridTemplateColumns = `repeat(${N}, minmax(0, 1fr))`;
      board.innerHTML = '';
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const d = document.createElement('div');
          d.className = 'nq-cell';
          d.dataset.r = r;
          d.dataset.c = c;
          const col = regionOf[r][c];
          d.style.background = col || '#16162a';

          const g = document.createElement('span');
          g.className = 'nq-glyph';
          d.appendChild(g);

          if (mark[r][c] === 'x') d.classList.add('x');
          if (mark[r][c] === 'cat') {
            d.classList.add('cat');
            d.style.setProperty('--d', ((r + c) * 45) + 'ms');
          }
          if (!mark[r][c] && tempMark[r] && tempMark[r][c]) {
            d.classList.add(tempMark[r][c] === 'x' ? 'tx' : 'tcat');
          }
          if (solutionCells && solutionCells.some(([sr, sc]) => sr === r && sc === c)) {
            d.classList.add('sol');
          }
          if (hintCells.hyp && hintCells.hyp[0] === r && hintCells.hyp[1] === c) d.classList.add('hyp');
          if (hintCells.steps.some(([sr, sc]) => sr === r && sc === c)) d.classList.add('step');
          if (hintCells.doom.some(([sr, sc]) => sr === r && sc === c)) d.classList.add('doom');
          if (hintCells.ring.some(([sr, sc]) => sr === r && sc === c)) d.classList.add('ring');
          if (hintCells.pinch.some(([sr, sc]) => sr === r && sc === c)) d.classList.add('pinch');
          if (hintCells.xprev.some(([sr, sc]) => sr === r && sc === c)) d.classList.add('xprev');
          if (importReview.some(([sr, sc]) => sr === r && sc === c)) d.classList.add('review');
          board.appendChild(d);
        }
      }

      if (editMode) {
        const k = tempList().length, el = document.getElementById('nqEditCount');
        if (el) el.textContent = k ? k + ' temporary mark' + (k > 1 ? 's' : '') : 'no marks yet';
      }
      refreshSolvedUI();
    }

    // ── Solution validation & caching ───────────────────────────────
    let pureCache = { sig: null, sols: null };
    function pureSolutions() {
      const sig = N + '|' + starsPer + '|' + regionOf.map(row => row.join('\u0000')).join('\n');
      if (pureCache.sig !== sig) pureCache = { sig, sols: solvePure(2) };
      return pureCache.sols;
    }

    function catIsWrong(r, c) {
      if (regionOf[r][c] == null || unpainted() || regionCount() !== N) return false;
      const sols = pureSolutions();
      return sols.length === 1 && !sols[0].some(([sr, sc]) => sr === r && sc === c);
    }

    function cellFlash(r, c, cls, ms) {
      requestAnimationFrame(() => {
        const el = board.querySelector('.nq-cell[data-r="' + r + '"][data-c="' + c + '"]');
        if (!el) return;
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), ms);
      });
    }

    const rejectFlash = (r, c) => cellFlash(r, c, 'reject', 700);
    const landFlash = (r, c, placed) => cellFlash(r, c, placed ? 'land' : 'lift', 560);

    function isComplete() {
      const SP = starsPer, cats = [];
      if (unpainted() || regionCount() !== N) return false;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (mark[r][c] === 'cat') cats.push([r, c]);
      if (cats.length !== N * SP) return false;
      const rowC = Array(N).fill(0), colC = Array(N).fill(0), regC = new Map();
      for (const [r, c] of cats) {
        rowC[r]++; colC[c]++; const g = regionOf[r][c]; regC.set(g, (regC.get(g) || 0) + 1);
      }
      if (rowC.some(v => v !== SP) || colC.some(v => v !== SP)) return false;
      if (regC.size !== N) return false;
      for (const v of regC.values()) if (v !== SP) return false;
      for (let i = 0; i < cats.length; i++) {
        for (let j = i + 1; j < cats.length; j++) {
          if (Math.abs(cats[i][0] - cats[j][0]) <= 1 && Math.abs(cats[i][1] - cats[j][1]) <= 1) return false;
        }
      }
      return true;
    }

    const SOLVED_MSG = '🎉 Solved — every queen is placed, and every one of them is right. Perfect!';
    let wasComplete = false, celebrateTimer = null;
    function refreshSolvedUI() {
      const done = isComplete();
      board.classList.toggle('solved', done);
      const hb = document.getElementById('nqHintBtn'); if (hb) hb.disabled = done;
      if (done !== wasComplete) {
        wasComplete = done;
        if (done) {
          board.classList.add('celebrate');
          clearTimeout(celebrateTimer);
          celebrateTimer = setTimeout(() => board.classList.remove('celebrate'), 1200);
        } else {
          board.classList.remove('celebrate');
          if (statusEl.textContent === pieceText(SOLVED_MSG)) hideStatus();
        }
      }
      if (done) showStatus('ok', SOLVED_MSG);
      updateCoordsCard();
    }

    // ── Queen Coordinates Formatting & Copy ─────────────────────────
    let coordFormat = 'colLetter'; // 'colLetter' = H1 E2 G3 (Col Letter + Row Num); 'rowLetter' = A5 B8 C6 (Row Letter + Col Num)

    function formatCoords(cellsList) {
      if (!cellsList || !cellsList.length) return '';
      if (coordFormat === 'colLetter') {
        // Sorted by row: Col Letter + Row Number (e.g. H1 E2 G3...)
        const sorted = cellsList.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        return sorted.map(([r, c]) => `${String.fromCharCode(65 + c)}${r + 1}`).join(' ');
      } else {
        // Sorted by row: Row Letter + Col Number (e.g. A5 B8 C6...)
        const sorted = cellsList.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        return sorted.map(([r, c]) => `${String.fromCharCode(65 + r)}${c + 1}`).join(' ');
      }
    }

    function getActiveQueens() {
      if (solutionCells && solutionCells.length) return solutionCells;
      const cats = [];
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (mark[r][c] === 'cat') cats.push([r, c]);
        }
      }
      if (cats.length === N * starsPer) return cats;
      if (!unpainted() && regionCount() === N) {
        const pure = pureSolutions();
        if (pure && pure.length === 1) return pure[0];
      }
      return cats.length ? cats : null;
    }

    function updateCoordsCard() {
      const card = document.getElementById('nqCoordsCard');
      const textEl = document.getElementById('nqCoordsText');
      const subEl = document.getElementById('nqCoordsSubtext');
      const togBtn = document.getElementById('nqToggleCoordFormat');
      if (!card || !textEl) return;

      const queens = getActiveQueens();
      if (queens && queens.length) {
        textEl.textContent = formatCoords(queens);
        if (subEl) {
          subEl.textContent = coordFormat === 'colLetter'
            ? 'Format: Col Letter + Row Number (e.g. H1 = Column H, Row 1)'
            : 'Format: Row Letter + Col Number (e.g. A8 = Row A, Column 8)';
        }
        if (togBtn) {
          togBtn.textContent = coordFormat === 'colLetter'
            ? 'Switch format (Row Letter A-H)'
            : 'Switch format (Col Letter A-H)';
        }
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    }

    const copyCoordsBtn = document.getElementById('nqCopyCoordsBtn');
    const coordsTextEl = document.getElementById('nqCoordsText');
    const togCoordBtn = document.getElementById('nqToggleCoordFormat');

    function doCopyCoords() {
      if (!coordsTextEl || !coordsTextEl.textContent.trim()) return;
      const val = coordsTextEl.textContent.trim();
      const onCopied = () => {
        if (copyCoordsBtn) {
          const old = copyCoordsBtn.textContent;
          copyCoordsBtn.textContent = '✓ Copied!';
          setTimeout(() => { copyCoordsBtn.textContent = old; }, 1500);
        }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(onCopied).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = val;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          onCopied();
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = val;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        onCopied();
      }
    }

    if (copyCoordsBtn) copyCoordsBtn.onclick = doCopyCoords;
    if (coordsTextEl) coordsTextEl.onclick = doCopyCoords;
    if (togCoordBtn) {
      togCoordBtn.onclick = () => {
        coordFormat = (coordFormat === 'colLetter') ? 'rowLetter' : 'colLetter';
        updateCoordsCard();
      };
    }

    // ── Gesture & Editing ───────────────────────────────────────────
    function applyPick(r, c) {
      if (regionOf[r][c]) {
        activeColor = regionOf[r][c];
        setTool('paint');
        buildPalette();
      }
    }

    function applyOp(r, c) {
      if (dragOp === 'addtx') {
        if (!mark[r][c] && tempMark[r][c] !== 'cat') {
          tempMark[r][c] = 'x';
          solutionCells = null;
        }
        return;
      }
      if (dragOp === 'deltx') {
        if (tempMark[r][c] === 'x') tempMark[r][c] = null;
        return;
      }
      solutionCells = null;
      importReview = importReview.filter(([rr, cc]) => !(rr === r && cc === c));
      if (dragOp === 'paint') { regionOf[r][c] = activeColor; }
      else if (dragOp === 'erase') { regionOf[r][c] = null; mark[r][c] = null; }
      else if (dragOp === 'addx') { if (mark[r][c] !== 'cat') mark[r][c] = 'x'; }
      else if (dragOp === 'delx') { if (mark[r][c] === 'x') mark[r][c] = null; }
    }

    let down = false, painted = new Set(), dragOp = null;
    function startGesture(r, c) {
      if (tool === 'pick') { dragOp = null; applyPick(r,c); return; }
      if (editMode) {
        clearHintHighlight(); editFeedback(null);
        dragOp = (tempMark[r][c] === 'x') ? 'deltx' : 'addtx';
        applyOp(r, c); return;
      }
      pushUndo();
      if (tool === 'paint') dragOp = 'paint';
      else if (tool === 'erase') dragOp = 'erase';
      else if (tool === 'x') dragOp = (mark[r][c] === 'x') ? 'delx' : 'addx';
      applyOp(r, c);
    }

    function toggleCat(r, c, was) {
      if (editMode) {
        clearHintHighlight(); editFeedback(null);
        if (!mark[r][c]) {
          tempMark[r][c] = was === 'cat' ? null : 'cat'; solutionCells = null;
          landFlash(r, c, tempMark[r][c] === 'cat');
        }
        return;
      }
      solutionCells = null;
      importReview = importReview.filter(([rr, cc]) => !(rr === r && cc === c));
      if (was !== 'cat' && catIsWrong(r, c)) {
        mark[r][c] = 'x';
        rejectFlash(r, c);
        showStatus('warn', `R${r + 1}C${c + 1} can’t hold a queen — marked ✕ instead. Use ✏️ Test mode to test freely.`);
        return;
      }
      mark[r][c] = was === 'cat' ? null : 'cat';
      landFlash(r, c, mark[r][c] === 'cat');
    }

    const DBL_TAP_MS = 350;
    let lastTap = { t: 0, r: -1, c: -1, was: null };
    function tryDoubleTap(r, c) {
      const now = Date.now();
      const hit = tool === 'x' && now - lastTap.t < DBL_TAP_MS && lastTap.r === r && lastTap.c === c;
      if (!hit) { lastTap = { t: now, r, c, was: editMode ? tempMark[r][c] : mark[r][c] }; return false; }
      const was = lastTap.was;
      lastTap = { t: 0, r: -1, c: -1, was: null };
      toggleCat(r, c, was);
      return true;
    }

    const HOLD_MS = 400, HOLD_SLOP = 10;
    let holdTimer = null, holdFrom = null;
    function cancelHold() { clearTimeout(holdTimer); holdTimer = null; holdFrom = null; }
    function armHold(r, c, was, x, y) {
      cancelHold();
      if (tool !== 'x') return;
      holdFrom = { x, y };
      holdTimer = setTimeout(() => {
        holdTimer = null; holdFrom = null;
        down = false; dragOp = null;
        lastTap = { t: 0, r: -1, c: -1, was: null };
        toggleCat(r, c, was);
        render();
      }, HOLD_MS);
    }

    board.addEventListener('pointerdown', e => {
      const cell = e.target.closest('.nq-cell'); if (!cell) return;
      const r = +cell.dataset.r, c = +cell.dataset.c;
      cancelHold();
      if (tryDoubleTap(r, c)) { render(); return; }
      const was = lastTap.was;
      down = true; painted.clear();
      startGesture(r, c); painted.add(r + ',' + c); render();
      armHold(r, c, was, e.clientX, e.clientY);
      board.setPointerCapture(e.pointerId);
    });

    board.addEventListener('pointermove', e => {
      if (!down || dragOp === null) return;
      if (holdFrom && (Math.abs(e.clientX - holdFrom.x) > HOLD_SLOP || Math.abs(e.clientY - holdFrom.y) > HOLD_SLOP))
        cancelHold();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el && el.closest && el.closest('.nq-cell'); if (!cell) return;
      const r = +cell.dataset.r, c = +cell.dataset.c, k = r + ',' + c;
      if (painted.has(k)) return; painted.add(k);
      lastTap.t = 0;
      applyOp(r, c); render();
    });

    window.addEventListener('pointerup', () => {
      cancelHold();
      const op = dragOp; down = false; dragOp = null;
      if (op === 'paint' || op === 'erase') refreshAssessment();
    });
    window.addEventListener('pointercancel', () => { cancelHold(); down = false; dragOp = null; });

    // ── Tool & Palette UI ───────────────────────────────────────────
    function setTool(name) {
      tool = name;
      document.querySelectorAll('#nqTools button').forEach(x => x.classList.toggle('on', x.dataset.tool === name));
      const pWrap = document.getElementById('nqPaletteWrap');
      if (pWrap) pWrap.classList.toggle('hidden', name !== 'paint');
    }

    const toolsContainer = document.getElementById('nqTools');
    if (toolsContainer) {
      toolsContainer.addEventListener('click', e => {
        const b = e.target.closest('button'); if (b && b.dataset.tool) setTool(b.dataset.tool);
      });
    }

    function buildPalette() {
      if (!paletteEl) return;
      paletteEl.innerHTML = '';
      paletteColors.forEach(p => {
        const s = document.createElement('div');
        s.className = 'nq-sw' + (p.hex === activeColor ? ' on' : '');
        s.style.background = p.hex;
        s.title = p.name || nameOf(p.hex);
        s.onclick = () => {
          activeColor = p.hex;
          [...paletteEl.children].forEach(x => x.classList.toggle('on', x === s));
        };
        paletteEl.appendChild(s);
      });
    }

    // ── Solver Engine ───────────────────────────────────────────────
    function regionCells(reg) {
      const m = {};
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const g = reg[r][c]; if (g == null) continue;
          (m[g] = m[g] || []).push([r, c]);
        }
      }
      return m;
    }

    const SOLVE_NODE_BUDGET = 2e6;
    function solve(capLimit) {
      const SP = starsPer;
      const fixedCats = []; const forbidden = new Set();
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (mark[r][c] === 'cat') fixedCats.push([r, c]);
          if (mark[r][c] === 'x') forbidden.add(r + ',' + c);
        }
      }
      const over = w => SP === 1 ? `two of your queens share a ${w}` : `a ${w} has more than ${SP} of your queens`;
      const rowCnt = Array(N).fill(0), colCnt = Array(N).fill(0), regCnt = new Map(), placed = [];
      for (const [r, c] of fixedCats) {
        const g = regionOf[r][c];
        if (++rowCnt[r] > SP) return { bad: over('row') };
        if (++colCnt[c] > SP) return { bad: over('column') };
        regCnt.set(g, (regCnt.get(g) || 0) + 1);
        if (regCnt.get(g) > SP) return { bad: over('region') };
        if (placed.some(([pr, pc]) => Math.abs(pr - r) <= 1 && Math.abs(pc - c) <= 1)) return { bad: 'two of your queens touch' };
        placed.push([r, c]);
      }
      const okAdj = (r, c) => placed.every(([pr, pc]) => Math.abs(pr - r) > 1 || Math.abs(pc - c) > 1);
      const sols = []; let budget = SOLVE_NODE_BUDGET;

      (function go(r) {
        if (sols.length >= capLimit || budget < 0) return;
        if (r === N) { sols.push(placed.map(x => x.slice())); return; }
        (function pick(start, left) {
          if (sols.length >= capLimit || --budget < 0) return;
          if (!left) { go(r + 1); return; }
          for (let c = start; c < N; c++) {
            if (forbidden.has(r + ',' + c)) continue;
            if (colCnt[c] >= SP) continue;
            const g = regionOf[r][c]; if (g == null) continue;
            if ((regCnt.get(g) || 0) >= SP) continue;
            if (!okAdj(r, c)) continue;
            colCnt[c]++; regCnt.set(g, (regCnt.get(g) || 0) + 1); placed.push([r, c]);
            pick(c + 2, left - 1);
            placed.pop(); colCnt[c]--; regCnt.set(g, regCnt.get(g) - 1);
          }
        })(0, SP - rowCnt[r]);
      })(0);
      return { sols };
    }

    function statusFromMarks() {
      const s = Array.from({ length: N }, () => Array(N).fill(null));
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (mark[r][c]) s[r][c] = mark[r][c];
      return s;
    }
    const clone = s => s.map(row => row.slice());

    function propagate(status, directOnly) {
      status = clone(status);
      const reason = {}, events = []; let contradiction = null;
      const K = (r, c) => r + ',' + c;
      const regC = regionCells(regionOf);

      function setX(r, c, why) {
        if (status[r][c] === 'cat') { contradiction = contradiction || { type: 'conflict-cat', r, c, why }; return false; }
        if (status[r][c] === null) { status[r][c] = 'x'; reason[K(r, c)] = why; events.push({ t: 'elim', r, c, why }); return true; }
        return false;
      }
      function setCat(r, c, why) {
        if (status[r][c] === 'x') { contradiction = contradiction || { type: 'conflict-x', r, c, why, xWhy: reason[K(r, c)] }; return false; }
        if (status[r][c] !== 'cat') { status[r][c] = 'cat'; events.push({ t: 'cat', r, c, why }); return true; }
        return false;
      }

      const SP = starsPer;
      let changed = true;
      while (changed && !contradiction) {
        changed = false;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (status[r][c] !== 'cat') continue;
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue; const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
            if (setX(nr, nc, `sits next to the queen at R${r + 1}C${c + 1}`)) changed = true;
          }
          if (SP === 1) {
            for (let cc = 0; cc < N; cc++) if (cc !== c && setX(r, cc, `shares row ${r + 1} with the queen at R${r + 1}C${c + 1}`)) changed = true;
            for (let rr = 0; rr < N; rr++) if (rr !== r && setX(rr, c, `shares column ${c + 1} with the queen at R${r + 1}C${c + 1}`)) changed = true;
            const g = regionOf[r][c];
            for (const [rr, cc] of (regC[g] || []))
              if ((rr !== r || cc !== c) && setX(rr, cc, `is in the ${nameOf(g)} region, already taken by the queen at R${r + 1}C${c + 1}`)) changed = true;
          }
        }
        if (contradiction) break;
        const groups = [];
        for (let r = 0; r < N; r++) groups.push(['row', r + 1, [...Array(N).keys()].map(c => [r, c])]);
        for (let c = 0; c < N; c++) groups.push(['column', c + 1, [...Array(N).keys()].map(r => [r, c])]);
        for (const g in regC) groups.push(['region', nameOf(g), regC[g]]);

        for (const [kind, label, cells] of groups) {
          let cats = 0; const unk = [];
          for (const [r, c] of cells) {
            if (status[r][c] === 'cat') cats++;
            else if (status[r][c] === null) unk.push([r, c]);
          }
          const gname = kind === 'region' ? `${label} region` : `${kind} ${label}`;
          if (cats > SP) {
            const [or, oc] = cells.find(([r, c]) => status[r][c] === 'cat');
            contradiction = { type: 'conflict-cat', r: or, c: oc, why: `is in ${gname}, which already has more than ${SP === 2 ? 'two' : SP} queens` };
            break;
          }
          if (cats === SP && SP > 1) {
            for (const [r, c] of unk)
              if (setX(r, c, `is in ${gname}, which already has ${SP === 2 ? 'both' : 'all'} its queens`)) changed = true;
            continue;
          }
          const need = SP - cats;
          if (need > 0 && unk.length < need) {
            contradiction = {
              type: 'empty', kind, label, need, left: unk.length,
              cells: cells.filter(([r, c]) => status[r][c] === 'x').map(([r, c]) => ({ r, c, why: reason[K(r, c)] || 'you marked it out' }))
            };
            break;
          }
          if (need > 0 && unk.length === need) {
            const why = need === 1 && SP === 1 ? `${gname} has only this one cell left`
              : unk.length === 1 ? `${gname} has only this one cell left for its last queen`
                : `${gname} needs ${need} more queens and has only ${need} cells left`;
            for (const [r, c] of unk) if (setCat(r, c, why)) changed = true;
          }
        }
        if (contradiction) break;

        if (!directOnly) for (const g in regC) {
          const cells = regC[g];
          let gCats = 0; const unk = [];
          for (const [r, c] of cells) { if (status[r][c] === 'cat') gCats++; else if (status[r][c] === null) unk.push([r, c]); }
          const rem = SP - gCats;
          if (rem <= 0 || !unk.length) continue;
          const rows = new Set(unk.map(x => x[0])), cols = new Set(unk.map(x => x[1]));
          const confine = (isRow, li) => {
            let lineCats = 0; for (let i = 0; i < N; i++) { const r = isRow ? li : i, c = isRow ? i : li; if (status[r][c] === 'cat') lineCats++; }
            const slots = SP - lineCats;
            if (slots > rem) return;
            const why = `${isRow ? 'row' : 'column'} ${li + 1}'s ${rem === 1 ? 'queen' : 'remaining queens'} must come from the ${nameOf(g)} region`;
            for (let i = 0; i < N; i++) {
              const r = isRow ? li : i, c = isRow ? i : li;
              if (regionOf[r][c] === g) continue;
              if (slots === rem && status[r][c] === 'cat') continue;
              if (setX(r, c, why)) changed = true;
            }
          };
          if (rows.size === 1) confine(true, [...rows][0]);
          if (cols.size === 1) confine(false, [...cols][0]);
        }
      }
      return { status, events, contradiction, reason };
    }

    // ── Helper formatters ───────────────────────────────────────────
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function coord(r, c) { return `<span class="nq-coord">R${r + 1}C${c + 1}</span>`; }
    function joinNames(a) { return a.length === 1 ? a[0] : a.length === 2 ? a[0] + ' and ' + a[1] : a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1]; }
    function combos(n, k) {
      const res = [], idx = [];
      (function rec(start) {
        if (idx.length === k) { res.push(idx.slice()); return; }
        for (let i = start; i < n; i++) { idx.push(i); rec(i + 1); idx.pop(); }
      })(0);
      return res;
    }

    function buildCandidates() {
      const SP = starsPer;
      const cat = [], dead = new Set(), K = (r, c) => r + ',' + c;
      const rowCnt = Array(N).fill(0), colCnt = Array(N).fill(0), regCnt = new Map();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (mark[r][c] === 'cat') { cat.push([r, c]); rowCnt[r]++; colCnt[c]++; const g = regionOf[r][c]; regCnt.set(g, (regCnt.get(g) || 0) + 1); }
        if (mark[r][c] === 'x') dead.add(K(r, c));
      }
      for (const [cr, cc] of cat)
        for (let r = Math.max(0, cr - 1); r <= Math.min(N - 1, cr + 1); r++)
          for (let c = Math.max(0, cc - 1); c <= Math.min(N - 1, cc + 1); c++)
            if (r !== cr || c !== cc) dead.add(K(r, c));
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++)
        if (rowCnt[r] >= SP || colCnt[c] >= SP || (regCnt.get(regionOf[r][c]) || 0) >= SP) dead.add(K(r, c));
      const cand = (r, c) => regionOf[r][c] != null && mark[r][c] !== 'cat' && !dead.has(K(r, c));
      return { cat, cand, rowCnt, colCnt, regCnt };
    }

    // ── Strategy 1: Forced Move ─────────────────────────────────────
    function forcedCatHint(cs, why) {
      const many = cs.length > 1;
      const where = joinNames(cs.map(([r, c]) => `R${r + 1}C${c + 1}`));
      return {
        kind: 'Forced move', cell: cs[0], cells: cs.map(x => x.slice()), action: 'cat',
        head: many ? `Place queens at ${where}.` : `Place a queen at ${where}.`,
        chain: [{ k: 'end', html: cap(why) + (many ? `, so queens must go in all of them.` : `, so the queen must go there.`) }],
        hyp: null, steps: cs.map(x => x.slice()), doom: []
      };
    }

    function forcedWhy(name, need) {
      if (need === 1 && starsPer === 1) return `${name} has only one square left`;
      if (need === 1) return `${name} needs one more queen and has only one square left`;
      return `${name} needs ${need} queens and has only ${need} squares left`;
    }

    function findForcedCat(M) {
      const { cand, rowCnt, colCnt, regCnt } = M; const SP = starsPer;
      const regCells = {};
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const g = regionOf[r][c]; if (g == null) continue;
        (regCells[g] = regCells[g] || []).push([r, c]);
      }
      for (const g in regCells) {
        const need = SP - (regCnt.get(g) || 0); if (need <= 0) continue;
        const cs = regCells[g].filter(([r, c]) => cand(r, c));
        if (cs.length === need) return forcedCatHint(cs, forcedWhy(`the ${nameOf(g)} region`, need));
      }
      for (let r = 0; r < N; r++) {
        const need = SP - rowCnt[r]; if (need <= 0) continue;
        const cs = []; for (let c = 0; c < N; c++) if (cand(r, c)) cs.push([r, c]);
        if (cs.length === need) return forcedCatHint(cs, forcedWhy(`row ${r + 1}`, need));
      }
      for (let c = 0; c < N; c++) {
        const need = SP - colCnt[c]; if (need <= 0) continue;
        const cs = []; for (let r = 0; r < N; r++) if (cand(r, c)) cs.push([r, c]);
        if (cs.length === need) return forcedCatHint(cs, forcedWhy(`column ${c + 1}`, need));
      }
      return null;
    }

    // ── Strategy 1b: Trapped Colour ─────────────────────────────────
    function findTrappedColour(M) {
      const { cand, rowCnt, colCnt, regCnt } = M;
      const regCells = {};
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const g = regionOf[r][c]; if (g == null) continue;
        (regCells[g] = regCells[g] || []).push([r, c]);
      }
      for (const g in regCells) {
        const K = starsPer - (regCnt.get(g) || 0); if (K <= 0) continue;
        const C = regCells[g].filter(([r, c]) => cand(r, c));
        if (C.length <= K) continue;
        const rows = new Set(C.map(x => x[0])), cols = new Set(C.map(x => x[1]));
        let isRow, li;
        if (rows.size === 1) { isRow = true; li = [...rows][0]; }
        else if (cols.size === 1) { isRow = false; li = [...cols][0]; }
        else continue;
        const Mcap = starsPer - (isRow ? rowCnt : colCnt)[li];
        const inC = (r, c) => C.some(x => x[0] === r && x[1] === c);
        const elim = [], seen = new Set();
        const add = (r, c) => {
          if (r < 0 || r >= N || c < 0 || c >= N) return;
          const k = r + ',' + c;
          if (!seen.has(k) && cand(r, c) && !inC(r, c)) { seen.add(k); elim.push([r, c]); }
        };
        const usedA = K === Mcap;
        if (usedA) for (let i = 0; i < N; i++) { const r = isRow ? li : i, c = isRow ? i : li; add(r, c); }
        const idx = C.map(x => isRow ? x[1] : x[0]).sort((a, b) => a - b);
        const usedB = K === 2 && idx.length === 4 && idx[3] - idx[0] === 3;
        if (usedB) for (const d of [-1, 1]) for (const p of idx) { const rr = isRow ? li + d : p, cc = isRow ? p : li + d; add(rr, cc); }
        if (!elim.length) continue;
        const lineTxt = (isRow ? 'row ' : 'column ') + (li + 1), cName = nameOf(g), many = elim.length > 1;
        const chain = [{ k: 'step', html: `Every open ${cName} square lies in ${lineTxt} (${joinNames(C.map(([r, c]) => coord(r, c)))}), so ${cName}’s ${K === 1 ? 'queen goes' : 'queens go'} there.` }];
        if (usedA) chain.push({ k: 'doom', html: `That fills ${lineTxt} — no other open square in it can hold a queen.` });
        if (usedB) chain.push({ k: 'doom', html: `Two queens among those four in a row can’t touch, so they cover the whole run — every square beside it in the neighbouring ${isRow ? 'rows' : 'columns'} is touched too.` });
        chain.push({ k: 'end', html: `Mark ${many ? 'them' : 'it'} ✕.` });
        return {
          kind: 'Trapped colour', action: 'x', cells: elim.map(x => x.slice()),
          head: `Rule out ${elim.length} square${many ? 's' : ''} — ${cName} is trapped in ${lineTxt}.`,
          chain, hyp: null, steps: [], doom: elim.map(x => x.slice()), ring: C.map(x => x.slice()), pinch: [], xprev: elim.map(x => x.slice())
        };
      }
      return null;
    }

    // ── Strategy 1c: Pair Squeeze ───────────────────────────────────
    function findPairSqueeze(M) {
      if (starsPer === 1) return null;
      const { cand, rowCnt, colCnt, regCnt } = M;
      const units = [], regionUnits = [];
      const regCells = {};
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const g = regionOf[r][c]; if (g == null) continue;
        (regCells[g] = regCells[g] || []).push([r, c]);
      }
      for (const g in regCells) if (starsPer - (regCnt.get(g) || 0) === 2) {
        const u = [`${nameOf(g)} region`, regCells[g].filter(([r, c]) => cand(r, c))];
        units.push(u); regionUnits.push(u);
      }
      for (let li = 0; li < N; li++) {
        if (starsPer - rowCnt[li] === 2) { const u = []; for (let c = 0; c < N; c++) if (cand(li, c)) u.push([li, c]); units.push([`row ${li + 1}`, u]); }
        if (starsPer - colCnt[li] === 2) { const u = []; for (let r = 0; r < N; r++) if (cand(r, li)) u.push([r, li]); units.push([`column ${li + 1}`, u]); }
      }
      const nonTouchPair = cells => {
        for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++)
          if (Math.abs(cells[i][0] - cells[j][0]) > 1 || Math.abs(cells[i][1] - cells[j][1]) > 1) return true;
        return false;
      };
      for (const [uname, u] of units) {
        if (u.length < 3) continue;
        const forced = u.filter(([r, c]) => !nonTouchPair(u.filter(([or, oc]) => or !== r || oc !== c)));
        if (!forced.length || forced.length > 2) continue;
        const rest = u.filter(([r, c]) => !forced.some(([fr, fc]) => fr === r && fc === c));
        const many = forced.length > 1;
        const where = joinNames(forced.map(([r, c]) => `R${r + 1}C${c + 1}`));
        return {
          kind: 'Pair squeeze', cell: forced[0], cells: forced.map(x => x.slice()), action: 'cat',
          head: many ? `Place queens at ${where}.` : `Place a queen at ${where}.`,
          chain: [
            { k: 'step', html: `The ${uname} still needs two queens, and its only open squares are ${joinNames(u.map(([ur, uc]) => coord(ur, uc)))}.` },
            {
              k: 'doom', html: many
                ? `Only ${joinNames(forced.map(([ur, uc]) => coord(ur, uc)))} can complete the pair — any other choice would leave two queens touching.`
                : `Leave ${coord(...forced[0])} empty and the pair must come from ${joinNames(rest.map(([ur, uc]) => coord(ur, uc)))}, which can’t hold two queens without touching.`
            },
            { k: 'end', html: many ? `So queens are forced at ${where}.` : `So a queen is forced at ${coord(...forced[0])}.` }
          ],
          hyp: null, steps: forced.map(x => x.slice()), doom: [], ring: [], pinch: rest.map(x => x.slice()), xprev: []
        };
      }
      for (const [uname, u] of units) {
        if (u.length < 2) continue;
        for (const [r, c] of u) {
          if (!u.every(([or, oc]) => (or === r && oc === c) || (Math.abs(or - r) <= 1 && Math.abs(oc - c) <= 1))) continue;
          const others = u.filter(([or, oc]) => or !== r || oc !== c);
          return {
            kind: 'Pair squeeze', cell: [r, c], action: 'x', cells: [[r, c]],
            head: `No queen can sit at R${r + 1}C${c + 1} — the ${uname} needs two.`,
            chain: [
              { k: 'step', html: `The ${uname} still needs two queens, and its only open squares are ${joinNames(u.map(([ur, uc]) => coord(ur, uc)))}.` },
              { k: 'doom', html: `A queen at ${coord(r, c)} would touch every other one of them — leaving no room for its partner.` },
              { k: 'end', html: `Queens can’t touch — mark ${coord(r, c)} ✕.` }
            ],
            hyp: null, steps: [], doom: [[r, c]], ring: [], pinch: others.map(x => x.slice()), xprev: [[r, c]]
          };
        }
      }
      for (const [uname, u] of regionUnits) {
        if (u.length < 2) continue;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (!cand(r, c)) continue;
          if (u.some(([ur, uc]) => ur === r && uc === c)) continue;
          const surv = u.filter(([ur, uc]) => Math.abs(ur - r) > 1 || Math.abs(uc - c) > 1);
          let pair = false;
          for (let i = 0; i < surv.length && !pair; i++) for (let j = i + 1; j < surv.length; j++)
            if (Math.abs(surv[i][0] - surv[j][0]) > 1 || Math.abs(surv[i][1] - surv[j][1]) > 1) { pair = true; break; }
          if (pair) continue;
          const killed = u.filter(([ur, uc]) => Math.abs(ur - r) <= 1 && Math.abs(uc - c) <= 1);
          return {
            kind: 'Pair squeeze', cell: [r, c], action: 'x', cells: [[r, c]],
            head: `No queen can sit at R${r + 1}C${c + 1} — it would squeeze the ${uname}.`,
            chain: [
              { k: 'step', html: `The ${uname} still needs two queens, and its only open squares are ${joinNames(u.map(([ur, uc]) => coord(ur, uc)))}.` },
              { k: 'doom', html: `A queen at ${coord(r, c)} would touch ${joinNames(killed.map(([ur, uc]) => coord(ur, uc)))} — and the squares left can’t hold two queens without touching.` },
              { k: 'end', html: `Mark ${coord(r, c)} ✕.` }
            ],
            hyp: null, steps: [], doom: [[r, c]], ring: surv.map(x => x.slice()), pinch: killed.map(x => x.slice()), xprev: [[r, c]]
          };
        }
      }
      return null;
    }

    // ── Strategy 1c-b: Capacity Counting ────────────────────────────
    function findCapacityForced(M) {
      if (starsPer === 1) return null;
      const { cand, rowCnt, colCnt, regCnt } = M;
      const regCells = {};
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const g = regionOf[r][c]; if (g == null) continue;
        (regCells[g] = regCells[g] || []).push([r, c]);
      }
      const touch = (a, b) => Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1;
      const anyTouch = cells => {
        for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) if (touch(cells[i], cells[j])) return true;
        return false;
      };
      const units = [];
      for (const g in regCells) {
        const need = starsPer - (regCnt.get(g) || 0);
        if (need > 0) { const C = regCells[g].filter(([r, c]) => cand(r, c)); if (C.length >= 2) units.push([`the ${nameOf(g)} region`, C, need, 'region']); }
      }
      for (let r = 0; r < N; r++) {
        const need = starsPer - rowCnt[r];
        if (need > 0) { const C = []; for (let c = 0; c < N; c++) if (cand(r, c)) C.push([r, c]); if (C.length >= 2) units.push([`row ${r + 1}`, C, need, 'row']); }
      }
      for (let c = 0; c < N; c++) {
        const need = starsPer - colCnt[c];
        if (need > 0) { const C = []; for (let r = 0; r < N; r++) if (cand(r, c)) C.push([r, c]); if (C.length >= 2) units.push([`column ${c + 1}`, C, need, 'col']); }
      }

      for (const [uname, C, K, ukind] of units) {
        const groups = [];
        if (ukind !== 'row') { const by = {}; C.forEach(x => { (by[x[0]] = by[x[0]] || []).push(x); }); for (const r in by) groups.push([`row ${+r + 1}`, by[r], starsPer - rowCnt[+r]]); }
        if (ukind !== 'col') { const by = {}; C.forEach(x => { (by[x[1]] = by[x[1]] || []).push(x); }); for (const c in by) groups.push([`column ${+c + 1}`, by[c], starsPer - colCnt[+c]]); }
        if (ukind !== 'region') { const by = {}; C.forEach(x => { const g = regionOf[x[0]][x[1]]; (by[g] = by[g] || []).push(x); }); for (const g in by) groups.push([`the ${nameOf(g)} region`, by[g], starsPer - (regCnt.get(g) || 0)]); }

        for (const [wname, S, Mw] of groups) {
          if (S.length <= Mw) continue;
          const outS = C.filter(x => !S.some(s => s[0] === x[0] && s[1] === x[1]));
          if (outS.length !== K - Mw || outS.length < 1) continue;
          if (anyTouch(outS)) continue;
          const many = outS.length > 1;
          const where = joinNames(outS.map(([r, c]) => `R${r + 1}C${c + 1}`));
          return {
            kind: 'Counting', action: 'cat', cell: outS[0], cells: outS.map(x => x.slice()),
            head: many ? `Place queens at ${where}.` : `Place a queen at ${where}.`,
            chain: [
              { k: 'step', html: `${cap(uname)} still needs ${K} queens, and its open squares are ${joinNames(C.map(([r, c]) => coord(r, c)))}.` },
              { k: 'doom', html: `${joinNames(S.map(([r, c]) => coord(r, c)))} all sit in ${wname}, which can take only ${Mw} more — so at most ${Mw} of ${uname}’s queens can go there.` },
              { k: 'end', html: `That leaves ${where} to take the ${many ? 'other queens' : 'other queen'} — ${many ? 'they’re' : 'it’s'} forced.` }
            ],
            hyp: null, steps: outS.map(x => x.slice()), doom: [], ring: [], pinch: S.map(x => x.slice()), xprev: []
          };
        }
      }
      return null;
    }

    // ── Strategy 1d: Segment Capacity ───────────────────────────────
    function findSegmentCapacity(M) {
      if (starsPer === 1) return null;
      const { cand, rowCnt, colCnt } = M;
      const capOf = L => Math.ceil(L/2);
      const segCap = idx => {
        let t = 0;
        for (let j = 0; j < idx.length;) {
          let k = j; while (k + 1 < idx.length && idx[k + 1] === idx[k] + 1) k++;
          t += capOf(idx[k] - idx[j] + 1); j = k + 1;
        }
        return t;
      };
      const lineOpen = (isRow, li) => {
        const o = []; for (let i = 0; i < N; i++) { const r = isRow ? li : i, c = isRow ? i : li; if (cand(r, c)) o.push(i); }
        return o;
      };
      const lineNeed = (isRow, li) => starsPer - (isRow ? rowCnt : colCnt)[li];
      const lineTxt = (isRow, li) => (isRow ? 'row ' : 'column ') + (li + 1);
      const runsTxt = (isRow, li, open) => {
        const at = i => isRow ? [li, i] : [i, li];
        const parts = [];
        for (let j = 0; j < open.length;) {
          let k = j; while (k + 1 < open.length && open[k + 1] === open[k] + 1) k++;
          parts.push(open[j] === open[k] ? coord(...at(open[j])) : `${coord(...at(open[j]))}–${coord(...at(open[k]))}`);
          j = k + 1;
        }
        return joinNames(parts);
      };

      for (const isRow of [true, false]) for (let li = 0; li < N; li++) {
        const need = lineNeed(isRow, li); if (need <= 0) continue;
        const open = lineOpen(isRow, li);
        if (open.length < 2) continue;
        const at = i => isRow ? [li, i] : [i, li];
        const forced = open.filter(i => segCap(open.filter(x => x !== i)) < need);
        if (forced.length) {
          const cs = forced.map(at), many = cs.length > 1;
          const csTxt = joinNames(cs.map(([r, c]) => coord(r, c)));
          const line = lineTxt(isRow, li);
          return {
            kind: 'Stretch squeeze', action: 'cat', cell: cs[0], cells: cs.map(x => x.slice()),
            head: many ? `Place queens at ${joinNames(cs.map(([r, c]) => `R${r + 1}C${c + 1}`))}.` : `Place a queen at R${cs[0][0] + 1}C${cs[0][1] + 1}.`,
            chain: [
              { k: 'step', html: `${cap(line)} still needs ${need} queens, and its only open squares are ${runsTxt(isRow, li, open)}.` },
              { k: 'end', html: `Queens can’t sit side by side, so without ${many ? 'queens at' : 'a queen at'} ${csTxt} the stretches can’t fit ${need} — ${many ? 'they’re' : 'it’s'} forced.` }
            ],
            hyp: null, steps: cs.map(x => x.slice()), doom: [], ring: open.map(at)
          };
        }
      }

      let best = null;
      for (const isRow of [true, false]) for (let li = 0; li < N; li++) {
        const need = lineNeed(isRow, li); if (need <= 0) continue;
        const open = lineOpen(isRow, li);
        if (!open.length) continue;
        const elim = [];
        for (let d = -1; d <= 1; d++) {
          const lj = li + d; if (lj < 0 || lj >= N) continue;
          for (let i = 0; i < N; i++) {
            const [er, ec] = isRow ? [lj, i] : [i, lj];
            if (!cand(er, ec)) continue;
            const kill = isRow ? ec : er;
            const left = open.filter(x => Math.abs(x - kill) > 1);
            if (left.length === open.length) continue;
            const self = d === 0 ? 1 : 0;
            if (self + segCap(left) < need) elim.push([er, ec]);
          }
        }
        if (elim.length && (!best || elim.length > best.elim.length)) best = { isRow, li, need, open, elim };
      }
      if (!best) return null;
      const { isRow, li, need, open, elim } = best;
      const at = i => isRow ? [li, i] : [i, li];
      const line = lineTxt(isRow, li), many = elim.length > 1;
      const csTxt = joinNames(elim.map(([r, c]) => coord(r, c)));
      return {
        kind: 'Stretch squeeze', action: 'x', cells: elim.map(x => x.slice()),
        head: `Rule out ${elim.length} square${many ? 's' : ''} — ${line} would run out of room.`,
        chain: [
          { k: 'step', html: `${cap(line)} still needs ${need} queens, and its only open squares are ${runsTxt(isRow, li, open)}.` },
          { k: 'doom', html: `A queen ${many ? 'at any of' : 'at'} ${csTxt} would block the squares it touches there, leaving stretches that can’t fit ${need}.` },
          { k: 'end', html: `Mark ${many ? 'them' : 'it'} ✕.` }
        ],
        hyp: null, steps: [], doom: elim.map(x => x.slice()), ring: open.map(at), xprev: elim.map(x => x.slice())
      };
    }

    // ── Strategy 2: Locked Sets ─────────────────────────────────────
    function lockedHint(elim, lock, lead, why, head) {
      return {
        kind: 'Locked set', action: 'x', cells: elim.map(x => x.slice()),
        head, chain: [{ k: 'step', html: lead }, { k: 'doom', html: why }],
        hyp: null, steps: [], doom: elim.map(x => x.slice()), ring: lock.map(x => x.slice()), xprev: elim.map(x => x.slice())
      };
    }

    function findLockedSets(M) {
      const { cand, rowCnt, colCnt, regCnt } = M; const SP = starsPer;
      const cells = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (cand(r, c)) cells.push([r, c]);
      const regCells = {}; cells.forEach(([r, c]) => { const g = regionOf[r][c]; (regCells[g] = regCells[g] || []).push([r, c]); });
      const regions = Object.keys(regCells).filter(g => (regCnt.get(g) || 0) < SP);
      const regNeed = g => SP - (regCnt.get(g) || 0);
      const colSet = {}, rowSet = {}; regions.forEach(g => { colSet[g] = new Set(regCells[g].map(([r, c]) => c)); rowSet[g] = new Set(regCells[g].map(([r, c]) => r)); });
      function lineData(lineOf, cnts) {
        const regs = {}, cl = {}; for (let li = 0; li < N; li++) { if (cnts[li] >= SP) continue; regs[li] = new Set(); cl[li] = []; }
        cells.forEach(([r, c]) => { const li = lineOf(r, c); if (regs[li]) { regs[li].add(regionOf[r][c]); cl[li].push([r, c]); } });
        return { regs, cl };
      }
      const rowD = lineData((r, c) => r, rowCnt), colD = lineData((r, c) => c, colCnt);

      function regionsInLines(k, setMap, lineName, lineOf, lineCnt) {
        if (regions.length < k) return null;
        for (const comb of combos(regions.length, k)) {
          const S = comb.map(i => regions[i]), U = new Set(); S.forEach(g => setMap[g].forEach(v => U.add(v)));
          const needSum = S.reduce((a, g) => a + regNeed(g), 0);
          let capSum = 0; U.forEach(li => { capSum += SP - lineCnt[li]; });
          if (capSum !== needSum) continue; const Sset = new Set(S);
          const elim = cells.filter(([r, c]) => U.has(lineOf(r, c)) && !Sset.has(regionOf[r][c]));
          if (elim.length) {
            const names = S.map(nameOf), lns = [...U].map(v => v + 1).sort((a, b) => a - b), plural = lns.length > 1;
            const lead = SP === 1
              ? `${joinNames(names)} can only place ${S.length > 1 ? 'their queens' : 'its queen'} in ${lineName}${plural ? 's' : ''} ${lns.join(' & ')}.`
              : `${joinNames(names)} must place all ${needSum} of ${S.length > 1 ? 'their' : 'its'} remaining queens in ${lineName}${plural ? 's' : ''} ${lns.join(' & ')}.`;
            const why = SP === 1
              ? `That’s ${S.length} ${S.length > 1 ? 'regions' : 'region'} needing ${lns.length} ${lineName}${plural ? 's' : ''}, which fills ${plural ? 'them' : 'it'} — so every other square in ${lineName}${plural ? 's' : ''} ${lns.join(' & ')} can be ruled out.`
              : `${plural ? 'Those' : 'That'} ${lineName}${plural ? 's' : ''} only ${plural ? 'have' : 'has'} room for ${capSum} more queen${capSum > 1 ? 's' : ''}, which fills ${plural ? 'them' : 'it'} — so every other square in ${lineName}${plural ? 's' : ''} ${lns.join(' & ')} can be ruled out.`;
            const head = `Rule out ${elim.length} square${elim.length > 1 ? 's' : ''} in ${lineName}${plural ? 's' : ''} ${lns.join(' & ')}.`;
            return lockedHint(elim, S.flatMap(g => regCells[g]), lead, why, head);
          }
        }
        return null;
      }

      function linesInRegions(k, D, lineName, lineOf, lineCnt) {
        const lines = Object.keys(D.cl).map(Number).filter(li => D.cl[li].length);
        if (lines.length < k) return null;
        for (const comb of combos(lines.length, k)) {
          const S = comb.map(i => lines[i]), U = new Set(); S.forEach(li => D.regs[li].forEach(g => U.add(g)));
          const capSum = S.reduce((a, li) => a + SP - lineCnt[li], 0);
          let needSum = 0; U.forEach(g => { needSum += regNeed(g); });
          if (needSum !== capSum) continue; const Sset = new Set(S);
          const elim = cells.filter(([r, c]) => U.has(regionOf[r][c]) && !Sset.has(lineOf(r, c)));
          if (elim.length) {
            const names = [...U].map(nameOf), lns = S.map(v => v + 1).sort((a, b) => a - b), plural = lns.length > 1;
            const lead = `${cap(lineName)}${plural ? 's' : ''} ${lns.join(' & ')} contain only ${joinNames(names)}.`;
            const why = SP === 1
              ? `${lns.length} ${lineName}${plural ? 's' : ''} holding just ${names.length} ${names.length > 1 ? 'colours' : 'colour'} means ${names.length > 1 ? 'those colours place their queens' : 'that colour places its queen'} here — so ${names.length > 1 ? 'they' : 'it'} can be ruled out in other ${lineName}s.`
              : `${plural ? 'These' : 'This'} ${lineName}${plural ? 's' : ''} still need${plural ? '' : 's'} ${capSum} queen${capSum > 1 ? 's' : ''} and ${names.length > 1 ? 'those colours have' : 'that colour has'} exactly ${needSum} left to place — all of them land here, so ${names.length > 1 ? 'they' : 'it'} can be ruled out in other ${lineName}s.`;
            const head = `Rule out ${elim.length} square${elim.length > 1 ? 's' : ''} of ${joinNames(names)} outside ${lineName}s ${lns.join(' & ')}.`;
            return lockedHint(elim, S.flatMap(li => D.cl[li]), lead, why, head);
          }
        }
        return null;
      }

      const KMAX = Math.floor(N / 2);
      for (let k = 1; k <= KMAX; k++) {
        let h = regionsInLines(k, colSet, 'column', (r, c) => c, colCnt); if (h) return h;
        h = regionsInLines(k, rowSet, 'row', (r, c) => r, rowCnt); if (h) return h;
        h = linesInRegions(k, colD, 'column', (r, c) => c, colCnt); if (h) return h;
        h = linesInRegions(k, rowD, 'row', (r, c) => r, rowCnt); if (h) return h;
      }
      return null;
    }

    // ── Strategy 2b: Line Squeeze ───────────────────────────────────
    function findLineSqueeze(M) {
      const { cat, cand } = M;
      const rc = new Set(cat.map(x => x[0])), cc = new Set(cat.map(x => x[1]));
      let best = null;
      for (const isRow of [true, false]) {
        const done = isRow ? rc : cc;
        for (let li = 0; li < N; li++) {
          if (done.has(li)) continue;
          const open = [];
          for (let i = 0; i < N; i++) { const r = isRow ? li : i, c = isRow ? i : li; if (cand(r, c)) open.push([r, c]); }
          if (open.length < 2) continue;
          const elim = [];
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            if (isRow ? r === li : c === li) continue;
            if (!cand(r, c)) continue;
            if (open.every(([or, oc]) => Math.abs(or - r) <= 1 && Math.abs(oc - c) <= 1)) elim.push([r, c]);
          }
          if (elim.length && (!best || elim.length > best.elim.length)) best = { isRow, li, open, elim };
        }
      }
      if (!best) return null;
      const { isRow, li, open, elim } = best;
      const line = (isRow ? 'row ' : 'column ') + (li + 1);
      const openC = joinNames(open.map(([r, c]) => coord(r, c)));
      const elimC = joinNames(elim.map(([r, c]) => coord(r, c)));
      const plural = elim.length > 1;
      const oneCat = starsPer === 1;
      return {
        kind: isRow ? 'Row squeeze' : 'Column squeeze', action: 'x', cells: elim.map(x => x.slice()),
        head: `Rule out ${elim.length} square${plural ? 's' : ''} next to ${line}.`,
        chain: [
          { k: 'step', html: `${cap(line)} is down to ${open.length} squares: ${openC} — its ${oneCat ? 'queen must be one of them' : 'queens must all be among them'}.` },
          { k: 'doom', html: `Every one of those squares touches ${elimC}, so wherever ${line}’s ${oneCat ? 'queen lands, it' : 'queens land, they'} will touch ${plural ? 'them' : 'it'}.` },
          { k: 'end', html: `Queens can’t touch — mark ${plural ? 'those squares' : 'that square'} ✕.` }
        ],
        hyp: null, steps: [], doom: elim.map(x => x.slice()), ring: open.map(x => x.slice()), xprev: elim.map(x => x.slice())
      };
    }

    // ── Strategy 2c: Colour Squeeze / Starvation ────────────────────
    function findStarvation() {
      const base = statusFromMarks();
      const imp = collectImpossible(base, true).filter(o => {
        const ct = o.run.contradiction;
        return o.catSteps === 0 && ct.type === 'empty' && ct.cells.some(x => x.why && x.why !== 'you marked it out');
      });
      if (!imp.length) return null;
      imp.sort((a, b) => {
        const ar = a.run.contradiction.kind === 'region' ? 0 : 1, br = b.run.contradiction.kind === 'region' ? 0 : 1;
        return ar - br || b.run.contradiction.cells.length - a.run.contradiction.cells.length;
      });
      const { r, c, run } = imp[0], ct = run.contradiction;
      const gname = ct.kind === 'region' ? `the ${ct.label} region` : `${ct.kind} ${ct.label}`;
      const hit = ct.cells.filter(x => x.why && x.why !== 'you marked it out');
      const byReason = {}; hit.forEach(x => { (byReason[x.why] = byReason[x.why] || []).push(coord(x.r, x.c)); });
      const parts = Object.entries(byReason).map(([why, cs]) => `${cs.join(', ')} ${cs.length > 1 ? 'each ' : ''}${why}`);
      const leftTxt = ct.left ? `only ${ct.left} square${ct.left === 1 ? '' : 's'}` : 'no square';
      const catsTxt = ct.need === 1 ? 'its last queen' : `its ${ct.need} queens`;
      return {
        kind: 'Colour squeeze', cell: [r, c], action: 'x', cells: [[r, c]],
        head: `No queen can sit at R${r + 1}C${c + 1} — it would starve ${gname}.`,
        chain: [
          { k: 'step', html: `A queen at ${coord(r, c)} would knock out ${parts.join('; ')}.` },
          { k: 'doom', html: `That leaves ${gname} ${leftTxt} for ${catsTxt}.` },
          { k: 'end', html: `So ${coord(r, c)} can’t hold a queen — mark it ✕.` }
        ],
        hyp: null, steps: [], doom: ct.cells.map(x => [x.r, x.c]), ring: [[r, c]], xprev: [[r, c]]
      };
    }

    function findColorKiller(M) {
      if (starsPer > 1) return findStarvation();
      const { cat, cand } = M;
      const gc = new Set(cat.map(([r, c]) => regionOf[r][c]));
      const cells = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (cand(r, c)) cells.push([r, c]);
      const rg = {}; cells.forEach(([r, c]) => { const g = regionOf[r][c]; (rg[g] = rg[g] || []).push([r, c]); });
      const regions = Object.keys(rg).filter(g => !gc.has(g));
      let best = null;
      for (const [cr, cc] of cells) {
        const g0 = regionOf[cr][cc];
        const kills = (r, c) => (r !== cr || c !== cc) && (r === cr || c === cc || regionOf[r][c] === g0 || (Math.abs(r - cr) <= 1 && Math.abs(c - cc) <= 1));
        for (const g of regions) {
          if (g === g0) continue; const open = rg[g]; if (!open.length) continue;
          if (open.every(([r, c]) => kills(r, c))) {
            if (!best || open.length > best.victims.length) best = { cr, cc, g, victims: open.map(x => x.slice()) };
          }
        }
      }
      if (!best) return null;
      const { cr, cc, g, victims } = best, nm = nameOf(g);
      const col = [], row = [], touch = [];
      victims.forEach(([r, c]) => { if (c === cc) col.push(coord(r, c)); else if (r === cr) row.push(coord(r, c)); else touch.push(coord(r, c)); });
      const parts = [];
      if (col.length) parts.push(`${joinNames(col)} ${col.length > 1 ? 'are' : 'is'} in its column`);
      if (row.length) parts.push(`${joinNames(row)} ${row.length > 1 ? 'are' : 'is'} in its row`);
      if (touch.length) parts.push(`${joinNames(touch)} ${touch.length > 1 ? 'sit' : 'sits'} right next to it`);
      return {
        kind: 'Colour squeeze', cell: [cr, cc], action: 'x', cells: [[cr, cc]],
        head: `No queen can sit at R${cr + 1}C${cc + 1} — it would wipe out ${nm}.`,
        chain: [
          { k: 'step', html: `A queen at ${coord(cr, cc)} would rule out every remaining <b>${nm}</b> square: ${parts.join('; ')}.` },
          { k: 'doom', html: `That leaves the ${nm} region nowhere to put its queen.` },
          { k: 'end', html: `So ${coord(cr, cc)} can’t hold a queen — mark it ✕.` }
        ],
        hyp: null, steps: [], doom: victims.map(x => x.slice()), ring: [[cr, cc]], xprev: [[cr, cc]]
      };
    }

    // ── Strategy 3: Contradiction by Lookahead ──────────────────────
    function collectImpossible(base, directOnly) {
      const impossible = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (regionOf[r][c] == null || base[r][c] !== null) continue;
        const s = clone(base); s[r][c] = 'cat'; const run = propagate(s, directOnly);
        if (run.contradiction) impossible.push({ r, c, run, catSteps: run.events.filter(e => e.t === 'cat').length });
      }
      return impossible;
    }

    function findContradiction() {
      const base = statusFromMarks();
      let directOnly = true, impossible = collectImpossible(base, true);
      if (!impossible.length) { directOnly = false; impossible = collectImpossible(base, false); }
      if (!impossible.length) return null;
      impossible.forEach(o => { const s = clone(base); s[o.r][o.c] = 'x'; o.payoff = propagate(s, directOnly).events.length; });
      impossible.sort((a, b) => a.catSteps - b.catSteps || b.payoff - a.payoff);
      return buildContradictionHint(impossible[0]);
    }

    function expandReason(why, status) {
      const m = why && why.match(/^(row|column) (\d+)'s (?:cat|queen|remaining cats|remaining queens) must come from the (.+) region$/);
      if (!m) return '';
      const isRow = m[1] === 'row', idx = +m[2] - 1, open = [];
      for (let i = 0; i < N; i++) { const r = isRow ? idx : i, c = isRow ? i : idx; if (status[r][c] !== 'x') open.push(coord(r, c)); }
      if (!open.length) return '';
      return ` (${m[1]} ${m[2]}’s only open squares are ${joinNames(open)}, ${open.length > 1 ? 'all ' : ''}in ${m[3]})`;
    }

    function buildContradictionHint(o) {
      const { r, c, run } = o; const status = run.status;
      const chain = [{ k: 'hyp', html: `Suppose a queen goes at ${coord(r, c)}.` }]; const steps = [];
      run.events.filter(e => e.t === 'cat').forEach(e => { steps.push([e.r, e.c]); chain.push({ k: 'step', html: `Then ${coord(e.r, e.c)} is forced — ${e.why}.` }); });
      const ct = run.contradiction; let doom = [];
      if (ct.type === 'empty') {
        doom = ct.cells.map(x => [x.r, x.c]);
        const gname = ct.kind === 'region' ? `<b>${ct.label} region</b>` : `<b>${ct.kind} ${ct.label}</b>`;
        const byReason = {}; ct.cells.forEach(x => { (byReason[x.why] = byReason[x.why] || []).push(coord(x.r, x.c)); });
        const parts = Object.entries(byReason).map(([why, cs]) => `${cs.join(', ')} ${cs.length > 1 ? 'each' : ''} ${why}${expandReason(why, status)}`);
        const catsTxt = ct.need === 1 ? (starsPer > 1 ? 'its remaining queen' : 'its queen') : `its ${ct.need} remaining queens`;
        const leftTxt = ct.left ? `only ${ct.left} square${ct.left === 1 ? '' : 's'}` : 'no square';
        chain.push({ k: 'doom', html: `But then ${gname} has ${leftTxt} left for ${catsTxt}: ${parts.join('; ')}.` });
      } else if (ct.type === 'conflict-cat') {
        doom = [[ct.r, ct.c]];
        chain.push({ k: 'doom', html: `But ${coord(ct.r, ct.c)} now holds a queen, yet it ${ct.why}${expandReason(ct.why, status)} — two queens can’t share that.` });
      } else {
        doom = [[ct.r, ct.c]];
        const xNote = ct.xWhy ? ` (already ruled out — it ${ct.xWhy}${expandReason(ct.xWhy, status)})` : '';
        chain.push({ k: 'doom', html: `But ${ct.why}, forcing a queen at ${coord(ct.r, ct.c)}${xNote} — impossible.` });
      }
      chain.push({ k: 'end', html: `So ${coord(r, c)} cannot hold a queen — mark it ✕.` });
      return { kind: 'Rule out a cell', deep: true, cell: [r, c], action: 'x', head: `No queen can sit at R${r + 1}C${c + 1}.`, chain, hyp: [r, c], steps, doom };
    }

    // ── Strategy 0: Pure Solution & Mistakes ────────────────────────
    function solvePure(capLimit) {
      const SP = starsPer;
      const colCnt = Array(N).fill(0), regCnt = new Map(), placed = [], sols = [];
      const okAdj = (r, c) => placed.every(([pr, pc]) => Math.abs(pr - r) > 1 || Math.abs(pc - c) > 1);
      let budget = SOLVE_NODE_BUDGET;
      (function go(r) {
        if (sols.length >= capLimit || budget < 0) return;
        if (r === N) { sols.push(placed.map(x => x.slice())); return; }
        (function pick(start, left) {
          if (sols.length >= capLimit || --budget < 0) return;
          if (!left) { go(r + 1); return; }
          for (let c = start; c < N; c++) {
            if (colCnt[c] >= SP) continue; const g = regionOf[r][c]; if (g == null) continue;
            if ((regCnt.get(g) || 0) >= SP) continue; if (!okAdj(r, c)) continue;
            colCnt[c]++; regCnt.set(g, (regCnt.get(g) || 0) + 1); placed.push([r, c]);
            pick(c + 2, left - 1);
            placed.pop(); colCnt[c]--; regCnt.set(g, regCnt.get(g) - 1);
          }
        })(0, SP);
      })(0);
      return sols;
    }

    function findIncorrectMarks(M, pure) {
      const sols = pure || solvePure(2); if (sols.length !== 1) return null;
      const sol = new Set(sols[0].map(([r, c]) => r + ',' + c));
      for (const [r, c] of M.cat) {
        if (!sol.has(r + ',' + c))
          return {
            kind: 'Fix a mistake', cell: [r, c], action: 'clear',
            head: `The queen at R${r + 1}C${c + 1} can’t be right.`,
            chain: [
              { k: 'doom', html: `No solution to this board places a queen at ${coord(r, c)} — it clashes with rows, columns, regions or spacing.` },
              { k: 'end', html: `Clear it, then re-check anything deduced from it.` }
            ],
            hyp: null, steps: [], doom: [[r, c]], ring: [], xprev: []
          };
      }
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (mark[r][c] === 'x' && sol.has(r + ',' + c))
          return {
            kind: 'Fix a mistake', cell: [r, c], action: 'clear',
            head: `The ✕ at R${r + 1}C${c + 1} can’t be right.`,
            chain: [
              { k: 'doom', html: `This board’s solution needs a queen at ${coord(r, c)}, but it’s marked ✕.` },
              { k: 'end', html: `Clear the ✕ so the queen can go there.` }
            ],
            hyp: null, steps: [], doom: [[r, c]], ring: [], xprev: []
          };
      }
      return null;
    }

    function findMissedX(M) {
      const SP = starsPer, { rowCnt, colCnt, regCnt } = M;
      for (const [cr, cc] of M.cat) {
        const g = regionOf[cr][cc], miss = [];
        const rowFull = rowCnt[cr] >= SP, colFull = colCnt[cc] >= SP, regFull = (regCnt.get(g) || 0) >= SP;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (r === cr && c === cc) continue;
          if (mark[r][c]) continue;
          if ((rowFull && r === cr) || (colFull && c === cc) || (regFull && regionOf[r][c] === g) || (Math.abs(r - cr) <= 1 && Math.abs(c - cc) <= 1)) miss.push([r, c]);
        }
        if (miss.length) {
          let blocks;
          if (SP === 1) blocks = `blocks its whole row, column and ${nameOf(g)} region, plus the squares it touches`;
          else {
            const full = []; if (rowFull) full.push(`row ${cr + 1}`); if (colFull) full.push(`column ${cc + 1}`); if (regFull) full.push(`the ${nameOf(g)} region`);
            blocks = full.length
              ? `blocks the squares it touches — and ${joinNames(full)} already ${full.length > 1 ? 'have' : 'has'} ${SP === 2 ? 'both' : 'all'} queens, ruling out the rest`
              : `blocks the squares it touches`;
          }
          return {
            kind: 'Tidy up', action: 'x', cells: miss.map(x => x.slice()),
            head: `Rule out ${miss.length} square${miss.length > 1 ? 's' : ''} around the queen at R${cr + 1}C${cc + 1}.`,
            chain: [
              { k: 'step', html: `The queen at ${coord(cr, cc)} ${blocks}.` },
              { k: 'doom', html: `${miss.length > 1 ? 'Those squares aren’t' : 'That square isn’t'} marked ✕ yet.` }
            ],
            hyp: null, steps: [], doom: miss.map(x => x.slice()), ring: [[cr, cc]], xprev: miss.map(x => x.slice())
          };
        }
      }
      return null;
    }

    function findEasyHint(M, pure) {
      return findIncorrectMarks(M, pure) || findMissedX(M) || findForcedCat(M) || findTrappedColour(M) || findPairSqueeze(M) || findCapacityForced(M) || findSegmentCapacity(M) || findLockedSets(M) || findLineSqueeze(M) || findColorKiller(M);
    }

    function findHint() {
      return findEasyHint(buildCandidates()) || findContradiction();
    }

    // ── Deep Trap & Assessment ──────────────────────────────────────
    const TRAP_LOOKAHEAD = 8;
    const TRAP_EASY_RUN = 6;
    function simApply(h) { (h.cells || [h.cell]).forEach(([r, c]) => { mark[r][c] = h.action === 'clear' ? null : h.action; }); }

    function measureTrap(pure) {
      const saved = mark; mark = saved.map(r => r.slice());
      const cells = [];
      while (cells.length < TRAP_LOOKAHEAD) {
        if (findEasyHint(buildCandidates(), pure)) break;
        const h = findContradiction(); if (!h) break;
        cells.push(h.cell); simApply(h);
      }
      mark = saved;
      return { depth: cells.length, cells };
    }

    function bestSureCat(pure) {
      if (pure.length !== 1) return null;
      const saved = mark; let best = null;
      for (const [r, c] of pure[0]) {
        if (saved[r][c]) continue;
        mark = saved.map(row => row.slice()); mark[r][c] = 'cat';
        let run = 0;
        while (run < TRAP_EASY_RUN) {
          const h = findEasyHint(buildCandidates(), pure); if (!h) break;
          simApply(h); run++;
        }
        if (!best || run > best.run) best = { r, c, run };
      }
      mark = saved;
      return best && [best.r, best.c];
    }

    function assessBoard() {
      const pure = solvePure(2);
      const saved = mark; mark = saved.map(r => r.slice());
      let hints = 0, walls = 0, firstWall = 0, inWall = false;
      const CAP = 3 * N * N;
      while (hints < CAP) {
        const easy = findEasyHint(buildCandidates(), pure);
        const h = easy || findContradiction();
        if (!h) break;
        hints++;
        if (easy) inWall = false;
        else if (!inWall) { walls++; inWall = true; if (!firstWall) firstWall = hints; }
        simApply(h);
      }
      mark = saved;
      return { walls, firstWall };
    }

    function assessNote(a) {
      return (!a || !a.walls)
        ? ', and every step to the finish is human-findable.'
        : '. Heads up: ' + (a.walls === 1 ? 'one stretch' : a.walls + ' stretches') + ' of this board requires “suppose a queen…” lookahead, the first around hint ' + a.firstWall + ' — the hint panel offers a skip when you get there.';
    }

    function refreshAssessment() {
      if (isComplete()) return;
      if (unpainted() || regionCount() !== N) { hideStatus(); return; }
      const res = solve(2);
      if (res.bad || !res.sols || res.sols.length !== 1) { hideStatus(); return; }
      showStatus('ok', 'Board validated — a unique solution exists' + assessNote(assessBoard()));
    }

    // ── Undo Stack ──────────────────────────────────────────────────
    const UNDO_MAX = 14;
    function snapshot() {
      return {
        N, stars: starsPer, regionOf: regionOf.map(r => r.slice()), mark: mark.map(r => r.slice()),
        importReview: importReview.map(x => x.slice()), palette: paletteColors.slice(), activeColor
      };
    }
    function pushUndo() {
      undoStack.push(snapshot());
      if (undoStack.length > UNDO_MAX) undoStack.shift();
      updateUndoBtn();
    }
    function doUndo() {
      if (!undoStack.length) return;
      const st = undoStack.pop();
      N = st.N; if (sizeSel) sizeSel.value = String(N);
      setStars(st.stars || 1);
      regionOf = st.regionOf.map(r => r.slice()); mark = st.mark.map(r => r.slice());
      importReview = st.importReview.map(x => x.slice()); paletteColors = st.palette.slice(); activeColor = st.activeColor;
      clearTemp();
      solutionCells = null; hintEl.className = 'nq-hint'; clearHintHighlight(); hideStatus();
      buildPalette(); render(); updateUndoBtn();
    }
    function updateUndoBtn() {
      const b = document.getElementById('nqUndoBtn');
      if (b) b.disabled = editMode || undoStack.length === 0;
    }

    // ── UI Status & Hints ───────────────────────────────────────────
    function showStatus(cls, msg) {
      statusEl.className = 'nq-status show ' + cls;
      statusEl.textContent = pieceText(msg);
    }
    function hideStatus() { statusEl.className = 'nq-status'; }
    function clearHintHighlight() { hintCells = { hyp: null, steps: [], doom: [], ring: [], pinch: [], xprev: [] }; }
    function hideHint() { hintEl.className = 'nq-hint'; clearHintHighlight(); render(); }

    function regionCount() {
      const s = new Set();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (regionOf[r][c] != null) s.add(regionOf[r][c]);
      return s.size;
    }
    function unpainted() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (regionOf[r][c] == null) return true;
      return false;
    }

    function showHintObj(h) {
      document.getElementById('nqHintKind').textContent = h.kind;
      document.getElementById('nqHintHead').textContent = pieceText(h.head);
      const ul = document.getElementById('nqHintChain'); ul.innerHTML = '';
      h.chain.forEach(step => {
        const li = document.createElement('li'); li.className = 'k-' + step.k; li.innerHTML = pieceText(step.html); ul.appendChild(li);
      });
      hintCells = { hyp: h.hyp || null, steps: h.steps || [], doom: h.doom || [], ring: h.ring || [], pinch: h.pinch || [], xprev: h.xprev || [] };
      const n = (h.cells || [h.cell]).length;
      document.getElementById('nqApplyHint').textContent =
        h.action === 'cat' ? pieceText('Place the queen') :
          h.action === 'clear' ? 'Clear this mark' :
            (n > 1 ? `Mark ${n} ✕` : 'Mark ✕');
      const trapEl = document.getElementById('nqHintTrap');
      if (h.deep) {
        const more = (h.trapDepth || 1) - 1;
        let msg = 'This step can only be proven by “suppose a queen here” lookahead. ';
        msg += h.trapDepth >= TRAP_LOOKAHEAD ? `At least the next ${TRAP_LOOKAHEAD - 1} hints are the same.`
          : more > 0 ? `The next ${more} hint${more > 1 ? 's are' : ' is'} the same, then the board opens up again.`
            : 'The next hint after this one is human-findable again.';
        document.getElementById('nqTrapMsg').textContent = pieceText(msg);
        document.getElementById('nqTrapCat').classList.toggle('hidden', !h.sureCat);
        const tc = h.trapCells || [], showBtn = document.getElementById('nqTrapShow');
        showBtn.classList.toggle('hidden', tc.length < 2);
        if (tc.length >= 2) showBtn.textContent = (h.trapDepth >= TRAP_LOOKAHEAD
          ? `Show the next ${tc.length} ✕ at once 👀`
          : `Show the whole stretch — ${tc.length} ✕ at once 👀`);
        trapEl.classList.remove('hidden');
      } else trapEl.classList.add('hidden');
      hintEl.className = 'nq-hint show'; hintEl._pending = h; render();
      hintEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ── Testing (Pencil) Mode ───────────────────────────────────────
    function clearTemp() { tempMark = Array.from({ length: N }, () => Array(N).fill(null)); }
    function editFeedback(cls, msg) {
      const el = document.getElementById('nqEditMsg'), vb = document.getElementById('nqVerifyBtn');
      if (el) { el.className = 'emsg' + (cls ? ' show ' + cls : ''); el.textContent = pieceText(msg) || ''; }
      if (vb) { vb.className = 'btn ghost' + (cls ? ' v-' + cls : ''); }
    }
    function tempList() {
      const a = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++)
        if (tempMark[r] && tempMark[r][c] && !mark[r][c]) a.push([r, c, tempMark[r][c]]);
      return a;
    }
    function setEditMode(on) {
      if (editMode === on) return;
      editMode = on;
      if (on) { setTool('x'); solutionCells = null; }
      else clearTemp();
      editFeedback(null);
      const pBtn = document.getElementById('nqPencilBtn');
      const eBar = document.getElementById('nqEditBar');
      if (pBtn) pBtn.classList.toggle('on', on);
      if (eBar) eBar.classList.toggle('hidden', !on);
      board.classList.toggle('editing', on);
      document.querySelectorAll('#nqTools button').forEach(b => { if (b.dataset.tool !== 'x') b.disabled = on; });
      hideHint(); hideStatus(); updateUndoBtn(); render();
    }

    // ── Button Bindings ─────────────────────────────────────────────
    const solveBtn = document.getElementById('nqSolveBtn');
    if (solveBtn) {
      solveBtn.onclick = () => {
        hideHint();
        if (unpainted()) { showStatus('warn', 'Some cells have no region yet — paint every cell first.'); return; }
        if (regionCount() !== N) { showStatus('warn', `This ${N}×${N} board needs exactly ${N} regions; it has ${regionCount()}.`); return; }
        const res = solve(2);
        if (res.bad) { showStatus('err', 'Your current marks conflict: ' + res.bad + '.'); solutionCells = null; render(); return; }
        if (res.sols.length === 0) { showStatus('err', 'No solution fits the board and your current marks.'); solutionCells = null; render(); return; }
        if (res.sols.length > 1) { showStatus('warn', 'This board has more than one solution — showing one valid placement.'); }
        else { showStatus('ok', 'Solved — unique solution found! 👑'); }
        solutionCells = res.sols[0]; render();
      };
    }

    const hintBtn = document.getElementById('nqHintBtn');
    if (hintBtn) {
      hintBtn.onclick = () => {
        solutionCells = null;
        if (unpainted()) { showStatus('warn', 'Paint every cell with a region before asking for a hint.'); return; }
        if (regionCount() !== N) { showStatus('warn', `This ${N}×${N} board needs exactly ${N} regions; it has ${regionCount()}.`); return; }
        const check = solve(1);
        const inconsistent = !!check.bad || check.sols.length === 0;
        const h = findHint();
        if (h && (!inconsistent || h.kind === 'Fix a mistake')) {
          if (h.deep) { const pure = solvePure(2); const t = measureTrap(pure); h.trapDepth = t.depth; h.trapCells = t.cells; h.sureCat = bestSureCat(pure); }
          hideStatus(); showHintObj(h); return;
        }
        if (check.bad) { showStatus('err', 'Your marks conflict: ' + check.bad + '. Check your queens.'); return; }
        if (check.sols.length === 0) { showStatus('err', 'No solution fits your current marks — one of them is wrong.'); return; }
        showStatus('ok', 'No single forced step right now. Try the Solve button, or place a queen you are sure of and ask again.');
      };
    }

    const applyHintBtn = document.getElementById('nqApplyHint');
    if (applyHintBtn) {
      applyHintBtn.onclick = () => {
        const h = hintEl._pending; if (!h) return;
        pushUndo();
        const cells = h.cells || [h.cell];
        cells.forEach(([r, c]) => { mark[r][c] = h.action === 'clear' ? null : h.action; });
        const f = cells[0];
        const label = h.action === 'cat' ? `a queen at (${f[0] + 1},${f[1] + 1})`
          : h.action === 'clear' ? `cleared (${f[0] + 1},${f[1] + 1})`
            : `${cells.length} ✕`;
        hideHint(); showStatus('ok', `Applied ${label}. Ask for the next hint.`);
        render();
      };
    }

    const clearHintBtn = document.getElementById('nqClearHint');
    if (clearHintBtn) clearHintBtn.onclick = hideHint;

    const trapCatBtn = document.getElementById('nqTrapCat');
    if (trapCatBtn) {
      trapCatBtn.onclick = () => {
        const h = hintEl._pending; if (!h || !h.sureCat) return;
        pushUndo();
        const [r, c] = h.sureCat; mark[r][c] = 'cat';
        hideHint();
        hintCells.ring = [[r, c]];
        showStatus('ok', `Placed a guaranteed queen at R${r + 1}C${c + 1} — straight from the solution. Ask for next hint.`);
        render();
      };
    }

    const trapShowBtn = document.getElementById('nqTrapShow');
    if (trapShowBtn) {
      trapShowBtn.onclick = () => {
        const h = hintEl._pending; if (!h || !h.trapCells || h.trapCells.length < 2) return;
        const cells = h.trapCells.map(x => x.slice());
        const opens = h.trapDepth < TRAP_LOOKAHEAD;
        const names = joinNames(cells.map(([r, c]) => coord(r, c)));
        showHintObj({
          kind: 'Rule out cells',
          head: opens ? `These ${cells.length} squares are the whole lookahead stretch.`
            : `The next ${cells.length} lookahead ✕ squares.`,
          chain: [
            { k: 'step', html: `Lookahead rules out ${names}, in that order.` },
            {
              k: 'end', html: opens ? `Mark them all — after that the next hint is human-findable again.`
                : `Mark them all, then ask for another hint to continue.`
            }
          ],
          action: 'x', cells, xprev: cells, ring: cells
        });
      };
    }

    const pencilBtn = document.getElementById('nqPencilBtn');
    if (pencilBtn) pencilBtn.onclick = () => setEditMode(!editMode);

    const verifyBtn = document.getElementById('nqVerifyBtn');
    if (verifyBtn) {
      verifyBtn.onclick = () => {
        const tl = tempList();
        if (!tl.length) { editFeedback('warn', 'No temporary marks to check yet — add some ✕ or queens first.'); return; }
        if (unpainted()) { editFeedback('warn', 'Some cells have no region yet — paint every cell first.'); return; }
        if (regionCount() !== N) { editFeedback('warn', `This ${N}×${N} board needs exactly ${N} regions; it has ${regionCount()}.`); return; }
        const pure = solvePure(2);
        if (pure.length === 0) { editFeedback('err', 'This board has no solution at all — fix the regions before testing marks.'); return; }
        if (pure.length === 1) {
          const sol = new Set(pure[0].map(([r, c]) => r + ',' + c));
          const wrong = tl.filter(([r, c, m]) => m === 'cat' ? !sol.has(r + ',' + c) : sol.has(r + ',' + c));
          if (!wrong.length) {
            hintCells.doom = []; render();
            editFeedback('ok', `Verified — all ${tl.length} temporary mark${tl.length > 1 ? 's' : ''} match the solution. Tap Apply to keep them.`);
            return;
          }
          hintCells.doom = wrong.map(([r, c]) => [r, c]); render();
          const parts = wrong.slice(0, 4).map(([r, c, m]) => m === 'cat' ? `no queen belongs at R${r + 1}C${c + 1}` : `R${r + 1}C${c + 1} needs a queen, not ✕`);
          const more = wrong.length > 4 ? `; …and ${wrong.length - 4} more` : '';
          editFeedback('err', `${wrong.length} of ${tl.length} temporary mark${tl.length > 1 ? 's' : ''} don't match the solution: ${parts.join('; ')}${more}.`);
          return;
        }
        const saved = mark; mark = saved.map(r => r.slice());
        tl.forEach(([r, c, m]) => { mark[r][c] = m; });
        const res = solve(1); mark = saved;
        if (res.bad) { editFeedback('err', 'Your temporary marks conflict: ' + res.bad + '.'); return; }
        if (!res.sols.length) { editFeedback('err', 'No solution fits with these temporary marks — at least one is wrong.'); return; }
        editFeedback('warn', 'The temporary marks fit a possible solution, but this board has multiple solutions.');
      };
    }

    const applyEditBtn = document.getElementById('nqApplyEditBtn');
    if (applyEditBtn) {
      applyEditBtn.onclick = () => {
        const tl = tempList();
        if (!tl.length) { setEditMode(false); showStatus('warn', 'No temporary marks to apply — left testing mode.'); return; }
        pushUndo();
        tl.forEach(([r, c, m]) => { mark[r][c] = m; });
        solutionCells = null;
        setEditMode(false);
        showStatus('ok', `Applied ${tl.length} temporary mark${tl.length > 1 ? 's' : ''} — they’re permanent now.`);
      };
    }

    const clearMarksBtn = document.getElementById('nqClearMarks');
    if (clearMarksBtn) {
      clearMarksBtn.onclick = () => {
        setEditMode(false);
        pushUndo();
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) mark[r][c] = null;
        solutionCells = null; importReview = []; hideHint(); hideStatus(); render();
        refreshAssessment();
      };
    }

    const resetBtn = document.getElementById('nqReset');
    if (resetBtn) {
      resetBtn.onclick = () => {
        setEditMode(false); pushUndo(); setStars(1); blank(); importReview = [];
        paletteColors = PALETTE.slice(); activeColor = PALETTE[0].hex; buildPalette(); hideHint(); hideStatus(); render();
      };
    }

    const undoBtn = document.getElementById('nqUndoBtn');
    if (undoBtn) undoBtn.onclick = doUndo;

    const iconBtn = document.getElementById('nqIconBtn');
    const ICON_CYCLE = ['queen', 'cat', 'duck'];
    function setPieceIcon(ic) {
      pieceIcon = PIECE_GLYPH[ic] ? ic : 'queen';
      board.classList.toggle('queen', pieceIcon === 'queen');
      board.classList.toggle('duck', pieceIcon === 'duck');
      if (iconBtn) iconBtn.textContent = PIECE_GLYPH[pieceIcon];
      refreshPieceText();
    }
    if (iconBtn) iconBtn.onclick = () => setPieceIcon(ICON_CYCLE[(ICON_CYCLE.indexOf(pieceIcon) + 1) % ICON_CYCLE.length]);

    if (sizeSel) {
      sizeSel.onchange = () => {
        setEditMode(false); pushUndo(); N = +sizeSel.value; blank(); importReview = []; hideHint(); hideStatus(); render();
      };
    }

    const starsBtn = document.getElementById('nqStarsBtn');
    function setStars(k) {
      starsPer = k === 2 ? 2 : 1;
      if (starsBtn) {
        starsBtn.textContent = '×' + starsPer;
        starsBtn.classList.toggle('on', starsPer > 1);
      }
    }
    if (starsBtn) {
      starsBtn.onclick = () => {
        setEditMode(false); pushUndo(); setStars(starsPer === 1 ? 2 : 1);
        solutionCells = null; hideHint(); hideStatus(); render();
        refreshAssessment();
        if (!statusEl.classList.contains('show'))
          showStatus('ok', starsPer === 2 ? 'Double-queen mode: 2 queens per row, column and colour — still no touching.'
            : 'Classic mode: 1 queen per row, column and colour.');
      };
    }

    // ── Computer Vision & Screenshot Importer ───────────────────────
    const overlay = document.getElementById('nqImpOverlay');
    const dropZone = document.getElementById('nqDropZone');
    const fileInput = document.getElementById('nqFileInput');
    const stage = document.getElementById('nqStage');
    const stageImg = document.getElementById('nqStageImg');
    const cropBox = document.getElementById('nqCropBox');
    const impSize = document.getElementById('nqImpSize');
    const readBtn = document.getElementById('nqReadBtn');
    let natImg = null, dispScale = 1, dataCache = null;

    function rgbDist(a, b) { const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return Math.sqrt(x * x + y * y + z * z); }
    function rgbToHex(c) { return '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
    function med(a) { a.sort((x, y) => x - y); return a[a.length >> 1]; }

    const importBtn = document.getElementById('nqImportBtn');
    if (importBtn && overlay) importBtn.onclick = () => overlay.classList.add('show');

    const impCancel = document.getElementById('nqImpCancel');
    if (impCancel && overlay) impCancel.onclick = () => overlay.classList.remove('show');

    if (overlay) {
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('show'); });
    }

    // Board text snapshots
    const dataOverlay = document.getElementById('nqDataOverlay');
    const dataText = document.getElementById('nqDataText');
    const dataStatus = document.getElementById('nqDataStatus');
    function dataMsg(msg, ok) {
      if (!dataStatus) return;
      dataStatus.style.display = 'block';
      dataStatus.style.color = ok ? 'var(--green)' : 'var(--red)';
      dataStatus.textContent = msg;
    }

    function exportBoard() {
      const colors = [], idx = {};
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const g = regionOf[r][c];
        if (g != null && !(g in idx)) { idx[g] = colors.length; colors.push(g); }
      }
      const L = i => String.fromCharCode(65 + i);
      const legend = colors.map((h, i) => `${L(i)}=${h}`).join(' ');
      let reg = '', mk = '';
      for (let r = 0; r < N; r++) {
        let rr = '', mm = '';
        for (let c = 0; c < N; c++) {
          const g = regionOf[r][c];
          rr += g == null ? '.' : L(idx[g]);
          mm += mark[r][c] === 'cat' ? 'Q' : mark[r][c] === 'x' ? 'x' : '.';
        }
        reg += rr + '\n'; mk += mm + '\n';
      }
      return `QUEENS ${APP_VERSION} board\nsize ${N}\nstars ${starsPer}\nicon ${pieceIcon}\ncolors ${legend}\nregions\n${reg}marks\n${mk}`.trim();
    }

    function parseBoardText(text) {
      const raw = String(text).replace(/\r/g, '').split('\n');
      const val = k => {
        for (const l of raw) {
          const m = l.match(new RegExp('^\\s*' + k + '\\s+(.+?)\\s*$', 'i'));
          if (m) return m[1];
        }
        return null;
      };
      const n = parseInt(val('size'), 10);
      if (!(n >= 5 && n <= 12)) throw new Error('missing or out-of-range "size" (need 5–12)');
      const stars = parseInt(val('stars'), 10) === 2 ? 2 : 1;
      const iconRaw = (val('icon') || 'queen').trim();
      const icon = PIECE_GLYPH[iconRaw] ? iconRaw : 'queen';
      const legend = {};
      (val('colors') || '').split(/\s+/).forEach(t => {
        const m = t.match(/^([A-Za-z])=#?([0-9a-fA-F]{3,8})$/);
        if (m) legend[m[1].toUpperCase()] = '#' + m[2];
      });
      const grid = label => {
        const gi = raw.findIndex(l => l.trim().toLowerCase() === label);
        if (gi < 0) return null;
        const rows = [];
        for (let k = gi + 1; k < raw.length && rows.length < n; k++) {
          const t = raw[k].trim(); if (t === '') continue; rows.push(t);
        }
        return rows;
      };
      const regRows = grid('regions');
      if (!regRows || regRows.length < n) throw new Error('missing or short "regions" grid');
      if (regRows.some(r => r.length < n)) throw new Error('a "regions" row is shorter than ' + n);
      return { n, stars, icon, legend, regRows, mkRows: grid('marks') };
    }

    function loadBoardFromText(text) {
      const b = parseBoardText(text);
      const seen = {}, order = [];
      for (let r = 0; r < b.n; r++) for (let c = 0; c < b.n; c++) {
        const ch = b.regRows[r][c].toUpperCase();
        if (ch !== '.' && !(ch in seen)) { seen[ch] = 1; order.push(ch); }
      }
      const hexOf = {}; order.forEach((ch, i) => { hexOf[ch] = b.legend[ch] || PALETTE[i % PALETTE.length].hex; });
      setEditMode(false); pushUndo();
      const nmL = assignNames(order.map(ch => hexOf[ch]));
      paletteColors = order.length ? order.map(ch => ({ hex: hexOf[ch], name: nmL.get(hexOf[ch]) })) : PALETTE.slice();
      activeColor = paletteColors[0].hex; buildPalette();
      N = b.n; if (sizeSel) sizeSel.value = String(N); blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const ch = b.regRows[r][c].toUpperCase();
        regionOf[r][c] = ch === '.' ? null : hexOf[ch];
        const mch = b.mkRows && b.mkRows[r] ? b.mkRows[r][c] : '.';
        mark[r][c] = (mch === 'C' || mch === 'Q') ? 'cat' : mch === 'x' ? 'x' : null;
      }
      setPieceIcon(b.icon); setStars(b.stars);
      importReview = []; solutionCells = null; hideHint(); render();
    }

    const dataLink = document.getElementById('nqDataLink');
    if (dataLink && dataOverlay) {
      dataLink.onclick = e => {
        e.preventDefault(); dataText.value = exportBoard(); if (dataStatus) dataStatus.style.display = 'none';
        dataOverlay.classList.add('show');
      };
    }
    const dataClose = document.getElementById('nqDataClose');
    if (dataClose && dataOverlay) dataClose.onclick = () => dataOverlay.classList.remove('show');
    if (dataOverlay) {
      dataOverlay.addEventListener('click', e => { if (e.target === dataOverlay) dataOverlay.classList.remove('show'); });
    }
    const dataCopy = document.getElementById('nqDataCopy');
    if (dataCopy && dataText) {
      dataCopy.onclick = () => {
        dataText.focus(); dataText.select(); dataText.setSelectionRange(0, dataText.value.length);
        const ok = () => dataMsg('Copied to clipboard.', true), no = () => dataMsg('Copy manually.', false);
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(dataText.value).then(ok).catch(no);
        else no();
      };
    }
    const dataLoad = document.getElementById('nqDataLoad');
    if (dataLoad && dataText) {
      dataLoad.onclick = () => {
        try { loadBoardFromText(dataText.value); dataOverlay.classList.remove('show'); showStatus('ok', 'Board loaded from text snapshot.'); }
        catch (err) { dataMsg('Couldn’t read snapshot: ' + (err && err.message || err), false); }
      };
    }

    if (dropZone && fileInput) {
      dropZone.onclick = () => fileInput.click();
      fileInput.onchange = e => { const f = e.target.files && e.target.files[0]; if (f) loadFile(f); fileInput.value = ''; };
      ['dragover', 'dragenter'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('over'); }));
      ['dragleave'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('over'); }));
      dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) loadFile(f); });
    }

    // Global paste listener on window
    window.addEventListener('paste', e => {
      const isNQueenActive = document.getElementById('nqueenSection')?.classList.contains('active');
      const isOverlayOpen = overlay && overlay.classList.contains('show');
      if (!isNQueenActive && !isOverlayOpen) return;

      const items = [...((e.clipboardData || {}).items || [])];
      const it = items.find(i => i.type.indexOf('image') === 0);
      if (it) {
        e.preventDefault();
        loadFile(it.getAsFile());
      }
    });

    // Enter & Escape keyboard shortcuts for OCR importer modal
    window.addEventListener('keydown', e => {
      if (overlay && overlay.classList.contains('show')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (readBtn) readBtn.click();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          overlay.classList.remove('show');
        }
      }
    });

    const pasteBtn = document.getElementById('nqPasteBtn');
    if (pasteBtn) {
      pasteBtn.onclick = async () => {
        if (!navigator.clipboard || !navigator.clipboard.read) {
          impMsg('Clipboard access not supported — select file via button.'); return;
        }
        impMsg('Reading clipboard…');
        try {
          const items = await navigator.clipboard.read();
          for (const it of items) {
            const type = it.types.find(t => t.indexOf('image/') === 0);
            if (type) { const blob = await it.getType(type); impMsg(''); loadFile(blob); return; }
          }
          impMsg('No image found on clipboard.');
        } catch (err) {
          impMsg('Could not read clipboard. Copy screenshot first, then click Paste.');
        }
      };
    }

    const fastImportBtn = document.getElementById('nqFastImportBtn');
    if (fastImportBtn) {
      fastImportBtn.onclick = async () => {
        if (!navigator.clipboard || !navigator.clipboard.read) { if (overlay) overlay.classList.add('show'); return; }
        const orig = fastImportBtn.textContent; fastImportBtn.textContent = '…'; fastImportBtn.disabled = true;
        try {
          const items = await navigator.clipboard.read();
          for (const it of items) {
            const type = it.types.find(t => t.indexOf('image/') === 0);
            if (type) {
              const blob = await it.getType(type);
              fastImportMode = true;
              loadFile(blob);
              fastImportBtn.textContent = orig;
              fastImportBtn.disabled = false;
              return;
            }
          }
          if (overlay) overlay.classList.add('show');
          impMsg('No image on clipboard — copy a puzzle screenshot first.');
        } catch (e) {
          if (overlay) overlay.classList.add('show');
          impMsg('Clipboard error. Allow clipboard permissions or upload screenshot.');
        }
        fastImportBtn.textContent = orig; fastImportBtn.disabled = false;
      };
    }

    function impMsg(t) {
      const el = document.getElementById('nqImpStatus');
      if (!el) return;
      el.textContent = pieceText(t) || '';
      el.style.display = t ? 'block' : 'none';
    }

    function loadFile(file) {
      if (!file) { impMsg('No image received — try again.'); return; }
      impMsg('Processing image…');
      const reader = new FileReader();
      reader.onerror = () => impMsg('Could not read file.');
      reader.onload = () => {
        stageImg.onload = () => {
          natImg = stageImg; dataCache = null;
          showStage(true); impMsg('Board detected! Click "⚡ Read & Import Board" or press Enter ↵ to solve.');
          if (fastImportMode && overlay) overlay.classList.add('show');
          requestAnimationFrame(() => {
            const cw = stageImg.clientWidth || stageImg.naturalWidth || 1;
            dispScale = stageImg.naturalWidth / cw;
            try {
              const box = autoDetectCrop();
              if (box.n && impSize) impSize.value = String(box.n);
              placeCrop(box.x / dispScale, box.y / dispScale, box.s / dispScale);
            } catch (_) {
              placeCrop(0, 0, Math.min(stageImg.clientWidth, stageImg.clientHeight) || 40);
            }
            if (fastImportMode) {
              fastImportMode = false;
              if (readBtn) readBtn.onclick();
            }
          });
        };
        stageImg.onerror = () => {
          natImg = null; showStage(false);
          impMsg('Could not load image format.');
        };
        stageImg.src = reader.result;
      };
      reader.readAsDataURL(file);
    }

    let gScale = 1;
    function getData() {
      if (!dataCache) {
        const q = Math.min(1, 1600 / Math.max(natImg.naturalWidth, natImg.naturalHeight));
        gScale = q;
        const cw = Math.max(1, Math.round(natImg.naturalWidth * q)), ch = Math.max(1, Math.round(natImg.naturalHeight * q));
        const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        cx.drawImage(natImg, 0, 0, cw, ch);
        dataCache = cx.getImageData(0, 0, cw, ch);
      }
      return dataCache;
    }

    const TILE_MIN_L = 0.31;
    const FLAT_RAD = 2, FLAT_TOL = 8;

    function autoDetectCrop() {
      const d = getData(), w = d.width, h = d.height, px = d.data;
      const step = Math.max(1, Math.floor(Math.min(w, h) / 600));
      const XS = [], YS = [];
      const flatField = (x, y, i) => {
        for (let k = 0; k < 4; k++) {
          const nx = x + (k === 0 ? FLAT_RAD : k === 1 ? -FLAT_RAD : 0), ny = y + (k === 2 ? FLAT_RAD : k === 3 ? -FLAT_RAD : 0);
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) return false;
          const j = (ny * w + nx) * 4;
          if (Math.abs(px[i] - px[j]) > FLAT_TOL || Math.abs(px[i + 1] - px[j + 1]) > FLAT_TOL || Math.abs(px[i + 2] - px[j + 2]) > FLAT_TOL) return false;
        }
        return true;
      };
      for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4, R = px[i] / 255, G = px[i + 1] / 255, B = px[i + 2] / 255;
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2, dd = mx - mn;
        const s = dd === 0 ? 0 : dd / (1 - Math.abs(2 * l - 1));
        if (l <= TILE_MIN_L || l >= 0.9) continue;
        if (s >= 0.12 || flatField(x, y, i)) { XS.push(x); YS.push(y); }
      }
      const TRIM_FRAC = 0.45;
      const profiles = (bx0, bx1, by0, by1) => {
        const col = new Float64Array(w), row = new Float64Array(h);
        for (let p = 0; p < XS.length; p++) {
          const x = XS[p], y = YS[p];
          if (x >= bx0 && x <= bx1 && y >= by0 && y <= by1) { col[x]++; row[y]++; }
        }
        return [col, row];
      };
      const trimEnds = (a, lo, hi) => {
        let bm = 0; for (let i = lo; i <= hi; i++) bm = Math.max(bm, a[i]);
        const tt = bm * TRIM_FRAC;
        while (lo < hi && a[lo] < tt) lo++;
        while (hi > lo && a[hi] < tt) hi--;
        return [lo, hi];
      };
      const runs = (a, lo, hi) => {
        let mx = 0; for (let i = lo; i <= hi; i++) mx = Math.max(mx, a[i]); const t = mx * TRIM_FRAC;
        let r = 0, on = false; for (let i = lo; i <= hi; i++) { const v = a[i] > t; if (v && !on) { r++; on = true; } else if (!v) on = false; } return r;
      };
      const runlist = (a, lo, hi) => {
        let mx = 0; for (let i = lo; i <= hi; i++) mx = Math.max(mx, a[i]);
        if (!mx) return [];
        const t = mx * TRIM_FRAC, out = []; let s = -1;
        for (let i = lo; i <= hi + 1; i++) {
          const v = i <= hi && a[i] > t;
          if (v && s < 0) s = i; else if (!v && s >= 0) { out.push([s, i - 1]); s = -1; }
        }
        return out;
      };
      const uniformBands = (a, lo, hi) => {
        const rl = runlist(a, lo, hi), bands = [], k = rl.length;
        let i = 0;
        while (i < k) {
          let j = i;
          while (j + 1 < k) {
            const seq = rl.slice(i, j + 2);
            const ws = seq.map(r => r[1] - r[0] + 1).sort((p, q) => p - q);
            const gs = []; for (let m = 0; m + 1 < seq.length; m++) gs.push(seq[m + 1][0] - seq[m][1] - 1);
            gs.sort((p, q) => p - q);
            const medw = ws[ws.length >> 1], medg = gs[gs.length >> 1];
            if (ws[ws.length - 1] > 1.8 * medw || ws[0] < medw / 1.8 || (medg > 0 && gs[gs.length - 1] > Math.max(2.2 * medg, 6))) break;
            j++;
          }
          if (j - i + 1 >= 5) { bands.push([rl[i][0], rl[j][1]]); i = j + 1; }
          else i++;
        }
        return bands;
      };
      const MINSPAN = Math.min(w, h) * 0.25;
      let best = null;
      const evaluate = (bx0, bx1, by0, by1) => {
        const pr = profiles(bx0, bx1, by0, by1);
        const [tx0, tx1] = trimEnds(pr[0], bx0, bx1), [ty0, ty1] = trimEnds(pr[1], by0, by1);
        const spanW = tx1 - tx0 + 1, spanH = ty1 - ty0 + 1;
        if (spanW < MINSPAN || spanH < MINSPAN) return;
        const sq = Math.min(spanW, spanH) / Math.max(spanW, spanH);
        if (sq < 0.65) return;
        let inside = 0;
        for (let p = 0; p < XS.length; p++) {
          const x = XS[p], y = YS[p];
          if (x >= tx0 && x <= tx1 && y >= ty0 && y <= ty1) inside++;
        }
        const dens = inside / ((spanW / step) * (spanH / step));
        const cr = runs(pr[0], tx0, tx1), rr = runs(pr[1], ty0, ty1);
        const match = cr === rr && cr >= 5 && cr <= 12;
        const score = spanW * spanH * sq * dens * dens * (match ? 4 : 1);
        if (!best || score > best.score) best = { score, tx0, tx1, ty0, ty1, col: pr[0], row: pr[1] };
      };

      const cs = Math.max(8, Math.round(Math.min(w, h) / 48));
      const gw = Math.ceil(w / cs), gh = Math.ceil(h / cs);
      const cnt = new Float64Array(gw * gh), tot = new Float64Array(gw * gh);
      for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) tot[((y / cs) | 0) * gw + ((x / cs) | 0)]++;
      for (let p = 0; p < XS.length; p++) cnt[((YS[p] / cs) | 0) * gw + ((XS[p] / cs) | 0)]++;
      const occ = new Uint8Array(gw * gh), seen = new Uint8Array(gw * gh);
      for (let i = 0; i < gw * gh; i++) occ[i] = tot[i] && cnt[i] / tot[i] >= 0.2 ? 1 : 0;
      for (let g0 = 0; g0 < gw * gh; g0++) {
        if (!occ[g0] || seen[g0]) continue;
        const stack = [g0]; seen[g0] = 1;
        let gx0 = g0 % gw, gx1 = gx0, gy0 = (g0 / gw) | 0, gy1 = gy0;
        while (stack.length) {
          const g = stack.pop(), gx = g % gw, gy = (g / gw) | 0;
          if (gx < gx0) gx0 = gx; if (gx > gx1) gx1 = gx; if (gy < gy0) gy0 = gy; if (gy > gy1) gy1 = gy;
          if (gx > 0 && occ[g - 1] && !seen[g - 1]) { seen[g - 1] = 1; stack.push(g - 1); }
          if (gx < gw - 1 && occ[g + 1] && !seen[g + 1]) { seen[g + 1] = 1; stack.push(g + 1); }
          if (gy > 0 && occ[g - gw] && !seen[g - gw]) { seen[g - gw] = 1; stack.push(g - gw); }
          if (gy < gh - 1 && occ[g + gw] && !seen[g + gw]) { seen[g + gw] = 1; stack.push(g + gw); }
        }
        if (Math.min(gx1 - gx0 + 1, gy1 - gy0 + 1) * cs < MINSPAN) continue;
        const bx0 = gx0 * cs, bx1 = Math.min(w - 1, (gx1 + 1) * cs - 1), by0 = gy0 * cs, by1 = Math.min(h - 1, (gy1 + 1) * cs - 1);
        const boxes = [[bx0, bx1, by0, by1]];
        const pr = profiles(bx0, bx1, by0, by1);
        for (const [a, b] of uniformBands(pr[1], by0, by1)) {
          boxes.push([bx0, bx1, a, b]);
          const c2 = profiles(bx0, bx1, a, b)[0];
          for (const [ca, cb] of uniformBands(c2, bx0, bx1)) boxes.push([ca, cb, a, b]);
        }
        for (const [a, b] of uniformBands(pr[0], bx0, bx1)) {
          boxes.push([a, b, by0, by1]);
          const r2 = profiles(a, b, by0, by1)[1];
          for (const [ra, rb] of uniformBands(r2, by0, by1)) boxes.push([a, b, ra, rb]);
        }
        const dedup = new Set();
        for (const bx of boxes) { const key = bx.join(); if (!dedup.has(key)) { dedup.add(key); evaluate(bx[0], bx[1], bx[2], bx[3]); } }
      }
      let x0, x1, y0, y1, colP, rowP;
      if (best) { x0 = best.tx0; x1 = best.tx1; y0 = best.ty0; y1 = best.ty1; colP = best.col; rowP = best.row; }
      else {
        const col = new Float64Array(w), row = new Float64Array(h);
        for (let p = 0; p < XS.length; p++) { col[XS[p]]++; row[YS[p]]++; }
        const boundPeak = (a, len) => {
          let mx = 0; for (let i = 0; i < len; i++) mx = Math.max(mx, a[i]);
          const t = mx * 0.18, gapTol = Math.ceil(Math.min(w, h) / (step * 50));
          let bestSz = 0, bs = 0, be = 0, curS = 0, curE = 0, gap = 0, inB = false;
          for (let i = 0; i < len; i++) {
            if (a[i] > t) { if (!inB) { inB = true; curS = i; gap = 0; } curE = i; gap = 0; }
            else if (inB) { if (++gap > gapTol) { const sz = curE - curS + 1; if (sz > bestSz) { bestSz = sz; bs = curS; be = curE; } inB = false; } }
          }
          if (inB) { const sz = curE - curS + 1; if (sz > bestSz) { bs = curS; be = curE; } }
          return trimEnds(a, bs, be);
        };
        [x0, x1] = boundPeak(col, w); [y0, y1] = boundPeak(row, h);
        colP = col; rowP = row;
        if (x1 <= x0 || y1 <= y0) return { x: 0, y: 0, s: Math.min(w, h) / gScale, n: 0 };
      }

      const EDGE_RUN_FRAC = 0.10;
      const extendEnd = (a, lo, hi, dir, t, t2, mw, pitch, anchor) => {
        const edge = dir < 0 ? lo : hi, tol = Math.round(pitch * 0.35);
        for (let k = -tol; k <= tol; k++) {
          const i = edge + dir * (pitch + k);
          if (i < 0 || i >= a.length || a[i] <= t) continue;
          let p = i; while (p > 0 && a[p - 1] > t) p--;
          let q = i; while (q < a.length - 1 && a[q + 1] > t) q++;
          const width = q - p + 1;
          if (width < mw * 0.6 || width > mw * 1.6) continue;
          if (dir < 0 ? q >= lo : p <= hi) continue;
          if (Math.abs(p - (anchor + dir * pitch)) > tol) continue;
          let peak = 0; for (let m = p; m <= q; m++) peak = Math.max(peak, a[m]);
          if (peak > t2) continue;
          return { edge: dir < 0 ? p : q, peak };
        }
        return null;
      };
      const recoverEdges = (a, lo, hi) => {
        const rl = runlist(a, lo, hi);
        if (rl.length < 3) return [lo, hi, 0];
        const ws = rl.map(r => r[1] - r[0] + 1).sort((p, q) => p - q);
        const ps = []; for (let m = 0; m + 1 < rl.length; m++) ps.push(rl[m + 1][0] - rl[m][0]);
        ps.sort((p, q) => p - q);
        const mw = ws[ws.length >> 1], pitch = ps[ps.length >> 1];
        if (pitch < 3) return [lo, hi, 0];
        let mx = 0; for (let i = lo; i <= hi; i++) mx = Math.max(mx, a[i]);
        const t = mx * EDGE_RUN_FRAC, t2 = mx * TRIM_FRAC;
        let add = 0;
        const e0 = extendEnd(a, lo, hi, -1, t, t2, mw, pitch, rl[0][0]); if (e0) { add++; lo = e0.edge; }
        const e1 = extendEnd(a, lo, hi, 1, t, t2, mw, pitch, rl[rl.length - 1][0]); if (e1) { add++; hi = e1.edge; }
        return [lo, hi, add];
      };

      const EDGE_PARTIAL_FRAC = 0.8;
      const growOccludedEdges = (a, lo, hi) => {
        const rl = runlist(a, lo, hi);
        if (rl.length < 3) return [lo, hi];
        const ws = rl.map(r => r[1] - r[0] + 1).sort((p, q) => p - q);
        const mw = ws[ws.length >> 1];
        let mx = 0; for (let i = lo; i <= hi; i++) mx = Math.max(mx, a[i]);
        const t = mx * EDGE_RUN_FRAC;
        const walk = (run, dir) => {
          const width = run[1] - run[0] + 1;
          let e = dir < 0 ? run[0] : run[1];
          if (width >= mw * EDGE_PARTIAL_FRAC) return e;
          for (let room = mw - width; room > 0; room--) {
            const i = e + dir;
            if (i < 0 || i >= a.length || a[i] <= t) break;
            e = i;
          }
          return e;
        };
        return [walk(rl[0], -1), walk(rl[rl.length - 1], 1)];
      };

      let addX = 0, addY = 0;
      rowP = profiles(x0, x1, 0, h - 1)[1]; [y0, y1, addY] = recoverEdges(rowP, y0, y1); [y0, y1] = growOccludedEdges(rowP, y0, y1);
      colP = profiles(0, w - 1, y0, y1)[0]; [x0, x1, addX] = recoverEdges(colP, x0, x1); [x0, x1] = growOccludedEdges(colP, x0, x1);
      const cr = runs(colP, x0, x1) + addX, rr = runs(rowP, y0, y1) + addY;
      let nGuess = (cr === rr && cr >= 5 && cr <= 14) ? cr : 0;
      if (!nGuess) {
        const Lp = x1 - x0 + 1, m = new Array(Lp); let mean = 0;
        for (let i = 0; i < Lp; i++) { m[i] = colP[x0 + i]; mean += m[i]; } mean /= Lp; for (let i = 0; i < Lp; i++) m[i] -= mean;
        let best2 = 0, lagB = 0; for (let lag = Math.floor(Lp / 14); lag < Math.floor(Lp / 4); lag++) { let ss = 0; for (let i = 0; i + lag < Lp; i++) ss += m[i] * m[i + lag]; if (ss > best2) { best2 = ss; lagB = lag; } }
        nGuess = lagB ? Math.round(Lp / lagB) : 10;
      }
      nGuess = Math.max(5, Math.min(12, nGuess));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, s = ((x1 - x0) + (y1 - y0)) / 2;
      return { x: (cx - s / 2) / gScale, y: (cy - s / 2) / gScale, s: s / gScale, n: nGuess };
    }

    let crop = { x: 0, y: 0, s: 0 };
    function placeCrop(x, y, s) {
      if (!stageImg || !cropBox) return;
      const W = stageImg.clientWidth, H = stageImg.clientHeight, maxS = Math.min(W, H);
      s = Math.max(40, Math.min(s, maxS));
      x = Math.max(0, Math.min(x, W - s)); y = Math.max(0, Math.min(y, H - s));
      crop = { x, y, s };
      cropBox.style.left = x + 'px'; cropBox.style.top = y + 'px'; cropBox.style.width = s + 'px'; cropBox.style.height = s + 'px';
    }

    let dragMode = null, dragStart = null;
    if (cropBox) {
      cropBox.addEventListener('pointerdown', e => {
        e.preventDefault();
        dragMode = e.target.classList.contains('h') ? 'resize' : 'move';
        dragStart = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y, s: crop.s };
        cropBox.setPointerCapture(e.pointerId);
      });
      cropBox.addEventListener('pointermove', e => {
        if (!dragMode) return;
        const dx = e.clientX - dragStart.px, dy = e.clientY - dragStart.py;
        if (dragMode === 'move') placeCrop(dragStart.x + dx, dragStart.y + dy, dragStart.s);
        else placeCrop(dragStart.x, dragStart.y, dragStart.s + Math.max(dx, dy));
      });
      cropBox.addEventListener('pointerup', () => { dragMode = null; });
    }

    const CORNER_FRAC = 0.18;
    function bgSample(px, w, x0, y0, cell, corners) {
      const inset = cell * 0.14, sx = Math.round(x0 + inset), sy = Math.round(y0 + inset), sz = Math.round(cell - 2 * inset);
      if (sz < 3) return [200, 200, 200];
      const k = Math.max(3, Math.round(sz * CORNER_FRAC));
      const rs = [], gs = [], bs = [], ar = [], ag = [], ab = [];
      let visited = 0;
      for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
        if (corners && !((x < k || x >= sz - k) && (y < k || y >= sz - k))) continue;
        visited++;
        const i = ((sy + y) * w + (sx + x)) * 4, r = px[i], g = px[i + 1], b = px[i + 2];
        ar.push(r); ag.push(g); ab.push(b);
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, dd = (mx - mn) / 255;
        const s = dd === 0 ? 0 : dd / (1 - Math.abs(2 * l - 1));
        if (s >= 0.2 && l > 0.2 && l < 0.92) { rs.push(r); gs.push(g); bs.push(b); }
      }
      if (rs.length > visited * 0.08) return [med(rs), med(gs), med(bs)];
      return [med(ar), med(ag), med(ab)];
    }

    const MARK_BG_DIST = 62;
    const CAT_DARK_FRAC = 0.10;
    const CAT_FILL_FRAC = 0.45;
    const MARK_MIN_FRAC = 0.12;
    const CAT_COLOR_STD = 70;
    const CAT_MEAN_SAT = 0.35;
    const CAT_PERP_STD = 27;
    const CROWN_SAT = 0.55;
    const DUCK_SAT = 0.23;
    const CROWN_MAX_L = 0.25;

    const CHIP_EDGE_FRAC = 0.75;
    const CHIP_ROW_FRAC = 0.9;
    const CHIP_MIN_ROWS = 3;
    const CHIP_MAX_FRAC = 0.6;
    const CHIP_REST_FRAC = 0.15;
    const CHIP_STEP_DROP = 0.35;
    const CHIP_MARK_MAX = 0.65;

    function chipDepth(cov, sz, dir, lim) {
      const at = k => cov[dir < 0 ? sz - 1 - k : k];
      const end = sz - lim;
      if (end <= CHIP_MIN_ROWS || at(0) < CHIP_EDGE_FRAC) return 0;
      let solid = 0;
      while (solid + 1 < end && at(solid + 1) >= CHIP_EDGE_FRAC) solid++;
      for (let k = solid + 1; k < end && k - solid <= 2; k++) if (at(k) >= CHIP_ROW_FRAC) solid = k;
      if (solid + 1 < CHIP_MIN_ROWS) return 0;
      const suffix = new Float64Array(end + 1);
      for (let k = end - 1, mx = 0; k >= 0; k--) { mx = Math.max(mx, at(k)); suffix[k] = mx; }
      const capVal = Math.min(Math.floor(sz * CHIP_MAX_FRAC), end - 1);
      if (solid + 1 <= capVal && at(solid) >= CHIP_ROW_FRAC && at(solid) - at(solid + 1) >= CHIP_STEP_DROP && suffix[solid + 1] <= CHIP_MARK_MAX) return solid + 1;
      for (let d = solid + 1; d <= capVal; d++) if (suffix[d] <= CHIP_REST_FRAC) return d;
      return 0;
    }

    const THIN_X_MIN_FRAC = 0.012;
    const THIN_X_MAX_L = 0.45;

    function classifyMark(px, w, x0, y0, cell, bg, out) {
      const inset = cell * 0.16, sx = Math.round(x0 + inset), sy = Math.round(y0 + inset), sz = Math.round(cell - 2 * inset);
      if (sz < 3) return null;
      const capC = Math.floor(sz * CHIP_MAX_FRAC), reach = Math.round(cell * 0.06);
      const clipT = new Int32Array(sz);
      const foreign = (x, y) => { const i = (y * w + x) * 4; return rgbDist([px[i], px[i + 1], px[i + 2]], bg) > MARK_BG_DIST; };
      for (let x = 0; x < sz; x++) {
        let yy = Math.max(0, sy - reach);
        while (yy < sy + sz && foreign(sx + x, yy)) yy++;
        clipT[x] = Math.min(capC, Math.max(0, yy - sy));
      }
      const cov = new Float64Array(sz);
      for (let y = 0; y < sz; y++) {
        let n = 0;
        for (let x = 0; x < sz; x++) if (foreign(sx + x, sy + y)) n++;
        cov[y] = n / sz;
      }
      let dt = chipDepth(cov, sz, 1, 0);
      const db = chipDepth(cov, sz, -1, dt);
      if (db) dt = chipDepth(cov, sz, 1, db);
      for (let x = 0; x < sz; x++) if (dt > clipT[x]) clipT[x] = dt;

      let gp = 0, tot = 0, dark = 0;
      let sr = 0, sg = 0, sb = 0, sr2 = 0, sg2 = 0, sb2 = 0, srg = 0, srb = 0, sgb = 0;
      for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
        if (y < clipT[x] || y > sz - 1 - db) continue;
        const i = ((sy + y) * w + (sx + x)) * 4, r = px[i], g = px[i + 1], b = px[i + 2]; tot++;
        const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
        if (l < 0.25) dark++;
        if (rgbDist([r, g, b], bg) > MARK_BG_DIST) {
          gp++;
          sr += r; sg += g; sb += b; sr2 += r * r; sg2 += g * g; sb2 += b * b; srg += r * g; srb += r * b; sgb += g * b;
        }
      }
      const frac = tot ? gp / tot : 0, dk = tot ? dark / tot : 0;
      let colorStd = 0, meanSat = 0, meanL = 1, perpStd = 0;
      if (gp > 0) {
        const mr = sr / gp, mg = sg / gp, mb = sb / gp;
        const crr = Math.max(0, sr2 / gp - mr * mr), cgg = Math.max(0, sg2 / gp - mg * mg), cbb = Math.max(0, sb2 / gp - mb * mb);
        const crg = srg / gp - mr * mg, crb = srb / gp - mr * mb, cgb = sgb / gp - mg * mb;
        colorStd = Math.sqrt(crr + cgg + cbb);
        let ux = mr - bg[0], uy = mg - bg[1], uz = mb - bg[2];
        const un = Math.hypot(ux, uy, uz);
        if (un > 1e-6) {
          ux /= un; uy /= un; uz /= un;
          const varAlong = ux * ux * crr + uy * uy * cgg + uz * uz * cbb + 2 * (ux * uy * crg + ux * uz * crb + uy * uz * cgb);
          perpStd = Math.sqrt(Math.max(0, crr + cgg + cbb - varAlong));
        } else perpStd = colorStd;
        const mx = Math.max(mr, mg, mb), mn = Math.min(mr, mg, mb);
        meanSat = mx > 0 ? (mx - mn) / mx : 0; meanL = (mx + mn) / 510;
      }
      if (out) { out.meanSat = meanSat; out.meanL = meanL; }
      if (dk > CAT_DARK_FRAC) return 'cat';
      if (frac >= CAT_FILL_FRAC && perpStd >= CAT_PERP_STD) return 'cat';
      if (frac >= MARK_MIN_FRAC) return ((colorStd >= CAT_COLOR_STD || meanSat >= CAT_MEAN_SAT) && perpStd >= CAT_PERP_STD) ? 'cat' : 'x';
      if (frac >= THIN_X_MIN_FRAC && meanL < THIN_X_MAX_L) return 'x';
      return null;
    }

    function clusterToK(items, K) {
      let nodes = items.map(it => ({ c: it.rgb.slice(), cells: [it.idx], n: 1 }));
      while (nodes.length > K) {
        let bi = 0, bj = 1, bd = 1e9;
        for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
          const dd = rgbDist(nodes[i].c, nodes[j].c);
          if (dd < bd) { bd = dd; bi = i; bj = j; }
        }
        const a = nodes[bi], b = nodes[bj];
        const m = { c: a.c.map((v, k) => (v * a.n + b.c[k] * b.n) / (a.n + b.n)), cells: a.cells.concat(b.cells), n: a.n + b.n };
        nodes = nodes.filter((_, k) => k !== bi && k !== bj); nodes.push(m);
      }
      return nodes;
    }

    function sampleGrid(n, px, w, X, Y, cell) {
      const bgs = [], mks = [];
      let pieces = 0, crownish = 0, duckish = 0;
      for (let r = 0; r < n; r++) {
        bgs.push([]); mks.push([]);
        for (let c = 0; c < n; c++) {
          const x0 = X + c * cell, y0 = Y + r * cell;
          const bg = bgSample(px, w, x0, y0, cell);
          const st = {}, mk = classifyMark(px, w, x0, y0, cell, bg, st);
          let rbg = bg;
          if (mk === 'cat') {
            rbg = bgSample(px, w, x0, y0, cell, true);
            const vote = {}; classifyMark(px, w, x0, y0, cell, rbg, vote);
            pieces++;
            if (vote.meanSat >= CROWN_SAT || vote.meanL < CROWN_MAX_L) crownish++;
            else if (vote.meanSat >= DUCK_SAT) duckish++;
          }
          bgs[r].push(rbg); mks[r].push(mk);
        }
      }
      const icon = !pieces ? 'queen' : crownish * 2 >= pieces ? 'queen' : duckish * 2 > pieces ? 'duck' : 'queen';
      return { bgs, mks, icon };
    }

    function importStatus(res, head, a, pureOK) {
      const catNote = 'A queen’s region may be off: click a highlighted square, then Pick color from a neighbour. ';
      const markNote = 'The colours read as a valid puzzle with exactly one solution — a mark conflicts. Tap Hint to fix it. ';
      if (pureOK) showStatus('warn', head + markNote + (res.bad ? '(' + res.bad + ').' : ''));
      else if (res.bad) showStatus('warn', head + catNote + '(' + res.bad + ').');
      else if (!res.sols.length) showStatus('warn', head + catNote + 'No solution yet — check highlighted squares or miscolored regions, then Solve.');
      else if (res.sols.length > 1) showStatus('warn', head + catNote + 'Multiple solutions found — two regions may share a color.');
      else showStatus('ok', head + 'Validated — unique solution exists' + assessNote(a) + ((!a || !a.walls) ? ' Review, then hint or solve.' : ''));
    }

    if (readBtn) {
      readBtn.onclick = () => {
        if (!natImg) { impMsg('Choose or paste a screenshot first.'); return; }
        try {
          const n = +impSize.value, d = getData(), w = d.width, px = d.data;
          const f = dispScale * gScale;
          const X = crop.x * f, Y = crop.y * f, S = crop.s * f, cell = S / n;
          const { bgs, mks, icon } = sampleGrid(n, px, w, X, Y, cell);
          if (icon) setPieceIcon(icon);
          setEditMode(false);

          const items = [];
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) items.push({ rgb: bgs[r][c], idx: r * n + c });
          const nodes = clusterToK(items, n);
          const assign = new Array(n * n).fill(0);
          nodes.forEach((nd, id) => nd.cells.forEach(ci => assign[ci] = id));
          const catCells = [];
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (mks[r][c] === 'cat') catCells.push([r, c]);
          const hexes = nodes.map(nd => rgbToHex(nd.c));
          pushUndo();
          const nmI = assignNames(hexes);
          paletteColors = hexes.map(h => ({ hex: h, name: nmI.get(h) }));
          activeColor = hexes[0]; buildPalette();
          N = n; if (sizeSel) sizeSel.value = String(n); blank();
          let nx = 0;
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            regionOf[r][c] = hexes[assign[r * n + c]]; mark[r][c] = mks[r][c];
            if (mks[r][c] === 'x') nx++;
          }

          const rCnt = {}, cCnt = {}, gCnt = {};
          catCells.forEach(([r, c]) => { rCnt[r] = (rCnt[r] || 0) + 1; cCnt[c] = (cCnt[c] || 0) + 1; const g = regionOf[r][c]; gCnt[g] = (gCnt[g] || 0) + 1; });
          const paired = [...Object.values(rCnt), ...Object.values(cCnt), ...Object.values(gCnt)].some(v => v > 1);
          setStars(paired ? 2 : 1);
          if (overlay) overlay.classList.remove('show'); render();
          let res = solve(2), ok = !!(res.sols && res.sols.length === 1 && !res.bad);
          let pure = ok ? null : solvePure(2);
          if (!paired && !ok && pure.length !== 1) {
            setStars(2);
            const pure2 = solvePure(2);
            if (pure2.length === 1) { pure = pure2; res = solve(2); ok = !!(res.sols && res.sols.length === 1 && !res.bad); }
            else setStars(1);
          }
          const head = 'Read ' + nodes.length + ' regions, ' + nx + ' ✕, ' + catCells.length + ' queen' + (catCells.length === 1 ? '' : 's')
            + (starsPer === 2 ? ' — double-queen board (2 per row, column and colour)' : '') + '. ';

          const pureSol = (!ok && pure && pure.length === 1) ? new Set(pure[0].map(([r, c]) => r + ',' + c)) : null;
          importReview = ok ? [] : (pureSol ? catCells.filter(([r, c]) => !pureSol.has(r + ',' + c)) : catCells.slice());
          render();
          importStatus(res, head, ok ? assessBoard() : null, !!pureSol);
        } catch (err) {
          impMsg('Error reading board: ' + (err && err.message || err) + '. Try adjusting crop box.');
        }
      };
    }

    function showStage(on) {
      if (!stage) return;
      stage.classList.toggle('show', on);
      if (dropZone) dropZone.style.display = on ? 'none' : '';
      if (pasteBtn) pasteBtn.style.display = on ? 'none' : '';
      const impAnother = document.getElementById('nqImpAnother');
      if (impAnother) impAnother.style.display = on ? '' : 'none';
    }

    const impAnother = document.getElementById('nqImpAnother');
    if (impAnother) {
      impAnother.onclick = () => {
        natImg = null; dataCache = null; if (stageImg) stageImg.removeAttribute('src'); showStage(false); impMsg('');
      };
    }

    // ── Module Initialization ───────────────────────────────────────
    buildPalette();
    blank();
    setPieceIcon('queen');
    setTool('x');
    updateUndoBtn();
    render();
  };

  // Auto-init if section is immediately active
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (document.getElementById('nqueenSection')?.classList.contains('active')) {
      window.initNQueenModule();
    }
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('nqueenSection')?.classList.contains('active')) {
        window.initNQueenModule();
      }
    });
  }
})();
