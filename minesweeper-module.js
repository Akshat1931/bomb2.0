/**
 * Minesweeper Module Solver for Keep Talking and Nobody Explains
 * 
 * Grid: 10 Columns (A–J), 8 Rows (1–8) = 80 cells total.
 * Reading and solving: bomb_boomed's (bomb-logic.js). Each new screenshot is a round: only
 * squares that are newly safe are given and copied (space-separated, e.g. "C2 C3 H1").
 * 
 * Features:
 * 1. Image OCR / Computer Vision to extract 10x8 grid state.
 * 2. Exact CSP (Constraint Satisfaction) & Probability Engine to find 100% guaranteed safe moves.
 * 3. Iterative workflow: paste/upload screenshot -> get safe cells -> click them in game -> paste updated screenshot -> repeat.
 * 4. Interactive 10x8 visual board with manual square clicking / overrides.
 */

(function() {
  const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const ROWS = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const TOTAL_COLS = 10;
  const TOTAL_ROWS = 8;

  const NUMBER_COLORS = {
    '1': '#3b82f6', // Blue
    '2': '#22c55e', // Green
    '3': '#ef4444', // Red
    '4': '#6366f1', // Indigo / Dark Blue
    '5': '#b91c1c', // Dark Red / Maroon
    '6': '#06b6d4', // Teal / Cyan
    '7': '#ffffff', // White / Black
    '8': '#94a3b8'  // Gray
  };

  const state = {
    initialized: false,
    // 8x10 array of cell values: '.' (unrevealed), '0' (blank), '1'-'8' (revealed number), 'F' (flagged mine)
    grid: Array.from({ length: TOTAL_ROWS }, () => Array(TOTAL_COLS).fill('.')),
    safeCells: [],    // Array of string coords, e.g. ['C2', 'C3', 'H1']
    mineCells: [],    // Array of string coords, e.g. ['C1', 'H2']
    knownSafe: new Set(), // safe squares given in earlier rounds (already clicked)
    round: 0,             // 1 = first screenshot; each new screenshot is a new round
    currentImage: null,
    history: []
  };

  function coord(r, c) {
    return `${COLS[c]}${ROWS[r]}`;
  }

  function parseCoord(coordStr) {
    const colLetter = coordStr[0].toUpperCase();
    const rowNumber = coordStr.slice(1);
    const c = COLS.indexOf(colLetter);
    const r = ROWS.indexOf(rowNumber);
    return { r, c };
  }

  // ── Reading and solving: bomb_boomed's (window.BombLogic.mines, bomb-logic.js) ──
  // The reader gives 8 × 10 cells { name: 'C2', state: '#' covered | 'F' flag | 0–8 }; the
  // solver marks every cell that is certainly safe / a mine (constraints + exhaustive search per
  // independent group, no guessing). Here the board is kept as '.' / 'F' / '0'–'8' for display and
  // hand edits.
  const MS = window.BombLogic.mines;
  const toDisplay = (st) => (st === '#' ? '.' : st === 'F' ? 'F' : String(st));
  const toCells = (grid) => grid.map((row, r) => row.map((v, c) => ({
    r, c, name: coord(r, c), state: v === '.' ? '#' : v === 'F' ? 'F' : Number(v), isSafe: false, isMine: false
  })));
  const byColThenRow = (a, b) => (a[0] !== b[0] ? a[0].localeCompare(b[0]) : parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));

  function solveMinesweeper(grid) {
    const { safeList, mineList } = MS.solveMinesGrid(toCells(grid));
    return { safe: safeList.slice().sort(byColThenRow), mines: mineList.slice().sort(byColThenRow) };
  }

  // ── UI INJECTION & RENDERING ──────────────────────────────
  function injectStyles() {
    if (document.getElementById('minesweeperStyles')) return;
    const css = `
    .ms-shell {
      max-width: 1040px;
      margin: 0 auto 30px;
      background: #0d0f22;
      border: 1.5px solid #202448;
      border-radius: 18px;
      padding: 24px;
      color: #e2e8f0;
      font-family: 'Inter', system-ui, sans-serif;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
    }
    .ms-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #1c2042;
    }
    .ms-title {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #ffd875;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ms-layout {
      display: grid;
      grid-template-columns: 330px 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .ms-layout { grid-template-columns: 1fr; }
    }
    .ms-card {
      background: #070814;
      border: 1px solid #1c2042;
      border-radius: 14px;
      padding: 16px;
    }
    .ms-card-title {
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: #ffd875;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .ms-dropzone {
      border: 2px dashed #343864;
      border-radius: 12px;
      padding: 22px 14px;
      text-align: center;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.015);
      transition: all 0.2s;
      margin-bottom: 14px;
    }
    .ms-dropzone:hover, .ms-dropzone.dragover {
      border-color: #ffd875;
      background: rgba(255, 216, 117, 0.06);
    }
    .ms-banner-safe {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(16, 185, 129, 0.06) 100%);
      border: 2px solid #22c55e;
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 18px;
      box-shadow: 0 0 25px rgba(34, 197, 94, 0.15);
    }
    .ms-safe-tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .ms-safe-tag {
      background: #133824;
      border: 1.5px solid #22c55e;
      color: #4ade80;
      font-family: 'Outfit', monospace, sans-serif;
      font-size: 18px;
      font-weight: 800;
      padding: 5px 12px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.2);
    }
    .ms-board-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      user-select: none;
      margin: 10px 0;
    }
    .ms-grid-table {
      border-collapse: separate;
      border-spacing: 3px;
      background: #05060d;
      padding: 8px;
      border-radius: 12px;
      border: 2px solid #23274c;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
    }
    .ms-header-cell {
      width: 44px;
      height: 24px;
      text-align: center;
      color: #94a3b8;
      font-family: 'Outfit', monospace, sans-serif;
      font-size: 13px;
      font-weight: 800;
    }
    .ms-cell {
      width: 44px;
      height: 44px;
      text-align: center;
      vertical-align: middle;
      font-family: 'Outfit', monospace, sans-serif;
      font-size: 20px;
      font-weight: 900;
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      transition: transform 0.1s, box-shadow 0.15s;
    }
    .ms-cell:hover {
      transform: scale(1.08);
      z-index: 5;
    }
    /* Cell styles */
    .ms-cell-unrevealed {
      background: #2a3142;
      border: 1px solid #3d465c;
      color: transparent;
    }
    .ms-cell-blank {
      background: #e2e8f0;
      border: 1px solid #cbd5e1;
      color: transparent;
    }
    .ms-cell-numbered {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
    }
    .ms-cell-mine {
      background: #450a0a !important;
      border: 2px solid #ef4444 !important;
      color: #fca5a5 !important;
      box-shadow: 0 0 14px rgba(239, 68, 68, 0.4);
    }
    .ms-cell-known { opacity: 0.45; }
    .ms-cell-safe {
      background: #064e3b !important;
      border: 2px solid #22c55e !important;
      color: #4ade80 !important;
      box-shadow: 0 0 16px rgba(34, 197, 94, 0.5) !important;
      animation: msSafePulse 1.8s infinite ease-in-out;
    }
    @keyframes msSafePulse {
      0%, 100% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.4); }
      50% { box-shadow: 0 0 22px rgba(34, 197, 94, 0.8); }
    }
    .ms-prob-badge {
      position: absolute;
      bottom: 2px;
      right: 2px;
      font-size: 9px;
      font-weight: 700;
      color: #fca5a5;
      background: rgba(0,0,0,0.6);
      padding: 1px 3px;
      border-radius: 3px;
    }
    .ms-btn {
      background: #1c2042;
      border: 1px solid #343864;
      color: #e2e8f0;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ms-btn:hover {
      background: #282e5c;
      border-color: #ffd875;
      color: #fff;
    }
    .ms-btn.primary {
      background: #ffd875;
      border-color: #ffd875;
      color: #080914;
      font-weight: 800;
    }
    .ms-btn.primary:hover {
      background: #ffe399;
      transform: translateY(-1px);
    }
    .ms-stat-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-top: 14px;
    }
    .ms-stat-box {
      background: #0f1226;
      border: 1px solid #1f254e;
      border-radius: 10px;
      padding: 10px;
      text-align: center;
    }
    .ms-stat-val {
      font-size: 22px;
      font-weight: 900;
      font-family: 'Outfit', sans-serif;
    }
    .ms-stat-lbl {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    `;
    const style = document.createElement('style');
    style.id = 'minesweeperStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderUI() {
    const section = document.getElementById('minesweeperSection');
    if (!section) return;

    section.innerHTML = `
      <div class="ms-shell">
        <div class="ms-head">
          <div class="ms-title">
            <span>💣</span> Minesweeper Module Solver
            <span style="font-size:13px; font-weight:600; color:#94a3b8; background:#181b36; padding:3px 10px; border-radius:99px; border:1px solid #282d58;">
              10×8 Grid
            </span>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="ms-btn" onclick="window.clearMinesweeperBoard()">Reset Board</button>
            <button class="ms-btn" onclick="window.newMinesweeperRound()" title="Forget earlier rounds: give every safe square again">↺ New round</button>
            <button class="ms-btn primary" onclick="window.recalculateMinesweeper()">⚡ Recalculate</button>
          </div>
        </div>

        <div class="ms-layout">
          <!-- Left: Upload & Stats -->
          <div class="ms-card">
            <div class="ms-card-title">Upload / Paste Screenshot</div>
            
            <div id="msDropzone" class="ms-dropzone" onclick="window.openMinesweeperFileDialog()">
              <input type="file" id="msFileInput" accept="image/*" style="display:none;" onchange="window.handleMinesweeperFile(this)">
              <div style="font-size:32px; margin-bottom:8px;">📷</div>
              <div style="font-weight:700; font-size:14px; color:#fff; margin-bottom:4px;">Click to Upload Screenshot</div>
              <div style="font-size:12px; color:#94a3b8;">or press <kbd style="background:#1e2246; padding:2px 6px; border-radius:4px; color:#ffd875;">Ctrl+V</kbd> anywhere to paste</div>
            </div>

            <div id="msPreviewWrapper" style="display:none; margin-bottom:14px; text-align:center;">
              <canvas id="msImageCanvas" style="width:100%; border-radius:8px; border:1px solid #2a315e; max-height:220px; object-fit:contain;"></canvas>
            </div>

            <div style="background:#12152e; border:1px solid #232a58; border-radius:10px; padding:12px; font-size:12px; color:#cbd5e1; line-height:1.5;">
              <strong>💡 How to solve:</strong>
              <ol style="margin:6px 0 0; padding-left:18px;">
                <li>Paste (<kbd>Ctrl+V</kbd>) the initial opening image.</li>
                <li>Click the <strong style="color:#22c55e;">Green Safe Squares</strong> on your bomb.</li>
                <li>Paste the updated screenshot: only the <strong>new</strong> safe squares are given (earlier ones are dimmed).</li>
              </ol>
            </div>

            <div class="ms-stat-grid">
              <div class="ms-stat-box">
                <div class="ms-stat-val" id="msStatSafe" style="color:#22c55e;">0</div>
                <div class="ms-stat-lbl">Safe Squares</div>
              </div>
              <div class="ms-stat-box">
                <div class="ms-stat-val" id="msStatMines" style="color:#ef4444;">0</div>
                <div class="ms-stat-lbl">Mines Found</div>
              </div>
              <div class="ms-stat-box">
                <div class="ms-stat-val" id="msStatRevealed" style="color:#38bdf8;">0</div>
                <div class="ms-stat-lbl">Revealed Cells</div>
              </div>
              <div class="ms-stat-box">
                <div class="ms-stat-val" id="msStatUnknown" style="color:#a855f7;">80</div>
                <div class="ms-stat-lbl">Unrevealed</div>
              </div>
            </div>
          </div>

          <!-- Right: Safe Moves & Interactive Board -->
          <div>
            <!-- Safe Moves Banner -->
            <div id="msSafeBanner" class="ms-banner-safe">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                  <div style="font-size:12px; font-weight:800; color:#ffd875; letter-spacing:1px; text-transform:uppercase;">
                    100% GUARANTEED SAFE SQUARES (CLICK THESE IN GAME)
                  </div>
                  <div id="msSafeCountSummary" style="font-size:24px; font-weight:900; color:#22c55e; margin-top:2px;">
                    Ready for input
                  </div>
                </div>
                <button id="msCopyBtn" class="ms-btn" style="background:#133824; border-color:#22c55e; color:#4ade80; font-weight:800;" onclick="window.copyMinesweeperSafeMoves()">
                  📋 Copy Safe Moves
                </button>
              </div>
              <div id="msSafeTagList" class="ms-safe-tag-list">
                <span style="font-size:13px; color:#94a3b8;">Upload or paste an image to calculate safe squares.</span>
              </div>
            </div>

            <!-- Board Grid -->
            <div class="ms-board-container">
              <div id="msBoardWrapper"></div>
              <div style="margin-top:10px; font-size:12px; color:#8892b0;">
                Click any cell to manually cycle: <kbd>Unrevealed</kbd> ➔ <kbd>Blank</kbd> ➔ <kbd>1–8</kbd> ➔ <kbd>Mine</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    setupDropzone();
    setupGlobalPaste();
    renderBoard();
  }

  function setupDropzone() {
    const dropzone = document.getElementById('msDropzone');
    if (!dropzone) return;

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
      if (window.BombDragDrop) {
        window.BombDragDrop.handleDataTransfer(e.dataTransfer, (file) => {
          if (file) processImageFile(file);
        });
      } else {
        const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
        if (file) processImageFile(file);
      }
    });
  }

  function setupGlobalPaste() {
    document.addEventListener('paste', (e) => {
      const section = document.getElementById('minesweeperSection');
      if (!section || !section.classList.contains('active')) return;

      if (window.BombDragDrop) {
        window.BombDragDrop.handleDataTransfer(e.clipboardData, (file) => {
          if (file) processImageFile(file);
        });
        return;
      }

      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processImageFile(file);
          break;
        }
      }
    });
  }

  function processImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.currentImage = img;

        // Render preview canvas
        const previewWrap = document.getElementById('msPreviewWrapper');
        const previewCanvas = document.getElementById('msImageCanvas');
        if (previewWrap && previewCanvas) {
          previewWrap.style.display = 'block';
          previewCanvas.width = img.width;
          previewCanvas.height = img.height;
          const ctx = previewCanvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
        }

        // Read the board; a new screenshot starts a new round: the safe squares given so far were
        // clicked, so only squares that are newly safe are given (and copied) this time
        const cells = MS.parseMinesBoardFromImage(img);
        if (!cells || !cells.length) return;
        state.grid = cells.map(row => row.map(cell => toDisplay(cell.state)));
        if (state.round === 0) { state.round = 1; state.knownSafe = new Set(); }
        else { state.safeCells.forEach(c => state.knownSafe.add(c)); state.round++; }

        updateSolve();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function updateSolve() {
    const result = solveMinesweeper(state.grid);
    state.allSafe = result.safe;
    state.safeCells = result.safe.filter(c => !state.knownSafe.has(c)); // new this round
    state.mineCells = result.mines;

    renderBoard();
    updateStats();
    updateSafeBanner();
  }

  function updateStats() {
    let revealedCount = 0;
    let unknownCount = 0;

    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < TOTAL_COLS; c++) {
        const val = state.grid[r][c];
        if (val === '.') unknownCount++;
        else if (val !== 'F') revealedCount++;
      }
    }

    const statSafe = document.getElementById('msStatSafe');
    const statMines = document.getElementById('msStatMines');
    const statRevealed = document.getElementById('msStatRevealed');
    const statUnknown = document.getElementById('msStatUnknown');

    if (statSafe) statSafe.textContent = state.safeCells.length;
    if (statMines) statMines.textContent = `${state.mineCells.length}`;
    if (statRevealed) statRevealed.textContent = revealedCount;
    if (statUnknown) statUnknown.textContent = unknownCount;
  }

  function updateSafeBanner() {
    const summary = document.getElementById('msSafeCountSummary');
    const tagList = document.getElementById('msSafeTagList');
    const copyBtn = document.getElementById('msCopyBtn');

    if (!summary || !tagList) return;

    const roundTag = state.round > 1 ? ` <span style="font-size:13px; color:#94a3b8;">(round #${state.round})</span>` : '';
    if (state.safeCells.length > 0) {
      summary.innerHTML = `<span>✓ ${state.safeCells.length} New Safe Square${state.safeCells.length > 1 ? 's' : ''} to Click</span>${roundTag}`;
      tagList.innerHTML = state.safeCells.map(c => `
        <span class="ms-safe-tag">
          <span style="font-size:14px;">✓</span> ${c}
        </span>
      `).join('');
      if (copyBtn) copyBtn.style.display = 'inline-block';
    } else if (state.round === 0) {
      summary.innerHTML = 'Ready for input';
      tagList.innerHTML = `<span style="font-size:13px; color:#94a3b8;">Upload or paste an image to calculate safe squares.</span>`;
    } else {
      summary.innerHTML = `<span style="color:#ffd875;">No New Guaranteed Safe Squares</span>${roundTag}`;
      tagList.innerHTML = `<span style="font-size:13px; color:#94a3b8;">Nothing more is certain from this board${state.allSafe && state.allSafe.length ? ` (${state.allSafe.length} known safe from earlier rounds)` : ''} — check the board below, or start a new round.</span>`;
    }
  }

  function renderBoard() {
    const wrapper = document.getElementById('msBoardWrapper');
    if (!wrapper) return;

    let html = '<table class="ms-grid-table">';
    // Column header row
    html += '<tr><th></th>';
    for (let c = 0; c < TOTAL_COLS; c++) {
      html += `<th class="ms-header-cell">${COLS[c]}</th>`;
    }
    html += '<th></th></tr>';

    // 8 Rows
    for (let r = 0; r < TOTAL_ROWS; r++) {
      html += `<tr><th class="ms-header-cell">${ROWS[r]}</th>`;
      for (let c = 0; c < TOTAL_COLS; c++) {
        const cd = coord(r, c);
        const val = state.grid[r][c];
        const isSafe = state.safeCells.includes(cd);
        const isKnownSafe = !isSafe && val === '.' && (state.allSafe || []).includes(cd);
        const isMine = state.mineCells.includes(cd) || val === 'F';

        let cellClass = 'ms-cell ';
        let content = '';
        let colorStyle = '';

        if (isSafe) {
          cellClass += 'ms-cell-safe ';
          content = '✓';
        } else if (isKnownSafe) {
          cellClass += 'ms-cell-safe ms-cell-known ';
          content = '✓';
        } else if (isMine) {
          cellClass += 'ms-cell-mine ';
          content = '💣';
        } else if (val === '.') {
          cellClass += 'ms-cell-unrevealed ';
        } else if (val === '0') {
          cellClass += 'ms-cell-blank ';
          content = '';
        } else {
          cellClass += 'ms-cell-numbered ';
          content = val;
          colorStyle = `color:${NUMBER_COLORS[val] || '#fff'};`;
        }

        html += `
          <td class="${cellClass}" style="${colorStyle}" data-r="${r}" data-c="${c}" onclick="window.handleMinesweeperCellClick(${r}, ${c})">
            ${content}
          </td>
        `;
      }
      html += `<th class="ms-header-cell">${ROWS[r]}</th></tr>`;
    }

    // Bottom column header row
    html += '<tr><th></th>';
    for (let c = 0; c < TOTAL_COLS; c++) {
      html += `<th class="ms-header-cell">${COLS[c]}</th>`;
    }
    html += '<th></th></tr>';
    html += '</table>';

    wrapper.innerHTML = html;
  }

  // ── USER INTERACTIONS ─────────────────────────────────────
  window.openMinesweeperFileDialog = function() {
    const input = document.getElementById('msFileInput');
    if (input) input.click();
  };

  window.handleMinesweeperFile = function(input) {
    const file = input.files && input.files[0];
    if (file) processImageFile(file);
    input.value = '';
  };

  window.handleMinesweeperCellClick = function(r, c) {
    // Cycle cell state: . -> 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> F -> .
    const current = state.grid[r][c];
    const cycle = ['.', '0', '1', '2', '3', '4', '5', 'F'];
    const idx = cycle.indexOf(current);
    state.grid[r][c] = cycle[(idx + 1) % cycle.length];
    updateSolve();
  };

  window.copyMinesweeperSafeMoves = function() {
    if (!state.safeCells.length) return;
    const text = state.safeCells.join(' ');
    navigator.clipboard.writeText(text);

    const btn = document.getElementById('msCopyBtn');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => btn.textContent = orig, 1500);
    }
  };

  window.clearMinesweeperBoard = function() {
    state.grid = Array.from({ length: TOTAL_ROWS }, () => Array(TOTAL_COLS).fill('.'));
    state.safeCells = [];
    state.mineCells = [];
    state.allSafe = [];
    state.knownSafe = new Set();
    state.round = 0;
    state.currentImage = null;

    const previewWrap = document.getElementById('msPreviewWrapper');
    if (previewWrap) previewWrap.style.display = 'none';

    renderBoard();
    updateStats();
    updateSafeBanner();
  };

  window.recalculateMinesweeper = function() {
    updateSolve();
  };

  // forget earlier rounds: every safe square on the board counts as new again
  window.newMinesweeperRound = function() {
    state.knownSafe = new Set();
    if (state.round > 0) state.round = 1;
    updateSolve();
  };

  window.initMinesweeperModule = function() {
    injectStyles();
    renderUI();
    state.initialized = true;
  };

})();
