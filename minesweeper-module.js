/**
 * Minesweeper Module Solver for Keep Talking and Nobody Explains
 * 
 * Grid: 10 Columns (A–J), 8 Rows (1–8) = 80 cells total.
 * Constant: 16 Mines.
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
  const TOTAL_MINES = 16;

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
    probabilities: {}, // Coord -> percentage mine (0 to 100)
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

  // ── COMPUTER VISION GRID EXTRACTION ──────────────────────
  function extractGridFromImage(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const W = canvas.width;
    const H = canvas.height;

    // Detect grid bounding box:
    // Look for grid pixels that have unrevealed background (#586473) or revealed (#e6ebf0)
    let minX = W, maxX = 0, minY = H, maxY = 0;
    let found = false;

    // Exclude outer 4% and top 14% (header/title area)
    const startY = Math.floor(H * 0.14);
    const endY = Math.floor(H * 0.96);
    const startX = Math.floor(W * 0.04);
    const endX = Math.floor(W * 0.96);

    for (let y = startY; y < endY; y += 2) {
      for (let x = startX; x < endX; x += 2) {
        const idx = (y * W + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Unrevealed background ~ [88, 100, 115] or revealed ~ [230, 235, 240]
        if ((r > 65 && g > 75 && b > 85) || (r > 180 && g > 180 && b > 180)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found || maxX - minX < 100 || maxY - minY < 100) {
      // Fallback to relative percentages of module standard
      minX = Math.floor(W * 0.07);
      maxX = Math.floor(W * 0.93);
      minY = Math.floor(H * 0.17);
      maxY = Math.floor(H * 0.93);
    }

    const cellW = (maxX - minX) / TOTAL_COLS;
    const cellH = (maxY - minY) / TOTAL_ROWS;

    const extracted = [];

    for (let r = 0; r < TOTAL_ROWS; r++) {
      const row = [];
      for (let c = 0; c < TOTAL_COLS; c++) {
        const cx = Math.floor(minX + (c + 0.5) * cellW);
        const cy = Math.floor(minY + (r + 0.5) * cellH);

        const pw = Math.max(2, Math.floor(cellW * 0.22));
        const ph = Math.max(2, Math.floor(cellH * 0.22));

        let sumR = 0, sumG = 0, sumB = 0;
        let count = 0;
        let minBrightness = 255;
        let minPixel = [255, 255, 255];

        for (let dy = -ph; dy <= ph; dy++) {
          for (let dx = -pw; dx <= pw; dx++) {
            const px = cx + dx;
            const py = cy + dy;
            if (px >= 0 && px < W && py >= 0 && py < H) {
              const idx = (py * W + px) * 4;
              const pr = data[idx];
              const pg = data[idx + 1];
              const pb = data[idx + 2];

              sumR += pr;
              sumG += pg;
              sumB += pb;
              count++;

              const brightness = (pr + pg + pb) / 3;
              if (brightness < minBrightness) {
                minBrightness = brightness;
                minPixel = [pr, pg, pb];
              }
            }
          }
        }

        const avgR = count ? sumR / count : 0;
        const avgG = count ? sumG / count : 0;
        const avgB = count ? sumB / count : 0;

        // Revealed cells have light gray background (~220-245)
        if (avgR > 140 && avgG > 140) {
          if (minBrightness > 185) {
            row.push('0'); // Blank revealed cell
          } else {
            const [pr, pg, pb] = minPixel;
            // 3: Red
            if (pr > pg + 35 && pr > pb + 35) {
              row.push('3');
            // 2: Green
            } else if (pg > pr + 20 && pg > pb + 15) {
              row.push('2');
            // 4: Purple (Blue + Red, Green is low)
            } else if (pb > pg + 25 && pr > pg + 15 && pb > pr) {
              row.push('4');
            // 1: Blue (Blue is highest, Green > Red)
            } else if (pb > pr + 35 && pb > 85) {
              row.push('1');
            // 5: Maroon
            } else if (pr > 90 && pg < 60 && pb < 60) {
              row.push('5');
            // 6: Teal
            } else if (pg > 80 && pb > 80 && pr < 70) {
              row.push('6');
            } else {
              row.push('?');
            }
          }
        } else {
          row.push('.'); // Unrevealed
        }
      }
      extracted.push(row);
    }

    return extracted;
  }

  // ── EXACT CONSTRAINT SATISFACTION (CSP) SOLVER ────────────
  function solveMinesweeper(grid) {
    const safeSet = new Set();
    const mineSet = new Set();
    const probabilities = {};

    // 1. Gather all numbered revealed cells
    const numberedCells = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < TOTAL_COLS; c++) {
        const val = grid[r][c];
        if (val !== '.' && val !== '0' && val !== 'F' && val !== '?') {
          numberedCells.push({ r, c, val: parseInt(val, 10) });
        } else if (val === 'F') {
          mineSet.add(coord(r, c));
        }
      }
    }

    // Helper: get neighbors
    function getNeighbors(r, c) {
      const nbrs = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < TOTAL_ROWS && nc >= 0 && nc < TOTAL_COLS) {
            nbrs.push({ r: nr, c: nc, id: coord(nr, nc) });
          }
        }
      }
      return nbrs;
    }

    // Direct deduction loop
    let progress = true;
    while (progress) {
      progress = false;
      for (const cell of numberedCells) {
        const nbrs = getNeighbors(cell.r, cell.c);
        const unknownNbrs = nbrs.filter(n => grid[n.r][n.c] === '.' && !mineSet.has(n.id) && !safeSet.has(n.id));
        const confirmedMines = nbrs.filter(n => grid[n.r][n.c] === 'F' || mineSet.has(n.id));

        const neededMines = cell.val - confirmedMines.length;

        // If remaining needed == unknown count -> all are mines!
        if (neededMines > 0 && neededMines === unknownNbrs.length) {
          for (const u of unknownNbrs) {
            if (!mineSet.has(u.id)) {
              mineSet.add(u.id);
              progress = true;
            }
          }
        }

        // If needed == 0 -> all unknown are safe!
        if (neededMines === 0 && unknownNbrs.length > 0) {
          for (const u of unknownNbrs) {
            if (!safeSet.has(u.id)) {
              safeSet.add(u.id);
              progress = true;
            }
          }
        }
      }
    }

    // 2. Component-Based Backtracking CSP for boundary cells
    const boundaryCellsMap = new Map(); // coord -> { r, c }
    const constraints = [];

    for (const cell of numberedCells) {
      const nbrs = getNeighbors(cell.r, cell.c);
      const unk = nbrs.filter(n => grid[n.r][n.c] === '.' && !safeSet.has(n.id) && !mineSet.has(n.id));
      const confirmedMines = nbrs.filter(n => grid[n.r][n.c] === 'F' || mineSet.has(n.id)).length;
      const remainingNeeded = cell.val - confirmedMines;

      if (unk.length > 0) {
        unk.forEach(n => boundaryCellsMap.set(n.id, { r: n.r, c: n.c }));
        constraints.push({
          variables: unk.map(n => n.id),
          needed: remainingNeeded
        });
      }
    }

    const boundaryList = Array.from(boundaryCellsMap.keys());

    if (boundaryList.length > 0 && boundaryList.length <= 30) {
      // Connect variables into connected components
      const adj = new Map();
      boundaryList.forEach(id => adj.set(id, new Set()));

      constraints.forEach(con => {
        for (let i = 0; i < con.variables.length; i++) {
          for (let j = i + 1; j < con.variables.length; j++) {
            adj.get(con.variables[i]).add(con.variables[j]);
            adj.get(con.variables[j]).add(con.variables[i]);
          }
        }
      });

      const visited = new Set();
      const components = [];

      boundaryList.forEach(id => {
        if (!visited.has(id)) {
          const comp = [];
          const q = [id];
          visited.add(id);
          while (q.length > 0) {
            const curr = q.shift();
            comp.push(curr);
            adj.get(curr).forEach(nxt => {
              if (!visited.has(nxt)) {
                visited.add(nxt);
                q.push(nxt);
              }
            });
          }
          components.push(comp);
        }
      });

      // 1. Solve each component locally
      const compSolutions = [];

      components.forEach(compVars => {
        const compVarSet = new Set(compVars);
        const compConstraints = constraints.filter(con =>
          con.variables.some(v => compVarSet.has(v))
        );

        // Map constraint variables to component indices
        const indexedConstraints = compConstraints.map(con => ({
          indices: con.variables.map(v => compVars.indexOf(v)).filter(idx => idx !== -1),
          needed: con.needed
        }));

        const rawSolutions = [];

        function backtrack(idx, currentAssignment) {
          if (idx === compVars.length) {
            // Validate all constraints
            for (const con of indexedConstraints) {
              let s = 0;
              for (const vIdx of con.indices) s += currentAssignment[vIdx];
              if (s !== con.needed) return;
            }
            rawSolutions.push([...currentAssignment]);
            return;
          }

          // Prune early
          for (const con of indexedConstraints) {
            let assignedSum = 0;
            let unassignedCount = 0;
            for (const vIdx of con.indices) {
              if (vIdx < idx) {
                assignedSum += currentAssignment[vIdx];
              } else {
                unassignedCount++;
              }
            }
            if (assignedSum > con.needed) return;
            if (assignedSum + unassignedCount < con.needed) return;
          }

          // Try 0 (Safe)
          currentAssignment.push(0);
          backtrack(idx + 1, currentAssignment);
          currentAssignment.pop();

          // Try 1 (Mine)
          currentAssignment.push(1);
          backtrack(idx + 1, currentAssignment);
          currentAssignment.pop();
        }

        backtrack(0, []);
        if (rawSolutions.length > 0) {
          compSolutions.push({ vars: compVars, solutions: rawSolutions });
        }
      });

      // 2. Global mine count filter across all components and off-boundary squares
      const confirmedMineCount = mineSet.size;
      const remainingMines = TOTAL_MINES - confirmedMineCount;

      let totalBoundaryVarsCount = 0;
      compSolutions.forEach(cs => totalBoundaryVarsCount += cs.vars.length);

      let totalUnrevealedCount = 0;
      for (let r = 0; r < TOTAL_ROWS; r++) {
        for (let c = 0; c < TOTAL_COLS; c++) {
          if (grid[r][c] === '.' && !mineSet.has(coord(r, c))) {
            totalUnrevealedCount++;
          }
        }
      }
      const offBoundaryCount = Math.max(0, totalUnrevealedCount - totalBoundaryVarsCount);

      let validGlobalCombos = [{ assignments: {}, totalMines: 0 }];

      for (const comp of compSolutions) {
        const nextCombos = [];
        for (const prev of validGlobalCombos) {
          for (const sol of comp.solutions) {
            const solMines = sol.reduce((a, b) => a + b, 0);
            const newTotal = prev.totalMines + solMines;
            if (newTotal <= remainingMines && (remainingMines - newTotal) <= offBoundaryCount) {
              const newAssignments = { ...prev.assignments };
              comp.vars.forEach((v, i) => { newAssignments[v] = sol[i]; });
              nextCombos.push({ assignments: newAssignments, totalMines: newTotal });
            }
          }
        }
        validGlobalCombos = nextCombos;
      }

      if (validGlobalCombos.length > 0) {
        const allCompVars = [];
        compSolutions.forEach(cs => allCompVars.push(...cs.vars));

        for (const vId of allCompVars) {
          let mineOccurrences = 0;
          for (const combo of validGlobalCombos) {
            if (combo.assignments[vId] === 1) mineOccurrences++;
          }

          if (mineOccurrences === 0) {
            safeSet.add(vId);
            mineSet.delete(vId);
            probabilities[vId] = 0;
          } else if (mineOccurrences === validGlobalCombos.length) {
            mineSet.add(vId);
            safeSet.delete(vId);
            probabilities[vId] = 100;
          } else {
            probabilities[vId] = Math.round((mineOccurrences / validGlobalCombos.length) * 100);
          }
        }

        // Check if all remaining mines are accounted for on the boundary
        const maxRemainingForOff = Math.max(...validGlobalCombos.map(c => remainingMines - c.totalMines));
        const minRemainingForOff = Math.min(...validGlobalCombos.map(c => remainingMines - c.totalMines));

        if (maxRemainingForOff === 0) {
          // All off-boundary cells are 100% Guaranteed SAFE!
          for (let r = 0; r < TOTAL_ROWS; r++) {
            for (let c = 0; c < TOTAL_COLS; c++) {
              const id = coord(r, c);
              if (grid[r][c] === '.' && !allCompVars.includes(id) && !mineSet.has(id)) {
                safeSet.add(id);
                probabilities[id] = 0;
              }
            }
          }
        } else if (offBoundaryCount > 0 && minRemainingForOff === offBoundaryCount) {
          // All off-boundary cells MUST be MINES!
          for (let r = 0; r < TOTAL_ROWS; r++) {
            for (let c = 0; c < TOTAL_COLS; c++) {
              const id = coord(r, c);
              if (grid[r][c] === '.' && !allCompVars.includes(id) && !mineSet.has(id)) {
                mineSet.add(id);
                probabilities[id] = 100;
              }
            }
          }
        } else if (offBoundaryCount > 0) {
          // Calculate average probability for off-boundary cells
          const avgRemainingForOff = validGlobalCombos.reduce((sum, c) => sum + (remainingMines - c.totalMines), 0) / validGlobalCombos.length;
          const offProb = Math.round((avgRemainingForOff / offBoundaryCount) * 100);
          for (let r = 0; r < TOTAL_ROWS; r++) {
            for (let c = 0; c < TOTAL_COLS; c++) {
              const id = coord(r, c);
              if (grid[r][c] === '.' && !allCompVars.includes(id) && !mineSet.has(id)) {
                probabilities[id] = offProb;
              }
            }
          }
        }
      }
    }

    // Global mine count check: If all 16 mines are found, ALL remaining unrevealed are safe!
    const totalFoundMines = mineSet.size;
    if (totalFoundMines >= TOTAL_MINES) {
      for (let r = 0; r < TOTAL_ROWS; r++) {
        for (let c = 0; c < TOTAL_COLS; c++) {
          const id = coord(r, c);
          if (grid[r][c] === '.' && !mineSet.has(id)) {
            safeSet.add(id);
          }
        }
      }
    }

    const safeArray = Array.from(safeSet).sort();
    const mineArray = Array.from(mineSet).sort();

    return {
      safe: safeArray,
      mines: mineArray,
      probabilities
    };
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
              10×8 Grid · 16 Mines
            </span>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="ms-btn" onclick="window.clearMinesweeperBoard()">Reset Board</button>
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
                <li>Paste the updated screenshot to immediately get the next safe squares!</li>
              </ol>
            </div>

            <div class="ms-stat-grid">
              <div class="ms-stat-box">
                <div class="ms-stat-val" id="msStatSafe" style="color:#22c55e;">0</div>
                <div class="ms-stat-lbl">Safe Squares</div>
              </div>
              <div class="ms-stat-box">
                <div class="ms-stat-val" id="msStatMines" style="color:#ef4444;">0 / 16</div>
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
      dropzone.classList.remove('dragover');
      const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
      if (file) processImageFile(file);
    });
  }

  function setupGlobalPaste() {
    document.addEventListener('paste', (e) => {
      const section = document.getElementById('minesweeperSection');
      if (!section || !section.classList.contains('active')) return;

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

        // Extract grid
        const extracted = extractGridFromImage(img);

        // Merge into current grid (preserving existing numbers/mines if new image didn't clear them)
        for (let r = 0; r < TOTAL_ROWS; r++) {
          for (let c = 0; c < TOTAL_COLS; c++) {
            const ext = extracted[r][c];
            if (ext !== '.' && ext !== '?') {
              state.grid[r][c] = ext;
            }
          }
        }

        updateSolve();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function updateSolve() {
    const result = solveMinesweeper(state.grid);
    state.safeCells = result.safe;
    state.mineCells = result.mines;
    state.probabilities = result.probabilities;

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
    if (statMines) statMines.textContent = `${state.mineCells.length} / ${TOTAL_MINES}`;
    if (statRevealed) statRevealed.textContent = revealedCount;
    if (statUnknown) statUnknown.textContent = unknownCount;
  }

  function updateSafeBanner() {
    const summary = document.getElementById('msSafeCountSummary');
    const tagList = document.getElementById('msSafeTagList');
    const copyBtn = document.getElementById('msCopyBtn');

    if (!summary || !tagList) return;

    if (state.safeCells.length > 0) {
      summary.innerHTML = `<span>✓ ${state.safeCells.length} Safe Square${state.safeCells.length > 1 ? 's' : ''} to Click</span>`;
      tagList.innerHTML = state.safeCells.map(c => `
        <span class="ms-safe-tag">
          <span style="font-size:14px;">✓</span> ${c}
        </span>
      `).join('');
      if (copyBtn) copyBtn.style.display = 'inline-block';
    } else if (state.mineCells.length >= TOTAL_MINES) {
      summary.innerHTML = `<span style="color:#ffd875;">🎉 All 16 Mines Identified!</span>`;
      tagList.innerHTML = `<span style="font-size:14px; color:#4ade80;">All remaining squares on the board are 100% SAFE to dig!</span>`;
    } else {
      summary.innerHTML = `<span style="color:#ffd875;">No 100% Deterministic Safe Moves</span>`;
      // Find lowest probability guess
      let lowestProb = 100;
      let lowestCoord = null;
      for (const [cd, prob] of Object.entries(state.probabilities)) {
        if (prob < lowestProb) {
          lowestProb = prob;
          lowestCoord = cd;
        }
      }
      if (lowestCoord) {
        tagList.innerHTML = `<span style="font-size:13px; color:#ffd875;">Safest Guess: <strong>${lowestCoord}</strong> (${lowestProb}% mine risk)</span>`;
      } else {
        tagList.innerHTML = `<span style="font-size:13px; color:#94a3b8;">Upload or paste an image to calculate safe squares.</span>`;
      }
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
        const isMine = state.mineCells.includes(cd) || val === 'F';
        const prob = state.probabilities[cd];

        let cellClass = 'ms-cell ';
        let content = '';
        let colorStyle = '';

        if (isSafe) {
          cellClass += 'ms-cell-safe ';
          content = '✓';
        } else if (isMine) {
          cellClass += 'ms-cell-mine ';
          content = '💣';
        } else if (val === '.') {
          cellClass += 'ms-cell-unrevealed ';
          if (prob !== undefined && prob > 0 && prob < 100) {
            content = `<span class="ms-prob-badge">${prob}%</span>`;
          }
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
    const text = state.safeCells.join(', ');
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
    state.probabilities = {};
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

  window.initMinesweeperModule = function() {
    injectStyles();
    renderUI();
    state.initialized = true;
  };

})();
