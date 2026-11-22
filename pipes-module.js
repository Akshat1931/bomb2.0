/**
 * Pipes Module Solver for Keep Talking and Nobody Explains
 *
 * A grid of pipe pieces; each colour button turns every pipe of that colour 90°
 * (clockwise on some bombs, anticlockwise on others). Solved when all pipes form
 * ONE network with no loops and no open ends.
 *
 * Features:
 * 1. Vision: finds the tile grid, reads each piece's openings and (on the
 *    helper's picture) its colour. The defuser's grey picture cross-checks pieces.
 * 2. Tries every 0–3 presses per colour, for both turning directions.
 * 3. Tap a tile to fix a misread colour; tap a colour chip to highlight it.
 */

(function () {
  'use strict';

  // ── src/modules/pipes/pipesSolver.js ────────────────────────────
  const { N, E, S, W, DIRS, rotCW, pieceKind, isSolved, solvePipes, pressText } = (function () {
    // Pipes: a grid of pipe pieces; each colour button turns every pipe of that colour 90° — clockwise or
    // anticlockwise depending on the bomb, so both are solved.
    // Solved when all pipes form ONE network with no loops and no open ends (a spanning tree of the
    // grid). The defuser's picture never updates, so the answer is "press each colour N times".
    //
    // A piece is a 4-bit mask of its openings: N = 1, E = 2, S = 4, W = 8.

    const N = 1, E = 2, S = 4, W = 8;
    const DIRS = [[N, 0, -1, S], [E, 1, 0, W], [S, 0, 1, N], [W, -1, 0, E]]; // bit, dx, dy, opposite

    /** Turn a piece clockwise `times` quarter turns. */
    function rotCW(m, times = 1) {
      let r = m & 15;
      for (let i = 0; i < ((times % 4) + 4) % 4; i++) r = ((r << 1) | (r >> 3)) & 15;
      return r;
    }

    const bits = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);

    /** Piece kind from its mask: end (1 opening), straight, elbow, tee, cross, empty. */
    function pieceKind(m) {
      const b = bits(m);
      if (b === 0) return 'empty';
      if (b === 1) return 'end';
      if (b === 2) return (m === (N | S) || m === (E | W)) ? 'straight' : 'elbow';
      if (b === 3) return 'tee';
      return 'cross';
    }

    /**
     * Is this board one network with no loops and no open ends?
     * masks: flat array (row-major) of cols×rows piece masks.
     */
    function isSolved(masks, cols, rows) {
      let edges = 0, cells = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const m = masks[y * cols + x];
          if (!m) continue;
          cells++;
          for (const [bit, dx, dy, opp] of DIRS) {
            if (!(m & bit)) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return false; // open end off the board
            if (!(masks[ny * cols + nx] & opp)) return false;               // open end into a closed side
            edges++;
          }
        }
      }
      edges /= 2;
      if (edges !== cells - 1) return false; // a connected network with cells-1 joints has no loop
      // connected?
      const start = masks.findIndex(m => m);
      if (start < 0) return false;
      const seen = new Uint8Array(masks.length);
      const st = [start];
      seen[start] = 1;
      let n = 1;
      while (st.length) {
        const p = st.pop(), x = p % cols, y = (p - x) / cols;
        for (const [bit, dx, dy] of DIRS) {
          if (!(masks[p] & bit)) continue;
          const q = (y + dy) * cols + x + dx;
          if (!seen[q]) { seen[q] = 1; n++; st.push(q); }
        }
      }
      return n === cells;
    }

    /**
     * cells: [{ mask, color }] row-major; colours = the distinct colour names.
     * dir: 1 = a press turns clockwise, -1 = anticlockwise.
     * Tries every 0–3 presses per colour. Returns { colors, solutions: [{ presses: {color: n}, total, masks }] }
     * with boards that look the same counted once, fewest presses first.
     */
    function solvePipes(cells, cols, rows, dir = 1) {
      const colors = [...new Set(cells.map(c => c.color).filter(Boolean))];
      const k = colors.length;
      const idx = cells.map(c => colors.indexOf(c.color));
      const seen = new Map();
      const total = 4 ** k;
      const press = new Array(k).fill(0);
      for (let code = 0; code < total; code++) {
        let c = code;
        for (let i = 0; i < k; i++) { press[i] = c % 4; c = (c - press[i]) / 4; }
        const masks = cells.map((cell, i) => (idx[i] < 0 ? cell.mask : rotCW(cell.mask, dir * press[idx[i]])));
        if (!isSolved(masks, cols, rows)) continue;
        const key = masks.join(',');
        const sum = press.reduce((a, b) => a + b, 0);
        if (!seen.has(key) || seen.get(key).total > sum) {
          seen.set(key, { presses: Object.fromEntries(colors.map((col, i) => [col, press[i]])), total: sum, masks });
        }
      }
      const solutions = [...seen.values()].sort((a, b) => a.total - b.total);
      return { colors, solutions };
    }

    /** "Red ×1, Blue ×2" (colours pressed 0 times left out; "no presses" when already solved). */
    function pressText(presses, colors) {
      const parts = colors.filter(c => presses[c]).map(c => `${c[0].toUpperCase()}${c.slice(1)} ×${presses[c]}`);
      return parts.length ? parts.join(', ') : 'no presses';
    }
    return { N, E, S, W, DIRS, rotCW, pieceKind, isSolved, solvePipes, pressText };
  })();

  // ── src/modules/pipes/pipesVision.js ────────────────────────────
  const { pipeColorName, readPipes } = (function () {
    // Pipes vision: find the grid of tiles, then for each tile which of its four sides a pipe reaches
    // (that's the piece) and, on the helper's picture, the pipe's colour.
    // Tiles are the same dark slate (42,47,56) on both pictures; pipes are grey (defuser) or a bright
    // colour (helper) with a dark outline.


    const isTile = (r, g, b) => Math.abs(r - 42) <= 1 && Math.abs(g - 47) <= 1 && Math.abs(b - 56) <= 1;
    const isGap = (r, g, b) => Math.abs(r - 31) <= 3 && Math.abs(g - 34) <= 3 && Math.abs(b - 40) <= 3;
    const isPipe = (r, g, b) => Math.max(r, g, b) > 100;

    /** Saturated RGB → colour name (null for grey / dark). */
    function pipeColorName(r, g, b) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      if (mx < 90 || d < 60) return null;
      let h;
      if (mx === r) h = ((g - b) / d + 6) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 15 || h >= 335) return 'red';
      if (h < 38) return 'orange';
      if (h < 70) return 'yellow';
      if (h < 165) return 'green';
      if (h < 195) return 'cyan';
      if (h < 250) return 'blue';
      if (h < 290) return 'purple';
      return 'pink';
    }

    /** Runs of `true` in a boolean profile → [[start, end)] longer than minLen. */
    function runs(profile, minLen) {
      const out = [];
      let s = -1;
      for (let i = 0; i <= profile.length; i++) {
        const on = i < profile.length && profile[i];
        if (on && s < 0) s = i;
        if (!on && s >= 0) { if (i - s >= minLen) out.push([s, i]); s = -1; }
      }
      return out;
    }

    /**
     * Read a Pipes picture (helper's coloured one or the defuser's grey one).
     * Returns { ok, reason?, cols, rows, cells: [{ mask, color, box }], colored }.
     */
    function readPipes(data, Wd, Hd) {
      // Board: where the tile colour is (the board frame around it is a near-identical slate, so be exact)
      const tileCol = new Float64Array(Wd), tileRow = new Float64Array(Hd);
      for (let y = 0; y < Hd; y++) {
        for (let x = 0; x < Wd; x++) {
          const p = (y * Wd + x) * 4;
          if (isTile(data[p], data[p + 1], data[p + 2])) { tileCol[x]++; tileRow[y]++; }
        }
      }
      const span = (prof, len) => {
        const mx = Math.max(...prof);
        let lo = 0, hi = len - 1;
        while (lo < len && prof[lo] < mx * 0.1) lo++;
        while (hi > lo && prof[hi] < mx * 0.1) hi--;
        return [lo, hi + 1];
      };
      const [bx0, bx1] = span(tileCol, Wd), [by0, by1] = span(tileRow, Hd);
      if (bx1 - bx0 < Wd * 0.2 || by1 - by0 < Hd * 0.2) return { ok: false, reason: 'could not find the pipe tiles' };
      // Tiles: inside the board, the columns / rows that are NOT mostly gap colour
      const gapCol = new Float64Array(Wd), gapRow = new Float64Array(Hd);
      for (let y = by0; y < by1; y++) {
        for (let x = bx0; x < bx1; x++) {
          const p = (y * Wd + x) * 4;
          if (isGap(data[p], data[p + 1], data[p + 2])) { gapCol[x]++; gapRow[y]++; }
        }
      }
      const minTile = Math.round(Math.min(Wd, Hd) * 0.05);
      const xs = runs(Array.from(gapCol.subarray(bx0, bx1), v => v < (by1 - by0) * 0.5), minTile).map(([a0, a1]) => [a0 + bx0, a1 + bx0]);
      const ys = runs(Array.from(gapRow.subarray(by0, by1), v => v < (bx1 - bx0) * 0.5), minTile).map(([a0, a1]) => [a0 + by0, a1 + by0]);
      if (xs.length < 2 || ys.length < 2) return { ok: false, reason: 'could not find the pipe tiles' };

      const cells = [];
      let colored = 0;
      for (const [y0, y1] of ys) {
        for (const [x0, x1] of xs) {
          const cx = Math.round((x0 + x1) / 2), cy = Math.round((y0 + y1) / 2);
          const tw = x1 - x0, th = y1 - y0;
          // a side is open when the pipe reaches it: sample a short line just inside the tile edge
          const side = (sx, sy, dx, dy) => {
            let on = 0, n = 0;
            for (let t = -3; t <= 3; t++) {
              const x = sx + dx * t, y = sy + dy * t;
              if (x < 0 || y < 0 || x >= Wd || y >= Hd) continue;
              const p = (y * Wd + x) * 4;
              n++;
              if (isPipe(data[p], data[p + 1], data[p + 2])) on++;
            }
            return n && on / n > 0.5;
          };
          const inset = Math.max(2, Math.round(Math.min(tw, th) * 0.06));
          let mask = 0;
          if (side(cx, y0 + inset, 1, 0)) mask |= N;
          if (side(x1 - 1 - inset, cy, 0, 1)) mask |= E;
          if (side(cx, y1 - 1 - inset, 1, 0)) mask |= S;
          if (side(x0 + inset, cy, 0, 1)) mask |= W;
          // colour: most common pipe colour in the middle of the tile
          const votes = {};
          for (let y = y0 + Math.round(th * 0.2); y < y1 - th * 0.2; y++) {
            for (let x = x0 + Math.round(tw * 0.2); x < x1 - tw * 0.2; x++) {
              const p = (y * Wd + x) * 4;
              const c = pipeColorName(data[p], data[p + 1], data[p + 2]);
              if (c) votes[c] = (votes[c] || 0) + 1;
            }
          }
          const top = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
          const color = top && top[1] > tw * th * 0.03 ? top[0] : null;
          if (color) colored++;
          cells.push({ mask, color, box: { x0, y0, x1, y1 } });
        }
      }
      return { ok: true, cols: xs.length, rows: ys.length, cells, colored: colored > cells.length / 2 };
    }
    return { pipeColorName, readPipes };
  })();

  // ── UI ──────────────────────────────────────────────────────────
  const PIPE_SWATCH = {
    red: '#ef4444', orange: '#f97316', yellow: '#facc15', green: '#22c55e', cyan: '#06b6d4',
    blue: '#3b82f6', purple: '#a855f7', pink: '#ec4899'
  };
  const GREY = '#94a3b8';
  const ORDER = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'];
  const TURNS = [
    { dir: 1, key: 'cw', icon: '↻', name: 'Clockwise' },
    { dir: -1, key: 'ccw', icon: '↺', name: 'Anticlockwise' }
  ];

  const state = {
    helper: null,   // coloured picture: { cols, rows, cells: [{ mask, color }] }
    defuser: null,  // grey picture (shapes only), to cross-check
    status: { text: '', ok: null },
    focus: null     // colour highlighted on the boards
  };
  window.pipesModuleState = state;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const sameBoard = (a, b) => Boolean(a && b) && a.masks.join(',') === b.masks.join(',');

  function imageToData(img, maxDim = 2400) {
    const sc = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const W = Math.round(img.naturalWidth * sc), H = Math.round(img.naturalHeight * sc);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    return g.getImageData(0, 0, W, H);
  }

  function injectStyles() {
    if ($('pipesStyles')) return;
    const style = document.createElement('style');
    style.id = 'pipesStyles';
    style.textContent = `
    .pp-shell { max-width: 1040px; margin: 0 auto 30px; background: #0d0f22; border: 1.5px solid #202448; border-radius: 18px; padding: 24px; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
    .pp-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #1c2042; }
    .pp-title { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; color: #ffd875; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .pp-pill { font-size: 13px; font-weight: 600; color: #94a3b8; background: #181b36; padding: 3px 10px; border-radius: 99px; border: 1px solid #282d58; }
    .pp-layout { display: grid; grid-template-columns: 330px 1fr; gap: 24px; align-items: start; }
    @media (max-width: 860px) { .pp-layout { grid-template-columns: 1fr; } }
    .pp-card { background: #070814; border: 1px solid #1c2042; border-radius: 14px; padding: 16px; }
    .pp-card-title { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #ffd875; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.8px; }
    .pp-dropzone { border: 2px dashed #343864; border-radius: 12px; padding: 22px 14px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.015); transition: all 0.2s; margin-bottom: 14px; }
    .pp-dropzone:hover, .pp-dropzone.dragover { border-color: #ffd875; background: rgba(255,216,117,0.06); }
    .pp-btn { background: #181b36; border: 1px solid #2d3366; color: #cbd5e1; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .pp-btn:hover { border-color: #ffd875; color: #ffd875; }
    .pp-help { background: #12152e; border: 1px solid #232a58; border-radius: 10px; padding: 12px; font-size: 12px; color: #cbd5e1; line-height: 1.5; }
    .pp-help ol { margin: 6px 0 0; padding-left: 18px; }
    .pp-status { font-size: 13px; color: #94a3b8; background: #0a0c1c; border: 1px solid #1c2042; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; line-height: 1.5; }
    .pp-status.ok { color: #4ade80; border-color: rgba(34,197,94,0.4); }
    .pp-warn { background: rgba(255,95,87,0.08); border: 1px solid rgba(255,95,87,0.4); color: #ff9b94; border-radius: 10px; padding: 10px 12px; font-size: 13px; margin-bottom: 12px; }
    .pp-stamps { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    @media (max-width: 560px) { .pp-stamps { grid-template-columns: 1fr; } }
    .pp-banner { background: linear-gradient(135deg, rgba(255,216,117,0.10) 0%, rgba(245,197,66,0.04) 100%); border: 2px solid #f5c542; border-radius: 14px; padding: 14px 16px; box-shadow: 0 0 25px rgba(245,197,66,0.12); cursor: pointer; transition: transform 0.1s; }
    .pp-banner:hover { transform: translateY(-1px); }
    .pp-banner.empty { cursor: default; border-color: #2d3366; box-shadow: none; background: #0a0c1c; }
    .pp-banner-lbl { font-size: 12px; font-weight: 800; color: #ffd875; letter-spacing: 1px; text-transform: uppercase; display: flex; justify-content: space-between; }
    .pp-answer { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 900; color: #fff; margin-top: 4px; line-height: 1.3; }
    .pp-stats { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .pp-presses { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .pp-press { display: inline-flex; align-items: center; gap: 6px; background: #12152e; border: 1.5px solid #2d3366; color: #e2e8f0; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .pp-press.on { border-color: var(--pc); box-shadow: 0 0 12px var(--pc); }
    .pp-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--pc); }
    .pp-press b { color: #ffd875; }
    .pp-press b.ccw { color: #94a3b8; }
    .pp-boards { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; margin-bottom: 14px; }
    .pp-board { margin: 0; text-align: center; font-size: 12px; color: #8892b0; }
    .pp-board svg { width: 210px; max-width: 100%; background: #05060d; border: 2px solid #23274c; border-radius: 12px; padding: 6px; display: block; margin-bottom: 6px; }
    .pp-tile.tap { cursor: pointer; }
    .pp-tile.tap:hover .pp-bg { stroke: #ffd875; }
    .pp-bg { fill: #2a2f38; stroke: #1f2228; stroke-width: 2; }
    .pp-details { background: #070814; border: 1px solid #1c2042; border-radius: 12px; padding: 10px 14px; font-size: 13px; color: #94a3b8; line-height: 1.6; }
    .pp-details summary { color: #ffd875; font-weight: 700; font-size: 13px; cursor: pointer; outline: none; }
    `;
    document.head.appendChild(style);
  }

  function renderUI() {
    const section = $('pipesSection');
    if (!section) return;
    section.innerHTML = `
      <div class="pp-shell">
        <div class="pp-head">
          <div class="pp-title"><span>🟩</span> Pipes Solver <span class="pp-pill">Colour buttons · 0–3 presses each</span></div>
          <div style="display:flex; gap:10px;">
            <button class="pp-btn" type="button" onclick="window.clearPipes()">Reset</button>
          </div>
        </div>

        <div class="pp-layout">
          <div class="pp-card">
            <div class="pp-card-title">Upload / Paste Screenshot</div>
            <div id="pipesDropzone" class="pp-dropzone" onclick="document.getElementById('pipesFileInput').click()">
              <input type="file" id="pipesFileInput" accept="image/*" style="display:none;" onchange="window.handlePipesFile(this)">
              <div style="font-size:32px; margin-bottom:8px;">🟥🟩🟦</div>
              <div style="font-weight:700; font-size:14px; color:#fff; margin-bottom:4px;">Click to Upload the Helper's Coloured Picture</div>
              <div style="font-size:12px; color:#94a3b8;">or press <kbd style="background:#1e2246; padding:2px 6px; border-radius:4px; color:#ffd875;">Ctrl+V</kbd> anywhere to paste</div>
            </div>
            <div id="pipesStatus"></div>
            <div class="pp-help">
              <strong>💡 How to solve:</strong>
              <ol>
                <li>Paste the <strong>helper's coloured</strong> picture — the colours decide the buttons.</li>
                <li>The defuser's grey picture is optional (cross-check of the pieces).</li>
                <li>Press each colour the shown number of times, in any order.</li>
                <li>Use the side that matches which way the bomb turns the pipes.</li>
              </ol>
            </div>
          </div>

          <div>
            <div class="pp-stamps" id="pipesStamps"></div>
            <div id="pipesNotes"></div>
            <div class="pp-presses" id="pipesPresses"></div>
            <div class="pp-boards" id="pipesBoards"></div>
            <details class="pp-details">
              <summary>How it's solved</summary>
              <div id="pipesHow" style="margin-top:8px;"></div>
            </details>
          </div>
        </div>
      </div>
    `;
    setupInputs();
    update();
  }

  function setupInputs() {
    const dz = $('pipesDropzone');
    if (dz) {
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
      dz.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dz.classList.remove('dragover');
        if (window.BombDragDrop) {
          window.BombDragDrop.handleDataTransfer(e.dataTransfer, (file) => { if (file) loadFile(file); });
        } else {
          const f = [...(e.dataTransfer?.files || [])].find(x => x.type.startsWith('image/'));
          if (f) loadFile(f);
        }
      });
    }
    // A pasted image blob (Discord links are routed by dragdrop-helper.js)
    document.addEventListener('paste', (e) => {
      if (!$('pipesSection')?.classList.contains('active')) return;
      for (const item of (e.clipboardData?.items || [])) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const f = item.getAsFile();
          if (f) loadFile(f);
          return;
        }
      }
    });
  }

  function loadFile(file) {
    const img = new Image();
    img.onload = () => { handleImage(img); URL.revokeObjectURL(img.src); };
    img.onerror = () => { state.status = { text: 'Could not open that file as an image.', ok: false }; update(); };
    img.src = URL.createObjectURL(file);
  }

  function handleImage(img) {
    try {
      const d = imageToData(img);
      const r = readPipes(d.data, d.width, d.height);
      if (!r.ok) {
        state.status = { text: `${r.reason} — is this a Pipes picture?`, ok: false };
      } else {
        const board = { cols: r.cols, rows: r.rows, cells: r.cells.map(c => ({ mask: c.mask, color: c.color })) };
        if (r.colored) {
          state.helper = board;
          state.focus = null;
          const s = solvePipes(board.cells, board.cols, board.rows, 1);
          const missing = board.cells.filter(c => !c.color).length;
          state.status = {
            text: `Helper picture: ${r.cols}×${r.rows}, ${s.colors.length} colours${missing ? ` · ${missing} tile(s) without a colour — tap them` : ''} · ${s.solutions.length ? 'solved ✓' : 'no solution — a tile was misread'}`,
            ok: s.solutions.length > 0 && !missing
          };
        } else {
          state.defuser = board;
          state.status = { text: `Defuser picture: ${r.cols}×${r.rows} pieces read. Now paste the helper's coloured picture — the colours decide the buttons.`, ok: null };
        }
      }
    } catch (e) {
      state.status = { text: `Could not read that image (${e.message || e}).`, ok: false };
    }
    update();
  }

  // The board drawn from masks + colours (row-major); onTap = index of a tappable tile
  function boardSvg(cols, rows, masks, colors, label, tappable) {
    const size = 40;
    let tiles = '';
    masks.forEach((mask, i) => {
      const x = (i % cols) * size, y = Math.floor(i / cols) * size;
      const c = colors[i] ? PIPE_SWATCH[colors[i]] || GREY : GREY;
      const dim = state.focus && colors[i] !== state.focus;
      const h = size / 2, w = size * 0.3, cx = x + h, cy = y + h;
      let arms = '';
      if (mask & N) arms += `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}"/>`;
      if (mask & E) arms += `<rect x="${cx}" y="${cy - w / 2}" width="${h}" height="${w}"/>`;
      if (mask & S) arms += `<rect x="${cx - w / 2}" y="${cy}" width="${w}" height="${h}"/>`;
      if (mask & W) arms += `<rect x="${x}" y="${cy - w / 2}" width="${h}" height="${w}"/>`;
      const ends = [N, E, S, W].filter(b => mask & b).length;
      const hub = ends === 1
        ? `<circle cx="${cx}" cy="${cy}" r="${size * 0.28}"/>`
        : `<rect x="${cx - w / 2}" y="${cy - w / 2}" width="${w}" height="${w}"/>`;
      tiles += `<g class="pp-tile ${tappable ? 'tap' : ''}" opacity="${dim ? 0.35 : 1}"${tappable ? ` onclick="window.cyclePipesColor(${i})"` : ''}>`
        + `<rect x="${x + 1}" y="${y + 1}" width="${size - 2}" height="${size - 2}" rx="${size * 0.12}" class="pp-bg"/>`
        + `<g fill="${c}">${arms}${hub}</g></g>`;
    });
    return `<figure class="pp-board"><svg viewBox="0 0 ${cols * size} ${rows * size}" role="img" aria-label="${esc(label)}">${tiles}</svg><figcaption>${esc(label)}</figcaption></figure>`;
  }

  function solveAll() {
    const h = state.helper;
    if (!h) return null;
    const results = { cw: solvePipes(h.cells, h.cols, h.rows, 1), ccw: solvePipes(h.cells, h.cols, h.rows, -1) };
    const result = results.cw;
    const colors = ORDER.filter(c => result.colors.includes(c)).concat(result.colors.filter(c => !ORDER.includes(c)));
    const bestOf = { cw: result.solutions[0], ccw: results.ccw.solutions[0] };
    const answerOf = {
      cw: bestOf.cw ? pressText(bestOf.cw.presses, colors) : '',
      ccw: bestOf.ccw ? pressText(bestOf.ccw.presses, colors) : ''
    };
    return { result, colors, bestOf, answerOf };
  }

  function update() {
    if (!$('pipesStamps')) return;
    const { helper, defuser } = state;
    const s = solveAll();
    const best = s && s.bestOf.cw;
    const both = s && s.answerOf.cw && s.answerOf.cw === s.answerOf.ccw;

    $('pipesStatus').innerHTML = state.status.text
      ? `<div class="${state.status.ok === false ? 'pp-warn' : `pp-status ${state.status.ok ? 'ok' : ''}`}">${esc(state.status.text)}</div>` : '';

    $('pipesStamps').innerHTML = TURNS.map(t => {
      const ans = s ? s.answerOf[t.key] : '';
      const b = s && s.bestOf[t.key];
      return `<div class="pp-banner ${ans ? '' : 'empty'}" ${ans ? `onclick="window.copyPipesAnswer('${t.key}', this)" title="Click to copy"` : ''}>
        <div class="pp-banner-lbl"><span>${t.icon} ${t.name}</span><span class="pp-copied">${ans ? '📋' : ''}</span></div>
        <div class="pp-answer">${ans ? esc(ans) : '<span style="color:#64748b;">— — —</span>'}</div>
        <div class="pp-stats">${b && b.total ? `${b.total} presses` : ''}</div>
      </div>`;
    }).join('');

    const mismatch = helper && defuser && (helper.cols !== defuser.cols || helper.rows !== defuser.rows
      || helper.cells.some((c, i) => c.mask !== defuser.cells[i].mask));
    const notes = [];
    if (mismatch) notes.push(['warn', "⚠ The defuser's picture shows different pieces from the helper's — check both are from this bomb."]);
    if (best && !both) notes.push(['', 'Press each colour that many times, in any order — use the side that matches which way the bomb turns the pipes. Click it to copy.']);
    if (best && both) notes.push(['ok', 'Both turning directions need the same presses.']);
    if (helper && s && !best) notes.push(['warn', '⚠ No combination of presses joins every pipe — a piece or a colour was misread. Tap a tile below to change its colour.']);
    if (best && s.result.solutions.length > 1) notes.push(['warn', `⚠ ${s.result.solutions.length} different solutions — showing the one with the fewest presses.`]);
    $('pipesNotes').innerHTML = notes.map(([k, t]) => `<div class="${k === 'warn' ? 'pp-warn' : `pp-status ${k}`}">${esc(t)}</div>`).join('');

    $('pipesPresses').innerHTML = best ? s.colors.map(c => `
      <button type="button" class="pp-press ${state.focus === c ? 'on' : ''}" style="--pc:${PIPE_SWATCH[c] || GREY}" onclick="window.focusPipesColor('${c}')" title="Highlight this colour's pipes">
        <span class="pp-dot"></span> ${cap(c)} <b>↻${best.presses[c]}</b>${s.bestOf.ccw ? `<b class="ccw">↺${s.bestOf.ccw.presses[c]}</b>` : ''}
      </button>`).join('') : '';

    let boards = '';
    if (helper) {
      const cols = helper.cells.map(c => c.color);
      boards += boardSvg(helper.cols, helper.rows, helper.cells.map(c => c.mask), cols, 'now · tap a tile to fix its colour', true);
      if (best) {
        const same = sameBoard(best, s.bestOf.ccw);
        boards += boardSvg(helper.cols, helper.rows, best.masks, cols, same ? 'after the presses (either way)' : 'after the ↻ presses', false);
        if (s.bestOf.ccw && !same) boards += boardSvg(helper.cols, helper.rows, s.bestOf.ccw.masks, cols, 'after the ↺ presses', false);
      }
    }
    $('pipesBoards').innerHTML = boards;

    const k = s ? s.colors.length : 0;
    $('pipesHow').innerHTML = 'Each colour button turns all pipes of that colour 90° (clockwise on some bombs, anticlockwise on others), so only the number of presses per colour matters (0–3). '
      + 'Both directions reach the same finished board: a colour pressed n times one way is pressed (4 − n) times the other way, except that pieces which look the same after a half turn can need fewer. '
      + `All ${k ? `4^${k} = ${4 ** k} ` : ''}combinations are tried; a combination solves it when every opening meets an opening, nothing points off the board, every tile is joined and there are exactly (tiles − 1) joints (no loops).`
      + (defuser && !mismatch && helper ? " The defuser's grey picture matches the helper's pieces ✓." : '');
  }

  window.handlePipesFile = function (input) {
    const f = input.files && input.files[0];
    if (f) loadFile(f);
    input.value = '';
  };

  // Tap a tile on the helper board to change its colour (fixes a misread)
  window.cyclePipesColor = function (i) {
    const h = state.helper;
    if (!h) return;
    const s = solveAll();
    const pal = s && s.colors.length ? s.colors : ORDER.slice(0, 5);
    h.cells = h.cells.map((c, j) => (j === i ? { ...c, color: pal[(pal.indexOf(c.color) + 1) % pal.length] } : c));
    update();
  };

  window.focusPipesColor = function (c) {
    state.focus = state.focus === c ? null : c;
    update();
  };

  window.copyPipesAnswer = function (key, el) {
    const s = solveAll();
    const text = s && s.answerOf[key];
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const tag = el && el.querySelector('.pp-copied');
      if (!tag) return;
      tag.textContent = '✓ Copied';
      setTimeout(() => { tag.textContent = '📋'; }, 1500);
    }).catch(() => {});
  };

  window.clearPipes = function () {
    state.helper = null;
    state.defuser = null;
    state.focus = null;
    state.status = { text: '', ok: null };
    update();
  };

  window.initPipesModule = function () {
    injectStyles();
    renderUI();
  };
})();
