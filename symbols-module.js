/**
 * Symbols Module Solver for KTaNE Solver Deck
 * 
 * Capabilities:
 * - Scans 1 to 3 reference grid images (supporting single 5x5 grids, stacked 2-stage grids, or multi-stage strips)
 * - Detects all 12 canonical symbols: Ω, Ѣ, ©, Ψ, ☆, ★, Ж, Ϙ, ¿, ƛ, Ѿ, ⩪
 * - Auto-detects 4-button module keypad (Buttons 1, 2, 3, 4)
 * - Supports 1-click manual symbol selector / overrides for each button
 * - Aggregates total symbol counts across all reference slots
 * - Sorts buttons in descending order of count and displays the exact press sequence
 */

(function () {
  'use strict';

  // ── 12 CANONICAL SYMBOL DEFINITIONS ──────────────────────────────
  const SYMBOLS_DEF = {
    OMEGA:         { id: 'OMEGA',         name: 'Omega',          glyph: 'Ω',  label: 'Omega (Ω)' },
    YAT:           { id: 'YAT',           name: 'Yat',            glyph: 'Ѣ',  label: 'Yat (Ѣ)' },
    COPYRIGHT:     { id: 'COPYRIGHT',     name: 'Copyright',      glyph: '©',  label: 'Copyright (©)' },
    PSI:           { id: 'PSI',           name: 'Psi',            glyph: 'Ψ',  label: 'Psi (Ψ)' },
    STAR_HOLLOW:   { id: 'STAR_HOLLOW',   name: 'White Star',     glyph: '☆',  label: 'Hollow Star (☆)' },
    STAR_SOLID:    { id: 'STAR_SOLID',    name: 'Black Star',     glyph: '★',  label: 'Solid Star (★)' },
    ZHE:           { id: 'ZHE',           name: 'Zhe',            glyph: 'Ж',  label: 'Zhe / Spider (Ж)' },
    KOPPA:         { id: 'KOPPA',         name: 'Koppa',          glyph: 'Ϙ',  label: 'Koppa / Balloon (Ϙ)' },
    INV_QUESTION:  { id: 'INV_QUESTION',  name: 'Inverted ?',     glyph: '¿',  label: 'Inverted ? (¿)' },
    LAMBDA_STROKE: { id: 'LAMBDA_STROKE', name: 'Lambda Stroke',  glyph: 'ƛ',  label: 'Lambda Stroke (ƛ)' },
    OT:            { id: 'OT',            name: 'Ot (C-Q)',       glyph: 'Ѿ',  label: 'Ot / C-Q (Ѿ)' },
    DOUBLE_CROSS:  { id: 'DOUBLE_CROSS',  name: 'Double Cross',   glyph: '҂',  label: 'Double Cross (҂)' }
  };

  // Helper to render exact glyph or crisp SVG for in-game accuracy
  function getSymbolGlyphHTML(symKey, size = 28) {
    if (!symKey || !SYMBOLS_DEF[symKey]) return '?';
    if (symKey === 'DOUBLE_CROSS') {
      return `<svg class="sym-svg-glyph" viewBox="0 0 24 24" width="${size}" height="${size}" style="display:inline-block; vertical-align:middle; fill:currentColor;"><path d="M 17.7 2.7 L 15.7 2.0 L 13.0 5.3 L 9.7 3.3 L 7.7 4.7 L 11.0 10.0 L 9.0 12.7 L 5.7 10.7 L 3.0 12.7 L 7.0 16.0 L 5.7 21.3 L 8.3 22.0 L 11.0 18.0 L 15.0 20.7 L 17.0 17.3 L 12.3 14.7 L 15.0 10.7 L 18.3 12.7 L 21.0 10.7 L 17.0 7.3 Z" /></svg>`;
    }
    return SYMBOLS_DEF[symKey].glyph;
  }

  // Precomputed 16x16 bitmasks for the 12 symbols
  const SYMBOL_TEMPLATES = {
    OMEGA:         [0, 1584, 6172, 12302, 12294, 24582, 24582, 24582, 24582, 12294, 12300, 7192, 512, 16384, 32318, 0],
    YAT:           [0, 8064, 8064, 1536, 32704, 26208, 18016, 1536, 1912, 1564, 1564, 1548, 1564, 1564, 8184, 0],
    COPYRIGHT:     [0, 448, 1040, 2056, 9190, 9762, 17440, 19456, 19456, 19456, 17442, 9762, 12772, 2056, 1584, 0],
    LAMBDA_STROKE: [0, 2048, 15872, 13056, 1792, 3328, 2304, 768, 896, 1664, 3264, 3136, 6240, 6180, 12348, 0],
    OT:            [0, 768, 3120, 6264, 14540, 12684, 29062, 29062, 24966, 29062, 29070, 12748, 14556, 7416, 1650, 0],
    PSI:           [0, 992, 12482, 12482, 12486, 12486, 12486, 12486, 6342, 3276, 992, 192, 192, 192, 0, 0],
    DOUBLE_CROSS:  [0, 32, 568, 1912, 4080, 1008, 508, 12796, 15260, 32640, 7936, 4064, 4064, 7904, 7168, 0],
    STAR_SOLID:    [0, 128, 128, 128, 448, 448, 32766, 8188, 4088, 2032, 2032, 2032, 1584, 1040, 0, 0],
    STAR_HOLLOW:   [0, 128, 128, 0, 320, 0, 32318, 4, 2056, 1040, 1040, 1168, 544, 1040, 0, 0],
    ZHE:           [0, 0, 31726, 2176, 144, 1168, 1184, 2016, 1168, 3224, 6284, 12740, 6, 2, 0, 0],
    KOPPA:         [0, 448, 992, 1048, 3096, 2056, 6152, 6152, 2056, 3080, 1048, 1008, 192, 128, 128, 0],
    INV_QUESTION:  [0, 128, 192, 128, 0, 128, 128, 128, 768, 1536, 1536, 3584, 3584, 1568, 864, 0]
  };

  // Precompute normalized vectors for NCC matching
  const PRECOMPUTED_TEMPLATES = {};
  for (const [key, rows] of Object.entries(SYMBOL_TEMPLATES)) {
    const vec = new Float32Array(256);
    let sum = 0;
    for (let r = 0; r < 16; r++) {
      const val = rows[r];
      for (let c = 0; c < 16; c++) {
        if (val & (1 << (15 - c))) {
          vec[r * 16 + c] = 1.0;
          sum += 1.0;
        }
      }
    }
    const mean = sum / 256;
    let normSq = 0;
    for (let i = 0; i < 256; i++) {
      vec[i] -= mean;
      normSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(normSq);
    PRECOMPUTED_TEMPLATES[key] = { vec, norm };
  }

  // ── MODULE STATE ──────────────────────────────────────────────────
  const state = {
    // 3 Reference slots
    refImages: [null, null, null],
    refCounts: [{}, {}, {}],
    refMeta: ['', '', ''],
    // 4 module buttons: index 0 -> Button 1, index 1 -> Button 2, etc.
    buttons: [null, null, null, null],
    moduleImage: null,
    // Aggregated counts for all 12 symbols
    totalCounts: {},
    // Currently selected target for paste (default: Slot 1)
    activeTarget: 'ref0' // 'ref0' | 'ref1' | 'ref2' | 'mod'
  };

  // ── CLASSIFIER UTILITIES ──────────────────────────────────────────
  function classifyCellPatch(patch) {
    const h = patch.shape ? patch.shape[0] : patch.length;
    const w = patch.shape ? patch.shape[1] : patch[0].length;

    let area = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (patch[y][x]) area++;
      }
    }
    const fillRatio = area / (h * w);

    const scale = Math.min(14.0 / w, 14.0 / h);
    const nw = Math.max(1, Math.round(w * scale));
    const nh = Math.max(1, Math.round(h * scale));
    const ox = Math.floor((16 - nw) / 2);
    const oy = Math.floor((16 - nh) / 2);

    const canvas = new Float32Array(256);
    let sum = 0;
    for (let r = 0; r < nh; r++) {
      const srcY = Math.min(h - 1, Math.floor(r / scale));
      for (let c = 0; c < nw; c++) {
        const srcX = Math.min(w - 1, Math.floor(c / scale));
        if (patch[srcY][srcX]) {
          canvas[(oy + r) * 16 + (ox + c)] = 1.0;
          sum += 1.0;
        }
      }
    }

    const mean = sum / 256;
    let normSq = 0;
    for (let i = 0; i < 256; i++) {
      canvas[i] -= mean;
      normSq += canvas[i] * canvas[i];
    }
    const norm = Math.sqrt(normSq);
    if (norm === 0) return { symbol: '?', score: 0 };

    let bestSymbol = '?';
    let bestScore = -999;

    for (const [key, tpl] of Object.entries(PRECOMPUTED_TEMPLATES)) {
      if (tpl.norm === 0) continue;
      let dot = 0;
      for (let i = 0; i < 256; i++) {
        dot += canvas[i] * tpl.vec[i];
      }
      const score = dot / (norm * tpl.norm);
      if (score > bestScore) {
        bestScore = score;
        bestSymbol = key;
      }
    }

    // Accurate discrimination between solid star vs hollow star
    if (bestSymbol === 'STAR_SOLID' || bestSymbol === 'STAR_HOLLOW') {
      bestSymbol = fillRatio > 0.24 ? 'STAR_SOLID' : 'STAR_HOLLOW';
    }

    return { symbol: bestSymbol, score: bestScore };
  }

  // ── SCAN REFERENCE GRIDS (1 to 3 images) ───────────────────────────
  function scanReferenceImage(img) {
    const cv = document.createElement('canvas');
    const W = img.naturalWidth || img.width;
    const H = img.naturalHeight || img.height;
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const idata = ctx.getImageData(0, 0, W, H).data;

    // Detect grid row intervals via average row brightness:
    // Dark headers/separators ~ 40, light grid cells ~ 220
    const rowMeans = new Float32Array(H);
    for (let y = 0; y < H; y++) {
      let rSum = 0;
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        rSum += 0.299 * idata[idx] + 0.587 * idata[idx + 1] + 0.114 * idata[idx + 2];
      }
      rowMeans[y] = rSum / W;
    }

    const isGridRow = new Uint8Array(H);
    for (let y = 0; y < H; y++) {
      if (rowMeans[y] > 140) isGridRow[y] = 1;
    }

    const gridIntervals = [];
    let inGrid = false;
    let startY = 0;
    for (let y = 0; y < H; y++) {
      if (isGridRow[y] === 1 && !inGrid) {
        inGrid = true;
        startY = y;
      } else if (isGridRow[y] === 0 && inGrid) {
        inGrid = false;
        if (y - startY > 45) {
          gridIntervals.push({ y1: startY, y2: y, h: y - startY });
        }
      }
    }
    if (inGrid && (H - startY) > 45) {
      gridIntervals.push({ y1: startY, y2: H, h: H - startY });
    }

    // Fallback: If no headers detected, treat entire image as 1 grid
    if (gridIntervals.length === 0) {
      gridIntervals.push({ y1: 0, y2: H, h: H });
    }

    const counts = {};
    let totalCells = 0;

    for (const grid of gridIntervals) {
      const gY = grid.y1;
      const gH = grid.h;
      const cellW = W / 5.0;
      const cellH = gH / 5.0;

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const x1 = Math.floor(c * cellW);
          const x2 = Math.floor((c + 1) * cellW);
          const y1 = Math.floor(gY + r * cellH);
          const y2 = Math.floor(gY + (r + 1) * cellH);
          const cw = x2 - x1;
          const ch = y2 - y1;
          if (cw <= 0 || ch <= 0) continue;

          // Find dark symbol pixels inside cell
          let minX = cw, maxX = -1, minY = ch, maxY = -1;
          const binary = [];
          for (let py = 0; py < ch; py++) {
            const row = new Uint8Array(cw);
            for (let px = 0; px < cw; px++) {
              // Exclude outer 2px boundary
              if (py < 2 || py >= ch - 2 || px < 2 || px >= cw - 2) continue;
              const idx = ((y1 + py) * W + (x1 + px)) * 4;
              const gray = 0.299 * idata[idx] + 0.587 * idata[idx + 1] + 0.114 * idata[idx + 2];
              if (gray < 110) {
                row[px] = 1;
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
              }
            }
            binary.push(row);
          }

          if (maxX >= minX && maxY >= minY) {
            const pw = maxX - minX + 1;
            const ph = maxY - minY + 1;
            const patch = [];
            for (let py = minY; py <= maxY; py++) {
              const pRow = new Uint8Array(pw);
              for (let px = minX; px <= maxX; px++) {
                pRow[px - minX] = binary[py][px];
              }
              patch.push(pRow);
            }
            const res = classifyCellPatch(patch);
            if (res.symbol && res.symbol !== '?') {
              counts[res.symbol] = (counts[res.symbol] || 0) + 1;
              totalCells++;
            }
          }
        }
      }
    }

    return {
      counts,
      gridCount: gridIntervals.length,
      totalCells
    };
  }

  // ── SCAN 4-BUTTON MODULE IMAGE ─────────────────────────────────────
  function scanModuleImage(img) {
    const cv = document.createElement('canvas');
    const W = img.naturalWidth || img.width;
    const H = img.naturalHeight || img.height;
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const idata = ctx.getImageData(0, 0, W, H).data;

    // Detect the 4 white buttons (buttons have light gray/white background)
    const whiteMap = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        const r = idata[idx], g = idata[idx + 1], b = idata[idx + 2];
        if (r > 195 && g > 195 && b > 195) {
          whiteMap[y * W + x] = 1;
        }
      }
    }

    // BFS connected components to find buttons
    const visited = new Uint8Array(W * H);
    const btns = [];
    const queue = new Int32Array(W * H * 2);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const startIdx = y * W + x;
        if (whiteMap[startIdx] === 1 && visited[startIdx] === 0) {
          let qHead = 0, qTail = 0;
          queue[qTail++] = x;
          queue[qTail++] = y;
          visited[startIdx] = 1;

          let minX = x, maxX = x, minY = y, maxY = y;
          let area = 0, sumX = 0, sumY = 0;

          while (qHead < qTail) {
            const cx = queue[qHead++];
            const cy = queue[qHead++];
            area++;
            sumX += cx;
            sumY += cy;

            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            const neighbors = [cx - 1, cy, cx + 1, cy, cx, cy - 1, cx, cy + 1];
            for (let i = 0; i < 8; i += 2) {
              const nx = neighbors[i], ny = neighbors[i + 1];
              if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                const nIdx = ny * W + nx;
                if (whiteMap[nIdx] === 1 && visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  queue[qTail++] = nx;
                  queue[qTail++] = ny;
                }
              }
            }
          }

          const bw = maxX - minX + 1;
          const bh = maxY - minY + 1;
          // Filter button areas
          if (area > 500 && bw >= 30 && bh >= 30 && bw <= W * 0.6 && bh <= H * 0.6) {
            btns.push({
              x: minX,
              y: minY,
              bw,
              bh,
              cx: sumX / area,
              cy: sumY / area
            });
          }
        }
      }
    }

    // Sort into 2x2 grid: Top-Left (1), Top-Right (2), Bottom-Left (3), Bottom-Right (4)
    if (btns.length >= 4) {
      btns.sort((a, b) => {
        const aTop = a.cy < H * 0.5;
        const bTop = b.cy < H * 0.5;
        if (aTop !== bTop) return aTop ? -1 : 1;
        return a.cx - b.cx;
      });
    }

    const detectedSymbols = [null, null, null, null];

    for (let idx = 0; idx < Math.min(4, btns.length); idx++) {
      const b = btns[idx];
      // Inner area of button: zero out top-left corner where digit '1', '2', '3', '4' is
      let minX = b.bw, maxX = -1, minY = b.bh, maxY = -1;
      const binary = [];
      const digitLimitY = Math.floor(b.bh * 0.32);
      const digitLimitX = Math.floor(b.bw * 0.32);

      for (let py = 0; py < b.bh; py++) {
        const row = new Uint8Array(b.bw);
        for (let px = 0; px < b.bw; px++) {
          // Zero out top-left digit corner & outer borders
          if (py < digitLimitY && px < digitLimitX) continue;
          if (py < 4 || py >= b.bh - 4 || px < 4 || px >= b.bw - 4) continue;

          const pIdx = ((b.y + py) * W + (b.x + px)) * 4;
          const gray = 0.299 * idata[pIdx] + 0.587 * idata[pIdx + 1] + 0.114 * idata[pIdx + 2];
          if (gray < 120) {
            row[px] = 1;
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }
        binary.push(row);
      }

      if (maxX >= minX && maxY >= minY) {
        const pw = maxX - minX + 1;
        const ph = maxY - minY + 1;
        const patch = [];
        for (let py = minY; py <= maxY; py++) {
          const pRow = new Uint8Array(pw);
          for (let px = minX; px <= maxX; px++) {
            pRow[px - minX] = binary[py][px];
          }
          patch.push(pRow);
        }
        const res = classifyCellPatch(patch);
        if (res.symbol && res.symbol !== '?') {
          detectedSymbols[idx] = res.symbol;
        }
      }
    }

    return detectedSymbols;
  }

  // ── SOLVER & UI LOGIC ─────────────────────────────────────────────
  function recalcTotalCounts() {
    const total = {};
    for (let i = 0; i < 3; i++) {
      const counts = state.refCounts[i];
      for (const [sym, count] of Object.entries(counts)) {
        total[sym] = (total[sym] || 0) + count;
      }
    }
    state.totalCounts = total;
  }

  function solveSymbols() {
    recalcTotalCounts();
    updateCountsDisplay();
    updateButtonTiles();
    updateSolutionDisplay();
  }

  function updateCountsDisplay() {
    const gridEl = document.getElementById('symbolsCountsGrid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    for (const [key, def] of Object.entries(SYMBOLS_DEF)) {
      const count = state.totalCounts[key] || 0;
      const card = document.createElement('div');
      card.className = 'sym-count-badge';
      card.innerHTML = `
        <div class="sym-count-glyph">${getSymbolGlyphHTML(key, 22)}</div>
        <div class="sym-count-num ${count > 0 ? 'active' : ''}">${count}</div>
      `;
      gridEl.appendChild(card);
    }
  }

  function updateButtonTiles() {
    for (let i = 1; i <= 4; i++) {
      const symKey = state.buttons[i - 1];
      const glyphEl = document.getElementById(`symBtnGlyph-${i}`);
      const nameEl = document.getElementById(`symBtnName-${i}`);
      const countEl = document.getElementById(`symBtnCount-${i}`);

      if (symKey && SYMBOLS_DEF[symKey]) {
        const def = SYMBOLS_DEF[symKey];
        const count = state.totalCounts[symKey] || 0;
        if (glyphEl) glyphEl.innerHTML = getSymbolGlyphHTML(symKey, 38);
        if (nameEl) nameEl.textContent = def.name;
        if (countEl) countEl.textContent = `Count: ${count}`;
      } else {
        if (glyphEl) glyphEl.textContent = '?';
        if (nameEl) nameEl.textContent = 'Click to select';
        if (countEl) countEl.textContent = 'Count: -';
      }
    }
  }

  function updateSolutionDisplay() {
    const solBanner = document.getElementById('symbolsSolutionBanner');
    const stepsEl = document.getElementById('symbolsSolutionSteps');
    if (!solBanner || !stepsEl) return;

    // Check how many buttons are assigned
    const assignedButtons = [];
    for (let i = 0; i < 4; i++) {
      const symKey = state.buttons[i];
      if (symKey && SYMBOLS_DEF[symKey]) {
        assignedButtons.push({
          num: i + 1,
          symbolKey: symKey,
          symbolDef: SYMBOLS_DEF[symKey],
          count: state.totalCounts[symKey] || 0
        });
      }
    }

    if (assignedButtons.length < 4) {
      solBanner.style.display = 'none';
      stepsEl.innerHTML = `<div style="color:#64748b; font-size:13.5px; padding:12px; text-align:center;">
        Assign all 4 buttons (by pasting the module screenshot or clicking on each button) to see the descending press sequence.
      </div>`;
      return;
    }

    // Sort buttons in descending order of count
    // In case of ties, preserve numerical order (1, 2, 3, 4)
    const sorted = [...assignedButtons].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.num - b.num;
    });

    const seqText = sorted.map(b => b.num).join('  ➔  ');
    solBanner.style.display = 'block';
    solBanner.innerHTML = `
      <div style="font-size:11.5px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#ffd875; margin-bottom:4px;">
        PRESS SEQUENCE (DESCENDING BY COUNT)
      </div>
      <div style="font-family:'Outfit',sans-serif; font-size:32px; font-weight:900; color:#3ddc84; letter-spacing:1px;">
        ${seqText}
      </div>
    `;

    let stepsHtml = '<div style="display:flex; flex-direction:column; gap:8px; width:100%;">';
    sorted.forEach((item, rank) => {
      stepsHtml += `
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid #1e2442; border-radius:10px; padding:10px 16px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-family:'Outfit',sans-serif; font-size:16px; font-weight:800; color:#ffd875; min-width:24px;">#${rank + 1}</span>
            <div style="background:#1e2442; border:1px solid #3b82f6; border-radius:8px; padding:4px 12px; font-size:20px; font-weight:900; color:#fff;">
              Button ${item.num}
            </div>
            <div style="font-size:24px; color:#a5b4fc; font-weight:800; min-width:32px; text-align:center; display:flex; align-items:center; justify-content:center;">
              ${getSymbolGlyphHTML(item.symbolKey, 24)}
            </div>
            <span style="font-size:13.5px; color:#cbd5e1; font-weight:600;">${item.symbolDef.name}</span>
          </div>
          <div style="font-size:16px; font-weight:800; color:#3ddc84;">
            ${item.count} <span style="font-size:11.5px; color:#94a3b8; font-weight:500;">occurrences</span>
          </div>
        </div>
      `;
    });
    stepsHtml += '</div>';
    stepsEl.innerHTML = stepsHtml;
  }

  // ── MODAL PICKER FOR MANUAL SYMBOL SELECTION ──────────────────────
  let activePickingButton = null;

  function openSymbolPicker(btnIndex) {
    activePickingButton = btnIndex;
    const modal = document.getElementById('symbolsPickerModal');
    const titleEl = document.getElementById('symbolsPickerTitle');
    if (!modal) return;
    if (titleEl) titleEl.textContent = `Select Symbol for Button ${btnIndex}`;
    modal.style.display = 'flex';
  }

  function closeSymbolPicker() {
    const modal = document.getElementById('symbolsPickerModal');
    if (modal) modal.style.display = 'none';
    activePickingButton = null;
  }

  function selectSymbolForActiveButton(symKey) {
    if (activePickingButton !== null) {
      state.buttons[activePickingButton - 1] = symKey;
      closeSymbolPicker();
      solveSymbols();
    }
  }

  // ── IMAGE HANDLING ────────────────────────────────────────────────
  function handleReferenceImage(file, slotIndex) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.refImages[slotIndex] = img;
        const res = scanReferenceImage(img);
        state.refCounts[slotIndex] = res.counts;
        state.refMeta[slotIndex] = `${res.gridCount} grid(s), ${res.totalCells} cells scanned`;

        // Update slot UI
        const prevEl = document.getElementById(`symRefPrev-${slotIndex}`);
        const metaEl = document.getElementById(`symRefMeta-${slotIndex}`);
        const clearBtn = document.getElementById(`symRefClear-${slotIndex}`);
        if (prevEl) {
          prevEl.src = e.target.result;
          prevEl.style.display = 'block';
        }
        if (metaEl) {
          metaEl.textContent = state.refMeta[slotIndex];
          metaEl.style.display = 'block';
        }
        if (clearBtn) clearBtn.style.display = 'inline-block';

        solveSymbols();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function clearReferenceSlot(slotIndex) {
    state.refImages[slotIndex] = null;
    state.refCounts[slotIndex] = {};
    state.refMeta[slotIndex] = '';

    const prevEl = document.getElementById(`symRefPrev-${slotIndex}`);
    const metaEl = document.getElementById(`symRefMeta-${slotIndex}`);
    const clearBtn = document.getElementById(`symRefClear-${slotIndex}`);
    const inputEl = document.getElementById(`symRefInput-${slotIndex}`);

    if (prevEl) { prevEl.src = ''; prevEl.style.display = 'none'; }
    if (metaEl) { metaEl.textContent = ''; metaEl.style.display = 'none'; }
    if (clearBtn) clearBtn.style.display = 'none';
    if (inputEl) inputEl.value = '';

    selectTarget(`ref${slotIndex}`);
    solveSymbols();
  }

  function handleModuleImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.moduleImage = img;
        const detected = scanModuleImage(img);
        for (let i = 0; i < 4; i++) {
          if (detected[i]) state.buttons[i] = detected[i];
        }

        const prevEl = document.getElementById('symModPrev');
        const metaEl = document.getElementById('symModMeta');
        const clearBtn = document.getElementById('symModClear');
        if (prevEl) {
          prevEl.src = e.target.result;
          prevEl.style.display = 'block';
        }
        if (metaEl) {
          metaEl.textContent = '4 buttons auto-detected';
          metaEl.style.display = 'block';
        }
        if (clearBtn) clearBtn.style.display = 'inline-block';

        selectTarget('mod');
        solveSymbols();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function clearModuleImage() {
    state.moduleImage = null;
    state.buttons = [null, null, null, null];
    const prevEl = document.getElementById('symModPrev');
    const metaEl = document.getElementById('symModMeta');
    const clearBtn = document.getElementById('symModClear');
    const inputEl = document.getElementById('symModInput');
    if (prevEl) { prevEl.src = ''; prevEl.style.display = 'none'; }
    if (metaEl) { metaEl.textContent = ''; metaEl.style.display = 'none'; }
    if (clearBtn) clearBtn.style.display = 'none';
    if (inputEl) inputEl.value = '';
    selectTarget('mod');
    solveSymbols();
  }

  function resetAll() {
    for (let i = 0; i < 3; i++) clearReferenceSlot(i);
    clearModuleImage();
    selectTarget('ref0');
  }

  // ── TARGET SELECTION FOR PASTING ──────────────────────────────────
  function selectTarget(targetId) {
    state.activeTarget = targetId;
    for (let i = 0; i < 3; i++) {
      const slotEl = document.getElementById(`symRefSlot-${i}`);
      const pillEl = document.getElementById(`symRefTargetPill-${i}`);
      const isSelected = targetId === `ref${i}`;
      if (slotEl) slotEl.classList.toggle('selected', isSelected);
      if (pillEl) {
        pillEl.textContent = isSelected ? '🎯 Target (Ctrl+V)' : 'Click to Target';
      }
    }
    const modEl = document.getElementById('symModSlot');
    const modPill = document.getElementById('symModTargetPill');
    const isModSelected = targetId === 'mod';
    if (modEl) modEl.classList.toggle('selected', isModSelected);
    if (modPill) {
      modPill.textContent = isModSelected ? '🎯 Target (Ctrl+V)' : 'Click to Target';
    }
  }

  // ── RENDER DOM ────────────────────────────────────────────────────
  function renderUI() {
    const section = document.getElementById('symbolsSection');
    if (!section) return;

    section.innerHTML = `
      <style>
        .sym-shell {
          max-width: 1040px;
          margin: 0 auto;
          background: #0b0d19;
          border: 1px solid #1a1e36;
          border-radius: 16px;
          padding: 24px;
          color: #e2e8f0;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .sym-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #1e2442;
          padding-bottom: 14px;
          margin-bottom: 20px;
        }
        .sym-title {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: #ffd875;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sym-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 820px) {
          .sym-grid-2col { grid-template-columns: 1fr; }
        }
        .sym-panel {
          background: #101426;
          border: 1px solid #1e2442;
          border-radius: 12px;
          padding: 16px;
        }
        .sym-panel-title {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #a5b4fc;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sym-drop-slots {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .sym-slot {
          background: #141930;
          border: 2px dashed #2d3766;
          border-radius: 10px;
          padding: 12px 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .sym-slot:hover {
          border-color: #3b82f6;
          background: #18203f;
        }
        .sym-slot.selected {
          border-color: #ffd875 !important;
          border-style: solid !important;
          background: #1c2242 !important;
          box-shadow: 0 0 16px rgba(255, 216, 117, 0.4);
        }
        .sym-target-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          margin-top: 4px;
          letter-spacing: 0.3px;
          transition: all 0.15s ease;
        }
        .sym-slot.selected .sym-target-pill {
          background: #ffd875;
          color: #0b0d19;
        }
        .sym-slot:not(.selected) .sym-target-pill {
          background: rgba(255, 255, 255, 0.06);
          color: #64748b;
        }
        .sym-slot img {
          max-width: 100%;
          max-height: 90px;
          border-radius: 6px;
          margin: 6px auto;
          display: none;
          object-fit: contain;
        }
        .sym-btn-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          max-width: 320px;
          margin: 0 auto;
        }
        .sym-btn-tile {
          background: #f1f5f9;
          color: #0f172a;
          border: 2px solid #cbd5e1;
          border-radius: 12px;
          padding: 12px 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s;
          position: relative;
          min-height: 100px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .sym-btn-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
          border-color: #ffd875;
        }
        .sym-btn-num {
          position: absolute;
          top: 6px;
          left: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 800;
          color: #475569;
        }
        .sym-btn-glyph {
          font-size: 38px;
          font-weight: 900;
          line-height: 1;
          margin: 4px 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sym-btn-name {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
        }
        .sym-btn-count {
          font-size: 11px;
          font-weight: 700;
          color: #0284c7;
          margin-top: 2px;
        }
        .sym-counts-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          margin-top: 14px;
        }
        @media (max-width: 600px) {
          .sym-counts-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .sym-count-badge {
          background: #141930;
          border: 1px solid #1e2442;
          border-radius: 8px;
          padding: 6px;
          text-align: center;
        }
        .sym-count-glyph {
          font-size: 20px;
          font-weight: 800;
          color: #a5b4fc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 26px;
        }
        .sym-count-num {
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 800;
          color: #64748b;
        }
        .sym-count-num.active {
          color: #ffd875;
        }
        .sym-modal-overlay {
          position: fixed; inset: 0; z-index: 99999;
          background: rgba(4, 6, 18, 0.85);
          backdrop-filter: blur(8px);
          display: none; align-items: center; justify-content: center;
          padding: 16px;
        }
        .sym-modal-card {
          background: #0f1224;
          border: 1px solid #2d3766;
          border-radius: 16px;
          padding: 24px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.8);
        }
        .sym-picker-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin: 18px 0;
        }
        .sym-picker-item {
          background: #18203f;
          border: 1px solid #2d3766;
          border-radius: 10px;
          padding: 10px 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sym-picker-item:hover {
          background: #ffd875;
          color: #0b0d19;
          border-color: #ffd875;
          transform: scale(1.06);
        }
        .sym-picker-glyph {
          font-size: 28px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
        }
        .sym-picker-label {
          font-size: 10.5px;
          margin-top: 4px;
        }
      </style>

      <div class="sym-shell">
        <div class="sym-header">
          <h2 class="sym-title">
            <span>🔣</span> Symbols Solver
          </h2>
          <div style="display:flex; gap:8px;">
            <button class="upload-btn" style="margin-top:0; padding:6px 14px; font-size:12.5px;" onclick="window.symbolsModule.resetAll()">
              ↺ Reset All
            </button>
          </div>
        </div>

        <div style="background:#12162e; border:1px solid #202750; border-radius:10px; padding:10px 14px; font-size:12.5px; line-height:1.5; color:#94a3b8; margin-bottom:20px;">
          <strong>Quick Instructions:</strong><br>
          1. <strong>Click any slot or box</strong> below to select it as the active paste target (highlighted in gold), then press <kbd style="background:#222; padding:1px 4px; border-radius:3px;">Ctrl+V</kbd> to paste into it, or use its <strong>Upload</strong> button.<br>
          2. <strong>Reference Slots (1–3):</strong> Load your reference sheets with symbol grids (handles single 5×5 or multi-stage strips).<br>
          3. <strong>Module Keypad:</strong> Paste your 4-button module screenshot into the keypad slot, or click any button tile below to pick symbols manually.<br>
          4. <strong>Solution:</strong> The solver computes total symbol frequencies and gives the exact descending press sequence!
        </div>

        <div class="sym-grid-2col">
          <!-- LEFT COLUMN: REFERENCE IMAGES (1 to 3 slots) -->
          <div class="sym-panel">
            <div class="sym-panel-title">
              <span>🖼️</span> Reference Symbol Grids (1–3 Slots)
            </div>
            <div class="sym-drop-slots">
              ${[0, 1, 2].map(idx => `
                <div class="sym-slot ${state.activeTarget === 'ref' + idx ? 'selected' : ''}" id="symRefSlot-${idx}" onclick="window.symbolsModule.selectTarget('ref${idx}')">
                  <input type="file" id="symRefInput-${idx}" accept="image/*" style="display:none;" onchange="window.symbolsModule.onRefFile(event, ${idx})">
                  <div style="font-size:12px; font-weight:700; color:#ffd875;">Slot ${idx + 1}</div>
                  <div class="sym-target-pill" id="symRefTargetPill-${idx}">
                    ${state.activeTarget === 'ref' + idx ? '🎯 Target (Ctrl+V)' : 'Click to Target'}
                  </div>
                  <img id="symRefPrev-${idx}">
                  <div id="symRefMeta-${idx}" style="font-size:10px; color:#3ddc84; font-weight:600; display:none; margin-top:4px;"></div>
                  <div style="display:flex; gap:6px; justify-content:center; margin-top:8px; align-items:center;">
                    <button type="button" class="upload-btn" style="margin-top:0; padding:3px 10px; font-size:11px;" onclick="event.stopPropagation(); document.getElementById('symRefInput-${idx}').click()">Upload</button>
                    <button type="button" id="symRefClear-${idx}" style="display:none; background:#ff5f57; color:#fff; border:none; border-radius:4px; font-size:10.5px; padding:3px 8px; cursor:pointer;" onclick="event.stopPropagation(); window.symbolsModule.clearRef(${idx})">Clear</button>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- LIVE COUNTS BREAKDOWN -->
            <div style="margin-top:20px; border-top:1px solid #1e2442; padding-top:14px;">
              <div style="font-size:12px; font-weight:700; color:#cbd5e1; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                Total Reference Symbol Counts (All Slots)
              </div>
              <div class="sym-counts-grid" id="symbolsCountsGrid"></div>
            </div>
          </div>

          <!-- RIGHT COLUMN: 4-BUTTON MODULE SCREENSHOT & PICKER -->
          <div class="sym-panel">
            <div class="sym-panel-title">
              <span>🔘</span> 4 Module Buttons (1, 2, 3, 4)
            </div>

            <!-- Module Screenshot Upload Box -->
            <div class="sym-slot ${state.activeTarget === 'mod' ? 'selected' : ''}" id="symModSlot" style="margin-bottom:16px; padding:12px;" onclick="window.symbolsModule.selectTarget('mod')">
              <input type="file" id="symModInput" accept="image/*" style="display:none;" onchange="window.symbolsModule.onModFile(event)">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                <div style="font-size:13px; font-weight:700; color:#a5b4fc;">4-Button Keypad Screenshot</div>
                <div class="sym-target-pill" id="symModTargetPill">
                  ${state.activeTarget === 'mod' ? '🎯 Target (Ctrl+V)' : 'Click to Target'}
                </div>
              </div>
              <div style="font-size:11px; color:#94a3b8; margin:4px 0 6px;">Click here to target for pasting, or click Upload</div>
              <img id="symModPrev">
              <div id="symModMeta" style="font-size:11px; color:#3ddc84; font-weight:600; display:none; margin-top:4px;"></div>
              <div style="display:flex; gap:8px; justify-content:center; margin-top:8px; align-items:center;">
                <button type="button" class="upload-btn" style="margin-top:0; padding:4px 14px; font-size:11.5px;" onclick="event.stopPropagation(); document.getElementById('symModInput').click()">Upload</button>
                <button type="button" id="symModClear" style="display:none; background:#ff5f57; color:#fff; border:none; border-radius:4px; font-size:11px; padding:4px 10px; cursor:pointer;" onclick="event.stopPropagation(); window.symbolsModule.clearMod()">Clear</button>
              </div>
            </div>

            <!-- 4-Button Interactive Grid -->
            <div class="sym-btn-grid">
              ${[1, 2, 3, 4].map(btnNum => `
                <div class="sym-btn-tile" id="symBtnTile-${btnNum}" onclick="window.symbolsModule.openPicker(${btnNum})">
                  <span class="sym-btn-num">${btnNum}</span>
                  <div class="sym-btn-glyph" id="symBtnGlyph-${btnNum}">?</div>
                  <div class="sym-btn-name" id="symBtnName-${btnNum}">Click to select</div>
                  <div class="sym-btn-count" id="symBtnCount-${btnNum}">Count: -</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- SOLUTION BANNER -->
        <div style="margin-top:24px;">
          <div id="symbolsSolutionBanner" style="display:none; background:rgba(61,220,132,0.08); border:2px solid #3ddc84; border-radius:12px; padding:18px; text-align:center; box-shadow:0 0 30px rgba(61,220,132,0.15);"></div>
          <div id="symbolsSolutionSteps" style="margin-top:14px;"></div>
        </div>
      </div>

      <!-- MODAL PICKER FOR MANUAL SELECTION -->
      <div class="sym-modal-overlay" id="symbolsPickerModal" onclick="window.symbolsModule.closePicker()">
        <div class="sym-modal-card" onclick="event.stopPropagation()">
          <h3 id="symbolsPickerTitle" style="font-family:'Outfit',sans-serif; font-size:18px; color:#ffd875; margin:0 0 10px;">Select Symbol</h3>
          <div style="font-size:12px; color:#94a3b8; margin-bottom:12px;">Click a symbol to assign it to this button:</div>
          <div class="sym-picker-grid">
            ${Object.entries(SYMBOLS_DEF).map(([key, def]) => `
              <div class="sym-picker-item" onclick="window.symbolsModule.pickSymbol('${key}')">
                <div class="sym-picker-glyph">${getSymbolGlyphHTML(key, 28)}</div>
                <div class="sym-picker-label">${def.name}</div>
              </div>
            `).join('')}
          </div>
          <button class="upload-btn" style="margin-top:8px; padding:6px 16px; font-size:12px;" onclick="window.symbolsModule.closePicker()">Cancel</button>
        </div>
      </div>
    `;
  }

  // ── GLOBAL PASTE LISTENER ─────────────────────────────────────────
  let pasteListenerAttached = false;

  function setupPasteListener() {
    if (pasteListenerAttached) return;
    pasteListenerAttached = true;

    window.addEventListener('paste', (e) => {
      const activeSection = document.querySelector('.page-section.active');
      if (!activeSection || activeSection.id !== 'symbolsSection') return;

      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            if (state.activeTarget === 'mod') {
              handleModuleImage(file);
            } else if (state.activeTarget === 'ref0') {
              handleReferenceImage(file, 0);
            } else if (state.activeTarget === 'ref1') {
              handleReferenceImage(file, 1);
            } else if (state.activeTarget === 'ref2') {
              handleReferenceImage(file, 2);
            } else {
              handleReferenceImage(file, 0);
            }
            break;
          }
        }
      }
    });
  }

  // ── PUBLIC INTERFACE ──────────────────────────────────────────────
  let isInitialized = false;

  window.symbolsModule = {
    init: function () {
      if (!isInitialized) {
        renderUI();
        solveSymbols();
        setupPasteListener();
        isInitialized = true;
      }
    },
    selectTarget: function (targetId) {
      selectTarget(targetId);
    },
    onRefFile: function (event, slotIndex) {
      const file = event.target.files && event.target.files[0];
      if (file) {
        handleReferenceImage(file, slotIndex);
        event.target.value = '';
      }
    },
    clearRef: function (slotIndex) {
      clearReferenceSlot(slotIndex);
    },
    onModFile: function (event) {
      const file = event.target.files && event.target.files[0];
      if (file) {
        handleModuleImage(file);
        event.target.value = '';
      }
    },
    clearMod: function () {
      clearModuleImage();
    },
    openPicker: function (btnIndex) {
      openSymbolPicker(btnIndex);
    },
    closePicker: function () {
      closeSymbolPicker();
    },
    pickSymbol: function (symKey) {
      selectSymbolForActiveButton(symKey);
    },
    resetAll: function () {
      resetAll();
    }
  };

  window.initSymbolsModule = function () {
    if (window.symbolsModule && typeof window.symbolsModule.init === 'function') {
      window.symbolsModule.init();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.symbolsModule.init());
  } else {
    window.symbolsModule.init();
  }
})();
