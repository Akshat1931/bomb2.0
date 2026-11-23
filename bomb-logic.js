// GENERATED from bomb_boomed (2026-11-23 13:16) by scripts/build-conso-logic.mjs — do not edit here.
// window.BombLogic.<module>.<function>: the same image readers and solvers as bomb_boomed.
var __BombLogic = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // conso-logic-entry.js
  var conso_logic_entry_exports = {};
  __export(conso_logic_entry_exports, {
    default: () => conso_logic_entry_default
  });

  // src/modules/mines/minesSolver.js
  var minesSolver_exports = {};
  __export(minesSolver_exports, {
    MINES_COLS: () => MINES_COLS,
    MINES_ROWS: () => MINES_ROWS,
    finishCheck: () => finishCheck,
    solveMinesGrid: () => solveMinesGrid
  });
  var MINES_ROWS = 8;
  var MINES_COLS = 10;
  function solveMinesGrid(gridData) {
    if (!gridData || !gridData.length) return { safeList: [], mineList: [] };
    for (let r = 0; r < MINES_ROWS; r++) {
      for (let c = 0; c < MINES_COLS; c++) {
        gridData[r][c].isSafe = false;
        gridData[r][c].isMine = false;
      }
    }
    function getNeighbors(r, c) {
      const list = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < MINES_ROWS && nc >= 0 && nc < MINES_COLS) {
            list.push(gridData[nr][nc]);
          }
        }
      }
      return list;
    }
    const constraints = [];
    for (let r = 0; r < MINES_ROWS; r++) {
      for (let c = 0; c < MINES_COLS; c++) {
        const cell = gridData[r][c];
        if (typeof cell.state === "number" && cell.state >= 0) {
          const neighs = getNeighbors(r, c);
          let flags = 0;
          const coveredNeighs = [];
          neighs.forEach((n) => {
            if (n.state === "F") flags++;
            else if (n.state === "#") coveredNeighs.push(n);
          });
          constraints.push({ cell, reqMines: cell.state - flags, covered: coveredNeighs });
        }
      }
    }
    let changed = true;
    while (changed) {
      changed = false;
      constraints.forEach((con) => {
        const un = con.covered.filter((c) => !c.isSafe && !c.isMine);
        const cur = con.covered.filter((c) => c.isMine).length;
        const rem = con.reqMines - cur;
        if (rem === 0 && un.length > 0) {
          un.forEach((c) => {
            c.isSafe = true;
            changed = true;
          });
        } else if (rem === un.length && un.length > 0) {
          un.forEach((c) => {
            c.isMine = true;
            changed = true;
          });
        }
      });
      for (let i = 0; i < constraints.length; i++) {
        for (let j = 0; j < constraints.length; j++) {
          if (i === j) continue;
          const cA = constraints[i], cB = constraints[j];
          const unA = cA.covered.filter((c) => !c.isSafe && !c.isMine);
          const unB = cB.covered.filter((c) => !c.isSafe && !c.isMine);
          const remA = cA.reqMines - cA.covered.filter((c) => c.isMine).length;
          const remB = cB.reqMines - cB.covered.filter((c) => c.isMine).length;
          if (unA.length > 0 && unA.every((e) => unB.includes(e))) {
            const diff = unB.filter((e) => !unA.includes(e));
            const diffM = remB - remA;
            if (diffM === 0 && diff.length > 0) {
              diff.forEach((c) => {
                c.isSafe = true;
                changed = true;
              });
            } else if (diffM === diff.length && diff.length > 0) {
              diff.forEach((c) => {
                c.isMine = true;
                changed = true;
              });
            }
          }
        }
      }
    }
    const isOpen = (c) => !c.isSafe && !c.isMine;
    const live = constraints.map((con) => ({ cells: con.covered.filter(isOpen), need: con.reqMines - con.covered.filter((c) => c.isMine).length })).filter((con) => con.cells.length > 0);
    const parent = /* @__PURE__ */ new Map();
    const find = (x) => {
      while (parent.get(x) !== x) {
        parent.set(x, parent.get(parent.get(x)));
        x = parent.get(x);
      }
      return x;
    };
    live.forEach((con) => con.cells.forEach((c) => {
      if (!parent.has(c.name)) parent.set(c.name, c.name);
    }));
    live.forEach((con) => {
      for (let i = 1; i < con.cells.length; i++) parent.set(find(con.cells[i].name), find(con.cells[0].name));
    });
    const groups = /* @__PURE__ */ new Map();
    live.forEach((con) => {
      const g = find(con.cells[0].name);
      if (!groups.has(g)) groups.set(g, { cells: /* @__PURE__ */ new Map(), cons: [] });
      const grp = groups.get(g);
      grp.cons.push(con);
      con.cells.forEach((c) => grp.cells.set(c.name, c));
    });
    const MAX_NODES = 2e6;
    for (const grp of groups.values()) {
      const cells = Array.from(grp.cells.values());
      if (cells.length > 64) continue;
      const idx = new Map(cells.map((c, i) => [c.name, i]));
      const cons = grp.cons.map((con) => ({ ids: con.cells.map((c) => idx.get(c.name)), need: con.need }));
      const consOf = cells.map(() => []);
      cons.forEach((con, ci) => con.ids.forEach((id) => consOf[id].push(ci)));
      const assign = new Int8Array(cells.length).fill(-1);
      const mineCnt = new Int32Array(cons.length), openCnt = new Int32Array(cons.length);
      cons.forEach((con, ci) => {
        openCnt[ci] = con.ids.length;
      });
      const seenMine = new Uint8Array(cells.length), seenSafe = new Uint8Array(cells.length);
      let solutions = 0, nodes = 0, aborted = false;
      const fits = (id) => consOf[id].every((ci) => mineCnt[ci] <= cons[ci].need && mineCnt[ci] + openCnt[ci] >= cons[ci].need);
      const dfs = (k) => {
        if (aborted) return;
        if (++nodes > MAX_NODES) {
          aborted = true;
          return;
        }
        if (k === cells.length) {
          solutions++;
          for (let i = 0; i < cells.length; i++) (assign[i] ? seenMine : seenSafe)[i] = 1;
          return;
        }
        for (const v of [0, 1]) {
          assign[k] = v;
          for (const ci of consOf[k]) {
            openCnt[ci]--;
            if (v) mineCnt[ci]++;
          }
          if (fits(k)) dfs(k + 1);
          for (const ci of consOf[k]) {
            openCnt[ci]++;
            if (v) mineCnt[ci]--;
          }
          assign[k] = -1;
        }
      };
      dfs(0);
      if (aborted || solutions === 0) continue;
      cells.forEach((cell, i) => {
        if (seenSafe[i] && !seenMine[i]) cell.isSafe = true;
        if (seenMine[i] && !seenSafe[i]) cell.isMine = true;
      });
    }
    const safeList = [], mineList = [];
    for (let r = 0; r < MINES_ROWS; r++) {
      for (let c = 0; c < MINES_COLS; c++) {
        const cell = gridData[r][c];
        if (cell.isSafe) safeList.push(cell.name);
        if (cell.isMine) mineList.push(cell.name);
      }
    }
    safeList.sort((a, b) => {
      const ca = a[0], cb = b[0], ra = parseInt(a.slice(1)), rb = parseInt(b.slice(1));
      return ca !== cb ? ca.localeCompare(cb) : ra - rb;
    });
    return { safeList, mineList };
  }
  function finishCheck(gridData, next) {
    const covered = (gridData || []).flat().filter((c) => c && c.state === "#");
    const undecided = covered.filter((c) => !c.isSafe && !c.isMine).length;
    const safeLeft = covered.filter((c) => c.isSafe).map((c) => c.name);
    const nextSet = next instanceof Set ? next : new Set(next || []);
    const earlier = safeLeft.filter((n) => !nextSet.has(n));
    const allKnown = covered.length > 0 && undecided === 0 && safeLeft.length > 0;
    return { solves: allKnown && earlier.length === 0, allKnown, safeLeft, earlier, undecided };
  }

  // src/modules/mines/minesVision.js
  var minesVision_exports = {};
  __export(minesVision_exports, {
    parseMinesBoardFromImage: () => parseMinesBoardFromImage
  });

  // src/utils/canvas.js
  var cachedCanvas = null;
  var cachedCtx = null;
  function getWorkCanvas() {
    if (!cachedCanvas) {
      cachedCanvas = document.getElementById("workCanvas");
      if (!cachedCanvas) {
        cachedCanvas = document.createElement("canvas");
        cachedCanvas.id = "workCanvas";
        cachedCanvas.className = "work";
        document.body.appendChild(cachedCanvas);
      }
    }
    return cachedCanvas;
  }
  function getWorkContext() {
    const canvas = getWorkCanvas();
    if (!cachedCtx || cachedCtx.canvas !== canvas) {
      cachedCtx = canvas.getContext("2d", { willReadFrequently: true });
    }
    return cachedCtx;
  }

  // src/modules/mines/minesVision.js
  function parseMinesBoardFromImage(img) {
    const MAXDIM = 1200;
    let w = img.naturalWidth, h = img.naturalHeight;
    const scale = Math.min(1, MAXDIM / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    const workCanvas = getWorkCanvas();
    workCanvas.width = w;
    workCanvas.height = h;
    const ctx = getWorkContext();
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = 33 * (w / 440), maxX = 409 * (w / 440), minY = 73 * (h / 440), maxY = 409 * (h / 440);
    if (w !== h || w > 600) {
      minX = w * 0.05;
      maxX = w * 0.95;
      minY = h * 0.08;
      maxY = h * 0.95;
    }
    function snapEdgeX(xEst) {
      let bestX = Math.round(xEst), minV = 999;
      const startX = Math.max(0, Math.floor(xEst - 15)), endX = Math.min(w - 1, Math.ceil(xEst + 15));
      const startY = Math.floor(minY + 10), endY = Math.floor(maxY - 10);
      for (let x = startX; x <= endX; x++) {
        let sum = 0, count = 0;
        for (let y = startY; y < endY; y += 2) {
          const idx = (y * w + x) * 4;
          sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          count++;
        }
        const avg = count ? sum / count : 999;
        if (avg < minV) {
          minV = avg;
          bestX = x;
        }
      }
      return minV < 90 ? bestX : Math.round(xEst);
    }
    function snapEdgeY(yEst) {
      let bestY = Math.round(yEst), minV = 999;
      const startY = Math.max(0, Math.floor(yEst - 15)), endY = Math.min(h - 1, Math.ceil(yEst + 15));
      const startX = Math.floor(minX + 10), endX = Math.floor(maxX - 10);
      for (let y = startY; y <= endY; y++) {
        let sum = 0, count = 0;
        for (let x = startX; x < endX; x += 2) {
          const idx = (y * w + x) * 4;
          sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          count++;
        }
        const avg = count ? sum / count : 999;
        if (avg < minV) {
          minV = avg;
          bestY = y;
        }
      }
      return minV < 90 ? bestY : Math.round(yEst);
    }
    minX = snapEdgeX(minX);
    maxX = snapEdgeX(maxX);
    minY = snapEdgeY(minY);
    maxY = snapEdgeY(maxY);
    const cellW = (maxX - minX) / MINES_COLS;
    const cellH = (maxY - minY) / MINES_ROWS;
    function classifyMinesCell(cx0, cy0, cx1, cy1) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      let flagPx = 0;
      const cellPixels = [];
      for (let py = cy0; py < cy1 && py < h; py++) {
        for (let px = cx0; px < cx1 && px < w; px++) {
          const idx = (py * w + px) * 4;
          const pr = data[idx], pg = data[idx + 1], pb = data[idx + 2];
          rSum += pr;
          gSum += pg;
          bSum += pb;
          count++;
          if (pr > 160 && pg < 70 && pb < 70) flagPx++;
          cellPixels.push({ px, py, pr, pg, pb });
        }
      }
      if (!count) return "#";
      const avgBright = (rSum + gSum + bSum) / (3 * count);
      if (avgBright < 135) {
        return flagPx > count * 0.04 ? "F" : "#";
      }
      const textPixels = [];
      let minPX = 9999, maxPX = -1, minPY = 9999, maxPY = -1;
      for (const p of cellPixels) {
        const bright = (p.pr + p.pg + p.pb) / 3;
        const colorSpread = Math.max(p.pr, p.pg, p.pb) - Math.min(p.pr, p.pg, p.pb);
        if (bright < 205 || colorSpread > 30) {
          textPixels.push(p);
          if (p.px < minPX) minPX = p.px;
          if (p.px > maxPX) maxPX = p.px;
          if (p.py < minPY) minPY = p.py;
          if (p.py > maxPY) maxPY = p.py;
        }
      }
      if (textPixels.length < 12) return 0;
      const charW = maxPX - minPX + 1;
      const charH = maxPY - minPY + 1;
      const aspect = charW / (charH || 1);
      const targetY = Math.round(minPY + 0.65 * charH);
      let crossW = 0;
      for (const p of textPixels) {
        if (p.py === targetY) crossW++;
      }
      let bluePx = 0, greenPx = 0, redPx = 0, purplePx = 0, amberPx = 0, tealPx = 0;
      for (const p of textPixels) {
        const { pr, pg, pb } = p;
        const maxC = Math.max(pr, pg, pb), minC = Math.min(pr, pg, pb), delta = maxC - minC;
        let hue = 0;
        if (delta > 0) {
          if (maxC === pr) hue = (pg - pb) / delta % 6;
          else if (maxC === pg) hue = (pb - pr) / delta + 2;
          else hue = (pr - pg) / delta + 4;
          hue = Math.round(hue * 60);
          if (hue < 0) hue += 360;
        }
        const sat = maxC > 0 ? delta / maxC : 0;
        if (hue >= 245 && hue <= 305 && sat > 0.16 || pb > pg + 15 && pr > pg + 10) {
          purplePx++;
        } else if (hue >= 185 && hue <= 242 && sat > 0.16 || pb > pr + 20 && pg >= pr - 8 && pb > pg + 8) {
          bluePx++;
        } else if (hue >= 85 && hue <= 165 && sat > 0.16 || pg > pr + 15 && pg > pb + 5) {
          greenPx++;
        } else if ((hue >= 340 || hue <= 20) && sat > 0.2 || pr > pg + 25 && pr > pb + 25) {
          redPx++;
        } else if (hue >= 20 && hue <= 50 && sat > 0.25 || pr > pg + 15 && pg > pb + 15) {
          amberPx++;
        } else if (hue >= 165 && hue <= 188 && sat > 0.16 || pg > pr + 15 && pb > pr + 15) {
          tealPx++;
        }
      }
      const votes = { 1: bluePx, 2: greenPx, 3: redPx, 4: purplePx, 5: amberPx, 6: tealPx };
      if ((aspect >= 0.62 || crossW >= 8) && (purplePx > 4 || bluePx > 4)) {
        votes[4] += 50;
      } else if (aspect < 0.52 && crossW <= 6 && (bluePx > 4 || purplePx > 4)) {
        votes[1] += 50;
      }
      let winner = 1, maxV = -1;
      for (const [k, v] of Object.entries(votes)) {
        if (v > maxV) {
          maxV = v;
          winner = parseInt(k, 10);
        }
      }
      if (maxV < 8) return 0;
      return winner;
    }
    const gridData = [];
    for (let r = 0; r < MINES_ROWS; r++) {
      const row = [];
      for (let c = 0; c < MINES_COLS; c++) {
        const x0 = Math.round(minX + c * cellW), x1 = Math.round(minX + (c + 1) * cellW);
        const y0 = Math.round(minY + r * cellH), y1 = Math.round(minY + (r + 1) * cellH);
        const mx = Math.round((x1 - x0) * 0.15), my = Math.round((y1 - y0) * 0.15);
        const cx0 = x0 + mx, cx1 = x1 - mx, cy0 = y0 + my, cy1 = y1 - my;
        const state = classifyMinesCell(cx0, cy0, cx1, cy1);
        row.push({ r, c, name: String.fromCharCode(65 + c) + (r + 1), state, isSafe: false, isMine: false });
      }
      gridData.push(row);
    }
    return gridData;
  }

  // src/modules/queens/queensConstants.js
  var queensConstants_exports = {};
  __export(queensConstants_exports, {
    QUEENS_PALETTE: () => QUEENS_PALETTE
  });
  var QUEENS_PALETTE = ["#F2BD91", "#AFD2A1", "#BCACE9", "#EAD58D", "#9BCAE1", "#EDABC0", "#8ED3C6", "#B7BFD0"];

  // src/modules/queens/queensSolver.js
  var queensSolver_exports = {};
  __export(queensSolver_exports, {
    solveQueensPuzzle: () => solveQueensPuzzle
  });
  function solveQueensPuzzle(regionGrid) {
    if (!regionGrid || regionGrid.length !== 8) return [];
    const solutions = [];
    function canPlace(row, col, queens) {
      for (let r = 0; r < queens.length; r++) {
        const qc = queens[r];
        if (qc === col) return false;
        if (Math.abs(r - row) <= 1 && Math.abs(qc - col) <= 1) return false;
        if (regionGrid[r][qc] === regionGrid[row][col]) return false;
      }
      return true;
    }
    function backtrack(row, queens) {
      if (row === 8) {
        solutions.push([...queens]);
        return;
      }
      for (let c = 0; c < 8; c++) {
        if (canPlace(row, c, queens)) {
          queens.push(c);
          backtrack(row + 1, queens);
          queens.pop();
        }
      }
    }
    backtrack(0, []);
    return solutions;
  }

  // src/modules/queens/queensVision.js
  var queensVision_exports = {};
  __export(queensVision_exports, {
    parseQueensRegionsFromImage: () => parseQueensRegionsFromImage
  });
  function parseQueensRegionsFromImage(img) {
    const MAXDIM = 1200;
    let w = img.naturalWidth, h = img.naturalHeight;
    const scale = Math.min(1, MAXDIM / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    const workCanvas = getWorkCanvas();
    workCanvas.width = w;
    workCanvas.height = h;
    const ctx = getWorkContext();
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = 89 * (w / 440), maxX = 351 * (w / 440), minY = 89 * (h / 440), maxY = 351 * (h / 440);
    if (w !== h || w > 600) {
      minX = w * 0.15;
      maxX = w * 0.85;
      minY = h * 0.15;
      maxY = h * 0.85;
    }
    const cellW = (maxX - minX) / 8, cellH = (maxY - minY) / 8;
    const cellRGB = [];
    for (let r = 0; r < 8; r++) {
      const row = [];
      for (let c = 0; c < 8; c++) {
        const cx0 = Math.round(minX + c * cellW + cellW * 0.25);
        const cx1 = Math.round(minX + (c + 1) * cellW - cellW * 0.25);
        const cy0 = Math.round(minY + r * cellH + cellH * 0.25);
        const cy1 = Math.round(minY + (r + 1) * cellH - cellH * 0.25);
        let rS = 0, gS = 0, bS = 0, cnt = 0;
        for (let py = cy0; py < cy1 && py < h; py++) {
          for (let px = cx0; px < cx1 && px < w; px++) {
            const idx = (py * w + px) * 4;
            rS += data[idx];
            gS += data[idx + 1];
            bS += data[idx + 2];
            cnt++;
          }
        }
        row.push([cnt ? rS / cnt : 0, cnt ? gS / cnt : 0, cnt ? bS / cnt : 0]);
      }
      cellRGB.push(row);
    }
    const visited = Array.from({ length: 8 }, () => Array(8).fill(false));
    const regionGrid = Array.from({ length: 8 }, () => Array(8).fill(0));
    let compId = 0;
    const compColors = [];
    function colorDiff(c1, c2) {
      return Math.max(Math.abs(c1[0] - c2[0]), Math.abs(c1[1] - c2[1]), Math.abs(c1[2] - c2[2]));
    }
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (!visited[r][c]) {
          compId++;
          const queue = [[r, c]];
          visited[r][c] = true;
          regionGrid[r][c] = compId;
          let ra = 0, ga = 0, ba = 0, na = 0;
          while (queue.length) {
            const [cr, cc] = queue.shift();
            const rgb = cellRGB[cr][cc];
            ra += rgb[0];
            ga += rgb[1];
            ba += rgb[2];
            na++;
            for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
              const nr = cr + dr, nc = cc + dc;
              if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !visited[nr][nc] && colorDiff(cellRGB[cr][cc], cellRGB[nr][nc]) < 22) {
                visited[nr][nc] = true;
                regionGrid[nr][nc] = compId;
                queue.push([nr, nc]);
              }
            }
          }
          compColors[compId] = [ra / na, ga / na, ba / na];
        }
      }
    }
    const uMap = /* @__PURE__ */ new Map();
    let regCnt = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cid = regionGrid[r][c], rgb = compColors[cid];
        let mr = 0;
        for (const [rid, rrgb] of uMap.entries()) {
          if (colorDiff(rgb, rrgb) < 22) {
            mr = rid;
            break;
          }
        }
        if (!mr) {
          regCnt++;
          mr = regCnt;
          uMap.set(mr, rgb);
        }
        regionGrid[r][c] = mr;
      }
    }
    return regionGrid;
  }

  // src/modules/search/searchGlyphs.js
  var searchGlyphs_exports = {};
  __export(searchGlyphs_exports, {
    GLYPH_N: () => GLYPH_N,
    SEARCH_GLYPHS: () => SEARCH_GLYPHS,
    cellFeature: () => cellFeature,
    combineGlyphOcr: () => combineGlyphOcr,
    decodeTemplates: () => decodeTemplates,
    glyphScore: () => glyphScore,
    matchGlyph: () => matchGlyph
  });

  // src/modules/search/searchOCR.js
  var searchOCR_exports = {};
  __export(searchOCR_exports, {
    applyMorphologicalDilation: () => applyMorphologicalDilation,
    ensureOCRWorker: () => ensureOCRWorker,
    getSearchGrid: () => getSearchGrid,
    preWarmOCR: () => preWarmOCR,
    preprocessCellCanvas: () => preprocessCellCanvas,
    recognizeCell: () => recognizeCell,
    recognizeCellConsensus: () => recognizeCellConsensus,
    sanitizeSearchLetter: () => sanitizeSearchLetter
  });

  // src/utils/otsu.js
  function computeOtsuThreshold(lumArray) {
    const histogram = new Int32Array(256);
    const total = lumArray.length;
    for (let i = 0; i < total; i++) {
      histogram[lumArray[i]]++;
    }
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }
    let sumB = 0, wB = 0, wF = 0;
    let maxVar = -1, threshold = 128;
    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      wF = total - wB;
      if (wF === 0) break;
      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const varBetween = wB * wF * (mB - mF) * (mB - mF);
      if (varBetween > maxVar) {
        maxVar = varBetween;
        threshold = t;
      }
    }
    return threshold;
  }

  // src/modules/search/searchOCR.js
  var BASE_PARAMS = { tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ012568", tessedit_pageseg_mode: "10" };
  var POOL_MAX = (() => {
    const cores = typeof navigator !== "undefined" && navigator.hardwareConcurrency || 2;
    const mem = typeof navigator !== "undefined" && navigator.deviceMemory || 8;
    return cores >= 12 && mem >= 8 ? 3 : cores >= 4 && mem >= 4 ? 2 : 1;
  })();
  var pool = [];
  var waiting = [];
  var spawning = 0;
  var firstReady = null;
  var progressListener = null;
  function createTessWorker() {
    if (typeof Tesseract === "undefined") {
      return Promise.reject(new Error("Tesseract.js library not loaded \u2014 check network connection"));
    }
    let timerId;
    const timeout = new Promise((_, reject) => {
      timerId = setTimeout(() => reject(new Error("OCR engine initialization timed out (60s)")), 6e4);
    });
    const init = (async () => {
      const w = await Tesseract.createWorker("eng", 1, {
        logger: (m) => {
          if (m && progressListener) {
            try {
              progressListener(m);
            } catch (_) {
            }
          }
        }
      });
      await w.setParameters(BASE_PARAMS);
      return { w, params: { ...BASE_PARAMS }, busy: false };
    })();
    return Promise.race([init, timeout]).finally(() => clearTimeout(timerId));
  }
  function handOut(slot) {
    const next = waiting.shift();
    if (next) {
      slot.busy = true;
      next(slot);
    } else slot.busy = false;
  }
  function spawnExtra() {
    spawning++;
    createTessWorker().then((slot) => {
      spawning--;
      pool.push(slot);
      handOut(slot);
    }).catch(() => {
      spawning--;
    });
  }
  async function lease() {
    await ensurePool();
    const free = pool.find((s) => !s.busy);
    if (free) {
      free.busy = true;
      return free;
    }
    if (pool.length + spawning < POOL_MAX) spawnExtra();
    return new Promise((resolve) => waiting.push(resolve));
  }
  function ensurePool(onProgress) {
    if (onProgress) progressListener = onProgress;
    if (!firstReady) {
      spawning++;
      firstReady = createTessWorker().then(
        (slot) => {
          spawning--;
          pool.push(slot);
          handOut(slot);
          return slot;
        },
        (err) => {
          spawning--;
          firstReady = null;
          throw err;
        }
      );
    }
    return firstReady;
  }
  async function readWith(params, image, options, limitMs) {
    const slot = await lease();
    const job = (async () => {
      const diff = {};
      let changed = false;
      for (const k in params) if (slot.params[k] !== params[k]) {
        diff[k] = params[k];
        changed = true;
      }
      if (changed) {
        await slot.w.setParameters(diff);
        Object.assign(slot.params, diff);
      }
      return slot.w.recognize(image, options);
    })();
    job.then(() => handOut(slot), () => handOut(slot));
    if (!limitMs) return job;
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Cell OCR timeout")), limitMs);
    });
    try {
      return await Promise.race([job, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
  async function ensureOCRWorker(onProgress) {
    await ensurePool(onProgress);
    let params = {};
    return {
      setParameters: async (p) => {
        params = { ...params, ...p };
        return {};
      },
      recognize: (image, options) => readWith(params, image, options),
      /** recognize() that gives up (rejects) after `ms` of reading time */
      recognizeWithin: (ms, image, options) => readWith(params, image, options, ms)
    };
  }
  function preWarmOCR() {
    ensurePool().catch(() => {
    });
  }
  function applyMorphologicalDilation(binary, width, height, iterations = 1) {
    let src = binary;
    for (let iter = 0; iter < iterations; iter++) {
      const dst = new Uint8Array(src);
      for (let y = 0; y < height; y++) {
        const yw = y * width;
        for (let x = 0; x < width; x++) {
          if (src[yw + x] === 0) {
            if (x > 0) dst[yw + (x - 1)] = 0;
            if (x < width - 1) dst[yw + (x + 1)] = 0;
            if (y > 0) dst[yw - width + x] = 0;
            if (y < height - 1) dst[yw + width + x] = 0;
          }
        }
      }
      src = dst;
    }
    return src;
  }
  function preprocessCellCanvas(cellCtx, width, height, mode = "otsu", dilatePasses = 0) {
    const imgData = cellCtx.getImageData(0, 0, width, height);
    const d = imgData.data;
    const numPixels = width * height;
    const lumArray = new Uint8Array(numPixels);
    let maxL = 0;
    for (let i = 0; i < numPixels; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      const L = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      lumArray[i] = L;
      if (L > maxL) maxL = L;
    }
    let threshold = 128;
    if (mode === "otsu") {
      threshold = computeOtsuThreshold(lumArray);
      if (threshold < 35 || threshold > 225) {
        threshold = Math.max(50, Math.round(maxL * 0.4));
      }
    } else {
      threshold = Math.max(50, Math.round(maxL * 0.4));
    }
    let brightCount = 0;
    for (let i = 0; i < numPixels; i++) {
      if (lumArray[i] >= threshold) brightCount++;
    }
    const isBrightBackground = brightCount >= numPixels * 0.5;
    const binary = new Uint8Array(numPixels);
    for (let i = 0; i < numPixels; i++) {
      const isInk2 = isBrightBackground ? lumArray[i] < threshold : lumArray[i] >= threshold;
      binary[i] = isInk2 ? 0 : 255;
    }
    const processed = dilatePasses > 0 ? applyMorphologicalDilation(binary, width, height, dilatePasses) : binary;
    for (let i = 0; i < numPixels; i++) {
      const v = processed[i];
      d[i * 4] = v;
      d[i * 4 + 1] = v;
      d[i * 4 + 2] = v;
      d[i * 4 + 3] = 255;
    }
    cellCtx.putImageData(imgData, 0, 0);
  }
  function getSearchGrid(w, h) {
    const sx = w / 440;
    const sy = h / 440;
    return {
      cellW: 40 * sx,
      cellH: 40 * sy,
      colCenters: [118, 158, 198, 238, 278].map((x) => x * sx),
      rowCenters: [162, 202, 242, 282, 322].map((y) => y * sy)
    };
  }
  function sanitizeSearchLetter(rawText) {
    let s = (rawText || "").trim().toUpperCase();
    s = s.replace(/0/g, "O").replace(/1/g, "I").replace(/5/g, "S").replace(/8/g, "B").replace(/2/g, "Z").replace(/6/g, "G");
    return s.replace(/[^A-Z]/g, "").charAt(0);
  }
  async function recognizeCell(worker, padCanvas) {
    var _a;
    const psms = ["10", "6"];
    const candidates = [];
    for (const psm of psms) {
      try {
        await worker.setParameters({
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ012568",
          tessedit_pageseg_mode: psm,
          user_defined_dpi: "150"
        });
        const { data } = await worker.recognizeWithin(2500, padCanvas);
        const res = { letter: sanitizeSearchLetter(data == null ? void 0 : data.text), conf: Number((_a = data == null ? void 0 : data.confidence) != null ? _a : 0) };
        if (res.letter) {
          candidates.push(res);
          if (res.conf >= 60) {
            return { letter: res.letter, confidence: Math.round(res.conf) };
          }
        }
      } catch (_) {
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.conf - a.conf);
      return {
        letter: candidates[0].letter,
        confidence: Math.round(candidates[0].conf || 50)
      };
    }
    return { letter: "?", confidence: 0 };
  }
  async function recognizeCellConsensus(_worker, padCanvas) {
    const reads = await Promise.all(["6", "8", "13", "10"].map(async (psm) => {
      var _a;
      try {
        const w = await ensureOCRWorker();
        await w.setParameters({
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ012568",
          tessedit_pageseg_mode: psm,
          user_defined_dpi: "300"
        });
        const { data } = await w.recognizeWithin(4e3, padCanvas);
        return { letter: sanitizeSearchLetter(data == null ? void 0 : data.text), conf: Number((_a = data == null ? void 0 : data.confidence) != null ? _a : 0) };
      } catch (_) {
        return null;
      }
    }));
    const rawResults = reads.filter((r) => r && r.letter);
    if (!rawResults.length) return { letter: "?", confidence: 0 };
    const groups = {};
    for (const r of rawResults) {
      const g = groups[r.letter] || (groups[r.letter] = { letter: r.letter, count: 0, confs: [], maxConf: 0 });
      g.count++;
      g.confs.push(r.conf);
      g.maxConf = Math.max(g.maxConf, r.conf);
    }
    const options = Object.values(groups).map((g) => ({
      ...g,
      score: g.count * 60 + g.maxConf + g.confs.reduce((a, b) => a + b, 0) / g.count
    }));
    options.sort((a, b) => b.score - a.score);
    return { letter: options[0].letter, confidence: Math.round(options[0].maxConf || options[0].confs[0] || 50) };
  }

  // src/modules/search/searchGlyphs.js
  var GLYPH_N = 16;
  function cellFeature(data, W, H, r, c) {
    const { rowCenters, colCenters, cellW, cellH } = getSearchGrid(W, H);
    const cw = Math.round(cellW * 0.86), ch = Math.round(cellH * 0.86);
    const x0 = Math.max(0, Math.round(colCenters[c] - cw / 2)), y0 = Math.max(0, Math.round(rowCenters[r] - ch / 2));
    const w = Math.min(W - x0, cw), h = Math.min(H - y0, ch);
    if (w < 6 || h < 6) return null;
    const L = new Float32Array(w * h);
    const sorted = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * W + x0 + x) * 4;
      const v2 = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      L[y * w + x] = v2;
      sorted.push(v2);
    }
    sorted.sort((a, b) => a - b);
    const lo = sorted[sorted.length >> 1], hi = sorted[Math.floor(sorted.length * 0.985)];
    if (hi - lo < 60) return null;
    const thr = lo + 0.5 * (hi - lo);
    const ink = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) ink[i] = L[i] >= thr ? 1 : 0;
    const lab = new Int32Array(w * h), keep = [];
    let next = 0;
    const stack = [];
    for (let s = 0; s < w * h; s++) {
      if (!ink[s] || lab[s]) continue;
      next++;
      let edge = false, area = 0;
      stack.push(s);
      lab[s] = next;
      while (stack.length) {
        const p = stack.pop(), px = p % w, py = p / w | 0;
        area++;
        if (px === 0 || py === 0 || px === w - 1 || py === h - 1) edge = true;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (ink[q] && !lab[q]) {
            lab[q] = next;
            stack.push(q);
          }
        }
      }
      keep[next] = !edge && area >= 3;
    }
    let bx0 = w, by0 = h, bx1 = -1, by1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (keep[lab[y * w + x]]) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
    }
    if (bx1 < 0) return null;
    const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
    const v = new Float32Array(GLYPH_N * GLYPH_N);
    const span = hi - thr || 1;
    for (let gy = 0; gy < GLYPH_N; gy++) for (let gx = 0; gx < GLYPH_N; gx++) {
      const sx0 = bx0 + gx * bw / GLYPH_N, sx1 = bx0 + (gx + 1) * bw / GLYPH_N;
      const sy0 = by0 + gy * bh / GLYPH_N, sy1 = by0 + (gy + 1) * bh / GLYPH_N;
      let sum = 0, n = 0;
      for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
        const p = y * w + x;
        const cov = keep[lab[p]] ? Math.min(1, Math.max(0, (L[p] - thr) / span + 0.5)) : 0;
        sum += cov;
        n++;
      }
      v[gy * GLYPH_N + gx] = n ? sum / n : 0;
    }
    return { v, aspect: bw / bh, hRel: bh / cellH };
  }
  function corr(a, b) {
    let ma = 0, mb = 0;
    for (let i = 0; i < a.length; i++) {
      ma += a[i];
      mb += b[i];
    }
    ma /= a.length;
    mb /= b.length;
    let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < a.length; i++) {
      const x = a[i] - ma, y = b[i] - mb;
      sab += x * y;
      saa += x * x;
      sbb += y * y;
    }
    return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
  }
  function glyphScore(f, t) {
    return corr(f.v, t.v) - 0.6 * Math.abs(Math.log(f.aspect / t.aspect));
  }
  function decodeTemplates(bank) {
    const out = {};
    for (const [k, t] of Object.entries(bank)) {
      out[k] = { aspect: t.a, v: Float32Array.from(t.v, (ch) => Number(ch) / 9) };
    }
    return out;
  }
  function matchGlyph(f, templates) {
    if (!f) return { letter: "", score: 0, margin: 0, sure: false };
    let best = null, second = null;
    for (const [k, t] of Object.entries(templates)) {
      const s = glyphScore(f, t);
      if (!best || s > best.s) {
        second = best;
        best = { k, s };
      } else if (!second || s > second.s) second = { k, s };
    }
    if (!best) return { letter: "", score: 0, margin: 0, sure: false };
    const margin = best.s - (second ? second.s : 0);
    const sure = best.s >= 0.8 && margin >= 0.06 || best.s >= 0.68 && margin >= 0.35;
    return { letter: best.k, score: best.s, margin, sure };
  }
  function combineGlyphOcr(f, m, ocrLetter, templates) {
    if (!ocrLetter || ocrLetter === "?") return m.letter || "?";
    if (!f || !m.letter) return ocrLetter;
    const t = templates[ocrLetter];
    if (!t) return ocrLetter;
    return glyphScore(f, t) >= m.score - 0.12 ? ocrLetter : m.letter;
  }
  var SEARCH_GLYPH_BANK = {
    "A": { "a": 0.8, "v": "0000007999400000000004999980000000000999999000000000099999940000000099999999000000009995999940000004999099998000000999809999900000499944799998000099999999999900009999999999994004999999999999800999700000799994399920000039999889990000000599997985000000005799" },
    "C": { "a": 0.8, "v": "0000355898855570000589999999999000599999999999900599999855599993599999000000599999999400000005549999900000000000999990000000000099999000000000009999900000000000899994000000000049999900000005540599999555559998005999999999998300059999999995400000455798855000" },
    "D": { "a": 0.85, "v": "6999999998652000699999999999741027999999999998510599997557999984059999500027999905999950000599990599995000059999059999500005999905999950000599990599995000059999059999500027999905999950026999980599997699999972059999999999972005999999999972000489999987652000" },
    "E": { "a": 0.7, "v": "5799999999999964579999999999999804999999999999990499997555555678048999750000000004899987444443100489999999999830048999999999995004899987555554200489997500000000048999750000000004899962000000000489999999999999048999999999999904899999999999990269999999999974" },
    "F": { "a": 0.7, "v": "3699999999999974369999999999999902699999999999990059999955555689005999990000000000599999444444200059999999999840005999999999995000599999555554200059999900000000005999990000000000599999000000000059999800000000005999640000000000599720000000000046520000000000" },
    "G": { "a": 0.9, "v": "0000256788656740001479999999995002589999999999500489999756899950599997200004996169999500000245208999950000000000899994000133332189999400279999976999950004999984599995000489996159999720048999500599999646999950027999999999995000268999999998400001355699865410" },
    "H": { "a": 0.85, "v": "6999972000048997699999500005999927999950000599990599995000059999059999500005999905999975555799990599999999999999059999999999999905999974444799990599995000059999059999500005999905999950000599990599984000059998059996200005999605997200000599720486200000048620" },
    "J": { "a": 0.346, "v": "0002579999999964000257999999998800000478999999980000012599999998000000059999999800000005999999980000000599999998000000059999999800000005999999980000000599999998000000059999999800000125999999870000047899999962000236999999874023568999887642103698865532100000" },
    "K": { "a": 0.85, "v": "8999840169999972899995016999986269999500499974205999950169994000499995279972000049999669994000004999988998400000499999999840000049999999999400004999998899972000499997469999400049999503899972004999950027999720499994000489997249996200025899972454200000135699" },
    "L": { "a": 0.75, "v": "4699997200000000479999940000000002799995000000000059999500000000005999950000000000599995000000000059999500000000005999950000000000599995000000000059999500000000005999950000000000599995000000000059999755555532005999999999997600599999999999630027999999986520" },
    "M": { "a": 1.05, "v": "6999972000027996799999300026999727999940004999970599996000599997059999840399999705999995049999970599999725999997059999994699999705987899999889970598569999878997059835999965899705983279995389970598306997138997059710499602799705960028940069970474001352003686" },
    "N": { "a": 0.95, "v": "8999940002799996799998200279998559999962004999624999998400399950489999996239995048999999943999504899789997599950489955999979995048995279999999504899504899999950489950269999995048995002799999504899500026999950489950000289995048972000006999502662000000389720" },
    "O": { "a": 0.9, "v": "0002456886520000002689999997420002799999999997202799997557999961699995000169999589998400005999969999620000499998999950000038999999995000003899999999620000499998899984000059999669999500016999952699997557999940027999999999972000268999999742000002456886520000" },
    "P": { "a": 0.8, "v": "4999999988754000499999999999950005999999999999500099999455999990009999900069999300999990006999930099999000899990009999955599999000999999999985000099999875553000009999943000000000999990000000000099998000000000009999300000000000999500000000000085500000000000" },
    "R": { "a": 0.85, "v": "8999999986520000899999999997200069999999999972004999974479999500499995004999972049999501699996104999975689999500499999999999720049999999999620004999975799994000499995059999620049999503899984004999950048999830499995001699997249997200027999972665200000256899" },
    "S": { "a": 0.7, "v": "0014568988668500025899999999961004899999999998303699975556899940789997200026994036999975310244200489999976420000015999999986200000014799999997200000027999999950000000245799996444520000027999875799865555799963027999999999972000269999999972000002456887652000" },
    "T": { "a": 0.8, "v": "7999999999999970999999999999999099999999999999937555599999555573000009999900000000000999990000000000099999000000000009999900000000000999990000000000099999000000000009999900000000000999990000000000099999000000000009999900000000000999950000000000085540000000" },
    "U": { "a": 0.9, "v": "8999999402799999799999720279999749999950003899953899994000169984389998400005998338999840000599833899984000059983389998400005998338999840000599833899984000059983379999400016998316999950003899610279999856899720004999999999840000268999999741000002456886420000" },
    "V": { "a": 0.95, "v": "8999972000499995799997200059998527999600003997310599972000499500026999500069720000599961017950000038998404894000001699950597200000027998789400000000599999720000000049999960000000002799996000000000069999300000000004999930000000000289971000000000014662000000" },
    "W": { "a": 1.25, "v": "8999830242159995899972049415998547995006961389710699500698248960059993499935993004999359994599300399956999659930039998899977983000599997799995000049999669999500003899964999950000179994399994000006999328996000000499611699600000039950059960000002772002794000" },
    "X": { "a": 0.85, "v": "8999851004999995799998400489997327999962048997200599999416999400004999999998400000269999999610000004899999720000000169999950000000026999998400000004899999972000002799999999400001699977999972002799720269999830499940002799996279972000059999967862000002689997" },
    "Y": { "a": 0.85, "v": "8999998401699998799999720158999627999950004899620499997200599720004999972599720000269999779950000004999999972000000269999995000000002699995000000000059999500000000005999950000000000599995000000000059999400000000005999720000000000599830000000000047631000000" },
    "Z": { "a": 0.8, "v": "0389999999999980089999999999999009999999999999500895555599999900000000099999900000000059999950000000009999990000000005999995000000005999995000000003999999000000000799999500000000399999900000000399999955555597089999999999999429999999999999902899999999999970" }
  };
  var SEARCH_GLYPHS = decodeTemplates(SEARCH_GLYPH_BANK);

  // src/modules/search/searchSolver.js
  var searchSolver_exports = {};
  __export(searchSolver_exports, {
    solveWordSearch: () => solveWordSearch
  });
  function solveWordSearch(grid5x5, targetWords) {
    var _a;
    const wordSet = new Set(
      (targetWords || "").toUpperCase().split(/[\s,]+/).map((w) => w.trim().replace(/[^A-Z]/g, "")).filter((w) => w.length >= 2)
    );
    const directions = [
      [0, 1],
      // Right
      [0, -1],
      // Left
      [1, 0],
      // Down
      [-1, 0],
      // Up
      [1, 1],
      // Down-Right
      [1, -1],
      // Down-Left
      [-1, 1],
      // Up-Right
      [-1, -1]
      // Up-Left
    ];
    const foundMatches = [];
    const hitCells = /* @__PURE__ */ new Set();
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        for (const [dr, dc] of directions) {
          for (let len = 3; len <= 5; len++) {
            const endR = r + (len - 1) * dr;
            const endC = c + (len - 1) * dc;
            if (endR < 0 || endR >= 5 || endC < 0 || endC >= 5) continue;
            let candidate = "";
            const path = [];
            for (let i = 0; i < len; i++) {
              const cr = r + i * dr, cc = c + i * dc;
              const letter = (_a = grid5x5[cr]) == null ? void 0 : _a[cc];
              if (!letter) break;
              candidate += letter;
              path.push([cr, cc]);
            }
            if (candidate.length === len && wordSet.has(candidate)) {
              const revBoardStr = candidate.split("").reverse().join("");
              foundMatches.push({
                word: candidate,
                path,
                revBoardStr,
                isRev: dr < 0 || dc < 0
              });
              path.forEach(([pr, pc]) => hitCells.add(`${pr}_${pc}`));
            }
          }
        }
      }
    }
    const uniqueWords = Array.from(new Set(foundMatches.map((m) => m.word)));
    return { foundMatches, uniqueWords, hitCells, totalWords: wordSet.size };
  }

  // src/modules/password/passwordSolver.js
  var passwordSolver_exports = {};
  __export(passwordSolver_exports, {
    MASTER_PASSWORDS: () => MASTER_PASSWORDS,
    filterPasswordCandidates: () => filterPasswordCandidates,
    splitPasswordRows: () => splitPasswordRows
  });
  function splitPasswordRows(text) {
    return String(text || "").toUpperCase().replace(/[^A-Z]/g, "").match(/[A-Z]{5}/g) || [];
  }
  var MASTER_PASSWORDS = [
    "BELOW",
    "AGAIN",
    "STUDY",
    "LEARN",
    "HEART",
    "MUSIC",
    "WRITE",
    "WOULD",
    "START",
    "FIRST",
    "THERE",
    "SMALL",
    "SOUND",
    "WHERE",
    "PLACE",
    "STILL",
    "THINK",
    "GREEN",
    "COULD",
    "CHAIR",
    "THESE",
    "CLEAN",
    "WHICH",
    "THREE",
    "ABOUT",
    "AFTER",
    "BUILD",
    "CANCEL",
    "CLOCK",
    "EVERY",
    "FOUND",
    "GREAT",
    "GROUP",
    "HANDS",
    "HOUSE",
    "LARGE",
    "NEVER",
    "OTHER",
    "PLANT",
    "POINT",
    "RIGHT",
    "SPELL",
    "THING",
    "WATER",
    "WORLD"
  ];
  function filterPasswordCandidates(rows, masterWords) {
    const masterSet = Array.from(new Set(
      (masterWords || "").toUpperCase().split(/[\s,]+/).map((w) => w.trim().replace(/[^A-Z]/g, "")).filter((w) => w.length === 5)
    ));
    const validRows = rows.map((l) => l.trim().toUpperCase().replace(/[^A-Z]/g, "")).filter((l) => l.length === 5);
    if (!validRows.length) {
      return {
        rows: [],
        masterSet,
        matches: [],
        cols: Array.from({ length: 5 }, () => /* @__PURE__ */ new Set())
      };
    }
    const cols = Array.from({ length: 5 }, () => /* @__PURE__ */ new Set());
    validRows.forEach((r) => {
      for (let i = 0; i < 5; i++) {
        cols[i].add(r[i]);
      }
    });
    const matches = masterSet.filter((word) => {
      for (let i = 0; i < 5; i++) {
        if (!cols[i].has(word[i])) return false;
      }
      return true;
    });
    return { rows: validRows, masterSet, matches, cols };
  }

  // src/modules/password/passwordVision.js
  var passwordVision_exports = {};
  __export(passwordVision_exports, {
    findLetterBoxes: () => findLetterBoxes,
    readPasswordRow: () => readPasswordRow
  });
  var isInk = (r, g, b) => g > 140 && g - r > 70 && g - b > 50;
  function toData(img) {
    const sc = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
    const W = Math.round(img.naturalWidth * sc), H = Math.round(img.naturalHeight * sc);
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    return g.getImageData(0, 0, W, H);
  }
  function findLetterBoxes(imgData) {
    const { data, width: W, height: H } = imgData;
    const mask = new Uint8Array(W * H);
    const colInk = new Int32Array(W);
    for (let p = 0, i = 0; p < W * H; p++, i += 4) {
      if (isInk(data[i], data[i + 1], data[i + 2])) {
        mask[p] = 1;
        colInk[p % W]++;
      }
    }
    const runs = [];
    let start = -1;
    for (let x = 0; x <= W; x++) {
      const on = x < W && colInk[x] > 0;
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        runs.push([start, x - 1]);
        start = -1;
      }
    }
    const merged = [];
    for (const r of runs) {
      const last = merged[merged.length - 1];
      if (last && r[0] - last[1] <= 2) last[1] = r[1];
      else merged.push([...r]);
    }
    let boxes = merged.map(([x0, x1]) => {
      let y0 = H, y1 = -1, n = 0;
      for (let y = 0; y < H; y++) for (let x = x0; x <= x1; x++) if (mask[y * W + x]) {
        n++;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      return { x0, x1, y0, y1, n };
    }).filter((b) => b.n > 15 && b.y1 - b.y0 > 5);
    if (boxes.length > 5) boxes = [...boxes].sort((a, b) => b.n - a.n).slice(0, 5);
    boxes.sort((a, b) => a.x0 - b.x0);
    if (boxes.length === 5) {
      const hs = boxes.map((b) => b.y1 - b.y0 + 1).sort((a, b) => a - b), h = hs[2];
      const ys = boxes.map((b) => (b.y0 + b.y1) / 2).sort((a, b) => a - b), yc = ys[2];
      const aligned = boxes.every((b) => Math.abs((b.y0 + b.y1) / 2 - yc) < h * 0.4 && Math.abs(b.y1 - b.y0 + 1 - h) < h * 0.35);
      if (!aligned) boxes = [];
    }
    return { mask, W, H, boxes };
  }
  function glyphCanvas(mask, W, boxes, gap = 0) {
    const h = Math.max(...boxes.map((b) => b.y1 - b.y0 + 1));
    const scale = Math.max(1, 64 / h), pad = 16;
    const widths = boxes.map((b) => Math.round((b.x1 - b.x0 + 1) * scale));
    const cv = document.createElement("canvas");
    cv.width = widths.reduce((s, w) => s + w, 0) + gap * (boxes.length - 1) + pad * 2;
    cv.height = Math.round(h * scale) + pad * 2;
    const g = cv.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = "#000";
    let ox = pad;
    boxes.forEach((b, i) => {
      const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1, oy = pad + Math.round((h - bh) * scale);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        if (mask[(b.y0 + y) * W + b.x0 + x]) g.fillRect(ox + Math.floor(x * scale), oy + Math.floor(y * scale), Math.ceil(scale), Math.ceil(scale));
      }
      ox += widths[i] + gap;
    });
    return cv;
  }
  var clean = (t) => (t || "").toUpperCase().replace(/0/g, "O").replace(/1/g, "I").replace(/5/g, "S").replace(/8/g, "B").replace(/2/g, "Z").replace(/6/g, "G").replace(/[^A-Z]/g, "");
  async function readPasswordRow(img, allowed = null, onStatus = () => {
  }) {
    const { mask, W, boxes } = findLetterBoxes(toData(img));
    if (boxes.length !== 5) {
      return { ok: false, reason: `Found ${boxes.length} letters instead of 5 \u2014 type the row instead.` };
    }
    onStatus("Starting OCR\u2026");
    const worker = await ensureOCRWorker();
    onStatus("Reading the row\u2026");
    let line = "", lineConf = 0;
    try {
      await worker.setParameters({ tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", tessedit_pageseg_mode: "7" });
      const { data } = await worker.recognize(glyphCanvas(mask, W, boxes, 28));
      line = clean(data && data.text);
      lineConf = Number(data && data.confidence || 0);
    } catch (e) {
    }
    const letters = line.length === 5 ? line.split("") : Array(5).fill("");
    const unsure = Array(5).fill(line.length === 5 && lineConf < 60);
    const redo = [0, 1, 2, 3, 4].filter((i) => !(letters[i] && !(allowed && allowed[i] && !allowed[i].has(letters[i]))));
    if (redo.length) onStatus(`Reading ${redo.length} letter${redo.length > 1 ? "s" : ""} on their own\u2026`);
    const recs = await Promise.all(redo.map(async (i) => recognizeCell(await ensureOCRWorker(), glyphCanvas(mask, W, [boxes[i]]))));
    redo.forEach((i, k) => {
      const rec = recs[k];
      const ch = rec.letter && rec.letter !== "?" ? rec.letter : letters[i] || "?";
      letters[i] = ch;
      unsure[i] = ch === "?" || rec.confidence < 60;
    });
    for (let i = 0; i < 5; i++) if (allowed && allowed[i] && !allowed[i].has(letters[i])) unsure[i] = true;
    return { ok: true, row: letters.join(""), unsure };
  }

  // src/modules/switches/switchesSolver.js
  var switchesSolver_exports = {};
  __export(switchesSolver_exports, {
    swBFS: () => swBFS,
    swNorm: () => swNorm
  });
  function swNorm(s) {
    return (s || "").toUpperCase().replace(/[^UD]/g, "").slice(0, 5).padEnd(5, "U");
  }
  function swBFS(initial, goal, forbidden) {
    const forbidSet = new Set(forbidden);
    if (forbidSet.has(initial)) return null;
    if (initial === goal) return [initial];
    const prev = /* @__PURE__ */ new Map([[initial, null]]);
    const queue = [initial];
    while (queue.length > 0) {
      const state = queue.shift();
      for (let i = 0; i < 5; i++) {
        const arr = state.split("");
        arr[i] = arr[i] === "U" ? "D" : "U";
        const next = arr.join("");
        if (prev.has(next) || forbidSet.has(next)) continue;
        prev.set(next, state);
        if (next === goal) {
          const path = [];
          let cur = next;
          while (cur !== null) {
            path.unshift(cur);
            cur = prev.get(cur);
          }
          return path;
        }
        queue.push(next);
      }
    }
    return null;
  }

  // src/modules/switches/switchesVision.js
  var switchesVision_exports = {};
  __export(switchesVision_exports, {
    detectSwitchesAndGoals: () => detectSwitchesAndGoals
  });
  function detectSwitchesAndGoals(img) {
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const MAXDIM = 1200;
    if (w > MAXDIM || h > MAXDIM) {
      const scale = MAXDIM / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const greenMask = new Uint8Array(w * h);
    const silverMask = new Uint8Array(w * h);
    const colProfile = new Float64Array(w);
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x++) {
        const idx = rowOffset + x * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const brightness = (r + g + b) / 3;
        if (g > r + 25 && g > b + 25 && g > 80) {
          greenMask[y * w + x] = 1;
          colProfile[x] += 3;
        }
        if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20 && brightness > 110 && brightness < 220) {
          silverMask[y * w + x] = 1;
          colProfile[x] += 1;
        }
      }
    }
    const winSize = Math.max(5, Math.floor(w * 0.02));
    const smoothedCols = new Float64Array(w);
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      for (let dx = -winSize; dx <= winSize; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < w) {
          sum += colProfile[nx];
          count++;
        }
      }
      smoothedCols[x] = sum / (count || 1);
    }
    const margin = Math.floor(w * 0.04);
    for (let x = 0; x < margin; x++) smoothedCols[x] = 0;
    for (let x = w - margin; x < w; x++) smoothedCols[x] = 0;
    const minDist = Math.max(10, Math.floor(w * 0.08));
    const peaks = [];
    const tempCols = new Float64Array(smoothedCols);
    for (let k = 0; k < 5; k++) {
      let maxIdx = -1, maxVal = 0;
      for (let x = 0; x < w; x++) {
        if (tempCols[x] > maxVal) {
          maxVal = tempCols[x];
          maxIdx = x;
        }
      }
      if (maxIdx === -1 || maxVal <= 0) break;
      peaks.push(maxIdx);
      const pStart = Math.max(0, maxIdx - minDist);
      const pEnd = Math.min(w, maxIdx + minDist);
      for (let x = pStart; x < pEnd; x++) tempCols[x] = 0;
    }
    peaks.sort((a, b) => a - b);
    if (peaks.length < 5) {
      let nzMin = w, nzMax = 0;
      for (let x = 0; x < w; x++) {
        if (colProfile[x] > 0) {
          if (x < nzMin) nzMin = x;
          if (x > nzMax) nzMax = x;
        }
      }
      if (nzMin >= nzMax) {
        nzMin = Math.floor(w * 0.15);
        nzMax = Math.floor(w * 0.85);
      }
      peaks.length = 0;
      for (let i = 0; i < 5; i++) {
        peaks.push(Math.floor(nzMin + (nzMax - nzMin) * i / 4));
      }
    }
    let yTop = h, yBot = 0;
    const halfMinDist = Math.floor(minDist / 2);
    for (let y = 0; y < h; y++) {
      for (const px of peaks) {
        const x0 = Math.max(0, px - halfMinDist);
        const x1 = Math.min(w, px + halfMinDist);
        let rowHasMatch = false;
        for (let x = x0; x < x1; x++) {
          const idx = y * w + x;
          if (greenMask[idx] || silverMask[idx]) {
            rowHasMatch = true;
            break;
          }
        }
        if (rowHasMatch) {
          if (y < yTop) yTop = y;
          if (y > yBot) yBot = y;
        }
      }
    }
    if (yTop >= yBot) {
      yTop = 0;
      yBot = h - 1;
    }
    const yMid = (yTop + yBot) / 2;
    const initChars = [];
    const goalChars = [];
    const halfTrackW = Math.max(4, Math.floor(minDist * 0.45));
    for (const px of peaks) {
      const x0 = Math.max(0, px - halfTrackW);
      const x1 = Math.min(w, px + halfTrackW);
      let greenYSum = 0, greenCount = 0;
      for (let y = yTop; y <= yBot; y++) {
        for (let x = x0; x < x1; x++) {
          if (greenMask[y * w + x]) {
            greenYSum += y;
            greenCount++;
          }
        }
      }
      if (greenCount > 0) {
        const avgGreenY = greenYSum / greenCount;
        goalChars.push(avgGreenY < yMid ? "U" : "D");
      } else {
        goalChars.push("U");
      }
      const trackH = yBot - yTop + 1;
      const rowSilverCounts = new Int32Array(trackH);
      let totalSilver = 0;
      for (let y = yTop; y <= yBot; y++) {
        let rCount = 0;
        for (let x = x0; x < x1; x++) {
          if (silverMask[y * w + x]) rCount++;
        }
        rowSilverCounts[y - yTop] = rCount;
        totalSilver += rCount;
      }
      if (totalSilver > 0) {
        const rWin = Math.max(3, Math.floor(trackH * 0.05));
        let maxRowVal = -1, knobYRel = 0;
        for (let ry = 0; ry < trackH; ry++) {
          let sum = 0;
          for (let dry = -rWin; dry <= rWin; dry++) {
            const nry = ry + dry;
            if (nry >= 0 && nry < trackH) sum += rowSilverCounts[nry];
          }
          if (sum > maxRowVal) {
            maxRowVal = sum;
            knobYRel = ry;
          }
        }
        const knobY = yTop + knobYRel;
        initChars.push(knobY < yMid ? "U" : "D");
      } else {
        initChars.push("U");
      }
    }
    return {
      detectedInit: initChars.join(""),
      detectedGoal: goalChars.join("")
    };
  }

  // src/modules/diagram/diagramCore.js
  var diagramCore_exports = {};
  __export(diagramCore_exports, {
    VennCore: () => VennCore
  });
  var VennCore = function() {
    "use strict";
    var SLOT_ORDER = { c3: ["T", "L", "R"], c2h: ["L", "R"], c2v: ["T", "B"] };
    var GW = 12, GH = 16;
    var TEMPLATES = { A: [], B: [], C: [] };
    function addTemplate(letter, grid) {
      if (TEMPLATES[letter]) TEMPLATES[letter].push(grid);
    }
    function prep(img) {
      var W = img.width, H = img.height, d = img.data;
      var lum = new Float32Array(W * H), sat = new Float32Array(W * H);
      for (var i = 0, p = 0; i < W * H; i++, p += 4) {
        var r = d[p], g = d[p + 1], b = d[p + 2];
        lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        sat[i] = mx ? (mx - mn) / mx : 0;
      }
      return { W, H, lum, sat };
    }
    function isBright(P, x, y) {
      if (x < 0 || y < 0 || x >= P.W || y >= P.H) return false;
      var i = y * P.W + x;
      return P.lum[i] > 165 && P.sat[i] < 0.3;
    }
    function houghAcc(P, pts, r, acc) {
      var W = P.W, H = P.H;
      acc.fill(0);
      var steps = Math.ceil(2 * Math.PI * r), seen = {}, dxs = [], dys = [];
      for (var k = 0; k < steps; k++) {
        var th = 2 * Math.PI * k / steps;
        var dx = Math.round(r * Math.cos(th)), dy = Math.round(r * Math.sin(th));
        var key = dx * 4096 + dy;
        if (!seen[key]) {
          seen[key] = 1;
          dxs.push(dx);
          dys.push(dy);
        }
      }
      var n = dxs.length;
      for (var p = 0; p < pts.length; p += 2) {
        var x = pts[p], y = pts[p + 1];
        for (var j = 0; j < n; j++) {
          var cx = x - dxs[j], cy = y - dys[j];
          if (cx >= 0 && cx < W && cy >= 0 && cy < H) acc[cy * W + cx]++;
        }
      }
    }
    function rawMax(acc) {
      var m = 0;
      for (var i = 0; i < acc.length; i++) if (acc[i] > m) m = acc[i];
      return m;
    }
    function smooth3(P, acc) {
      var W = P.W, H = P.H, tmp = new Int32Array(W * H), out = new Int32Array(W * H);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var s = acc[y * W + x];
        if (x > 0) s += acc[y * W + x - 1];
        if (x < W - 1) s += acc[y * W + x + 1];
        tmp[y * W + x] = s;
      }
      for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) {
        var t = tmp[y2 * W + x2];
        if (y2 > 0) t += tmp[(y2 - 1) * W + x2];
        if (y2 < H - 1) t += tmp[(y2 + 1) * W + x2];
        out[y2 * W + x2] = t;
      }
      return out;
    }
    function ringScore(P, cx, cy, r) {
      var n = 120, hit = 0;
      for (var k = 0; k < n; k++) {
        var th = 2 * Math.PI * k / n, ok = false;
        for (var d = -2; d <= 2 && !ok; d++) {
          var x = Math.round(cx + (r + d) * Math.cos(th)), y = Math.round(cy + (r + d) * Math.sin(th));
          if (isBright(P, x, y)) ok = true;
        }
        if (ok) hit++;
      }
      return hit / n;
    }
    function refineCircle(P, c) {
      var best = { x: c.x, y: c.y, r: c.r, s: ringScore(P, c.x, c.y, c.r) };
      for (var dr = -2; dr <= 2; dr++) for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
        var s = ringScore(P, c.x + dx, c.y + dy, c.r + dr);
        if (s > best.s + 1e-9) best = { x: c.x + dx, y: c.y + dy, r: c.r + dr, s };
      }
      return best;
    }
    function findCircles(P) {
      var W = P.W, H = P.H, all = [];
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (isBright(P, x, y)) all.push(x, y);
      var N = all.length / 2;
      if (N < 80) return [];
      var stepP = Math.max(1, Math.ceil(N / 1800)), pts = [];
      for (var i = 0; i < N; i += stepP) pts.push(all[2 * i], all[2 * i + 1]);
      var m = Math.min(W, H);
      var rMin = Math.max(8, Math.round(0.08 * m)), rMax = Math.round(0.28 * m);
      var acc = new Int32Array(W * H);
      var bestR = rMin, bestV = -1;
      for (var r = rMin; r <= rMax; r += 2) {
        houghAcc(P, pts, r, acc);
        var v = rawMax(acc);
        if (v > bestV) {
          bestV = v;
          bestR = r;
        }
      }
      var fine = null;
      for (var rr = bestR - 2; rr <= bestR + 2; rr++) {
        if (rr < rMin - 2) continue;
        houghAcc(P, pts, rr, acc);
        var sm = smooth3(P, acc), mx = 0;
        for (var q = 0; q < sm.length; q++) if (sm[q] > mx) mx = sm[q];
        if (!fine || mx > fine.mx) fine = { r: rr, sm, mx };
      }
      var R = fine.r, sm2 = fine.sm, cands = [], guard = Math.round(0.5 * R);
      for (var it = 0; it < 6; it++) {
        var bi = -1, bv = 0;
        for (var j = 0; j < sm2.length; j++) if (sm2[j] > bv) {
          bv = sm2[j];
          bi = j;
        }
        if (bi < 0) break;
        if (it === 0) fine.first = bv;
        if (bv < 0.4 * fine.first) break;
        var cy = Math.floor(bi / W), cx = bi % W;
        cands.push({ x: cx, y: cy, r: R });
        for (var yy = Math.max(0, cy - guard); yy <= Math.min(H - 1, cy + guard); yy++)
          for (var xx = Math.max(0, cx - guard); xx <= Math.min(W - 1, cx + guard); xx++) sm2[yy * W + xx] = 0;
      }
      var good = [];
      cands.forEach(function(c) {
        var rf = refineCircle(P, c);
        if (rf.s >= 0.7) good.push(rf);
      });
      good.sort(function(a, b) {
        return b.s - a.s;
      });
      var out = [];
      good.forEach(function(g) {
        if (out.every(function(o) {
          return Math.hypot(o.x - g.x, o.y - g.y) > 0.4 * g.r;
        })) out.push(g);
      });
      return out.slice(0, 3);
    }
    function assignSlots(cs) {
      var n = cs.length, layout, ordered;
      if (n === 3) {
        layout = "c3";
        var byY = cs.slice().sort(function(a, b) {
          return a.y - b.y;
        });
        var rest = byY.slice(1).sort(function(a, b) {
          return a.x - b.x;
        });
        ordered = [byY[0], rest[0], rest[1]];
      } else {
        var dx = Math.abs(cs[0].x - cs[1].x), dy = Math.abs(cs[0].y - cs[1].y);
        if (dx >= dy) {
          layout = "c2h";
          ordered = cs.slice().sort(function(a, b) {
            return a.x - b.x;
          });
        } else {
          layout = "c2v";
          ordered = cs.slice().sort(function(a, b) {
            return a.y - b.y;
          });
        }
      }
      var slots = SLOT_ORDER[layout];
      ordered.forEach(function(c, i) {
        c.slot = slots[i];
      });
      return { layout, circles: ordered };
    }
    function findRect(P, cs) {
      var bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
      cs.forEach(function(c) {
        bx0 = Math.min(bx0, c.x - c.r);
        bx1 = Math.max(bx1, c.x + c.r);
        by0 = Math.min(by0, c.y - c.r);
        by1 = Math.max(by1, c.y + c.r);
      });
      var cxm = Math.round((bx0 + bx1) / 2), cym = Math.round((by0 + by1) / 2), W = P.W, H = P.H;
      function scan(x, y, dx, dy, maxd2) {
        for (var t2 = 0; t2 <= maxd2; t2++) {
          var px = Math.round(x + dx * t2), py = Math.round(y + dy * t2);
          if (px < 0 || py < 0 || px >= W || py >= H) return -1;
          if (P.lum[py * W + px] < 24) return t2;
        }
        return -1;
      }
      var maxd = 0.6 * Math.min(W, H);
      var l = scan(bx0 - 2, cym, -1, 0, maxd), r = scan(bx1 + 2, cym, 1, 0, maxd);
      var t = scan(cxm, by0 - 2, 0, -1, maxd), b = scan(cxm, by1 + 2, 0, 1, maxd);
      var pad = 0.3 * cs[0].r, guessed = false;
      var x0 = l >= 0 ? bx0 - 2 - l : bx0 - pad, x1 = r >= 0 ? bx1 + 2 + r : bx1 + pad;
      var y0 = t >= 0 ? by0 - 2 - t : by0 - pad, y1 = b >= 0 ? by1 + 2 + b : by1 + pad;
      if (l < 0 || r < 0 || t < 0 || b < 0) guessed = true;
      return { x0: x0 + 3, y0: y0 + 3, x1: x1 - 3, y1: y1 - 3, guessed };
    }
    function regionMaskAt(cs, x, y) {
      var mask = 0, edge = 1e9;
      for (var i = 0; i < cs.length; i++) {
        var d = Math.hypot(x - cs[i].x, y - cs[i].y);
        if (d < cs[i].r) mask |= 1 << i;
        edge = Math.min(edge, Math.abs(d - cs[i].r));
      }
      return { mask, edge };
    }
    function median(a) {
      a.sort(function(p, q) {
        return p - q;
      });
      return a[a.length >> 1];
    }
    function sampleRegions(P, cs, rect) {
      var n = cs.length, M = 1 << n, buckets = [], sx = [], sy = [], cnt = [];
      for (var m = 0; m < M; m++) {
        buckets.push([]);
        sx.push(0);
        sy.push(0);
        cnt.push(0);
      }
      var W = P.W;
      for (var y = Math.ceil(rect.y0); y <= rect.y1; y += 2) {
        for (var x = Math.ceil(rect.x0); x <= rect.x1; x += 2) {
          var rm = regionMaskAt(cs, x, y);
          if (rm.edge < 5) continue;
          var i = y * W + x;
          if (P.lum[i] > 150 && P.sat[i] < 0.3) continue;
          buckets[rm.mask].push(P.lum[i]);
          sx[rm.mask] += x;
          sy[rm.mask] += y;
          cnt[rm.mask]++;
        }
      }
      var lums = [], dots = [];
      for (var k = 0; k < M; k++) {
        if (cnt[k] >= 12) {
          lums.push(median(buckets[k]));
          dots.push({ mask: k, x: sx[k] / cnt[k], y: sy[k] / cnt[k] });
        } else {
          lums.push(null);
          dots.push({ mask: k, x: null, y: null });
        }
      }
      return { lums, dots };
    }
    function classify2(lums) {
      var vals = lums.filter(function(v) {
        return v !== null;
      });
      var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
      var thr = mx - mn >= 28 ? (mn + mx) / 2 : 68;
      return lums.map(function(v) {
        return v !== null && v > thr;
      });
    }
    function resampleGlyph(cov, w, h) {
      var out = new Float32Array(GW * GH), SS = 4;
      for (var gy = 0; gy < GH; gy++) for (var gx = 0; gx < GW; gx++) {
        var s = 0;
        for (var sy = 0; sy < SS; sy++) for (var sx = 0; sx < SS; sx++) {
          var px = Math.min(w - 1, Math.floor((gx + (sx + 0.5) / SS) / GW * w));
          var py = Math.min(h - 1, Math.floor((gy + (sy + 0.5) / SS) / GH * h));
          s += cov[py * w + px];
        }
        out[gy * GW + gx] = s / (SS * SS);
      }
      return out;
    }
    function gridToStr(g) {
      var rows = [];
      for (var y = 0; y < GH; y++) {
        var r = "";
        for (var x = 0; x < GW; x++) r += Math.min(9, Math.round(g[y * GW + x] * 9));
        rows.push(r);
      }
      return rows.join("");
    }
    function strToGrid(s) {
      var g = new Float32Array(GW * GH);
      for (var i = 0; i < GW * GH; i++) g[i] = (s.charCodeAt(i) - 48) / 9;
      return g;
    }
    function ncc(a, b) {
      var n = a.length, ma = 0, mb = 0, i;
      for (i = 0; i < n; i++) {
        ma += a[i];
        mb += b[i];
      }
      ma /= n;
      mb /= n;
      var sab = 0, saa = 0, sbb = 0;
      for (i = 0; i < n; i++) {
        var da = a[i] - ma, db = b[i] - mb;
        sab += da * db;
        saa += da * da;
        sbb += db * db;
      }
      return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
    }
    function extractGlyph2(P, cs, idx) {
      var c = cs[idx], W = P.W, H = P.H, bgs = [];
      var pix = [];
      var x0 = Math.floor(c.x - c.r), x1 = Math.ceil(c.x + c.r), y0 = Math.floor(c.y - c.r), y1 = Math.ceil(c.y + c.r);
      for (var y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (var x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
        var rm = regionMaskAt(cs, x, y);
        if (rm.mask !== 1 << idx || rm.edge < 6) continue;
        var i = y * W + x;
        if (P.lum[i] > 140 && P.sat[i] < 0.35) pix.push(x, y);
        else if ((x + y) % 5 === 0) bgs.push(P.lum[i]);
      }
      if (pix.length / 2 < 14) return null;
      var set = {}, k;
      for (k = 0; k < pix.length; k += 2) set[pix[k] + "," + pix[k + 1]] = 1;
      var best = null, seen = {};
      for (k = 0; k < pix.length; k += 2) {
        var key = pix[k] + "," + pix[k + 1];
        if (seen[key]) continue;
        var stack = [[pix[k], pix[k + 1]]], comp = [];
        seen[key] = 1;
        while (stack.length) {
          var cur = stack.pop();
          comp.push(cur);
          for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
            var nk = cur[0] + dx + "," + (cur[1] + dy);
            if (set[nk] && !seen[nk]) {
              seen[nk] = 1;
              stack.push([cur[0] + dx, cur[1] + dy]);
            }
          }
        }
        if (!best || comp.length > best.length) best = comp;
      }
      var bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
      best.forEach(function(p) {
        bx0 = Math.min(bx0, p[0]);
        bx1 = Math.max(bx1, p[0]);
        by0 = Math.min(by0, p[1]);
        by1 = Math.max(by1, p[1]);
      });
      bx0 -= 1;
      by0 -= 1;
      bx1 += 1;
      by1 += 1;
      var w = bx1 - bx0 + 1, h = by1 - by0 + 1;
      if (h < 0.12 * c.r || h > 0.95 * c.r || w > 1.2 * c.r || w < 3) return null;
      var bg = bgs.length ? median(bgs) : 34, cov = new Float32Array(w * h);
      for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
        var px = bx0 + xx, py = by0 + yy;
        var l = px >= 0 && py >= 0 && px < W && py < H ? P.lum[py * W + px] : bg;
        cov[yy * w + xx] = Math.max(0, Math.min(1, (l - bg) / (255 - bg)));
      }
      return { grid: resampleGlyph(cov, w, h), bbox: [bx0, by0, bx1, by1] };
    }
    function bestTemplateScore(grid, letter) {
      var best = -1;
      TEMPLATES[letter].forEach(function(t) {
        var s = ncc(grid, t);
        if (s > best) best = s;
      });
      return best;
    }
    function readLetters(P, cs, layout) {
      var n = cs.length, glyphs = [], i;
      for (i = 0; i < n; i++) {
        var g = extractGlyph2(P, cs, i);
        if (!g) return null;
        glyphs.push(g);
      }
      var L = ["A", "B", "C"];
      if (!TEMPLATES.A.length || !TEMPLATES.B.length || !TEMPLATES.C.length) return { ok: false, minScore: -1, glyphs };
      var sc = glyphs.map(function(g2) {
        return L.map(function(l) {
          return bestTemplateScore(g2.grid, l);
        });
      });
      var best = null;
      function rec(i2, used, acc, total) {
        if (i2 === n) {
          if (!best || total > best.total) best = { assign: acc.slice(), total };
          return;
        }
        for (var j = 0; j < 3; j++) if (!(used & 1 << j)) {
          acc.push(j);
          rec(i2 + 1, used | 1 << j, acc, total + sc[i2][j]);
          acc.pop();
        }
      }
      rec(0, 0, [], 0);
      var minScore = Math.min.apply(null, best.assign.map(function(j, k) {
        return sc[k][j];
      }));
      if (minScore < 0.55) return { ok: false, minScore, glyphs };
      var slots = SLOT_ORDER[layout], map = {};
      best.assign.forEach(function(j, k) {
        map[slots[k]] = L[j];
      });
      return { ok: true, slotLetters: map, minScore, glyphs };
    }
    function analyze(img) {
      var P = prep(img);
      var cs = findCircles(P);
      if (cs.length < 2) return { ok: false, reason: "Could not find 2 or 3 circles \u2014 crop the screenshot closer to the diagram." };
      var as = assignSlots(cs), circles = as.circles, layout = as.layout;
      var rect = findRect(P, circles);
      var sm = sampleRegions(P, circles, rect);
      var flags = classify2(sm.lums);
      var masks = [];
      flags.forEach(function(f, m) {
        if (f) masks.push(m);
      });
      var dots = sm.dots.map(function(d, m) {
        d.shaded = flags[m];
        return d;
      });
      var lt = readLetters(P, circles, layout);
      return {
        ok: true,
        W: P.W,
        H: P.H,
        layout,
        circles,
        rect,
        shade: { masks, lums: sm.lums, dots },
        letters: lt && lt.ok ? { slotLetters: lt.slotLetters, minScore: lt.minScore } : null,
        lettersTried: !!lt,
        lettersMinScore: lt ? lt.minScore : null,
        _glyphs: lt && lt.glyphs ? lt.glyphs : null
      };
    }
    var engineCache = {};
    function wrap(e, ctx) {
      if (ctx === "n" && e.prec === 1) return "(" + e.s + ")";
      if (ctx === "u" && e.prec === 2) return "(" + e.s + ")";
      return e.s;
    }
    function buildEngine(names) {
      var k = names.length, M = 1 << k, N = 1 << M, FULL = N - 1;
      var best = new Array(N).fill(null), buckets = [];
      function relax(f2, e2) {
        var b = best[f2];
        var better = !b || e2.s.length < b.s.length || e2.s.length === b.s.length && (e2.nc < b.nc || e2.nc === b.nc && e2.s < b.s);
        if (better) {
          best[f2] = e2;
          var L = e2.s.length;
          if (!buckets[L]) buckets[L] = [];
          buckets[L].push([f2, e2]);
        }
      }
      for (var v = 0; v < k; v++) {
        var t = 0;
        for (var m = 0; m < M; m++) if (m >> v & 1) t |= 1 << m;
        relax(t, { s: names[v], prec: 3, nc: 0, base: false });
      }
      relax(FULL, { s: "S", prec: 3, nc: 0, base: true });
      relax(0, { s: "Null", prec: 3, nc: 0, base: true });
      var done = [];
      for (var c = 1; c < buckets.length; c++) {
        var list = buckets[c];
        if (!list) continue;
        for (var i = 0; i < list.length; i++) {
          var f = list[i][0], e = list[i][1];
          if (best[f] !== e || e.done) continue;
          e.done = true;
          if (e.base) continue;
          if (e.s.charAt(e.s.length - 1) !== "'") {
            var ns = e.prec === 3 && e.s.length === 1 ? e.s + "'" : "(" + e.s + ")'";
            relax(~f & FULL, { s: ns, prec: 3, nc: e.nc + 1 });
          }
          for (var j = 0; j < done.length; j++) {
            var g = done[j], ge = best[g];
            var a1 = wrap(e, "n"), b1 = wrap(ge, "n");
            relax(f & g, { s: a1 <= b1 ? a1 + "n" + b1 : b1 + "n" + a1, prec: 2, nc: e.nc + ge.nc });
            var a2 = wrap(e, "u"), b2 = wrap(ge, "u");
            relax(f | g, { s: a2 <= b2 ? a2 + "u" + b2 : b2 + "u" + a2, prec: 1, nc: e.nc + ge.nc });
          }
          done.push(f);
        }
      }
      return { names, best, M };
    }
    function getEngine(names) {
      var key = names.join("");
      if (!engineCache[key]) engineCache[key] = buildEngine(names);
      return engineCache[key];
    }
    function expression(names, localMasks) {
      var eng = getEngine(names), f = 0;
      localMasks.forEach(function(m) {
        f |= 1 << m;
      });
      return eng.best[f].s;
    }
    function minterm(names, m) {
      return names.map(function(nm, i) {
        return m >> i & 1 ? nm : nm + "'";
      }).join("n");
    }
    addTemplate("A", strToGrid("000012210000000047851000000168872000000288883000000588886000001787887100002884888300004872788500016862588710027877788830038888888840158755578861168400037873388200015884376100002575121000000111"));
    addTemplate("C", strToGrid("000124553320001478888740016888778851038883125861158861002761278830000241288820000000288720000000288720000000278820000000168830000010048861001462028885235872005888788841001367877410000012432100"));
    addTemplate("B", strToGrid("011111110000156666664100158888888500028886788810028882278820028882178820028883388820028887788500028888888710028884478840028882148851028882028861028883368851028887888830018888887610004444443100"));
    return {
      analyze,
      expression,
      minterm,
      addTemplate,
      strToGrid,
      gridToStr,
      resampleGlyph,
      TEMPLATES,
      SLOT_ORDER,
      GW,
      GH,
      _ncc: ncc
    };
  }();

  // src/modules/wof/wofSolver.js
  var wofSolver_exports = {};
  __export(wofSolver_exports, {
    BLANK: () => BLANK,
    DEFAULT_RULES: () => DEFAULT_RULES,
    POS_NAMES: () => POS_NAMES,
    lev: () => lev,
    matchWord: () => matchWord,
    parseRules: () => parseRules,
    solveCore: () => solveCore
  });
  var DEFAULT_RULES = `Step 1. The display word tells you which button label to ask for:

    top left: NOTHING, READ, IDK, NOT, THEY'RE, YOU, YOUR
    top right: CEE, LEAD, OKAY, MIDDLE LEFT, WHAT, THEIR, YOU ARE
    middle left: LEED, REED, SAYS, TOP RIGHT, IT, YOU'RE
    middle right: NO, SEE, PRESS, DON'T, UR, YES
    bottom left: C, DISPLAY, HOLD ON, RED, THIS, THAT
    bottom right: (blank), BLANK, FIRST, LED, THERE, THEY ARE


Step 2. Find that label's list below. Tell the Defuser to press the first word in the list that appears on any button.

    THIS: PRESS, WAIT, WHAT, IT, HOLD, FIRST, THAT, READY, IDK, NOT, TOP RIGHT, THIS
    THAT: MIDDLE LEFT, FIRST, IT, PRESS, DON'T, READY, HOLD, NOT, IDK, THAT
    PRESS: TOP RIGHT, PRESS
    TOP RIGHT: FIRST, WHAT, TOP RIGHT
    MIDDLE LEFT: FIRST, TOP RIGHT, NOT, DON'T, IT, IDK, THAT, PRESS, HOLD, THIS, READY, WHAT, WAIT, MIDDLE LEFT
    DON'T: PRESS, IDK, THAT, MIDDLE LEFT, HOLD, WAIT, FIRST, DON'T
    IT: THIS, WAIT, HOLD, READY, PRESS, MIDDLE LEFT, TOP RIGHT, NOT, IT
    WHAT: NOT, FIRST, IDK, DON'T, IT, MIDDLE LEFT, TOP RIGHT, THIS, HOLD, READY, WHAT
    IDK: WHAT, WAIT, FIRST, THIS, MIDDLE LEFT, PRESS, IDK
    FIRST: WAIT, TOP RIGHT, WHAT, NOT, READY, HOLD, IT, DON'T, FIRST
    NOT: TOP RIGHT, DON'T, FIRST, THAT, WAIT, READY, PRESS, IDK, HOLD, NOT
    READY: FIRST, READY
    WAIT: IDK, NOT, THIS, FIRST, TOP RIGHT, THAT, HOLD, IT, READY, WHAT, WAIT
    HOLD: FIRST, NOT, HOLD
    C: UH UH, UHH, U, CEE, UH HUH, YOU ARE, UR, SEE, WHAT?, UHHH, YOU, YOU'RE, YOUR, C
    CEE: UH UH, UHHH, C, CEE
    SEE: YOUR, WHAT?, SEE
    UHH: YOU'RE, YOUR, U, UH HUH, UHHH, CEE, UHH
    UHHH: YOUR, UH UH, YOU, UHHH
    YOU: UR, YOU
    YOU ARE: UH HUH, WHAT?, U, YOUR, YOU'RE, C, CEE, YOU, YOU ARE
    YOUR: UR, YOUR
    YOU'RE: YOU ARE, WHAT?, YOUR, YOU, C, UH UH, SEE, U, UH HUH, YOU'RE
    UR: CEE, YOU, UH UH, UR
    U: YOU ARE, WHAT?, SEE, CEE, U
    UH HUH: WHAT?, YOU ARE, UH HUH
    UH UH: YOUR, YOU'RE, UH HUH, YOU ARE, C, UH UH
    WHAT?: YOU ARE, UH HUH, YOU, U, WHAT?`;
  var POS_NAMES = ["TOP LEFT", "TOP RIGHT", "MIDDLE LEFT", "MIDDLE RIGHT", "BOTTOM LEFT", "BOTTOM RIGHT"];
  var BLANK = "(BLANK)";
  function parseRules(text) {
    const R = { posOfWord: {}, step2: {}, displayWords: [], buttonLabels: [] };
    let mode = 1, npos = 0;
    const seenPos = {};
    for (const raw of String(text || "").split(/\r?\n/)) {
      const line = raw.replace(/[\u2018\u2019]/g, "'").replace(/[*`]/g, "").trim();
      if (/^step\s*1/i.test(line)) {
        mode = 1;
        continue;
      }
      if (/^step\s*2/i.test(line)) {
        mode = 2;
        continue;
      }
      const m = line.match(/^[-•]?\s*([^:]+?)\s*:\s*(.+)$/);
      if (!m) continue;
      const key = m[1].trim().toUpperCase();
      const words = m[2].split(",").map((w) => w.trim().toUpperCase()).filter(Boolean);
      if (!words.length) continue;
      if (mode === 1 && npos === 6) mode = 2;
      const pi = POS_NAMES.indexOf(key);
      if (mode === 1) {
        if (pi < 0 || seenPos[pi]) continue;
        seenPos[pi] = true;
        npos++;
        for (const w of words) if (!(w in R.posOfWord)) {
          R.posOfWord[w] = pi;
          R.displayWords.push(w);
        }
      } else {
        R.step2[key] = words;
      }
    }
    R.buttonLabels = Object.keys(R.step2);
    R.positions = npos;
    return R;
  }
  function solveCore(R, disp, btns) {
    if (!disp) return { ok: false, msg: "SET THE DISPLAY WORD" };
    const look = R.posOfWord[disp];
    if (look === void 0) return { ok: false, msg: "DISPLAY WORD NOT IN RULES" };
    if (btns.some((b) => !b)) return { ok: false, look, msg: "FILL IN ALL 6 BUTTONS" };
    const label = btns[look];
    const list = R.step2[label];
    if (!list) return { ok: false, look, label, msg: 'NO LIST FOR "' + label + '"' };
    const on = new Set(btns);
    const ans = list.find((w) => on.has(w));
    if (!ans) return { ok: false, look, label, list, msg: "NO LIST WORD IS ON A BUTTON" };
    return { ok: true, look, label, list, ans, hit: btns.indexOf(ans) };
  }
  function lev(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }
  function matchWord(text, vocab) {
    const t = String(text || "").toUpperCase().replace(/[^A-Z'?]/g, "");
    if (!t) return { w: "", d: 99, amb: false };
    let bw = "", bd = 99, second = 99;
    for (const w of vocab) {
      const d = lev(t, w.replace(/ /g, ""));
      if (d < bd) {
        second = bd;
        bd = d;
        bw = w;
      } else if (d < second) {
        second = d;
      }
    }
    return { w: bw, d: bd, amb: second === bd, len: t.length };
  }

  // src/modules/wof/wofOCR.js
  var wofOCR_exports = {};
  __export(wofOCR_exports, {
    wofReadImage: () => wofReadImage
  });
  var REG_DISP = [102, 102, 236, 46];
  var REG_BTN = [
    [84, 177, 124, 36],
    [232, 177, 124, 36],
    [84, 234, 124, 36],
    [232, 234, 124, 36],
    [84, 291, 124, 36],
    [232, 291, 124, 36]
  ];
  var WL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ'?";
  async function readRegion(worker, src, W, H, reg, vocab) {
    const sx = W / 440, sy = H / 440;
    const x = Math.round(reg[0] * sx), y = Math.round(reg[1] * sy);
    const w = Math.max(1, Math.round(reg[2] * sx)), h = Math.max(1, Math.round(reg[3] * sy));
    const f = Math.max(3, Math.round(160 / h));
    const c = document.createElement("canvas");
    c.width = w * f;
    c.height = h * f;
    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.imageSmoothingQuality = "high";
    cx.drawImage(src, x, y, w, h, 0, 0, c.width, c.height);
    const px = cx.getImageData(0, 0, c.width, c.height).data;
    let bright = 0;
    for (let i = 0; i < px.length; i += 16) {
      if (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2] > 110) bright++;
    }
    const ink = bright / (px.length / 16);
    preprocessCellCanvas(cx, c.width, c.height, "otsu", 0);
    const P = 30;
    const pad = document.createElement("canvas");
    pad.width = c.width + 2 * P;
    pad.height = c.height + 2 * P;
    const pc = pad.getContext("2d");
    pc.fillStyle = "#fff";
    pc.fillRect(0, 0, pad.width, pad.height);
    pc.drawImage(c, P, P);
    let best = { w: "", d: 99, amb: false };
    for (const psm of ["7", "6"]) {
      try {
        await worker.setParameters({ tessedit_char_whitelist: WL, tessedit_pageseg_mode: psm, user_defined_dpi: "300" });
        const { data } = await worker.recognize(pad);
        const r = matchWord(data.text, vocab);
        if (r.d < best.d || r.d === best.d && !r.amb && best.amb) best = r;
        if (best.d === 0 && !best.amb) break;
      } catch (_) {
      }
    }
    return { best, ink };
  }
  var isAcceptable = (best) => best.w && best.d <= Math.max(1, Math.floor((best.len || 1) * 0.34));
  async function wofReadImage(img, rules, onStatus = () => {
  }) {
    onStatus("Starting OCR engine\u2026");
    const worker = await ensureOCRWorker();
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const src = document.createElement("canvas");
    src.width = W;
    src.height = H;
    src.getContext("2d").drawImage(img, 0, 0);
    onStatus("Reading display and buttons\u2026");
    const dv = rules.displayWords.filter((w) => w !== BLANK);
    const [dr, ...btnReads] = await Promise.all([
      readRegion(worker, src, W, H, REG_DISP, dv),
      ...REG_BTN.map(async (reg) => readRegion(await ensureOCRWorker(), src, W, H, reg, rules.buttonLabels))
    ]);
    let disp, warnDisp;
    if (dr.ink < 0.012 && rules.displayWords.includes(BLANK)) {
      disp = BLANK;
      warnDisp = false;
    } else {
      const ok = isAcceptable(dr.best);
      disp = ok ? dr.best.w : "";
      warnDisp = !ok || dr.best.d > 0 || dr.best.amb;
    }
    const btns = [];
    const warnBtn = [];
    for (let i = 0; i < 6; i++) {
      const r = btnReads[i];
      const ok = isAcceptable(r.best);
      btns.push(ok ? r.best.w : "");
      warnBtn.push(!ok || r.best.d > 0 || r.best.amb);
    }
    return { disp, btns, warnDisp, warnBtn };
  }

  // src/modules/logic/logicSolver.js
  var logicSolver_exports = {};
  __export(logicSolver_exports, {
    GREEK_VARS: () => GREEK_VARS,
    STAGE_SYMBOLS: () => STAGE_SYMBOLS,
    classify: () => classify,
    detectStage: () => detectStage,
    evaluateExpression: () => evaluateExpression,
    extractGlyph: () => extractGlyph,
    fallbackTiles: () => fallbackTiles,
    findTiles: () => findTiles,
    groupRows: () => groupRows,
    isGreekGlyph: () => isGreekGlyph,
    labelComponents: () => labelComponents,
    lumaOf: () => lumaOf,
    measure: () => measure,
    parseManualText: () => parseManualText,
    readLogicGrid: () => readLogicGrid
  });
  var GREEK_VARS = ["\u03B1", "\u03B2", "\u03B3", "\u03B4"];
  var STAGE_SYMBOLS = ["\u03B1", "\u03B2", "\u03B3", "\u03B4", ""];
  function parseManualText(text) {
    const vars = {};
    const re = /\b([PQRST])\s*[:=]\s*(TRUE|FALSE|T|F|1|0)\b/gi;
    let m;
    while (m = re.exec(text)) {
      const val = m[2].toUpperCase();
      vars[m[1].toUpperCase()] = val === "T" || val === "TRUE" || val === "1";
    }
    return vars;
  }
  function evaluateExpression(src, greek, vars) {
    const s = src.replace(/=>|->/g, "\u2192").replace(/[!~]/g, "\xAC").replace(/[&∧]/g, "^").replace(/[|∨v]/g, "V").replace(/[pqrst]/g, (c) => c.toUpperCase()).replace(/ß/g, "\u03B2").replace(/\s+/g, "");
    let p = 0;
    const peek = () => s[p];
    function imp() {
      const a = or();
      if (peek() === "\u2192") {
        p++;
        const b = imp();
        return !a || b;
      }
      return a;
    }
    function or() {
      let a = and();
      while (peek() === "V") {
        p++;
        const b = and();
        a = a || b;
      }
      return a;
    }
    function and() {
      let a = not();
      while (peek() === "^") {
        p++;
        const b = not();
        a = a && b;
      }
      return a;
    }
    function not() {
      if (peek() === "\xAC") {
        p++;
        return !not();
      }
      return atom();
    }
    function atom() {
      const c = peek();
      if (c === "(") {
        p++;
        const v2 = imp();
        if (peek() !== ")") throw new Error("missing )");
        p++;
        return v2;
      }
      if (vars && c in vars) {
        p++;
        return vars[c];
      }
      if (GREEK_VARS.includes(c)) {
        p++;
        if (greek[c] === void 0) throw new Error(c + " not solved yet");
        return greek[c];
      }
      throw new Error(c ? 'unexpected "' + c + '"' : "incomplete");
    }
    if (!s) throw new Error("empty");
    const v = imp();
    if (p < s.length) throw new Error('unexpected "' + s[p] + '"');
    return v;
  }
  function lumaOf(d, w, h) {
    const L = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < L.length; i++, j += 4) {
      L[i] = (d[j] * 299 + d[j + 1] * 587 + d[j + 2] * 114) / 1e3;
    }
    return L;
  }
  function labelComponents(mask, w, h, diag) {
    const labels = new Int32Array(w * h), comps = [], stack = new Int32Array(w * h);
    for (let s = 0; s < w * h; s++) {
      if (!mask[s] || labels[s]) continue;
      const id = comps.length + 1;
      let sp = 0;
      stack[sp++] = s;
      labels[s] = id;
      let x0 = w, y0 = h, x1 = -1, y1 = -1, area = 0, sx = 0, sy = 0;
      while (sp) {
        const p = stack[--sp], x = p % w, y = p / w | 0;
        area++;
        sx += x;
        sy += y;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          if (!diag && dx && dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (mask[q] && !labels[q]) {
            labels[q] = id;
            stack[sp++] = q;
          }
        }
      }
      comps.push({ id, x0, y0, x1, y1, area, cx: sx / area, cy: sy / area });
    }
    return { labels, comps };
  }
  function findTiles(L, w, h) {
    const n = w * h, hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) hist[L[i]]++;
    let level = -1;
    for (let v = 0; v < 256; v++) {
      const c = (hist[v - 1] || 0) + hist[v] + (hist[v + 1] || 0);
      if (c > 0.03 * n) {
        level = v;
        break;
      }
    }
    if (level < 0) return null;
    const mask = new Uint8Array(n);
    for (let i = 0; i < n; i++) mask[i] = Math.abs(L[i] - level) <= 7 ? 1 : 0;
    const { comps } = labelComponents(mask, w, h, false), m = Math.min(w, h);
    let cand = comps.filter((c) => {
      const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1, ar = bw / bh;
      return bw >= 0.05 * m && bh >= 0.05 * m && bw <= 0.35 * m && bh <= 0.35 * m && ar > 0.6 && ar < 1.6 && c.area >= 0.55 * bw * bh;
    });
    if (cand.length < 6) return null;
    const med2 = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1];
    const mw = med2(cand.map((c) => c.x1 - c.x0 + 1)), mh = med2(cand.map((c) => c.y1 - c.y0 + 1));
    cand = cand.filter((c) => Math.abs(c.x1 - c.x0 + 1 - mw) <= 0.2 * mw && Math.abs(c.y1 - c.y0 + 1 - mh) <= 0.2 * mh);
    if (cand.length < 6) return null;
    return { level, tiles: cand.map((c) => ({ x: c.x0, y: c.y0, w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1 })) };
  }
  function fallbackTiles(w, h) {
    const gx0 = 0.13 * w, gx1 = 0.866 * w, gy0 = 0.253 * h, gy1 = 0.631 * h, cw = (gx1 - gx0) / 5, ch = (gy1 - gy0) / 3, t = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      t.push({ x: Math.round(gx0 + c * cw), y: Math.round(gy0 + r * ch), w: Math.round(cw), h: Math.round(ch) });
    }
    return t;
  }
  function groupRows(tiles) {
    const ts = tiles.slice().sort((a, b) => a.y - b.y), th = ts[0].h, rows = [];
    for (const t of ts) {
      const cy = t.y + t.h / 2, row = rows.find((r) => Math.abs(r.cy - cy) < 0.5 * th);
      if (row) {
        row.t.push(t);
        row.cy = (row.cy * (row.t.length - 1) + cy) / row.t.length;
      } else rows.push({ cy, t: [t] });
    }
    rows.sort((a, b) => a.cy - b.cy);
    rows.forEach((r) => r.t.sort((a, b) => a.x - b.x));
    return rows.map((r) => r.t);
  }
  function extractGlyph(L, w, tile, thr, range = null) {
    const ix = Math.round(tile.w * 0.06), iy = Math.round(tile.h * 0.06);
    const x0 = tile.x + ix, y0 = tile.y + iy, tw = tile.w - 2 * ix, th = tile.h - 2 * iy;
    const m = new Uint8Array(tw * th);
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) m[y * tw + x] = L[(y0 + y) * w + x0 + x] > thr ? 1 : 0;
    const { labels, comps } = labelComponents(m, tw, th, true);
    if (!comps.length) return null;
    const big = Math.max(...comps.map((c) => c.area));
    const keep = new Set(comps.filter((c) => c.area >= Math.max(6, 0.03 * big)).map((c) => c.id));
    let bx0 = tw, by0 = th, bx1 = -1, by1 = -1, area = 0;
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) if (keep.has(labels[y * tw + x])) {
      area++;
      if (x < bx0) bx0 = x;
      if (x > bx1) bx1 = x;
      if (y < by0) by0 = y;
      if (y > by1) by1 = y;
    }
    if (area < 5e-3 * tw * th) return null;
    const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1, g = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (keep.has(labels[(by0 + y) * tw + bx0 + x])) g[y * bw + x] = 1;
    let bright = NaN;
    if (range && range.gmax > range.level) {
      const hist = new Uint32Array(256);
      let n = 0;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (g[y * bw + x]) {
        hist[L[(y0 + by0 + y) * w + x0 + bx0 + x]]++;
        n++;
      }
      let acc = 0, p90 = 255;
      for (let v = 0; v < 256; v++) {
        acc += hist[v];
        if (acc >= 0.9 * n) {
          p90 = v;
          break;
        }
      }
      bright = (p90 - range.level) / (range.gmax - range.level);
    }
    return { mask: g, w: bw, h: bh, area, tileW: tile.w, tileH: tile.h, bright };
  }
  function measure(g) {
    const { mask: m, w, h, area } = g;
    const reg = (xa, xb, ya, yb) => {
      const X0 = Math.floor(xa * w), X1 = Math.max(X0 + 1, Math.ceil(xb * w)), Y0 = Math.floor(ya * h), Y1 = Math.max(Y0 + 1, Math.ceil(yb * h));
      let c = 0;
      for (let y = Y0; y < Math.min(Y1, h); y++) for (let x = X0; x < Math.min(X1, w); x++) c += m[y * w + x];
      return c / area;
    };
    const meanX = (ya, yb) => {
      let s = 0, c = 0;
      for (let y = Math.floor(ya * h); y < Math.max(Math.floor(ya * h) + 1, Math.ceil(yb * h)); y++)
        for (let x = 0; x < w; x++) if (m[y * w + x]) {
          s += x;
          c++;
        }
      return c ? s / c / w : 0.5;
    };
    const iou = (f) => {
      let i = 0, u = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const a = m[y * w + x], b = m[f(x, y)];
        if (a && b) i++;
        if (a || b) u++;
      }
      return u ? i / u : 0;
    };
    const W = w + 2, H = h + 2, bg = new Uint8Array(W * H).fill(1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) bg[(y + 1) * W + x + 1] = 0;
    const { comps } = labelComponents(bg, W, H, false);
    const holes2 = comps.filter((c) => c.x0 > 0 && c.y0 > 0 && c.x1 < W - 1 && c.y1 < H - 1 && c.area >= Math.max(4, 0.012 * w * h));
    const big = holes2.slice().sort((a, b) => b.area - a.area)[0];
    let leftRows = 0;
    const lw = Math.max(1, Math.round(0.14 * w));
    for (let y = 0; y < h; y++) {
      let hit = 0;
      for (let x = 0; x < lw; x++) hit |= m[y * w + x];
      leftRows += hit;
    }
    let stem = 0;
    for (let x = 0; x < Math.max(1, Math.ceil(0.4 * w)); x++) {
      let c = 0;
      for (let y = 0; y < h; y++) c += m[y * w + x];
      if (c / h > stem) stem = c / h;
    }
    const runs = [];
    for (let y = 0; y < h; y++) {
      let r = 0;
      for (let x = 0; x <= w; x++) {
        if (x < w && m[y * w + x]) r++;
        else if (r) {
          runs.push(r);
          r = 0;
        }
      }
    }
    for (let x = 0; x < w; x++) {
      let r = 0;
      for (let y = 0; y <= h; y++) {
        if (y < h && m[y * w + x]) r++;
        else if (r) {
          runs.push(r);
          r = 0;
        }
      }
    }
    runs.sort((a, b) => a - b);
    const stroke = runs.length ? runs[runs.length >> 1] / g.tileH : NaN;
    return {
      stem,
      stroke,
      bright: g.bright,
      w,
      h,
      aspect: w / h,
      hRel: h / g.tileH,
      holes: holes2.length,
      holeCy: big ? (big.cy - 1) / h : -1,
      TL: reg(0, 0.3, 0, 0.3),
      TC: reg(0.3, 0.7, 0, 0.3),
      TR: reg(0.7, 1, 0, 0.3),
      BL: reg(0, 0.3, 0.7, 1),
      BC: reg(0.3, 0.7, 0.7, 1),
      BR: reg(0.7, 1, 0.7, 1),
      ML: reg(0, 0.3, 0.3, 0.7),
      BRq: reg(0.55, 1, 0.6, 1),
      topCover: (() => {
        let c = 0;
        const y1 = Math.max(1, Math.round(0.18 * h));
        for (let x = 0; x < w; x++) {
          let k = 0;
          for (let y = 0; y < y1; y++) k |= m[y * w + x];
          c += k;
        }
        return c / w;
      })(),
      endsX: (meanX(0, 0.2) + meanX(0.8, 1)) / 2,
      midX: meanX(0.35, 0.65),
      lr: iou((x, y) => y * w + (w - 1 - x)),
      rot: iou((x, y) => (h - 1 - y) * w + (w - 1 - x)),
      leftEdge: leftRows / h
    };
  }
  var TALL = 0.71;
  var SHORT = 0.5;
  var BRACKET = 0.68;
  function isGreekGlyph(f) {
    if (!Number.isFinite(f.bright)) return null;
    const thin = Number.isFinite(f.stroke) && f.stroke < 0.125;
    if (f.bright < 0.88) return true;
    if (f.bright > 0.97) return false;
    return thin;
  }
  function classify(f) {
    const greek = isGreekGlyph(f);
    if (greek !== null && !(f.holes === 0 && f.hRel < SHORT) && !(f.holes === 0 && f.aspect < 0.62 && f.hRel > BRACKET)) {
      const twoArms = f.TL > 0.07 && f.TR > 0.05 && f.TC < 0.08;
      if (greek) {
        if (f.holes === 0) return twoArms ? "\u03B3" : f.aspect < 0.72 ? "\u03B2" : "?";
        if (f.holes >= 2) return "\u03B2";
        if (f.holeCy > 0.6) return twoArms ? "\u03B3" : "\u03B4";
        return f.aspect >= 0.8 ? "\u03B1" : "\u03B2";
      }
      if (f.holes === 0) return f.lr > f.rot + 0.1 ? "T" : "S";
      if (f.stem < 0.85) return "Q";
      return f.BRq > 0.09 ? "R" : "P";
    }
    const vPat = f.TL > 0.08 && f.TR > 0.08 && f.TC < 0.07 && f.BC > 0.12 && f.BL < 0.07 && f.BR < 0.07;
    const aPat = f.BL > 0.08 && f.BR > 0.08 && f.BC < 0.07 && f.TC > 0.12 && f.TL < 0.07 && f.TR < 0.07;
    if (f.holes === 0) {
      if (f.aspect < 0.62 && f.hRel > (greek === null ? 0.45 : BRACKET)) return f.midX < f.endsX ? "(" : ")";
      if (f.hRel < SHORT) {
        if (vPat) return "V";
        if (aPat) return "^";
        if (f.topCover > 0.7 && f.BR > f.BL + 0.05) return "\xAC";
        if (f.aspect > 1.5 && f.ML > 0.12 && f.TL < 0.06 && f.BL < 0.06) return "\u2192";
        return "?";
      }
      if ((f.hRel >= 0.48 || f.BL > 0.08) && f.TL > 0.07 && f.TR > 0.05 && f.TC < 0.08) return "\u03B3";
      if (f.lr > 0.78 && f.topCover > 0.7) return "T";
      if (f.rot > 0.45) return "S";
      return "?";
    }
    if (f.holes >= 2) return "\u03B2";
    if (f.holeCy > 0.6) return "\u03B4";
    if (f.hRel < SHORT && f.aspect >= 0.8) return "\u03B1";
    if (f.stem < 0.85) return f.aspect < 0.72 && f.leftEdge < 0.6 ? "\u03B2" : "Q";
    if (f.hRel > TALL) return "\u03B2";
    return f.BRq > 0.09 ? "R" : "P";
  }
  function readLogicGrid(data, w, h) {
    const L = lumaOf(data, w, h);
    const found = findTiles(L, w, h);
    const tiles = found ? found.tiles : fallbackTiles(w, h);
    const level = found ? found.level : (() => {
      let m = 255;
      for (const t of tiles) m = Math.min(m, L[(t.y + 3) * w + t.x + 3]);
      return m;
    })();
    const hist = new Uint32Array(256);
    let tot = 0;
    for (const t of tiles) for (let y = t.y + 3; y < t.y + t.h - 3; y++) for (let x = t.x + 3; x < t.x + t.w - 3; x++) {
      hist[L[y * w + x]]++;
      tot++;
    }
    let acc = 0, gmax = 255;
    for (let v = 255; v >= 0; v--) {
      acc += hist[v];
      if (acc >= 2e-3 * tot) {
        gmax = v;
        break;
      }
    }
    if (gmax - level < 50) return { rows: [], text: "", tilesFound: !!found };
    const thr = level + 0.4 * (gmax - level);
    const rows = groupRows(tiles).map((r) => r.map((t) => {
      const g = extractGlyph(L, w, t, thr, { level, gmax });
      if (!g) return null;
      const f = measure(g);
      let sym = classify(f);
      if (sym === "?" && Number.isFinite(g.bright)) {
        const peak = level + g.bright * (gmax - level);
        for (const k of [0.6, 0.75]) {
          const g2 = extractGlyph(L, w, t, level + k * (peak - level), { level, gmax });
          if (!g2) continue;
          const f2 = measure(g2);
          f2.bright = f.bright;
          const s2 = classify(f2);
          if (s2 !== "?") return { sym: s2, f: f2 };
        }
      }
      return { sym, f };
    }));
    const text = rows.map((r) => r.filter(Boolean).map((c) => c.sym).join("")).join("");
    return { rows, text, tilesFound: !!found };
  }
  function detectStage(data, w, h) {
    let sx = 0, sy = 0, n = 0;
    for (let y = Math.floor(0.75 * h); y < Math.floor(0.95 * h); y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 180 && g > 140 && b < 150 && r - b > 60) {
        sx += x;
        sy += y;
        n++;
      }
    }
    if (!n) return { idx: 0, count: 0 };
    const cx = sx / n, cy = Math.round(sy / n), px = (x, y) => {
      const i = (y * w + x) * 4;
      return (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1e3;
    };
    const panel = px(Math.round(cx), Math.max(0, cy - Math.round(0.06 * h)));
    const runs = [];
    let start = -1, last = -9;
    for (let x = Math.floor(0.1 * w); x < Math.floor(0.9 * w); x++) {
      const dot = Math.abs(px(x, cy) - panel) > 6;
      if (dot) {
        if (start < 0) start = x;
        last = x;
      } else if (start >= 0 && x - last > 3) {
        runs.push([start, last]);
        start = -1;
      }
    }
    if (start >= 0) runs.push([start, last]);
    const dots = runs.filter((r) => r[1] - r[0] >= 0.012 * w);
    if (dots.length >= 2) {
      let idx = 0, best = 1e9;
      dots.forEach((r, i) => {
        const d = Math.abs((r[0] + r[1]) / 2 - cx);
        if (d < best) {
          best = d;
          idx = i;
        }
      });
      return { idx, count: dots.length };
    }
    return { idx: Math.max(0, Math.round((cx / w - 0.396) / 0.0507)), count: 0 };
  }

  // src/modules/complexwires/complexwiresConstants.js
  var complexwiresConstants_exports = {};
  __export(complexwiresConstants_exports, {
    CW_LETTERS: () => CW_LETTERS,
    CW_PRESETS: () => CW_PRESETS,
    CW_REGIONS: () => CW_REGIONS,
    cwKey: () => cwKey,
    cwRuleFor: () => cwRuleFor
  });
  var CW_LETTERS = ["C", "D", "S", "P", "B"];
  var CW_REGIONS = [
    ["Star+LED", 196, 109],
    ["Red+LED", 357, 115],
    ["Red", 445, 85],
    ["Red+Star+LED", 252, 164],
    ["Star", 93, 212],
    ["Red+Blue+LED", 466, 214],
    ["Red+Star", 137, 295],
    ["Red+Blue+Star+LED", 333, 304],
    ["Blue+LED", 510, 305],
    ["Red+Blue+Star", 190, 370],
    ["LED", 552, 395],
    ["Red+Blue", 143, 436],
    ["Blue+Star+LED", 419, 430],
    ["Blue+Star", 330, 479],
    ["Blue", 258, 538],
    ["None", 659, 571]
  ].map(([id, x, y]) => ({ id, label: id === "None" ? "No features" : id.replace(/\+/g, " + ") }));
  var CW_PRESETS = {
    preset1: { None: "P", Red: "S", Blue: "D", Star: "B", LED: "B", "Red+Blue": "C", "Red+Star": "C", "Red+LED": "D", "Blue+Star": "B", "Blue+LED": "P", "Star+LED": "S", "Red+Blue+Star": "S", "Red+Blue+LED": "S", "Red+Star+LED": "P", "Blue+Star+LED": "C", "Red+Blue+Star+LED": "D" },
    preset2: { None: "D", Red: "D", Blue: "S", Star: "C", LED: "P", "Red+Blue": "C", "Red+Star": "C", "Red+LED": "P", "Blue+Star": "B", "Blue+LED": "S", "Star+LED": "S", "Red+Blue+Star": "B", "Red+Blue+LED": "B", "Red+Star+LED": "S", "Blue+Star+LED": "D", "Red+Blue+Star+LED": "P" },
    preset3: { None: "C", Red: "P", Blue: "C", Star: "D", LED: "P", "Red+Blue": "C", "Red+Star": "S", "Red+LED": "B", "Blue+Star": "S", "Blue+LED": "P", "Star+LED": "P", "Red+Blue+Star": "S", "Red+Blue+LED": "D", "Red+Star+LED": "S", "Blue+Star+LED": "B", "Red+Blue+Star+LED": "B" },
    preset4: { None: "S", Red: "D", Blue: "S", Star: "D", LED: "B", "Red+Blue": "S", "Red+Star": "P", "Red+LED": "D", "Blue+Star": "B", "Blue+LED": "P", "Star+LED": "S", "Red+Blue+Star": "C", "Red+Blue+LED": "C", "Red+Star+LED": "P", "Blue+Star+LED": "P", "Red+Blue+Star+LED": "C" }
  };
  var cwKey = (w) => {
    const p = [];
    if (w.color === "red" || w.color === "striped") p.push("Red");
    if (w.color === "blue" || w.color === "striped") p.push("Blue");
    if (w.star) p.push("Star");
    if (w.led) p.push("LED");
    return p.length ? p.join("+") : "None";
  };
  function cwRuleFor(letter, edge) {
    switch (letter) {
      case "C":
        return { cut: true, why: "Rule C: always CUT" };
      case "D":
        return { cut: false, why: "Rule D: never cut \u2192 LEAVE" };
      case "S":
        return { cut: edge.even, why: "Rule S: last serial digit is " + (edge.even ? "even \u2192 CUT" : "odd \u2192 LEAVE") };
      case "P":
        return { cut: edge.needy, why: "Rule P: needy module " + (edge.needy ? "present \u2192 CUT" : "not present \u2192 LEAVE") };
      case "B":
        return { cut: edge.gte5, why: "Rule B: " + (edge.gte5 ? "5 or more modules \u2192 CUT" : "fewer than 5 modules \u2192 LEAVE") };
      default:
        return { cut: false, why: "Unknown rule letter \u201C" + letter + "\u201D" };
    }
  }

  // src/modules/complexwires/complexwiresVision.js
  var complexwiresVision_exports = {};
  __export(complexwiresVision_exports, {
    CW_GLYPHS: () => CW_GLYPHS,
    CW_REGION_POS: () => CW_REGION_POS,
    cwReadDiagramImage: () => cwReadDiagramImage,
    cwReadDiagramPixels: () => cwReadDiagramPixels,
    cwReadWires: () => cwReadWires,
    cwReadWiresImage: () => cwReadWiresImage
  });
  var CW_REGION_POS = {
    "Star+LED": [196, 109],
    "Red+LED": [357, 115],
    Red: [445, 85],
    "Red+Star+LED": [252, 164],
    Star: [93, 212],
    "Red+Blue+LED": [466, 214],
    "Red+Star": [137, 295],
    "Red+Blue+Star+LED": [333, 304],
    "Blue+LED": [510, 305],
    "Red+Blue+Star": [190, 370],
    LED: [552, 395],
    "Red+Blue": [143, 436],
    "Blue+Star+LED": [419, 430],
    "Blue+Star": [330, 479],
    Blue: [258, 538],
    None: [659, 571]
  };
  var CW_GLYPHS = {
    C: [8162, 32766, 131070, 261758, 258078, 516111, 516103, 1040387, 1040384, 1032192, 1032192, 1032192, 1032192, 1032192, 1032192, 1032192, 516096, 516098, 516103, 260111, 261758, 131070, 32760, 8176],
    D: [1048448, 524272, 262136, 262140, 254206, 254078, 254015, 254015, 253983, 253983, 253983, 253983, 253983, 253983, 253983, 253983, 254015, 254078, 254206, 254974, 262140, 262136, 262112, 262016],
    S: [12, 32732, 131068, 524284, 516606, 1040446, 1040414, 1040398, 1044480, 523264, 262016, 262112, 65532, 16380, 8190, 1023, 511, 127, 917567, 983103, 1044735, 262140, 131064, 32736],
    P: [1048544, 1048568, 524284, 258558, 258175, 258111, 258111, 258079, 258111, 258111, 258175, 258558, 262140, 262136, 262080, 258048, 258048, 258048, 258048, 258048, 253952, 253952, 245760, 196608],
    B: [1048544, 524280, 262140, 258556, 258302, 258174, 258174, 258174, 258300, 258556, 262136, 262136, 262140, 258302, 258175, 258111, 258111, 258079, 258111, 258175, 258559, 262142, 262140, 131040]
  };
  function cwReadDiagramPixels(img, W, H) {
    const d = img.data, bin = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      if (r * 0.299 + g * 0.587 + b * 0.114 < 85 && Math.max(r, g, b) < 110) bin[i] = 1;
    }
    const seen = new Uint8Array(W * H), stack = new Int32Array(W * H * 2), blobs = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (bin[p] !== 1 || seen[p]) continue;
      let sp = 0, rp = 0;
      stack[sp++] = x;
      stack[sp++] = y;
      seen[p] = 1;
      let minX = x, maxX = x, minY = y, maxY = y, n = 0, sx = 0, sy = 0;
      while (rp < sp) {
        const cx = stack[rp++], cy = stack[rp++];
        n++;
        sx += cx;
        sy += cy;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        const nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
        for (const [nx, ny] of nb) {
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          const q = ny * W + nx;
          if (bin[q] === 1 && !seen[q]) {
            seen[q] = 1;
            stack[sp++] = nx;
            stack[sp++] = ny;
          }
        }
      }
      const w = maxX - minX + 1, h = maxY - minY + 1;
      if (w >= 5 && w <= 70 && h >= 8 && h <= 70 && n >= 25 && n <= 1500) blobs.push({ minX, minY, maxX, maxY, w, h, cx: sx / n, cy: sy / n });
    }
    return blobs.map((b) => {
      const cell = new Uint8Array(480);
      for (let r = 0; r < 24; r++) {
        const yy = Math.min(b.maxY, b.minY + Math.floor(r * b.h / 24));
        for (let c = 0; c < 20; c++) {
          const xx = Math.min(b.maxX, b.minX + Math.floor(c * b.w / 20));
          cell[r * 20 + c] = bin[yy * W + xx];
        }
      }
      let letter = "C", best = -1;
      for (const [L, rows] of Object.entries(CW_GLYPHS)) {
        let sc = 0, tot = 0;
        for (let r = 0; r < 24; r++) for (let c = 0; c < 20; c++) {
          const t = rows[r] >>> 19 - c & 1, v = cell[r * 20 + c];
          if (t === 1 && v === 1) sc += 2;
          else if (t === v) sc += 1;
          tot += 2;
        }
        const s = sc / tot;
        if (s > best) {
          best = s;
          letter = L;
        }
      }
      return { nx: b.cx / W, ny: b.cy / H, letter, score: best };
    });
  }
  function cwReadDiagramImage(im) {
    const W = 710, H = Math.max(1, Math.round(im.naturalHeight * (W / im.naturalWidth)));
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#fff";
    g.fillRect(0, 0, W, H);
    g.drawImage(im, 0, 0, W, H);
    const glyphs = cwReadDiagramPixels(g.getImageData(0, 0, W, H), W, H);
    if (glyphs.length < 8) {
      return { error: `Only ${glyphs.length} letters found \u2014 crop the screenshot to just the Venn diagram, or pick a preset.` };
    }
    const rules = {}, unsure = /* @__PURE__ */ new Set();
    for (const [id, [x, y]] of Object.entries(CW_REGION_POS)) {
      const nx = x / 710, ny = y / 640;
      let best = null, bd = 1e9;
      for (const gl of glyphs) {
        const dd = Math.hypot(gl.nx - nx, gl.ny - ny);
        if (dd < bd) {
          bd = dd;
          best = gl;
        }
      }
      rules[id] = best ? best.letter : "C";
      if (!best || bd > 0.1 || best.score < 0.75) unsure.add(id);
    }
    return { rules, unsure, count: glyphs.length };
  }
  function cwReadWires(img) {
    const { data, width: W, height: H } = img;
    const at = (x, y) => {
      const i = (y * W + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const isRed = (r, g, b) => r > 170 && g < 120 && b < 120;
    const isBlue = (r, g, b) => b > 170 && r < 120 && b - r > 90;
    const isWhite = (r, g, b) => r > 215 && g > 215 && b > 215;
    const isYellow2 = (r, g, b) => r > 200 && g > 170 && b < 175 && r - b > 60;
    const yA = Math.round(H * 0.42), yB = Math.round(H * 0.66), rows = yB - yA;
    const xA = Math.round(W * 0.08), xB = Math.round(W * 0.92);
    const hits = new Array(W).fill(0);
    for (let x = xA; x < xB; x++) for (let y = yA; y < yB; y++) {
      const [r, g, b] = at(x, y);
      if (isRed(r, g, b) || isBlue(r, g, b) || isWhite(r, g, b)) hits[x]++;
    }
    const cols = [];
    let cur = null, gap = 0;
    for (let x = xA; x < xB; x++) {
      if (hits[x] > rows * 0.12) {
        if (!cur) cur = { x0: x, x1: x };
        cur.x1 = x;
        gap = 0;
      } else if (cur && ++gap > 3) {
        if (cur.x1 - cur.x0 >= W * 0.012) cols.push(cur);
        cur = null;
        gap = 0;
      }
    }
    if (cur && cur.x1 - cur.x0 >= W * 0.012) cols.push(cur);
    const yellowIn = (xc, ya, yb) => {
      let n = 0;
      for (let x = Math.max(0, Math.round(xc - W * 0.05)); x <= Math.min(W - 1, xc + W * 0.05); x++) {
        for (let y = Math.round(H * ya); y < H * yb; y++) {
          const [r, g, b] = at(x, y);
          if (isYellow2(r, g, b)) n++;
        }
      }
      return n > W * H * 15e-5;
    };
    return cols.map((c) => {
      let nr = 0, nb = 0, nw = 0;
      for (let x = c.x0; x <= c.x1; x++) for (let y = yA; y < yB; y++) {
        const [r, g, b] = at(x, y);
        if (isRed(r, g, b)) nr++;
        else if (isBlue(r, g, b)) nb++;
        else if (isWhite(r, g, b)) nw++;
      }
      const tot = nr + nb + nw, color = nr > tot * 0.15 && nb > tot * 0.15 ? "striped" : nr > nb && nr > nw ? "red" : nb > nw ? "blue" : "white";
      const xc = Math.round((c.x0 + c.x1) / 2);
      return { active: true, color, led: yellowIn(xc, 0.18, 0.34), star: yellowIn(xc, 0.75, 0.9) };
    });
  }
  function cwReadWiresImage(im) {
    const cv = document.createElement("canvas");
    cv.width = im.naturalWidth;
    cv.height = im.naturalHeight;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    return cwReadWires(g.getImageData(0, 0, cv.width, cv.height)).slice(0, 6);
  }

  // src/modules/symbols/symbolsConstants.js
  var symbolsConstants_exports = {};
  __export(symbolsConstants_exports, {
    SY: () => SY,
    SY_KEYS: () => SY_KEYS,
    SY_RANK_COLORS: () => SY_RANK_COLORS
  });
  var SY = {
    OMEGA: { name: "Omega", glyph: "\u03A9" },
    YAT: { name: "Yat", glyph: "\u0462" },
    COPYRIGHT: { name: "Copyright", glyph: "\xA9" },
    PSI: { name: "Psi", glyph: "\u03A8" },
    STAR_HOLLOW: { name: "White Star", glyph: "\u2606" },
    STAR_SOLID: { name: "Black Star", glyph: "\u2605" },
    ZHE: { name: "Zhe", glyph: "\u0416" },
    KOPPA: { name: "Koppa", glyph: "\u03D8" },
    INV_QUESTION: { name: "Inverted ?", glyph: "\xBF" },
    LAMBDA_STROKE: { name: "Lambda Stroke", glyph: "\u019B" },
    OT: { name: "Ot (C-Q)", glyph: "\u047E" },
    DOUBLE_CROSS: { name: "Double Cross", glyph: "\u0482" }
  };
  var SY_KEYS = Object.keys(SY);
  var SY_RANK_COLORS = ["#E5B84B", "#4CAF50", "#42A5F5", "#E57373"];

  // src/modules/symbols/symbolsVision.js
  var symbolsVision_exports = {};
  __export(symbolsVision_exports, {
    SY_BITMAPS: () => SY_BITMAPS,
    syClassify: () => syClassify,
    syLayoutPanels: () => syLayoutPanels,
    syReadBox: () => syReadBox,
    syReadGrids: () => syReadGrids,
    syReadModule: () => syReadModule,
    syReadPanels: () => syReadPanels
  });
  var SY_BITMAPS = {
    OMEGA: [0, 1584, 6172, 12302, 12294, 24582, 24582, 24582, 24582, 12294, 12300, 7192, 512, 16384, 32318, 0],
    YAT: [0, 8064, 8064, 1536, 32704, 26208, 18016, 1536, 1912, 1564, 1564, 1548, 1564, 1564, 8184, 0],
    COPYRIGHT: [0, 448, 1040, 2056, 9190, 9762, 17440, 19456, 19456, 19456, 17442, 9762, 12772, 2056, 1584, 0],
    LAMBDA_STROKE: [0, 2048, 15872, 13056, 1792, 3328, 2304, 768, 896, 1664, 3264, 3136, 6240, 6180, 12348, 0],
    OT: [0, 2884, 7292, 14590, 31182, 29134, 29062, 29062, 25030, 29126, 29134, 14830, 14590, 7420, 1650, 0],
    PSI: [0, 992, 12482, 12482, 12486, 12486, 12486, 12486, 6342, 3276, 992, 192, 192, 192, 0, 0],
    DOUBLE_CROSS: [0, 32, 568, 1912, 4080, 1008, 508, 12796, 15260, 32640, 7936, 4064, 4064, 7904, 7168, 0],
    STAR_SOLID: [0, 128, 128, 128, 448, 448, 32766, 8188, 4088, 2032, 2032, 2032, 1584, 1040, 0, 0],
    STAR_HOLLOW: [0, 128, 128, 0, 320, 0, 32318, 4, 2056, 1040, 1040, 1168, 544, 1040, 0, 0],
    ZHE: [0, 0, 31726, 2176, 144, 1168, 1184, 2016, 1168, 3224, 6284, 12740, 6, 2, 0, 0],
    KOPPA: [0, 448, 992, 1048, 3096, 2056, 6152, 6152, 2056, 3080, 1048, 1008, 192, 128, 128, 0],
    INV_QUESTION: [0, 128, 192, 128, 0, 128, 128, 128, 768, 1536, 1536, 3584, 3584, 1568, 864, 0]
  };
  var SY_TPL = {};
  for (const [k, rows] of Object.entries(SY_BITMAPS)) {
    const v = new Float32Array(256);
    let on = 0;
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        if (rows[r] & 1 << 15 - c) {
          v[r * 16 + c] = 1;
          on++;
        }
      }
    }
    const mean = on / 256;
    let ss = 0;
    for (let i = 0; i < 256; i++) {
      v[i] -= mean;
      ss += v[i] * v[i];
    }
    SY_TPL[k] = { vec: v, norm: Math.sqrt(ss) };
  }
  function syClassify(bits) {
    if (!bits || !bits.length || !bits[0] || !bits[0].length) {
      return { symbol: "?", score: 0 };
    }
    const H = bits.length, W = bits[0].length;
    let on = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (bits[y][x]) on++;
    const density = on / (H * W);
    const sc = Math.min(14 / W, 14 / H), tw = Math.max(1, Math.round(W * sc)), th = Math.max(1, Math.round(H * sc));
    const ox = Math.floor((16 - tw) / 2), oy = Math.floor((16 - th) / 2);
    const v = new Float32Array(256);
    let n = 0;
    for (let y = 0; y < th; y++) {
      const sy = Math.min(H - 1, Math.floor(y / sc));
      for (let x = 0; x < tw; x++) {
        const sx = Math.min(W - 1, Math.floor(x / sc));
        if (bits[sy][sx]) {
          v[(oy + y) * 16 + (ox + x)] = 1;
          n++;
        }
      }
    }
    const mean = n / 256;
    let ss = 0;
    for (let i = 0; i < 256; i++) {
      v[i] -= mean;
      ss += v[i] * v[i];
    }
    const norm = Math.sqrt(ss);
    if (norm === 0) return { symbol: "?", score: 0 };
    let best = "?", bs = -999;
    for (const [k, t] of Object.entries(SY_TPL)) {
      if (!t.norm) continue;
      let dot = 0;
      for (let i = 0; i < 256; i++) dot += v[i] * t.vec[i];
      const s = dot / (norm * t.norm);
      if (s > bs) {
        bs = s;
        best = k;
      }
    }
    if (best === "STAR_SOLID" || best === "STAR_HOLLOW") {
      best = density > 0.24 ? "STAR_SOLID" : "STAR_HOLLOW";
    }
    return { symbol: best, score: bs };
  }
  var syGray = (d, i) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  function syReadBox(img, x0, y0, w, h, margin, thresh, skip) {
    const { data, width: W } = img;
    let minX = w, maxX = -1, minY = h, maxY = -1;
    const ink = [];
    for (let y = 0; y < h; y++) {
      const row = new Uint8Array(w);
      for (let x = 0; x < w; x++) {
        if (y < margin || y >= h - margin || x < margin || x >= w - margin) continue;
        if (skip && skip(y, x)) continue;
        if (syGray(data, ((y0 + y) * W + (x0 + x)) * 4) < thresh) {
          row[x] = 1;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      ink.push(row);
    }
    if (maxX < minX || maxY < minY) return null;
    const cw = maxX - minX + 1, rows = [];
    for (let y = minY; y <= maxY; y++) rows.push(ink[y].slice(minX, maxX + 1));
    return syClassify(rows);
  }
  function syLayoutPanels(img) {
    const { data, width: W, height: H } = img;
    const isLight = (i) => syGray(data, i) > 150;
    const rowN = new Uint32Array(H);
    let maxN = 0;
    for (let y = 0; y < H; y++) {
      let n = 0;
      for (let x = 0; x < W; x++) if (isLight((y * W + x) * 4)) n++;
      rowN[y] = n;
      if (n > maxN) maxN = n;
    }
    const minSide = Math.max(40, Math.min(W, H) * 0.08);
    const rowThr = Math.max(minSide * 0.6, Math.min(W * 0.45, maxN * 0.4));
    const bands = [];
    for (let y = 0; y < H; ) {
      if (rowN[y] < rowThr) {
        y++;
        continue;
      }
      let y2 = y;
      while (y2 < H && (rowN[y2] >= rowThr || y2 + 2 < H && (rowN[y2 + 1] >= rowThr || rowN[y2 + 2] >= rowThr))) y2++;
      if (y2 - y >= minSide) bands.push({ y1: y, y2 });
      y = y2;
    }
    if (!bands.length) bands.push({ y1: 0, y2: H });
    const textIn = (y0, y1) => {
      y0 = Math.max(0, y0 + 2);
      y1 = Math.min(H, y1 - 2);
      if (y1 - y0 < 6) return false;
      let n = 0;
      for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, r = data[i], b = data[i + 2];
        if (syGray(data, i) > 120 || r > 150 && r - b > 60) n++;
      }
      return n >= Math.max(15, (y1 - y0) * W * 2e-3);
    };
    const headerAbove = bands.map((b, k) => textIn(k ? bands[k - 1].y2 : 0, b.y1));
    const hasHeader = headerAbove.some(Boolean) || bands[0].y1 >= Math.max(8, H * 0.03);
    const splitByHeaders = headerAbove.slice(1).some(Boolean);
    const rects = [];
    let group = 0;
    bands.forEach((b, k) => {
      if (k > 0 && (!splitByHeaders || headerAbove[k])) group++;
      const bh = b.y2 - b.y1;
      const colGap = Math.max(4, Math.round(bh * 0.06));
      const runs = [];
      let s = -1, last = -1;
      for (let x = 0; x < W; x++) {
        let n = 0;
        for (let y = b.y1; y < b.y2; y++) if (isLight((y * W + x) * 4)) n++;
        if (n > bh * 0.45) {
          if (s < 0) s = x;
          last = x;
        } else if (s >= 0 && x - last > colGap) {
          runs.push([s, last + 1]);
          s = -1;
        }
      }
      if (s >= 0) runs.push([s, last + 1]);
      if (!runs.length) runs.push([0, W]);
      for (const [x1, x2] of runs) {
        const pw = x2 - x1;
        const k2 = pw / bh > 1.6 ? Math.round(pw / bh) : 1;
        for (let q = 0; q < k2; q++) {
          const qx = Math.round(x1 + q * pw / k2), qw = Math.round(pw / k2);
          if (qw < minSide || qw / bh > 2.2 || bh / qw > 2.2) continue;
          rects.push({ x: qx, y: b.y1, w: qw, h: bh, group });
        }
      }
    });
    const used = [...new Set(rects.map((r) => r.group))].sort((a, b) => a - b);
    rects.forEach((r) => {
      r.group = used.indexOf(r.group);
    });
    return { rects, hasHeader, groups: used.length };
  }
  function syReadPanels(img) {
    const { rects, hasHeader, groups } = syLayoutPanels(img);
    const panels = [];
    for (const { x: x1, y: y1, w: pw, h: bh, group } of rects) {
      const cw = pw / 5, ch = bh / 5;
      const cells = [];
      const counts = {};
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const cx0 = Math.floor(x1 + c * cw), cx1 = Math.floor(x1 + (c + 1) * cw);
          const cy0 = Math.floor(y1 + r * ch), cy1 = Math.floor(y1 + (r + 1) * ch);
          const mg = Math.max(2, Math.round(Math.min(cw, ch) * 0.06));
          const res = syReadBox(img, cx0, cy0, cx1 - cx0, cy1 - cy0, mg, 110, null);
          const k = res && res.symbol !== "?" ? res.symbol : null;
          cells.push(k);
          if (k) counts[k] = (counts[k] || 0) + 1;
        }
      }
      if (cells.some(Boolean)) panels.push({ x: x1, y: y1, w: pw, h: bh, group, cells, counts });
    }
    return { panels, hasHeader, groups };
  }
  function syReadGrids(img) {
    const { panels } = syReadPanels(img);
    const counts = {};
    let cells = 0;
    for (const p of panels) {
      for (const k of p.cells) if (k) {
        counts[k] = (counts[k] || 0) + 1;
        cells++;
      }
    }
    return { counts, grids: panels.length, cells };
  }
  function syReadModule(img) {
    const { data, width: W, height: H } = img;
    const white = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (data[i * 4] > 195 && data[i * 4 + 1] > 195 && data[i * 4 + 2] > 195) white[i] = 1;
    }
    const seen = new Uint8Array(W * H), stack = new Int32Array(W * H * 2), tiles = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (!white[p] || seen[p]) continue;
        let sp = 0, rp = 0;
        stack[sp++] = x;
        stack[sp++] = y;
        seen[p] = 1;
        let minX = x, maxX = x, minY = y, maxY = y, n = 0, sx = 0, sy = 0;
        while (rp < sp) {
          const cx = stack[rp++], cy = stack[rp++];
          n++;
          sx += cx;
          sy += cy;
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;
          for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
            if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
            const q = ny * W + nx;
            if (white[q] && !seen[q]) {
              seen[q] = 1;
              stack[sp++] = nx;
              stack[sp++] = ny;
            }
          }
        }
        const bw = maxX - minX + 1, bh = maxY - minY + 1;
        if (n > 500 && bw >= 30 && bh >= 30 && bw <= W * 0.6 && bh <= H * 0.6) {
          tiles.push({ x: minX, y: minY, bw, bh, cx: sx / n, cy: sy / n });
        }
      }
    }
    if (tiles.length >= 4) {
      tiles.sort((a, b) => {
        const at = a.cy < H * 0.5, bt = b.cy < H * 0.5;
        return at !== bt ? at ? -1 : 1 : a.cx - b.cx;
      });
    }
    const out = [null, null, null, null];
    for (let i = 0; i < Math.min(4, tiles.length); i++) {
      const t = tiles[i], mh = Math.floor(t.bh * 0.32), mw = Math.floor(t.bw * 0.32);
      const mg = Math.max(4, Math.round(Math.min(t.bw, t.bh) * 0.12));
      const res = syReadBox(img, t.x, t.y, t.bw, t.bh, mg, 120, (y, x) => y < mh && x < mw);
      if (res && res.symbol !== "?") out[i] = res.symbol;
    }
    return { buttons: out, tiles: tiles.length };
  }

  // src/modules/button/buttonSolver.js
  var buttonSolver_exports = {};
  __export(buttonSolver_exports, {
    BUTTON_COLORS: () => BUTTON_COLORS,
    DEFAULT_LABELS: () => DEFAULT_LABELS,
    FACT_LABELS: () => FACT_LABELS,
    SAMPLE_CHECKLIST: () => SAMPLE_CHECKLIST,
    compileClause: () => compileClause,
    evaluateRules: () => evaluateRules,
    labelVocab: () => labelVocab,
    parseChecklist: () => parseChecklist,
    parseQuantity: () => parseQuantity
  });
  var BUTTON_COLORS = ["white", "blue", "yellow", "red", "green", "black", "purple", "orange"];
  var DEFAULT_LABELS = ["BLUE", "WHITE", "RED", "YELLOW", "GREEN", "HOLD", "PUNCH", "PRESS", "ABORT", "DETONATE", "TAP", "PURPLE", "ORANGE", "BLACK"];
  var SAMPLE_CHECKLIST = `Defuse 3 buttons in order. The physical color and written label are separate. Ask for both, plus the serial, total modules, non-needy modules, needy modules, and Button modules.

Use the first matching rule. Count from the top each time.

button is white and label says Blue: 3s
there is exactly 1 needy module, button is blue, and label says Hold: 11s
there are at least 2 needy modules, button is yellow, and label says Punch: 3s
rightmost serial digit is odd and button is white: 12s
serial digit sum is odd and label says Punch: 10s
serial repeats a character and button is white: 2s
serial has at least 2 vowels and button is green: 7s
serial has fewer than 2 vowels and label says Green: 4s
total module count is even and button is red: 6s
Otherwise: 7s

Serial: E1ZQGHV1`;
  var NUM_WORDS = { zero: 0, no: 0, none: 0, one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  var toNum = (t) => t in NUM_WORDS ? NUM_WORDS[t] : Number(t);
  var NUM = "(\\d+|zero|no|none|one|a|an|two|three|four|five|six|seven|eight|nine|ten)";
  function parseQuantity(text) {
    const t = text.trim().toLowerCase().replace(/^(?:is|are|equals?|=)\s+/, "");
    let m;
    if (/^odd\b/.test(t)) return { test: (n) => Math.abs(n) % 2 === 1, desc: "odd" };
    if (/^even\b/.test(t)) return { test: (n) => n % 2 === 0, desc: "even" };
    if (/^(?:any|some|at least one|a|an)$/.test(t)) return { test: (n) => n >= 1, desc: "\u2265 1" };
    if (m = t.match(new RegExp(`^(?:divisible by|a multiple of)\\s+${NUM}$`))) {
      const k = toNum(m[1]);
      return { test: (n) => k !== 0 && n % k === 0, desc: `multiple of ${k}` };
    }
    if ((m = t.match(new RegExp(`^(?:at least|no fewer than|no less than|minimum of)\\s+${NUM}$`))) || (m = t.match(new RegExp(`^${NUM}\\s+or\\s+more$`)))) {
      const k = toNum(m[1]);
      return { test: (n) => n >= k, desc: `\u2265 ${k}` };
    }
    if (m = t.match(new RegExp(`^(?:more than|greater than|over|above|higher than)\\s+${NUM}$`))) {
      const k = toNum(m[1]);
      return { test: (n) => n > k, desc: `> ${k}` };
    }
    if (m = t.match(new RegExp(`^(?:fewer than|less than|under|below|lower than)\\s+${NUM}$`))) {
      const k = toNum(m[1]);
      return { test: (n) => n < k, desc: `< ${k}` };
    }
    if ((m = t.match(new RegExp(`^(?:at most|no more than|maximum of)\\s+${NUM}$`))) || (m = t.match(new RegExp(`^${NUM}\\s+or\\s+(?:fewer|less)$`)))) {
      const k = toNum(m[1]);
      return { test: (n) => n <= k, desc: `\u2264 ${k}` };
    }
    if (m = t.match(new RegExp(`^(?:exactly|only|precisely)?\\s*${NUM}$`))) {
      const k = toNum(m[1]);
      return { test: (n) => n === k, desc: `= ${k}` };
    }
    if (m = t.match(new RegExp(`^not\\s+${NUM}$`))) {
      const k = toNum(m[1]);
      return { test: (n) => n !== k, desc: `\u2260 ${k}` };
    }
    return null;
  }
  var serialDigits = (s) => (s.match(/\d/g) || []).map(Number);
  var serialVowels = (s) => (s.toUpperCase().match(/[AEIOU]/g) || []).length;
  var serialConsonants = (s) => (s.toUpperCase().match(/[B-DF-HJ-NP-TV-Z]/g) || []).length;
  var serialLetters = (s) => (s.toUpperCase().match(/[A-Z]/g) || []).length;
  var hasRepeat = (s) => {
    const c = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return new Set(c).size !== c.length;
  };
  function charTest(what) {
    const w = what.toLowerCase().replace(/^(?:a|an|the)\s+/, "").trim();
    let m;
    if (/^(?:digit|number|numeral)$/.test(w)) return { desc: "a digit", test: (ch) => /[0-9]/.test(ch) };
    if (/^letter$/.test(w)) return { desc: "a letter", test: (ch) => /[A-Z]/.test(ch) };
    if (/^vowel$/.test(w)) return { desc: "a vowel", test: (ch) => /[AEIOU]/.test(ch) };
    if (/^consonant$/.test(w)) return { desc: "a consonant", test: (ch) => /[B-DF-HJ-NP-TV-Z]/.test(ch) };
    if (m = w.match(/^(odd|even)\s+(?:digit|number)$/)) {
      const odd = m[1] === "odd";
      return { desc: `an ${m[1]} digit`, test: (ch) => /[0-9]/.test(ch) && Number(ch) % 2 === 1 === odd };
    }
    if (m = w.match(/^(?:the\s+)?(?:letter|digit|character|number)?\s*([a-z0-9])$/)) {
      const want = m[1].toUpperCase();
      return { desc: want, test: (ch) => ch === want };
    }
    return null;
  }
  function countSubject(t) {
    if (/non[-\s]?needy/.test(t)) return "nonNeedy";
    if (/needy/.test(t)) return "needy";
    if (/button/.test(t)) return "buttonMods";
    if (/batter/.test(t)) return "batteries";
    if (/modules?|module count/.test(t)) return "total";
    return null;
  }
  var FACT_LABELS = {
    nonNeedy: "non-needy modules",
    needy: "needy modules",
    buttonMods: "Button modules",
    total: "total modules",
    batteries: "batteries"
  };
  function compileClause(raw) {
    const t = raw.trim().toLowerCase().replace(/[“”"']/g, "").replace(/\.$/, "").replace(/^(?:if|when)\s+/, "").replace(/^the\s+/, "");
    let m;
    if (!t) return null;
    if (/^(?:otherwise|else|default|any other case|in all other cases|none of the above)/.test(t)) {
      return { kind: "always", desc: "otherwise", eval: () => true };
    }
    const colorWord = (c) => BUTTON_COLORS.includes(String(c.label || "").toLowerCase());
    if (/^(?:button\s+)?label\b/.test(t) && /colou?r/.test(t)) {
      const differs = /\b(?:different|differs?|not\s+(?:the\s+)?(?:same|match)|doesn'?t\s+match|does\s+not\s+match|other\s+than|mismatch)/.test(t);
      const matches = /\b(?:match(?:es|ing)?|same|equals?|names?\s+the\s+button)/.test(t) && /button/.test(t);
      if (/button/.test(t) && (differs || matches)) {
        const needWord = /colou?r\s+word|is\s+a\s+colou?r/.test(t) || differs;
        return {
          kind: "labelColor",
          desc: differs ? "label is a colour \u2260 button colour" : "label = button colour",
          eval: (c) => {
            if (!c.label || !c.color) return null;
            const same = String(c.label).toLowerCase() === c.color;
            return differs ? (!needWord || colorWord(c)) && !same : same;
          }
        };
      }
      if ((m = t.match(/^(?:button\s+)?label\s+(?:is|says|reads)\s+(not\s+)?(?:a|an|any)\s+colou?r(?:\s+word|\s+name)?$/)) || (m = t.match(/^(?:button\s+)?label\s+(does\s+not|doesn'?t)\s+(?:name|say)\s+a\s+colou?r$/))) {
        const neg = !!m[1];
        return { kind: "labelColor", desc: neg ? "label is not a colour word" : "label is a colour word", eval: (c) => c.label ? colorWord(c) !== neg : null };
      }
    }
    if (m = t.match(/^button(?:'s)?\s+(?:colou?r\s+)?(?:is|=)\s+(not\s+)?(?:a\s+)?(\w+(?:(?:\s*,\s*|\s+or\s+|\s*,\s*or\s+)\w+)*)(?:\s+button)?$/)) {
      const neg = !!m[1], cols = m[2].split(/\s*,\s*(?:or\s+)?|\s+or\s+/).filter(Boolean);
      if (cols.every((col) => BUTTON_COLORS.includes(col) || /^\w+$/.test(col))) {
        return { kind: "color", desc: `button ${neg ? "\u2260" : "="} ${cols.join(" / ")}`, eval: (c) => c.color ? cols.includes(c.color) !== neg : null };
      }
    }
    if ((m = t.match(/^(\w+)\s+button$/)) && BUTTON_COLORS.includes(m[1])) {
      const col = m[1];
      return { kind: "color", desc: `button = ${col}`, eval: (c) => c.color ? c.color === col : null };
    }
    if (m = t.match(/^(?:button\s+)?(?:label|text|word)\s+(?:(does\s+not|doesnt|doesn't)\s+(?:say|read)|says|reads|is|=)\s+(not\s+)?(.+)$/)) {
      const neg = !!(m[1] || m[2]);
      const words = m[3].trim().toUpperCase().split(/\s*,\s*(?:OR\s+)?|\s+OR\s+/).filter(Boolean);
      const word = words[0];
      return { kind: "label", word, words, desc: `label ${neg ? "\u2260" : "="} ${words.join(" / ")}`, eval: (c) => c.label ? words.includes(c.label.toUpperCase()) !== neg : null };
    }
    if (m = t.match(/^(rightmost|last|final|leftmost|first|largest|highest|biggest|smallest|lowest)\s+(?:serial(?:\s+number)?\s+digit|digit\s+(?:of|in)\s+(?:the\s+)?serial(?:\s+number)?)\s+(?:is\s+)?(.+)$/)) {
      const pos = m[1], q = parseQuantity(m[2]);
      if (q) {
        const pick = (d) => /right|last|final/.test(pos) ? d[d.length - 1] : /left|first/.test(pos) ? d[0] : /large|high|big/.test(pos) ? Math.max(...d) : Math.min(...d);
        return { kind: "serial", desc: `${pos} serial digit ${q.desc}`, eval: (c) => {
          if (!c.serial) return null;
          const d = serialDigits(c.serial);
          return d.length ? q.test(pick(d)) : false;
        } };
      }
    }
    if (m = t.match(/^serial(?:\s+number)?\s+ends\s+(?:with|in)\s+(?:an?\s+)?(odd|even)(?:\s+(?:digit|number))?$/)) {
      const q = parseQuantity(m[1]);
      return { kind: "serial", desc: `last serial digit ${q.desc}`, eval: (c) => {
        if (!c.serial) return null;
        const d = serialDigits(c.serial);
        return d.length ? q.test(d[d.length - 1]) : false;
      } };
    }
    if ((m = t.match(/^serial(?:\s+number)?\s+(?:(starts|begins)|(ends))\s+(?:with|in)\s+(.+)$/)) || (m = t.match(/^(?:(first|leading)|(last|final))\s+(?:character|char|symbol)\s+(?:of|in)\s+(?:the\s+)?serial(?:\s+number)?\s+is\s+(.+)$/))) {
      const first = !!m[1], what = m[3].trim();
      const kindTest = charTest(what);
      if (kindTest) {
        return {
          kind: "serial",
          desc: `serial ${first ? "starts" : "ends"} with ${kindTest.desc}`,
          eval: (c) => {
            const s = (c.serial || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (!s) return null;
            return kindTest.test(first ? s[0] : s[s.length - 1]);
          }
        };
      }
    }
    if (m = t.match(/^(?:serial(?:\s+number)?\s+digit\s+sum|sum\s+of\s+(?:the\s+)?(?:serial(?:\s+number)?\s+)?digits(?:\s+(?:in|of)\s+(?:the\s+)?serial(?:\s+number)?)?)\s+(?:is\s+)?(.+)$/)) {
      const q = parseQuantity(m[1]);
      if (q) return { kind: "serial", desc: `serial digit sum ${q.desc}`, eval: (c) => c.serial ? q.test(serialDigits(c.serial).reduce((a, b) => a + b, 0)) : null };
    }
    if (/^serial(?:\s+number)?\s+(?:repeats\s+(?:a|any)\s+(?:character|letter|digit|symbol)|has\s+(?:a\s+|any\s+)?(?:repeated|repeating|duplicate|duplicated)\s+(?:character|letter|digit|symbol)s?|contains\s+(?:a\s+)?(?:repeated|duplicate)\s+(?:character|letter|digit)s?)$/.test(t)) {
      return { kind: "serial", desc: "serial repeats a character", eval: (c) => c.serial ? hasRepeat(c.serial) : null };
    }
    if (/^serial(?:\s+number)?\s+(?:does\s+not|doesnt|doesn't)\s+repeat\s+(?:a|any)\s+(?:character|letter|digit)s?$|^serial(?:\s+number)?\s+has\s+no\s+(?:repeated|repeating|duplicate)\s+(?:character|letter|digit)s?$/.test(t)) {
      return { kind: "serial", desc: "serial has no repeats", eval: (c) => c.serial ? !hasRepeat(c.serial) : null };
    }
    if (m = t.match(/^serial(?:\s+number)?\s+(?:has|contains|includes)\s+(.+?)\s+(vowels?|consonants?|letters?|digits?|numbers?)$/)) {
      const q = parseQuantity(m[1]), what = m[2];
      if (q) {
        const fn = /vowel/.test(what) ? serialVowels : /consonant/.test(what) ? serialConsonants : /letter/.test(what) ? serialLetters : (s) => serialDigits(s).length;
        return { kind: "serial", desc: `serial ${what.replace(/s$/, "")}s ${q.desc}`, eval: (c) => c.serial ? q.test(fn(c.serial)) : null };
      }
    }
    if (m = t.match(/^serial(?:\s+number)?\s+(?:does\s+not|doesnt|doesn't)\s+(?:have|contain)\s+(?:a|any)\s+vowels?$/)) {
      return { kind: "serial", desc: "serial vowels = 0", eval: (c) => c.serial ? serialVowels(c.serial) === 0 : null };
    }
    if (m = t.match(/^serial(?:\s+number)?\s+(?:contains|has|includes)\s+(?:the\s+)?(?:letter|character|digit|number)?\s*([a-z0-9])$/)) {
      const ch = m[1].toUpperCase();
      return { kind: "serial", desc: `serial contains ${ch}`, eval: (c) => c.serial ? c.serial.toUpperCase().includes(ch) : null };
    }
    if ((m = t.match(/^(?:this|it)\s+is\s+(not\s+)?(?:the\s+)?(?:button|stage)\s*(?:number\s+|no\.?\s*|#)?(\d+(?:(?:\s*,\s*(?:or\s+)?|\s+or\s+)\d+)*)$/)) || (m = t.match(/^(?:current\s+)?(?:button|stage)\s*(?:number|#)\s*(?:is\s+)?(not\s+)?(\d+(?:(?:\s*,\s*(?:or\s+)?|\s+or\s+)\d+)*)$/))) {
      const neg = !!m[1], ns = m[2].split(/\s*,\s*(?:or\s+)?|\s+or\s+/).map(Number);
      return { kind: "stage", desc: `button # ${neg ? "\u2260" : "="} ${ns.join(" / ")}`, eval: (c) => Number.isFinite(c.buttonNum) ? ns.includes(c.buttonNum) !== neg : null };
    }
    if (m = t.match(/^(?:this|it)\s+is\s+(not\s+)?(?:the\s+)?(first|second|third|fourth|fifth|last|final)\s+(?:button|stage)$/)) {
      const neg = !!m[1], w = m[2], ORD2 = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
      return {
        kind: "stage",
        desc: `button # ${neg ? "\u2260" : "="} ${w}`,
        eval: (c) => {
          if (!Number.isFinite(c.buttonNum)) return null;
          if (w in ORD2) return c.buttonNum === ORD2[w] !== neg;
          return Number.isFinite(c.buttonTotal) ? c.buttonNum === c.buttonTotal !== neg : null;
        }
      };
    }
    if (m = t.match(/^(?:(?:this|it)\s+is\s+(?:an?\s+)?(odd|even)[-\s]numbered\s+(?:button|stage)|(?:the\s+)?(?:button|stage)\s+number\s+is\s+(odd|even))$/)) {
      const q = parseQuantity(m[1] || m[2]);
      return { kind: "stage", desc: `button # ${q.desc}`, eval: (c) => Number.isFinite(c.buttonNum) ? q.test(c.buttonNum) : null };
    }
    if ((m = t.match(/^there\s+(?:is|are)\s+(.+?)\s+((?:non[-\s]?needy|needy|button|total|batter\w*)?\s*(?:modules?|batteries|battery)(?:\s+(?:on the bomb|in total))?)$/)) || (m = t.match(/^(no|zero|exactly\s+\S+|at least\s+\S+|at most\s+\S+|more than\s+\S+|fewer than\s+\S+|less than\s+\S+|\d+|\S+\s+or\s+(?:more|fewer|less))\s+((?:non[-\s]?needy|needy|button|total)\s*modules?)$/))) {
      const q = parseQuantity(m[1]), subj = countSubject(m[2]);
      if (q && subj) return { kind: "count", fact: subj, desc: `${FACT_LABELS[subj]} ${q.desc}`, eval: (c) => Number.isFinite(c[subj]) ? q.test(c[subj]) : null };
    }
    if (m = t.match(/^(?:(?:the\s+)?(?:number|count|amount)\s+of\s+)?(.+?)(?:\s+count|\s+total)?\s+is\s+(.+)$/)) {
      const subj = countSubject(m[1]), q = parseQuantity(m[2]);
      if (subj && q) return { kind: "count", fact: subj, desc: `${FACT_LABELS[subj]} ${q.desc}`, eval: (c) => Number.isFinite(c[subj]) ? q.test(c[subj]) : null };
    }
    return { kind: "unknown", desc: raw.trim(), eval: () => null, unknown: true };
  }
  function splitClauses(cond) {
    const parts = cond.split(/\s*,\s*(?:and\s+)?|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
    const out = [];
    for (const p of parts) {
      if (out.length && /^(?:or\s+)?(?:\d+|[a-z]+)$/i.test(p) && /(?:\d|\b(?:is|says|reads)\s+(?:not\s+)?(?:a\s+)?\w+)$/i.test(out[out.length - 1]) && (/^(?:or\s+)?\d+$/i.test(p) ? /\d$/.test(out[out.length - 1]) : BUTTON_COLORS.includes(p.replace(/^or\s+/i, "").toLowerCase()) || /^or\s+/i.test(p))) {
        out[out.length - 1] += `, ${p}`;
      } else out.push(p);
    }
    return out;
  }
  var RULE_RE = /^\s*(?:[-*•]\s*)?(?:\(?\d+[.)]\s*)?\**\s*(.+?)\s*\**\s*[:=–—-]+\s*\**\s*(\d+(?:\.\d+)?)\s*\**\s*(?:s|sec|secs|seconds?)\b\**\.?\s*$/i;
  function parseChecklist(text) {
    const rules = [];
    const facts = {};
    for (const rawLine of String(text || "").split(/\r?\n/)) {
      const line = rawLine.replace(/\*\*/g, "").replace(/ /g, " ").trim();
      if (!line) continue;
      const fm = line.match(/^(serial(?:\s+number)?|total\s+modules?|modules?|non[-\s]?needy(?:\s+modules?)?|needy(?:\s+modules?)?|button\s+modules?|batter(?:y|ies))\s*[:=]\s*([A-Za-z0-9-]+)\s*$/i);
      if (fm) {
        const key = fm[1].toLowerCase();
        const val = fm[2];
        if (/serial/.test(key)) facts.serial = val.toUpperCase();
        else {
          const subj = /^modules?$/.test(key) ? "total" : countSubject(key);
          if (subj && /^\d+$/.test(val)) facts[subj] = Number(val);
        }
        continue;
      }
      const rm = line.match(RULE_RE);
      if (!rm) continue;
      const cond = rm[1].replace(/^(?:if|when)\s+/i, "");
      const clauses = splitClauses(cond).map(compileClause).filter(Boolean);
      if (!clauses.length) continue;
      rules.push({ n: rules.length + 1, text: cond, seconds: Number(rm[2]), clauses });
    }
    return { rules, facts };
  }
  function evaluateRules(rules, ctx) {
    const rows = rules.map((r) => {
      const vals = r.clauses.map((c) => c.eval(ctx));
      let status;
      if (vals.some((v) => v === false)) status = "no";
      else if (vals.every((v) => v === true)) status = "match";
      else status = "unknown";
      return { ...r, vals, status };
    });
    const firstMatch = rows.find((r) => r.status === "match") || null;
    const blocked = rows.find((r) => r.status === "unknown" && (!firstMatch || r.n < firstMatch.n)) || null;
    return { rows, match: blocked ? null : firstMatch, blocked, candidate: firstMatch };
  }
  function labelVocab(rules) {
    const set = new Set(DEFAULT_LABELS);
    rules.forEach((r) => r.clauses.forEach((c) => {
      if (c.kind === "label") (c.words || [c.word]).forEach((w) => w && set.add(w));
    }));
    return Array.from(set);
  }

  // src/modules/button/buttonVision.js
  var buttonVision_exports = {};
  __export(buttonVision_exports, {
    analyzeButtonImage: () => analyzeButtonImage,
    colorBucket: () => colorBucket,
    readButtonImage: () => readButtonImage
  });
  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = (g - b) / d % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, mx ? d / mx : 0, mx];
  }
  function colorBucket(r, g, b) {
    const [h, s, v] = rgbToHsv(r, g, b);
    if (v < 0.22) return "black";
    if (s < 0.2) return v > 0.62 ? "white" : "gray";
    if (h < 14 || h >= 340) return "red";
    if (h < 40) return "orange";
    if (h < 68) return "yellow";
    if (h < 165) return "green";
    if (h < 255) return "blue";
    return "purple";
  }
  var dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  function analyzeButtonImage(img) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const sc = Math.min(1, 600 / Math.max(iw, ih));
    const W = Math.max(1, Math.round(iw * sc)), H = Math.max(1, Math.round(ih * sc));
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const px = (x, y) => {
      const i = (y * W + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    };
    const tally = /* @__PURE__ */ new Map();
    for (let y = Math.floor(H * 0.2); y < H * 0.85; y += 3) {
      for (const x of [Math.floor(W * 0.12), Math.floor(W * 0.88)]) {
        const p = px(x, y);
        const k = p.map((v) => v >> 3).join(",");
        tally.set(k, (tally.get(k) || 0) + 1);
      }
    }
    let bgKey = null, bgN = -1;
    tally.forEach((n, k) => {
      if (n > bgN) {
        bgN = n;
        bgKey = k;
      }
    });
    const bg = bgKey ? bgKey.split(",").map((v) => Number(v) * 8 + 4) : [31, 34, 40];
    const x0 = Math.floor(W * 0.06), x1 = Math.ceil(W * 0.94), y0 = Math.floor(H * 0.18), y1 = Math.ceil(H * 0.9);
    const isFg = (x, y) => dist(px(x, y), bg) > 38;
    let sx = Math.floor(W / 2), sy = Math.floor(H / 2);
    if (!isFg(sx, sy)) {
      let found = false;
      for (let r = 2; r < Math.min(W, H) * 0.15 && !found; r += 2) {
        for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
          if (isFg(sx + dx, sy + dy)) {
            sx += dx;
            sy += dy;
            found = true;
            break;
          }
        }
      }
      if (!found) return { ok: false, reason: "Could not find the button in the screenshot." };
    }
    const seen = new Uint8Array(W * H);
    const stack = [sy * W + sx];
    seen[sy * W + sx] = 1;
    let bx0 = W, by0 = H, bx1 = 0, by1 = 0, area = 0;
    const buckets = {};
    while (stack.length) {
      const k = stack.pop(), x = k % W, y = k / W | 0;
      area++;
      if (x < bx0) bx0 = x;
      if (x > bx1) bx1 = x;
      if (y < by0) by0 = y;
      if (y > by1) by1 = y;
      const p = px(x, y), bk = colorBucket(...p);
      buckets[bk] = buckets[bk] || { n: 0, r: 0, g: 0, b: 0 };
      buckets[bk].n++;
      buckets[bk].r += p[0];
      buckets[bk].g += p[1];
      buckets[bk].b += p[2];
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) continue;
        const q = ny * W + nx;
        if (!seen[q] && isFg(nx, ny)) {
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
    if (area < W * H * 0.02) return { ok: false, reason: "Button region too small \u2014 crop the screenshot to the module." };
    const ranked = Object.entries(buckets).sort((a, b) => b[1].n - a[1].n);
    const [color, cb] = ranked[0];
    const btnRGB = [cb.r / cb.n, cb.g / cb.n, cb.b / cb.n];
    const confidence = cb.n / area;
    const ix = Math.round((bx1 - bx0) * 0.07), iy = Math.round((by1 - by0) * 0.12);
    const tx0 = bx0 + ix, ty0 = by0 + iy, tw = Math.max(1, bx1 - bx0 - 2 * ix), th = Math.max(1, by1 - by0 - 2 * iy);
    const f = Math.max(2, Math.round(90 / th));
    const tc = document.createElement("canvas");
    const P = 24;
    tc.width = tw * f + 2 * P;
    tc.height = th * f + 2 * P;
    const tctx = tc.getContext("2d");
    tctx.fillStyle = "#fff";
    tctx.fillRect(0, 0, tc.width, tc.height);
    const small = document.createElement("canvas");
    small.width = tw;
    small.height = th;
    const sctx = small.getContext("2d");
    const out = sctx.createImageData(tw, th);
    let ink = 0;
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const p = px(tx0 + x, ty0 + y), o = (y * tw + x) * 4;
      const on = dist(p, btnRGB) > 80;
      if (on) ink++;
      const v = on ? 0 : 255;
      out.data[o] = out.data[o + 1] = out.data[o + 2] = v;
      out.data[o + 3] = 255;
    }
    sctx.putImageData(out, 0, 0);
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(small, P, P, tw * f, th * f);
    const td = tctx.getImageData(0, 0, tc.width, tc.height);
    for (let i = 0; i < td.data.length; i += 4) {
      const v = td.data[i] < 140 ? 0 : 255;
      td.data[i] = td.data[i + 1] = td.data[i + 2] = v;
    }
    tctx.putImageData(td, 0, 0);
    const dots = [];
    const dy0 = Math.min(H - 1, by1 + 4), dy1 = Math.min(H, Math.round(H * 0.97));
    const dseen = new Uint8Array(W * H);
    for (let y = dy0; y < dy1; y++) for (let x = x0; x < x1; x++) {
      const k = y * W + x;
      if (dseen[k]) continue;
      const isDot = (xx, yy) => dist(px(xx, yy), bg) > 22;
      if (!isDot(x, y)) continue;
      const st = [k];
      dseen[k] = 1;
      let n = 0, ax = 0, ar = 0, ag = 0, ab = 0, minx = x, maxx = x, miny = y, maxy = y;
      while (st.length) {
        const q = st.pop(), qx = q % W, qy = q / W | 0;
        const pp = px(qx, qy);
        n++;
        ax += qx;
        ar += pp[0];
        ag += pp[1];
        ab += pp[2];
        if (qx < minx) minx = qx;
        if (qx > maxx) maxx = qx;
        if (qy < miny) miny = qy;
        if (qy > maxy) maxy = qy;
        for (const [nx, ny] of [[qx + 1, qy], [qx - 1, qy], [qx, qy + 1], [qx, qy - 1]]) {
          if (nx < x0 || nx >= x1 || ny < dy0 || ny >= dy1) continue;
          const r2 = ny * W + nx;
          if (dseen[r2]) continue;
          if (isDot(nx, ny)) {
            dseen[r2] = 1;
            st.push(r2);
          }
        }
      }
      const bw = maxx - minx + 1, bh = maxy - miny + 1;
      if (n >= 12 && bw < W * 0.08 && bh < H * 0.08 && bw / bh > 0.6 && bw / bh < 1.6) {
        dots.push({ x: ax / n, bucket: colorBucket(ar / n, ag / n, ab / n) });
      }
    }
    dots.sort((a, b) => a.x - b.x);
    let stage = null;
    if (dots.length >= 2 && dots.length <= 6) {
      const done = dots.filter((dt) => dt.bucket === "green").length;
      stage = { total: dots.length, current: Math.min(dots.length, done + 1), done };
    }
    return { ok: true, color, confidence, labelCanvas: tc, hasInk: ink > tw * th * 0.01, stage, box: [bx0, by0, bx1, by1] };
  }
  async function readButtonImage(img, vocab, onStatus = () => {
  }) {
    const res = analyzeButtonImage(img);
    if (!res.ok) return res;
    let label = "", labelRaw = "", labelSure = false;
    if (res.hasInk) {
      try {
        onStatus("Reading the label\u2026");
        const worker = await ensureOCRWorker();
        let best = { w: "", d: 99, amb: true };
        for (const psm of ["8", "7"]) {
          await worker.setParameters({ tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", tessedit_pageseg_mode: psm, user_defined_dpi: "300" });
          const { data } = await worker.recognize(res.labelCanvas);
          const txt = String(data.text || "").trim();
          const r = matchWord(txt, vocab);
          if (r.d < best.d) {
            best = r;
            labelRaw = txt;
          }
          if (best.d === 0) break;
        }
        const ok = best.w && best.d <= Math.max(1, Math.floor((best.len || 1) * 0.34));
        label = ok ? best.w : "";
        labelSure = ok && best.d === 0 && !best.amb;
      } catch (e) {
        res.ocrError = e.message;
      }
    }
    return { ...res, label, labelRaw, labelSure };
  }

  // src/modules/piano/pianoSolver.js
  var pianoSolver_exports = {};
  __export(pianoSolver_exports, {
    PN_DEFAULT_CODES: () => PN_DEFAULT_CODES,
    PN_INT: () => PN_INT,
    PN_KEYS: () => PN_KEYS,
    PN_LET: () => PN_LET,
    PN_NATURAL: () => PN_NATURAL,
    PN_STEPS: () => PN_STEPS,
    pnDrawnName: () => pnDrawnName,
    pnEffectiveAcc: () => pnEffectiveAcc,
    pnInterval: () => pnInterval,
    pnKeyAccidentals: () => pnKeyAccidentals,
    pnNote: () => pnNote,
    pnParseCodes: () => pnParseCodes,
    pnParseKey: () => pnParseKey,
    pnParseKeyField: () => pnParseKeyField
  });
  var PN_STEPS = [0, 2, 4, 5, 7, 9, 11];
  var PN_LET = "CDEFGAB";
  var PN_INT = [
    "Unison",
    "Minor 2nd",
    "Major 2nd",
    "Minor 3rd",
    "Major 3rd",
    "Perfect 4th",
    "Tritone",
    "Perfect 5th",
    "Minor 6th",
    "Major 6th",
    "Minor 7th",
    "Major 7th",
    "Octave"
  ];
  var PN_DEFAULT_CODES = "Minor 2nd 5.68  Major 2nd 6.99  Minor 3rd 2.33  Major 3rd 4.84  Perfect 4th 7.33  Tritone 8.69  Perfect 5th 5.44  Minor 6th 5.62  Major 6th 7.96  Minor 7th 8.05  Major 7th 6.13  Octave 3.98";
  function pnNote(clef, pos, acc) {
    const d = (clef === "treble" ? 30 : 18) + pos;
    const l = (d % 7 + 7) % 7;
    const o = Math.floor(d / 7);
    return {
      name: PN_LET[l] + (acc > 0 ? "\u266F" : acc < 0 ? "\u266D" : "") + o,
      semi: PN_STEPS[l] + 12 * o + acc
    };
  }
  function pnDrawnName(clef, pos, drawnAcc) {
    const n = pnNote(clef, pos, drawnAcc === PN_NATURAL ? 0 : drawnAcc || 0).name;
    return drawnAcc === PN_NATURAL ? n.replace(/(-?\d+)$/, "\u266E$1") : n;
  }
  var SHARP_ORDER = "FCGDAEB";
  var FLAT_ORDER = "BEADGCF";
  var MAJOR_FIFTHS = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F\u266F": 6, "C\u266F": 7, F: -1, "B\u266D": -2, "E\u266D": -3, "A\u266D": -4, "D\u266D": -5, "G\u266D": -6, "C\u266D": -7 };
  var MINOR_FIFTHS = { A: 0, E: 1, B: 2, "F\u266F": 3, "C\u266F": 4, "G\u266F": 5, "D\u266F": 6, "A\u266F": 7, D: -1, G: -2, C: -3, F: -4, "B\u266D": -5, "E\u266D": -6, "A\u266D": -7 };
  var PN_KEYS = [
    ...Object.entries(MAJOR_FIFTHS).map(([k, f]) => ({ id: `${k} Major`, fifths: f })),
    ...Object.entries(MINOR_FIFTHS).map(([k, f]) => ({ id: `${k} Minor`, fifths: f }))
  ];
  function pnKeyAccidentals(keyId) {
    const k = PN_KEYS.find((x) => x.id === keyId);
    const out = {};
    if (!k) return out;
    if (k.fifths > 0) for (const l of SHARP_ORDER.slice(0, k.fifths)) out[l] = 1;
    if (k.fifths < 0) for (const l of FLAT_ORDER.slice(0, -k.fifths)) out[l] = -1;
    return out;
  }
  function pnParseKey(text) {
    const t = String(text || "");
    const m = /key(?:\s*signature)?\s*[:\-]?\s*([A-G])\s*(#|♯|sharp|b|♭|flat)?\s*(major|minor|maj|min)\b/i.exec(t) || /^\s*([A-G])\s*(#|♯|sharp|b|♭|flat)?\s*(major|minor|maj|min)\s*\.?\s*$/i.exec(t);
    if (!m) return null;
    const acc = !m[2] ? "" : /#|♯|sharp/i.test(m[2]) ? "\u266F" : "\u266D";
    const id = `${m[1].toUpperCase()}${acc} ${/^min/i.test(m[3]) ? "Minor" : "Major"}`;
    return PN_KEYS.some((k) => k.id === id) ? id : null;
  }
  function pnParseKeyField(text) {
    const k = pnParseKey(text);
    if (k) return k;
    const m = /^\s*([A-G])\s*(#|♯|sharp|b|♭|flat)?\s*\.?\s*$/i.exec(String(text || ""));
    if (!m) return null;
    const id = `${m[1].toUpperCase()}${!m[2] ? "" : /#|♯|sharp/i.test(m[2]) ? "\u266F" : "\u266D"} Major`;
    return PN_KEYS.some((x) => x.id === id) ? id : null;
  }
  var PN_NATURAL = "n";
  function pnEffectiveAcc(clef, pos, drawnAcc, keyId) {
    if (drawnAcc === PN_NATURAL) return 0;
    if (drawnAcc) return drawnAcc;
    const letter = pnNote(clef, pos, 0).name[0];
    return pnKeyAccidentals(keyId)[letter] || 0;
  }
  var simple = (n) => n === 0 ? 0 : n % 12 === 0 ? 12 : n % 12;
  function pnInterval(semi1, semi2) {
    const distance = Math.abs(semi2 - semi1);
    const st = simple(distance);
    return { st, name: PN_INT[st], distance, octaveDropped: distance > 12 };
  }
  function pnParseCodes(t) {
    const m = {};
    const re = /(Minor 2nd|Major 2nd|Minor 3rd|Major 3rd|Perfect 4th|Tritone|Perfect 5th|Minor 6th|Major 6th|Minor 7th|Major 7th|Octave)\s*`?\s*([\d.]+)/gi;
    let r;
    while (r = re.exec(t)) {
      m[r[1].toLowerCase()] = r[2];
    }
    return m;
  }

  // src/modules/piano/pianoVision.js
  var pianoVision_exports = {};
  __export(pianoVision_exports, {
    pnAnalyze: () => pnAnalyze
  });
  function pnAnalyze(d, w, h) {
    const N = w * h, L = new Float32Array(N);
    for (let i = 0; i < N; i++) L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    const srt = L.slice().sort(), bg = srt[N >> 1], mx = srt[Math.floor(N * 0.995)];
    const lt = bg + 28, a0 = Math.floor(w * 0.2), a1 = Math.floor(w * 0.8), rows = [];
    for (let y = 0; y < h; y++) {
      let c = 0;
      for (let x = a0; x < a1; x++) if (L[y * w + x] > lt) c++;
      rows.push(c > (a1 - a0) * 0.5);
    }
    const cl = [];
    for (let y = 0; y < h; y++) {
      if (rows[y]) {
        const a = y;
        while (y + 1 < h && rows[y + 1]) y++;
        cl.push((a + y) / 2);
      }
    }
    if (cl.length < 5) return null;
    let best = null, bv = 1e9;
    for (let i = 0; i + 5 <= cl.length; i++) {
      const g = [1, 2, 3, 4].map((k) => cl[i + k] - cl[i + k - 1]), m = (g[0] + g[1] + g[2] + g[3]) / 4, v = g.reduce((a, b) => a + (b - m) ** 2, 0);
      if (v < bv) {
        bv = v;
        best = cl.slice(i, i + 5);
      }
    }
    const top = best[0], bot = best[4], s = (bot - top) / 4, ty = Math.round(top);
    let xL = w, xR = 0;
    for (let x = Math.floor(w * 0.05); x < w * 0.95; x++) {
      if (L[ty * w + x] > lt) {
        xL = Math.min(xL, x);
        xR = Math.max(xR, x);
      }
    }
    const ya = Math.max(0, Math.floor(top - 4 * s)), yb = Math.min(h - 1, Math.ceil(bot + 4 * s)), bt = bg + 0.55 * (mx - bg);
    const seen = new Uint8Array(N), comps = [];
    for (let y = ya; y <= yb; y++) {
      for (let x = xL; x <= xR; x++) {
        const i = y * w + x;
        if (seen[i] || L[i] <= bt) continue;
        const st = [i], px = [];
        seen[i] = 1;
        while (st.length) {
          const j = st.pop();
          px.push(j);
          const jx = j % w, jy = (j - jx) / w;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = jx + dx, ny = jy + dy;
            if (nx < xL || nx > xR || ny < ya || ny > yb) continue;
            const k = ny * w + nx;
            if (!seen[k] && L[k] > bt) {
              seen[k] = 1;
              st.push(k);
            }
          }
        }
        if (px.length >= 6) comps.push(px);
      }
    }
    const info = comps.map((px) => {
      let x0 = w, x1 = 0, y0 = h, y1 = 0;
      const ry = {};
      for (const j of px) {
        const x = j % w, y = (j - x) / w;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
        const r = ry[y] || (ry[y] = { a: x, b: x, n: 0 });
        r.a = Math.min(r.a, x);
        r.b = Math.max(r.b, x);
        r.n++;
      }
      return { x0, x1, y0, y1, ry, px, n: px.length };
    }).sort((p, q) => p.x0 - q.x0);
    const ci = info.findIndex((c) => c.n > s * s * 0.5 && c.y1 - c.y0 > s);
    if (ci < 0) return null;
    const cf = info[ci];
    const sm = info.filter((q) => q !== cf && q.x0 >= cf.x0 - 2 && q.x0 <= cf.x1 + 0.8 * s && q.x1 - q.x0 < 0.5 * s && q.y1 - q.y0 < 0.5 * s && q.y0 > top - 0.2 * s && q.y1 < bot + 0.2 * s);
    const dots = sm.some((p, i) => sm.some((q, j) => j > i && Math.abs(p.x0 - q.x0) <= 3 && Math.abs((p.y0 + p.y1) / 2 - (q.y0 + q.y1) / 2) > 0.4 * s && Math.abs((p.y0 + p.y1) / 2 - (q.y0 + q.y1) / 2) < 1.1 * s));
    const clef = cf.y0 < top - 0.6 * s && cf.y1 > bot + 0.6 * s || !dots ? "treble" : "bass";
    const heads = [], accs = [];
    for (const c of info) {
      if (c.x0 <= cf.x1) continue;
      const ys = Object.keys(c.ry).map(Number), ext = ys.map((y) => c.ry[y].b - c.ry[y].a + 1), me = Math.max(...ext);
      const ix = ys.map((y, i) => i).filter((i) => ext[i] >= 0.75 * me);
      const fill = ix.reduce((a, i) => a + c.ry[ys[i]].n / ext[i], 0) / ix.length, w2 = c.x1 - c.x0 + 1, h2 = c.y1 - c.y0 + 1;
      if (me >= 0.6 * s && me <= 2 * s && ix.length >= 0.4 * s && fill >= 0.8) {
        const hy = ix.map((i) => ys[i]);
        heads.push({ pos: Math.round((bot - hy.reduce((a, b) => a + b) / hy.length) / (s / 2)), x: c.x0, y: hy.reduce((a, b) => a + b) / hy.length, acc: 0 });
      } else if (h2 >= 0.85 * s && w2 <= 1.4 * s) {
        let rt = 0, rb = 0, lo = 1e9, ro = 1e9, lBot = 0;
        for (const j of c.px) {
          const x = j % w, y = (j - x) / w, fx = (x - c.x0) / w2, fy = (y - c.y0) / h2;
          if (fx > 0.5) {
            fy < 0.5 ? rt++ : rb++;
          }
          if (fx < 0.35) {
            lo = Math.min(lo, fy);
            lBot = Math.max(lBot, fy);
          }
          if (fx > 0.65) ro = Math.min(ro, fy);
        }
        const acc = rt < 0.25 * rb ? -1 : ro < 0.15 ? 1 : ro >= 0.15 && lBot < 0.85 ? "n" : 0;
        accs.push({ x1: c.x1, y: (c.y0 + c.y1) / 2, acc, used: false });
      }
    }
    heads.sort((p, q) => p.x - q.x);
    for (const a of accs) {
      let b = null;
      for (const hd of heads) {
        if (hd.x >= a.x1 - 2 && hd.x - a.x1 < 2.5 * s && Math.abs(a.y - hd.y) < 1.6 * s) {
          b = hd;
          break;
        }
      }
      if (b) {
        b.acc = a.acc;
        a.used = true;
      }
    }
    const notes = heads, stray = accs.filter((a) => !a.used).length;
    return { clef, notes, spacing: s, stray };
  }

  // src/modules/morse/morseDecoder.js
  var morseDecoder_exports = {};
  __export(morseDecoder_exports, {
    MORSE_FREQUENCIES: () => MORSE_FREQUENCIES,
    MORSE_TABLE: () => MORSE_TABLE,
    decodeMorseBothWays: () => decodeMorseBothWays,
    decodeMorseRLE: () => decodeMorseRLE
  });
  var MORSE_TABLE = {
    ".-": "A",
    "-...": "B",
    "-.-.": "C",
    "-..": "D",
    ".": "E",
    "..-.": "F",
    "--.": "G",
    "....": "H",
    "..": "I",
    ".---": "J",
    "-.-": "K",
    ".-..": "L",
    "--": "M",
    "-.": "N",
    "---": "O",
    ".--.": "P",
    "--.-": "Q",
    ".-.": "R",
    "...": "S",
    "-": "T",
    "..-": "U",
    "...-": "V",
    ".--": "W",
    "-..-": "X",
    "-.--": "Y",
    "--..": "Z",
    ".----": "1",
    "..---": "2",
    "...--": "3",
    "....-": "4",
    ".....": "5",
    "-....": "6",
    "--...": "7",
    "---..": "8",
    "----.": "9",
    "-----": "0",
    ".-.-.-": ".",
    "--..--": ",",
    "..--..": "?",
    "-.-.--": "!",
    "-..-.": "/",
    "...---...": "SOS"
  };
  var MORSE_FREQUENCIES = {
    SHELL: "3.505 MHz",
    HALLS: "3.515 MHz",
    SLICK: "3.522 MHz",
    TRICK: "3.532 MHz",
    BOXES: "3.535 MHz",
    LEAKS: "3.542 MHz",
    STROBE: "3.545 MHz",
    BISTRO: "3.552 MHz",
    FLICK: "3.555 MHz",
    BOMBS: "3.565 MHz",
    BREAK: "3.572 MHz",
    BRICK: "3.575 MHz",
    STEAK: "3.582 MHz",
    STING: "3.592 MHz",
    VECTOR: "3.595 MHz",
    BEATS: "3.600 MHz"
  };
  function decodeMorseRLE(rle, { swap = false } = {}) {
    const onDurs = rle.filter((x) => x.is_on).map((x) => x.duration).sort((a, b) => a - b);
    if (!onDurs.length) return { letters: [], unit: 100 };
    const unit = onDurs[0];
    const letters = [];
    let cur = [];
    for (const { is_on, duration } of rle) {
      if (is_on) {
        cur.push(duration > unit * 2 !== swap ? "-" : ".");
      } else {
        if (duration > unit * 5) {
          if (cur.length) {
            const code = cur.join("");
            letters.push({ code, char: MORSE_TABLE[code] || `[${code}]` });
            cur = [];
          }
          letters.push({ code: " ", char: " " });
        } else if (duration > unit * 2) {
          if (cur.length) {
            const code = cur.join("");
            letters.push({ code, char: MORSE_TABLE[code] || `[${code}]` });
            cur = [];
          }
        }
      }
    }
    if (cur.length) {
      const code = cur.join("");
      letters.push({ code, char: MORSE_TABLE[code] || `[${code}]` });
    }
    const rawWord = letters.map((l) => l.char).join("").trim();
    const cleanWord = rawWord.replace(/[^A-Z]/g, "");
    let word = rawWord;
    let frequency = MORSE_FREQUENCIES[cleanWord] || "";
    if (!frequency && cleanWord.length > 1) {
      for (let i = 1; i < cleanWord.length; i++) {
        const rotated = cleanWord.slice(i) + cleanWord.slice(0, i);
        if (MORSE_FREQUENCIES[rotated]) {
          word = rotated;
          frequency = MORSE_FREQUENCIES[rotated];
          break;
        }
      }
    }
    const valid = letters.every((l) => l.char === " " || MORSE_TABLE[l.code]);
    return { letters, unit, word, frequency, valid, swapped: swap };
  }
  function decodeMorseBothWays(rle, opts = {}) {
    const swap = Boolean(opts.swap);
    return {
      forward: decodeMorseRLE(rle, { swap }),
      backward: decodeMorseRLE([...rle].reverse(), { swap }),
      swapped: decodeMorseRLE(rle, { swap: !swap })
    };
  }

  // src/utils/gif.js
  var gif_exports = {};
  __export(gif_exports, {
    decodeGIFRGBA: () => decodeGIFRGBA,
    framesToRLE: () => framesToRLE,
    lightIsRed: () => lightIsRed,
    lzwGetPixelIndex: () => lzwGetPixelIndex,
    parseGIFFrames: () => parseGIFFrames
  });
  async function parseGIFFrames(bufferOrBlob) {
    let buffer = bufferOrBlob;
    if (typeof Blob !== "undefined" && bufferOrBlob instanceof Blob) {
      buffer = await bufferOrBlob.arrayBuffer();
    }
    const b = new Uint8Array(buffer);
    if (b.length < 10 || b[0] !== 71 || b[1] !== 73 || b[2] !== 70) throw new Error("Not a valid GIF file");
    let i = 6;
    const screenW = b[i] | b[i + 1] << 8;
    const screenH = b[i + 2] | b[i + 3] << 8;
    const gctFlag = b[i + 4] >> 7 & 1;
    const gctBytes = 3 * (2 << (b[i + 4] & 7));
    i += 7;
    let globalCT = null;
    if (gctFlag) {
      globalCT = b.subarray(i, i + gctBytes);
      i += gctBytes;
    }
    const CX = screenW >> 1, CY = screenH >> 1;
    const frames = [];
    let pendingDelay = 100, prevBright = 128, prevRgb = [128, 128, 128];
    while (i < b.length) {
      const byte = b[i];
      if (byte === 59) break;
      if (byte === 33) {
        const label = b[i + 1];
        if (label === 249) {
          pendingDelay = (b[i + 4] | b[i + 5] << 8) * 10;
          i += 8;
        } else {
          i += 2;
          while (i < b.length && b[i] !== 0) i += b[i] + 1;
          i++;
        }
      } else if (byte === 44) {
        const left = b[i + 1] | b[i + 2] << 8;
        const top = b[i + 3] | b[i + 4] << 8;
        const fw = b[i + 5] | b[i + 6] << 8;
        const fh = b[i + 7] | b[i + 8] << 8;
        const lctFlag = b[i + 9] >> 7 & 1;
        const lctBytes = 3 * (2 << (b[i + 9] & 7));
        i += 10;
        let ct = globalCT;
        if (lctFlag) {
          ct = b.subarray(i, i + lctBytes);
          i += lctBytes;
        }
        const minCS = b[i++];
        const lzw = [];
        while (i < b.length && b[i] !== 0) {
          const n = b[i++];
          for (let k = 0; k < n; k++) lzw.push(b[i++]);
        }
        i++;
        const px = CX - left, py = CY - top;
        let bright = prevBright, rgb = prevRgb;
        if (ct && px >= 0 && px < fw && py >= 0 && py < fh) {
          const ci = lzwGetPixelIndex(lzw, minCS, py * fw + px);
          if (ci >= 0 && ci * 3 + 2 < ct.length) {
            const r = ct[ci * 3], g = ct[ci * 3 + 1], bv = ct[ci * 3 + 2];
            bright = 0.299 * r + 0.587 * g + 0.114 * bv;
            rgb = [r, g, bv];
            prevBright = bright;
            prevRgb = rgb;
          }
        }
        frames.push({ brightness: bright, rgb, delay: pendingDelay || 100 });
        pendingDelay = 100;
      } else {
        i++;
      }
    }
    return frames;
  }
  function lzwGetPixelIndex(data, minCS, targetIdx) {
    const clear = 1 << minCS, endC = clear + 1;
    let codeSize = minCS + 1, nextCode = endC + 1;
    const tbl = [];
    for (let k = 0; k < clear; k++) tbl[k] = [k];
    let buf = 0, bLen = 0, pos = 0;
    const read = () => {
      while (bLen < codeSize && pos < data.length) {
        buf |= data[pos++] << bLen;
        bLen += 8;
      }
      const c = buf & (1 << codeSize) - 1;
      buf >>>= codeSize;
      bLen -= codeSize;
      return c;
    };
    let outPos = 0, prev = null;
    for (; ; ) {
      if (bLen < codeSize && pos >= data.length) break;
      const code = read();
      if (code === clear) {
        tbl.length = endC + 1;
        for (let k = 0; k < clear; k++) tbl[k] = [k];
        codeSize = minCS + 1;
        nextCode = endC + 1;
        prev = null;
        continue;
      }
      if (code === endC) break;
      let entry;
      if (code < nextCode) {
        entry = tbl[code];
      } else if (prev !== null) {
        entry = [...prev, prev[0]];
      } else {
        break;
      }
      if (!entry) break;
      for (const px of entry) {
        if (outPos === targetIdx) return px;
        outPos++;
      }
      if (prev !== null) {
        tbl[nextCode] = [...prev, entry[0]];
        nextCode++;
        if (nextCode === 1 << codeSize && codeSize < 12) codeSize++;
      }
      prev = entry;
    }
    return -1;
  }
  function lightIsRed(frames) {
    const lit = frames.filter((f) => f.rgb);
    if (!lit.length) return false;
    const bs = lit.map((f) => f.brightness);
    const thresh = (Math.min(...bs) + Math.max(...bs)) / 2;
    const on = lit.filter((f) => f.brightness > thresh);
    if (!on.length) return false;
    const [r, g, b] = [0, 1, 2].map((c) => on.reduce((s, f) => s + f.rgb[c], 0) / on.length);
    return r > 100 && r >= 1.8 * Math.max(g, b);
  }
  function framesToRLE(frames) {
    const bs = frames.map((f) => f.brightness);
    const mn = Math.min(...bs), mx = Math.max(...bs);
    if (mx - mn < 20) throw new Error("No significant brightness change \u2014 is this a blinking LED GIF?");
    const thresh = (mn + mx) / 2;
    const rle = [];
    let curOn = frames[0].brightness > thresh, curDur = frames[0].delay;
    for (let i = 1; i < frames.length; i++) {
      const on = frames[i].brightness > thresh;
      if (on === curOn) {
        curDur += frames[i].delay;
      } else {
        rle.push({ is_on: curOn, duration: curDur });
        curOn = on;
        curDur = frames[i].delay;
      }
    }
    rle.push({ is_on: curOn, duration: curDur });
    return rle;
  }
  function decodeGIFRGBA(buf) {
    const d = new Uint8Array(buf);
    let p = 0;
    if (String.fromCharCode(d[0], d[1], d[2]) !== "GIF") throw new Error("not a GIF");
    p = 6;
    const W = d[p] | d[p + 1] << 8, H = d[p + 2] | d[p + 3] << 8;
    p += 4;
    const fl = d[p++];
    p += 2;
    let gct = null;
    if (fl & 128) {
      const n = 2 << (fl & 7);
      gct = d.subarray(p, p + n * 3);
      p += n * 3;
    }
    let cv = new Uint8ClampedArray(W * H * 4);
    const frames = [];
    let gce = { delay: 0, trans: -1, disp: 0 };
    const skipSub = () => {
      while (p < d.length && d[p] !== 0) p += d[p] + 1;
      p++;
    };
    while (p < d.length) {
      const b = d[p++];
      if (b === 59) break;
      if (b === 33) {
        const label = d[p++];
        if (label === 249) {
          p++;
          const pf = d[p];
          gce = { disp: pf >> 2 & 7, delay: (d[p + 1] | d[p + 2] << 8) * 10, trans: pf & 1 ? d[p + 3] : -1 };
          p += 5;
        } else skipSub();
      } else if (b === 44) {
        const x0 = d[p] | d[p + 1] << 8, y0 = d[p + 2] | d[p + 3] << 8, w = d[p + 4] | d[p + 5] << 8, h = d[p + 6] | d[p + 7] << 8, f = d[p + 8];
        p += 9;
        let ct = gct;
        if (f & 128) {
          const n = 2 << (f & 7);
          ct = d.subarray(p, p + n * 3);
          p += n * 3;
        }
        const minCode = d[p++];
        const chunks = [];
        let tot = 0;
        while (p < d.length && d[p] !== 0) {
          chunks.push(d.subarray(p + 1, p + 1 + d[p]));
          tot += d[p];
          p += d[p] + 1;
        }
        p++;
        const data = new Uint8Array(tot);
        let o = 0;
        for (const c of chunks) {
          data.set(c, o);
          o += c.length;
        }
        const idx = gifLzwFull(minCode, data, w * h);
        const rows = new Array(h);
        if (f & 64) {
          let r = 0;
          for (const [s, st] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let y = s; y < h; y += st) rows[y] = r++;
        } else for (let y = 0; y < h; y++) rows[y] = y;
        const saved = gce.disp === 3 ? cv.slice() : null;
        if (ct) {
          for (let y = 0; y < h; y++) {
            const sy = rows[y] * w, dy = y0 + y;
            if (dy >= H) continue;
            for (let x = 0; x < w; x++) {
              const dx = x0 + x;
              if (dx >= W) continue;
              const ci = idx[sy + x];
              if (ci === gce.trans) continue;
              const o2 = (dy * W + dx) * 4;
              cv[o2] = ct[ci * 3];
              cv[o2 + 1] = ct[ci * 3 + 1];
              cv[o2 + 2] = ct[ci * 3 + 2];
              cv[o2 + 3] = 255;
            }
          }
        }
        frames.push({ data: cv.slice(), delay: gce.delay || 100 });
        if (gce.disp === 2) {
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const dx = x0 + x, dy = y0 + y;
            if (dx < W && dy < H) cv.fill(0, (dy * W + dx) * 4, (dy * W + dx) * 4 + 4);
          }
        } else if (gce.disp === 3 && saved) cv = saved;
        gce = { delay: 0, trans: -1, disp: 0 };
      } else break;
    }
    return { w: W, h: H, frames };
  }
  function gifLzwFull(minCode, data, npix) {
    const clear = 1 << minCode, eoi = clear + 1;
    let size = minCode + 1, next = eoi + 1, mask = (1 << size) - 1;
    const prefix = new Uint16Array(4096), suffix = new Uint8Array(4096), stack = new Uint8Array(4097), out = new Uint8Array(npix);
    for (let i = 0; i < clear; i++) suffix[i] = i;
    let bits = 0, nb = 0, op = 0, old = -1, first = 0;
    for (let i = 0; i < data.length; i++) {
      bits |= data[i] << nb;
      nb += 8;
      while (nb >= size) {
        let code = bits & mask;
        bits >>= size;
        nb -= size;
        if (code === clear) {
          size = minCode + 1;
          mask = (1 << size) - 1;
          next = eoi + 1;
          old = -1;
          continue;
        }
        if (code === eoi) return out;
        if (old === -1) {
          out[op++] = suffix[code];
          old = code;
          first = code;
          continue;
        }
        const inCode = code;
        let top = 0;
        if (code >= next) {
          stack[top++] = first;
          code = old;
        }
        while (code >= clear) {
          stack[top++] = suffix[code];
          code = prefix[code];
        }
        first = suffix[code];
        stack[top++] = first;
        if (next < 4096) {
          prefix[next] = old;
          suffix[next] = first;
          next++;
          if ((next & mask) === 0 && next < 4096) {
            size++;
            mask = (1 << size) - 1;
          }
        }
        old = inCode;
        while (top > 0 && op < npix) out[op++] = stack[--top];
      }
    }
    return out;
  }

  // src/modules/maze/mazeSolver.js
  var mazeSolver_exports = {};
  __export(mazeSolver_exports, {
    MAZE_SIZE: () => MAZE_SIZE,
    solveMazeBFS: () => solveMazeBFS
  });
  var MAZE_SIZE = 8;
  function solveMazeBFS(wallsGrid, startPos, goalPos) {
    const N = MAZE_SIZE;
    const sr = startPos.r, sc = startPos.c, gr = goalPos.r, gc = goalPos.c;
    const queue = [[sr, sc, []]];
    const visited = /* @__PURE__ */ new Set([`${sr}_${sc}`]);
    let foundPath = null;
    const moves = [
      [-1, 0, "U", (r, c) => wallsGrid[r][c].u],
      [1, 0, "D", (r, c) => wallsGrid[r][c].d],
      [0, -1, "L", (r, c) => wallsGrid[r][c].l],
      [0, 1, "R", (r, c) => wallsGrid[r][c].r]
    ];
    while (queue.length > 0) {
      const [cr, cc, path] = queue.shift();
      if (cr === gr && cc === gc) {
        foundPath = path;
        break;
      }
      for (const [dr, dc, moveChar, hasWall] of moves) {
        if (!hasWall(cr, cc)) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < N && nc >= 0 && nc < N && !visited.has(`${nr}_${nc}`)) {
            visited.add(`${nr}_${nc}`);
            queue.push([nr, nc, [...path, { move: moveChar, r: nr, c: nc }]]);
          }
        }
      }
    }
    return foundPath;
  }

  // src/modules/maze/mazeVision.js
  var mazeVision_exports = {};
  __export(mazeVision_exports, {
    detectMazeDots: () => detectMazeDots,
    detectMazeWalls: () => detectMazeWalls,
    imageData: () => imageData,
    isDotsImage: () => isDotsImage,
    mzReadManual: () => mzReadManual,
    mzSplitStrip: () => mzSplitStrip,
    mzWallsFromData: () => mzWallsFromData
  });
  function imageData(img, maxDim = 4e3) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const sc = Math.min(1, maxDim / Math.max(iw, ih));
    const W = Math.max(1, Math.round(iw * sc)), H = Math.max(1, Math.round(ih * sc));
    const cv = getWorkCanvas();
    cv.width = W;
    cv.height = H;
    const ctx = getWorkContext();
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    return { data: ctx.getImageData(0, 0, W, H).data, W, H, canvas: cv };
  }
  function mzSplitStrip(W, H) {
    if (!W || !H) return [];
    const tall = H >= W;
    const n = Math.max(1, Math.round(tall ? H / W : W / H));
    const step = (tall ? H : W) / n;
    return Array.from({ length: n }, (_, i) => tall ? { x: 0, y: Math.round(i * step), w: W, h: Math.round((i + 1) * step) - Math.round(i * step) } : { x: Math.round(i * step), y: 0, w: Math.round((i + 1) * step) - Math.round(i * step), h: H });
  }
  var blankGrid = () => Array.from({ length: MAZE_SIZE }, () => Array.from({ length: MAZE_SIZE }, () => ({ u: false, d: false, l: false, r: false })));
  function mzWallsFromData(data, W, H, rect = { x: 0, y: 0, w: W, h: H }) {
    const { x: ox, y: oy, w, h } = rect;
    const N = MAZE_SIZE;
    const lum = new Uint8Array(w * h), lt = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const j = ((oy + y) * W + ox + x) * 4, r = data[j], g = data[j + 1], b = data[j + 2];
      const L = 0.299 * r + 0.587 * g + 0.114 * b;
      lum[y * w + x] = L;
      lt[y * w + x] = r > 150 && g > 150 && b > 150 && L > 165 ? 1 : 0;
    }
    const x0 = Math.floor(w * 0.08), x1 = Math.floor(w * 0.92), y0 = Math.floor(h * 0.18), y1 = Math.floor(h * 0.96);
    const rc = new Int32Array(h), cc = new Int32Array(w);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (lt[y * w + x]) {
      rc[y]++;
      cc[x]++;
    }
    const span = (a, lo, hi) => {
      let m = 0;
      for (let i = lo; i < hi; i++) m = Math.max(m, a[i]);
      let s = -1, e = -1;
      for (let i = lo; i < hi; i++) if (m > 0 && a[i] >= m * 0.45) {
        if (s < 0) s = i;
        e = i;
      }
      return [s, e];
    };
    const [ty, by] = span(rc, y0, y1), [lx, rx] = span(cc, x0, x1), bw = rx - lx + 1, bh = by - ty + 1;
    let gx, gy, gw, gh, fallback = false;
    if (lx >= 0 && ty >= 0 && bw > w * 0.3 && Math.abs(bw - bh) < 0.12 * Math.max(bw, bh)) {
      const s = bw / 234;
      gx = lx - 3 * s;
      gy = ty - 3 * s;
      gw = bw + 6 * s;
      gh = bh + 6 * s;
    } else {
      fallback = true;
      gx = 100 * w / 440;
      gy = 122 * h / 440;
      gw = 240 * w / 440;
      gh = 240 * h / 440;
    }
    const cw = gw / N, ch = gh / N, TOL = Math.max(2, Math.round(0.17 * cw)), DARK = 140, NEED = 0.7;
    const dark = (x, y) => lum[y * w + x] < DARK;
    const vWall = (r, c) => {
      const xl = Math.round(gx + (c + 1) * cw), ya = Math.round(gy + (r + 0.28) * ch), yb = Math.round(gy + (r + 0.72) * ch);
      let best = 0;
      for (let dx = -TOL; dx <= TOL; dx++) {
        const x = xl + dx;
        if (x < 0 || x >= w) continue;
        let n = 0, t = 0;
        for (let y = ya; y <= yb; y++) {
          if (y < 0 || y >= h) continue;
          t++;
          if (dark(x, y)) n++;
        }
        if (t) best = Math.max(best, n / t);
      }
      return best >= NEED;
    };
    const hWall = (r, c) => {
      const yl = Math.round(gy + (r + 1) * ch), xa = Math.round(gx + (c + 0.28) * cw), xb = Math.round(gx + (c + 0.72) * cw);
      let best = 0;
      for (let dy = -TOL; dy <= TOL; dy++) {
        const y = yl + dy;
        if (y < 0 || y >= h) continue;
        let n = 0, t = 0;
        for (let x = xa; x <= xb; x++) {
          if (x < 0 || x >= w) continue;
          t++;
          if (dark(x, y)) n++;
        }
        if (t) best = Math.max(best, n / t);
      }
      return best >= NEED;
    };
    const grid = blankGrid();
    let count = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (r === 0) grid[r][c].u = true;
      if (r === N - 1) grid[r][c].d = true;
      if (c === 0) grid[r][c].l = true;
      if (c === N - 1) grid[r][c].r = true;
      if (c < N - 1 && vWall(r, c)) {
        grid[r][c].r = true;
        grid[r][c + 1].l = true;
        count++;
      }
      if (r < N - 1 && hWall(r, c)) {
        grid[r][c].d = true;
        grid[r + 1][c].u = true;
        count++;
      }
    }
    return { grid, geom: { gx: gx + ox, gy: gy + oy, gw, gh }, count, fallback };
  }
  function mzReadManual(data, W, H) {
    return mzSplitStrip(W, H).map((rect) => ({ rect, ...mzWallsFromData(data, W, H, rect) }));
  }
  function detectMazeWalls(img) {
    const { data, W, H } = imageData(img);
    return mzWallsFromData(data, W, H).grid;
  }
  function detectMazeDots(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const w = canvas.width, h = canvas.height;
    const gx = 100 * (w / 440), gy = 122 * (h / 440), gw = 240 * (w / 440), gh = 240 * (h / 440);
    const N = MAZE_SIZE, cw = gw / N, ch = gh / N;
    let rSX = 0, rSY = 0, rCnt = 0;
    let ySX = 0, ySY = 0, yCnt = 0;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const idx = (py * w + px) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if (r > 180 && g < 100 && b < 100) {
          rSX += px;
          rSY += py;
          rCnt++;
        } else if (r > 180 && g > 180 && b < 100) {
          ySX += px;
          ySY += py;
          yCnt++;
        }
      }
    }
    let startPos = null;
    let goalPos = null;
    if (rCnt > 0) {
      const rx = rSX / rCnt, ry = rSY / rCnt;
      startPos = {
        r: Math.min(N - 1, Math.max(0, Math.floor((ry - gy) / ch))),
        c: Math.min(N - 1, Math.max(0, Math.floor((rx - gx) / cw)))
      };
    }
    if (yCnt > 0) {
      const yx = ySX / yCnt, yy = ySY / yCnt;
      goalPos = {
        r: Math.min(N - 1, Math.max(0, Math.floor((yy - gy) / ch))),
        c: Math.min(N - 1, Math.max(0, Math.floor((yx - gx) / cw)))
      };
    }
    return { startPos, goalPos };
  }
  function isDotsImage(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let redCount = 0, yelCount = 0;
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 180 && g < 100 && b < 100) redCount++;
      if (r > 180 && g > 180 && b < 100) yelCount++;
    }
    return redCount > 10 || yelCount > 10;
  }

  // src/modules/simons/simonsSolver.js
  var simonsSolver_exports = {};
  __export(simonsSolver_exports, {
    SINAMES: () => SINAMES,
    SI_POS: () => SI_POS,
    SI_REF: () => SI_REF,
    siAnalyzeFrames: () => siAnalyzeFrames,
    siClassify: () => siClassify,
    siLayoutLooksOff: () => siLayoutLooksOff,
    siLooksLikeSimon: () => siLooksLikeSimon,
    siReadManual: () => siReadManual,
    siStageOf: () => siStageOf,
    siTileRGB: () => siTileRGB,
    siToFlashes: () => siToFlashes,
    simonPresses: () => simonPresses,
    simonRules: () => simonRules
  });
  var SINAMES = { R: "Red", B: "Blue", Y: "Yellow", G: "Green" };
  var simonRules = (table, hasVowel) => table ? table[hasVowel ? "vowel" : "noVowel"] : null;
  var simonPresses = (table, flashes, hasVowel, parity) => flashes.map((c) => simonRules(table, hasVowel)[parity][c]);
  var SI_POS = { B: [0.5, 0.45], R: [0.38, 0.59], G: [0.63, 0.59], Y: [0.5, 0.72] };
  var SI_REF = { B: [21, 101, 192], R: [198, 40, 40], G: [46, 125, 50], Y: [249, 168, 37] };
  var GLOW = 30;
  var dist2 = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  var med = (a) => {
    const s = [...a].sort((x, y) => x - y);
    return s[s.length >> 1];
  };
  function siTileRGB(data, W, H) {
    const r = Math.max(2, Math.round(Math.min(W, H) * 0.025)), o = {};
    for (const k in SI_POS) {
      const cx = Math.round(SI_POS[k][0] * W), cy = Math.round(SI_POS[k][1] * H);
      const s = [0, 0, 0];
      let n = 0;
      for (let y = Math.max(0, cy - r); y <= Math.min(H - 1, cy + r); y++) {
        for (let x = Math.max(0, cx - r); x <= Math.min(W - 1, cx + r); x++) {
          const i = (y * W + x) * 4;
          s[0] += data[i];
          s[1] += data[i + 1];
          s[2] += data[i + 2];
          n++;
        }
      }
      o[k] = s.map((v) => v / (n || 1));
    }
    return o;
  }
  function siStageOf(data, W, H) {
    let n = 0;
    for (const fx of [0.38, 0.442, 0.5, 0.558, 0.62]) {
      const cx = Math.round(fx * W), cy = Math.round(0.264 * H);
      let m = 0;
      for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = (y * W + x) * 4;
        m = Math.max(m, data[i], data[i + 1], data[i + 2]);
      }
      if (m >= 120) n++;
    }
    return n;
  }
  function siClassify(list) {
    const base = {};
    for (const k in SI_REF) {
      let b = SI_REF[k];
      if (list.length >= 3) {
        const m = [0, 1, 2].map((c) => med(list.map((l) => l[k][c])));
        if (dist2(m, SI_REF[k]) <= 25) b = m;
      }
      base[k] = b;
    }
    return list.map((l) => {
      let best = null, bs = GLOW;
      for (const k in l) {
        const s = dist2(l[k], base[k]);
        if (s > bs) {
          bs = s;
          best = k;
        }
      }
      return best;
    });
  }
  function siToFlashes(cols) {
    const fl = [];
    let prev = null;
    cols.forEach((c) => {
      if (c) {
        if (c !== prev) fl.push({ c, n: 1 });
        else fl[fl.length - 1].n++;
      }
      prev = c;
    });
    return fl;
  }
  function siLayoutLooksOff(rgb) {
    return Object.keys(SI_REF).filter((k) => dist2(rgb[k], SI_REF[k]) > 80).length >= 2;
  }
  var UNLIT = 60;
  function siLooksLikeSimon(rgb) {
    return Object.keys(SI_REF).filter((k) => dist2(rgb[k], SI_REF[k]) <= UNLIT).length >= 3;
  }
  var CELL_TOL = 60;
  var MANUAL_ROWS = [["noVowel", "odd"], ["noVowel", "even"], ["vowel", "odd"], ["vowel", "even"]];
  function hueClass(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn < 60) return null;
    let h;
    if (mx === r) h = (60 * ((g - b) / (mx - mn)) + 360) % 360;
    else if (mx === g) h = 60 * ((b - r) / (mx - mn)) + 120;
    else h = 60 * ((r - g) / (mx - mn)) + 240;
    if (h < 20 || h >= 330) return "R";
    if (h >= 30 && h < 70) return "Y";
    if (h >= 85 && h < 170) return "G";
    if (h >= 190 && h < 260) return "B";
    return null;
  }
  function siReadManual(data, W, H) {
    const cls = new Int8Array(W * H).fill(-1), keys = Object.keys(SI_REF);
    for (let p = 0, i = 0; p < W * H; p++, i += 4) {
      for (let k = 0; k < 4; k++) {
        if (dist2([data[i], data[i + 1], data[i + 2]], SI_REF[keys[k]]) <= CELL_TOL) {
          cls[p] = k;
          break;
        }
      }
    }
    const seen = new Uint8Array(W * H), stack = new Int32Array(W * H), cells = [];
    for (let p0 = 0; p0 < W * H; p0++) {
      if (cls[p0] < 0 || seen[p0]) continue;
      const k = cls[p0];
      let sp = 0, n = 0, x0 = W, x1 = -1, y0 = H, y1 = -1;
      stack[sp++] = p0;
      seen[p0] = 1;
      while (sp) {
        const p = stack[--sp], x = p % W, y = (p - x) / W;
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (x > 0 && cls[p - 1] === k && !seen[p - 1]) {
          seen[p - 1] = 1;
          stack[sp++] = p - 1;
        }
        if (x < W - 1 && cls[p + 1] === k && !seen[p + 1]) {
          seen[p + 1] = 1;
          stack[sp++] = p + 1;
        }
        if (y > 0 && cls[p - W] === k && !seen[p - W]) {
          seen[p - W] = 1;
          stack[sp++] = p - W;
        }
        if (y < H - 1 && cls[p + W] === k && !seen[p + W]) {
          seen[p + W] = 1;
          stack[sp++] = p + W;
        }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (bw >= W * 0.08 && bh >= H * 0.08 && n >= bw * bh * 0.5) {
        cells.push({ c: keys[k], x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
      }
    }
    if (cells.length !== 16) return null;
    cells.sort((a, b) => a.cy - b.cy);
    const rows = [0, 1, 2, 3].map((r) => cells.slice(r * 4, r * 4 + 4).sort((a, b) => a.cx - b.cx));
    const rowH = rows[0][0].y1 - rows[0][0].y0;
    for (const row of rows) if (row[3].cy - row[0].cy > rowH * 0.5) return null;
    for (let c = 0; c < 4; c++) {
      for (const row of rows) if (Math.abs(row[c].cx - rows[0][c].cx) > (rows[0][c].x1 - rows[0][c].x0) * 0.3) return null;
    }
    const headBottom = rows[0].reduce((m, c) => Math.min(m, c.y0), H) - 2;
    const flashOf = rows[0].map((col) => {
      const votes = { R: 0, B: 0, Y: 0, G: 0 };
      for (let y = 0; y < headBottom; y++) for (let x = col.x0; x <= col.x1; x++) {
        const i = (y * W + x) * 4, h = hueClass(data[i], data[i + 1], data[i + 2]);
        if (h) votes[h]++;
      }
      const best = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0];
      return votes[best] >= 20 ? best : null;
    });
    if (flashOf.some((f) => !f) || new Set(flashOf).size !== 4) return null;
    const table = { noVowel: { odd: {}, even: {} }, vowel: { odd: {}, even: {} } };
    MANUAL_ROWS.forEach(([v, p], r) => rows[r].forEach((cell, c) => {
      table[v][p][flashOf[c]] = cell.c;
    }));
    return table;
  }
  function siAnalyzeFrames(frames, W, H) {
    const rgb = frames.map((fr) => siTileRGB(fr.data, W, H));
    if (!rgb.some(siLooksLikeSimon)) {
      return { color: null, flashes: [], stage: 0, warn: false, strip: "", thumbIndex: 0, notSimon: true };
    }
    const cols = siClassify(rgb);
    const fl = siToFlashes(cols);
    const last = fl.length ? fl[fl.length - 1].c : null;
    const stage = siStageOf(frames[0].data, W, H);
    let thumbIndex = 0;
    for (let i = cols.length - 1; i >= 0; i--) if (cols[i] && cols[i] === last) {
      thumbIndex = i;
      break;
    }
    return {
      color: last,
      flashes: fl.map((x) => x.c),
      stage,
      warn: siLayoutLooksOff(rgb[0]),
      strip: cols.map((c) => c || "\xB7").join(""),
      thumbIndex,
      notSimon: false
    };
  }

  // src/modules/knob/knobManual.js
  var knobManual_exports = {};
  __export(knobManual_exports, {
    knobManualText: () => knobManualText,
    readKnobManual: () => readKnobManual
  });
  var isX = (r, g, b) => r > 180 && g > 140 && b < 100 && r - b > 120;
  var isO = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) < 40 && r > 90 && r < 185 && b > r;
  var isTitle = (r, g, b) => r > 200 && g > 150 && b > 95 && b < 190 && r - b > 60;
  function pieces(mask, W, H) {
    const seen = new Uint8Array(W * H), out = [];
    const stack = [];
    for (let s = 0; s < W * H; s++) {
      if (!mask[s] || seen[s]) continue;
      seen[s] = 1;
      stack.push(s);
      let n = 0, sx = 0, sy = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
      while (stack.length) {
        const p = stack.pop(), x = p % W, y = (p - x) / W;
        n++;
        sx += x;
        sy += y;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const q = ny * W + nx;
            if (mask[q] && !seen[q]) {
              seen[q] = 1;
              stack.push(q);
            }
          }
        }
      }
      out.push({ x0, y0, x1, y1, n, cx: sx / n, cy: sy / n });
    }
    return out;
  }
  function rowsOf(items) {
    const h = items.map((i) => i.y1 - i.y0 + 1).sort((a, b) => a - b)[items.length >> 1] || 1;
    const sorted = items.slice().sort((a, b) => a.cy - b.cy);
    const rows = [];
    for (const it of sorted) {
      const row = rows[rows.length - 1];
      if (row && it.cy - row[row.length - 1].cy < h * 0.5) row.push(it);
      else rows.push([it]);
    }
    return rows.map((r) => r.sort((a, b) => a.cx - b.cx));
  }
  var DIRS = ["UP", "DOWN", "LEFT", "RIGHT"];
  function titleDir(letters) {
    if (letters.length === 2) return "UP";
    if (letters.length === 5) return "RIGHT";
    if (letters.length === 4) return letters.some((l) => (l.x1 - l.x0 + 1) / (l.y1 - l.y0 + 1) > 1.1) ? "DOWN" : "LEFT";
    return null;
  }
  function readKnobManual(data, W, H) {
    const edge = /* @__PURE__ */ new Map();
    const add = (x, y) => {
      const i = (y * W + x) * 4;
      const k = `${data[i] >> 2},${data[i + 1] >> 2},${data[i + 2] >> 2}`;
      edge.set(k, (edge.get(k) || 0) + 1);
    };
    for (let x = 0; x < W; x++) {
      add(x, 0);
      add(x, H - 1);
    }
    for (let y = 0; y < H; y++) {
      add(0, y);
      add(W - 1, y);
    }
    const page = [...edge.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map((v) => Number(v) * 4 + 2);
    const notPage = new Uint8Array(W * H);
    const xMask = new Uint8Array(W * H), oMask = new Uint8Array(W * H), tMask = new Uint8Array(W * H);
    for (let p = 0, i = 0; p < W * H; p++, i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if ((r - page[0]) ** 2 + (g - page[1]) ** 2 + (b - page[2]) ** 2 > 60) notPage[p] = 1;
      if (isX(r, g, b)) xMask[p] = 1;
      else if (isO(r, g, b)) oMask[p] = 1;
      else if (isTitle(r, g, b)) tMask[p] = 1;
    }
    const panelBoxes = pieces(notPage, W, H).filter((c) => c.n >= W * H * 0.08);
    if (panelBoxes.length !== 4) return { ok: false, reason: `found ${panelBoxes.length} panels (need 4)`, dirs: null, panels: [], problems: [] };
    const inBox = (c, b) => c.cx >= b.x0 && c.cx <= b.x1 && c.cy >= b.y0 && c.cy <= b.y1;
    const marks = [
      ...pieces(xMask, W, H).map((c) => ({ ...c, v: "X" })),
      ...pieces(oMask, W, H).map((c) => ({ ...c, v: "O" }))
    ];
    const big = marks.map((m) => m.n).sort((a, b) => b - a)[Math.min(marks.length - 1, 20)] || 1;
    const cells = marks.filter((m) => m.n >= big * 0.3);
    const titleBits = pieces(tMask, W, H);
    const problems = [];
    const panels = rowsOf(panelBoxes).flat().map((b, k) => {
      const mine = cells.filter((c) => inBox(c, b));
      const rows = rowsOf(mine).map((r) => r.map((c) => c.v).join(""));
      const tb = titleBits.filter((c) => inBox(c, b));
      const tbig = Math.max(0, ...tb.map((c) => c.n));
      const letters = tb.filter((c) => c.n >= tbig * 0.15);
      const dir = titleDir(letters) || DIRS[k];
      if (rows.length !== 8 || rows.some((r) => r.length !== 6)) problems.push(`${dir}: read ${rows.length} rows of ${rows.map((r) => r.length).join("/")} (need 8 of 6)`);
      return { dir, box: { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }, rows, titleRead: Boolean(titleDir(letters)) };
    });
    const dirs = {};
    for (const p of panels) {
      if (dirs[p.dir]) problems.push(`two panels titled ${p.dir}`);
      dirs[p.dir] = p.rows;
    }
    const missing = DIRS.filter((d) => !dirs[d]);
    if (missing.length) problems.push(`no ${missing.join(", ")} panel`);
    return { ok: !problems.length, reason: problems[0], dirs, panels, problems };
  }
  function knobManualText(dirs, stamp = "") {
    const parts = DIRS.filter((d) => dirs[d]).map((d) => `${d}:
${dirs[d].join("\n")}`);
    return (stamp ? `${stamp}
` : "") + parts.join("\n\n");
  }

  // src/modules/knob/knobSolver.js
  var knobSolver_exports = {};
  __export(knobSolver_exports, {
    KEY: () => KEY,
    countLit: () => countLit,
    findPatternDir: () => findPatternDir,
    parseKnobRules: () => parseKnobRules,
    solveKnob: () => solveKnob
  });
  var KEY = "bombvision_knob_rules";
  function parseKnobRules(text) {
    const rules = { UP: [], DOWN: [], LEFT: [], RIGHT: [] };
    let curDir = null;
    const lines = String(text || "").split(/\r?\n/);
    for (const raw of lines) {
      const l = raw.trim().toUpperCase();
      if (l.startsWith("UP")) {
        curDir = "UP";
        continue;
      }
      if (l.startsWith("DOWN")) {
        curDir = "DOWN";
        continue;
      }
      if (l.startsWith("LEFT")) {
        curDir = "LEFT";
        continue;
      }
      if (l.startsWith("RIGHT")) {
        curDir = "RIGHT";
        continue;
      }
      const match = l.match(/[XO01]{6}/);
      if (match && curDir && rules[curDir]) {
        const pat = match[0].replace(/1/g, "X").replace(/0/g, "O");
        if (!rules[curDir].includes(pat)) rules[curDir].push(pat);
      }
    }
    return rules;
  }
  function countLit(pat) {
    return (pat.match(/X/g) || []).length;
  }
  function findPatternDir(pat, rules) {
    if (!pat || pat.length !== 6) return null;
    for (const dir of ["UP", "DOWN", "LEFT", "RIGHT"]) {
      if (rules[dir] && rules[dir].includes(pat)) {
        return dir;
      }
    }
    return null;
  }
  function solveKnob(topPat, botPat, disarmed, rules) {
    const dirTop = findPatternDir(topPat, rules);
    const dirBot = findPatternDir(botPat, rules);
    const litTop = countLit(topPat);
    const litBot = countLit(botPat);
    if (!dirTop && !dirBot) {
      return { ok: false, msg: "No matching pattern found for top or bottom row" };
    }
    const isOdd = disarmed % 2 !== 0;
    let chosenDir = null;
    let reason = "";
    if (dirTop && !dirBot) {
      chosenDir = dirTop;
      reason = `Only Top Row matched (${topPat} \u2192 ${dirTop})`;
    } else if (!dirTop && dirBot) {
      chosenDir = dirBot;
      reason = `Only Bottom Row matched (${botPat} \u2192 ${dirBot})`;
    } else {
      if (isOdd) {
        if (litTop > litBot) {
          chosenDir = dirTop;
        } else if (litBot > litTop) {
          chosenDir = dirBot;
        } else {
          chosenDir = dirTop;
        }
        reason = `Disarmed count (${disarmed}) is ODD \u2192 pick row with MOST lit lights (${litTop} vs ${litBot})`;
      } else {
        if (litTop < litBot) {
          chosenDir = dirTop;
        } else if (litBot < litTop) {
          chosenDir = dirBot;
        } else {
          chosenDir = dirTop;
        }
        reason = `Disarmed count (${disarmed}) is EVEN \u2192 pick row with FEWEST lit lights (${litTop} vs ${litBot})`;
      }
    }
    const arrowMap = { "UP": "\u2B06\uFE0F", "DOWN": "\u2B07\uFE0F", "LEFT": "\u2B05\uFE0F", "RIGHT": "\u27A1\uFE0F" };
    return {
      ok: true,
      direction: chosenDir,
      arrow: arrowMap[chosenDir] || "",
      topPat,
      dirTop,
      litTop,
      botPat,
      dirBot,
      litBot,
      disarmed,
      isOdd,
      reason
    };
  }

  // src/modules/knob/knobVision.js
  var knobVision_exports = {};
  __export(knobVision_exports, {
    detectKnobStateFromImage: () => detectKnobStateFromImage,
    readKnobLeds: () => readKnobLeds
  });
  var isLit = (r, g, b) => r > 180 && g > 120 && b < 120 && r - b > 100;
  var UNLIT2 = [42, 47, 54];
  var isUnlit = (r, g, b) => Math.abs(r - UNLIT2[0]) + Math.abs(g - UNLIT2[1]) + Math.abs(b - UNLIT2[2]) <= 18;
  var GRID_X = [0, 1, 2, 3, 4, 5].map((i) => (90 + 52 * i) / 440);
  var GRID_Y = [150 / 440, 210 / 440];
  function lampBlobs(cls, W, H) {
    const seen = new Uint8Array(W * H), stack = new Int32Array(W * H), out = [];
    const min = Math.min(W, H) * 0.04, max = Math.min(W, H) * 0.12;
    for (let p0 = 0; p0 < W * H; p0++) {
      if (!cls[p0] || seen[p0]) continue;
      const k = cls[p0];
      let sp = 0, n = 0, x0 = W, x1 = -1, y0 = H, y1 = -1;
      stack[sp++] = p0;
      seen[p0] = 1;
      while (sp) {
        const p = stack[--sp], x = p % W, y = (p - x) / W;
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (x > 0 && cls[p - 1] === k && !seen[p - 1]) {
          seen[p - 1] = 1;
          stack[sp++] = p - 1;
        }
        if (x < W - 1 && cls[p + 1] === k && !seen[p + 1]) {
          seen[p + 1] = 1;
          stack[sp++] = p + 1;
        }
        if (y > 0 && cls[p - W] === k && !seen[p - W]) {
          seen[p - W] = 1;
          stack[sp++] = p - W;
        }
        if (y < H - 1 && cls[p + W] === k && !seen[p + W]) {
          seen[p + W] = 1;
          stack[sp++] = p + W;
        }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (bw >= min && bw <= max && bh >= min && bh <= max && Math.abs(bw - bh) <= Math.max(bw, bh) * 0.3 && n >= bw * bh * 0.45) {
        out.push({ lit: k === 1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, size: Math.max(bw, bh) });
      }
    }
    return out;
  }
  function readKnobLeds(data, W, H) {
    const cls = new Uint8Array(W * H);
    for (let p = 0, i = 0; p < W * H; p++, i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      cls[p] = isLit(r, g, b) ? 1 : isUnlit(r, g, b) ? 2 : 0;
    }
    const blobs = lampBlobs(cls, W, H).sort((a, b) => a.cy - b.cy);
    if (blobs.length === 12) {
      const top = blobs.slice(0, 6).sort((a, b) => a.cx - b.cx), bot = blobs.slice(6).sort((a, b) => a.cx - b.cx);
      const size = blobs[0].size;
      const flat = (row) => row[5].cy - row[0].cy < size * 0.5 && Math.abs(row[0].cy - row[5].cy) < size;
      const sameRows = Math.min(...bot.map((b) => b.cy)) - Math.max(...top.map((t) => t.cy)) > size;
      if (flat(top) && flat(bot) && sameRows) {
        return { state: [...top, ...bot].map((b) => b.lit ? 1 : 0), how: "lamps" };
      }
    }
    const rad = Math.max(2, Math.round(Math.min(W, H) * 0.025));
    const state = [], lampLike = [];
    for (const fy of GRID_Y) for (const fx of GRID_X) {
      const cx = Math.round(fx * W), cy = Math.round(fy * H);
      let lit = 0, unlit = 0, n = 0;
      for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        n++;
        const c = cls[y * W + x];
        if (c === 1) lit++;
        else if (c === 2) unlit++;
      }
      state.push(lit > n * 0.3 ? 1 : 0);
      lampLike.push(lit + unlit > n * 0.5);
    }
    let gapsClear = 0;
    for (const fy of GRID_Y) for (let c = 0; c < 5; c++) {
      const x = Math.round((GRID_X[c] + GRID_X[c + 1]) / 2 * W), y = Math.round(fy * H);
      if (x >= 0 && y >= 0 && x < W && y < H && !cls[y * W + x]) gapsClear++;
    }
    if (lampLike.filter(Boolean).length >= 11 && gapsClear >= 9) return { state, how: "grid" };
    return null;
  }
  async function detectKnobStateFromImage(img) {
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const leds = readKnobLeds(ctx.getImageData(0, 0, W, H).data, W, H);
    if (leds) return leds.state;
    try {
      const worker = await ensureOCRWorker();
      await worker.setParameters({ tessedit_char_whitelist: "XO01 \n\r	", tessedit_pageseg_mode: "6", user_defined_dpi: "150" });
      const { data } = await worker.recognize(canvas);
      const text = data.text.toUpperCase().replace(/[01]/g, (m) => m === "1" ? "X" : "O");
      const matches = text.match(/[XO]{6}/g);
      if (matches && matches.length >= 2) {
        return [...matches[0], ...matches[1]].map((c) => c === "X" ? 1 : 0);
      }
    } catch (e) {
    }
    return null;
  }

  // src/modules/wireseq/wireseqManual.js
  var wireseqManual_exports = {};
  __export(wireseqManual_exports, {
    isWireManual: () => isWireManual,
    readWireManual: () => readWireManual,
    wireManualText: () => wireManualText
  });
  var PAGE = [31, 34, 40];
  var d2 = (data, i, c) => (data[i] - c[0]) ** 2 + (data[i + 1] - c[1]) ** 2 + (data[i + 2] - c[2]) ** 2;
  var isYellow = (r, g, b) => r > 150 && g > 110 && b < 110 && r - b > 90 && g - b > 60;
  function components(mask, w, h) {
    const lab = new Int32Array(w * h), comps = [];
    for (let s = 0; s < w * h; s++) {
      if (!mask[s] || lab[s]) continue;
      const id = comps.length + 1, st = [s];
      lab[s] = id;
      let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
      while (st.length) {
        const p = st.pop(), px = p % w, py = p / w | 0;
        n++;
        if (px < x0) x0 = px;
        if (px > x1) x1 = px;
        if (py < y0) y0 = py;
        if (py > y1) y1 = py;
        for (const q of [p - 1, p + 1, p - w, p + w]) {
          if (q < 0 || q >= w * h) continue;
          if (q === p - 1 && px === 0 || q === p + 1 && px === w - 1) continue;
          if (mask[q] && !lab[q]) {
            lab[q] = id;
            st.push(q);
          }
        }
      }
      comps.push({ id, x0, y0, x1, y1, n, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    return { lab, comps };
  }
  function holes(lab, id, W, g) {
    const w = g.w + 2, h = g.h + 2, bg = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = g.x0 + x - 1, Y = g.y0 + y - 1;
      const inside = x > 0 && y > 0 && x < w - 1 && y < h - 1;
      bg[y * w + x] = inside && lab[Y * W + X] === id ? 0 : 1;
    }
    const { comps } = components(bg, w, h);
    return comps.filter((c) => c.x0 > 0 && c.y0 > 0 && c.x1 < w - 1 && c.y1 < h - 1 && c.n >= 2).length;
  }
  function letterOf(lab, g, W) {
    const at = (x, y) => lab[(g.y0 + y) * W + g.x0 + x] === g.id;
    const rowWidth = (y) => {
      let a = -1, b = -1;
      for (let x = 0; x < g.w; x++) if (at(x, y)) {
        if (a < 0) a = x;
        b = x;
      }
      return a < 0 ? 0 : b - a + 1;
    };
    const band = (y0, y1) => {
      let s = 0, n = 0;
      for (let y = y0; y <= y1; y++) {
        s += rowWidth(y);
        n++;
      }
      return s / (n || 1);
    };
    const q = Math.max(1, Math.round(g.h * 0.2));
    const pointed = band(0, q - 1) < 0.6 * band(g.h - q, g.h - 1);
    let leftRows = 0;
    const lw = Math.max(1, Math.round(g.w * 0.2));
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < lw; x++) if (at(x, y)) {
        leftRows++;
        break;
      }
    }
    const straightLeft = leftRows >= g.h * 0.85;
    const h = holes(lab, g.id, W, g);
    if (h >= 2) return "B";
    if (h === 1) return pointed || !straightLeft ? "A" : "B";
    return pointed ? "A" : "C";
  }
  function readWireManual(data, W, H) {
    const problems = [];
    const ink = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) ink[p] = d2(data, p * 4, PAGE) > 120 ? 1 : 0;
    const { comps } = components(ink, W, H);
    const big = comps.filter((c) => c.w >= W * 0.08 && c.h >= H * 0.04 && c.n >= c.w * c.h * 0.6);
    if (big.length < 30) return { ok: false, problems: ["not the Wire Sequences manual (table cells not found)"] };
    const mean = (b) => {
      const s = [0, 0, 0];
      let n = 0;
      for (let y = Math.round(b.y0 + b.h * 0.15); y <= b.y1 - b.h * 0.15; y++) for (let x = b.x0 + 3; x <= b.x1 - 3; x++) {
        const i = (y * W + x) * 4;
        s[0] += data[i];
        s[1] += data[i + 1];
        s[2] += data[i + 2];
        n++;
      }
      return s.map((v) => v / (n || 1));
    };
    big.forEach((b) => {
      b.rgb = mean(b);
    });
    const pick = (test) => big.filter((b) => test(...b.rgb)).sort((a, b) => b.n - a.n)[0];
    const red = pick((r, g, b) => r > 150 && r - g > 80 && r - b > 80);
    const blue = pick((r, g, b) => b > 150 && b - r > 80);
    const top = red || blue;
    const black = top && big.filter((b) => b !== red && b !== blue && Math.abs(b.cy - top.cy) < top.h * 0.5).filter((b) => Math.max(...b.rgb) < 110).sort((a, b) => b.cx - a.cx)[0];
    if (!red || !blue || !black) return { ok: false, problems: ["Red / Blue / Black headers not found"] };
    const cols = [["red", red], ["blue", blue], ["black", black]];
    const lineY = Math.max(red.y1, blue.y1, black.y1);
    const rules = { red: {}, blue: {}, black: {} }, cells = [];
    const ylab = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) ylab[p] = isYellow(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]) ? 1 : 0;
    const { lab, comps: glyphs } = components(ylab, W, H);
    for (const [color, head] of cols) {
      const col = big.filter((b) => b.y0 > lineY && Math.abs(b.cx - head.cx) < head.w * 0.4).sort((a, b) => a.y0 - b.y0);
      if (col.length !== 9) problems.push(`${color}: ${col.length} cells (need 9)`);
      col.slice(0, 9).forEach((cell, k) => {
        const inCell = glyphs.filter((g) => g.x0 >= cell.x0 && g.x1 <= cell.x1 && g.y0 >= cell.y0 && g.y1 <= cell.y1);
        const tall = Math.max(0, ...inCell.map((g) => g.h));
        const letters = inCell.filter((g) => g.h >= tall * 0.7).sort((a, b) => a.x0 - b.x0);
        let read = letters.map((g) => letterOf(lab, g, W));
        let sure = true;
        if (letters.length === 3) {
          if (read.join("") !== "ABC") sure = false;
          read = ["A", "B", "C"];
        } else if (!letters.length || letters.length > 3) {
          sure = false;
          problems.push(`${color} ${k + 1}: ${letters.length} letters`);
        } else if (new Set(read).size !== read.length || read.join("") !== [...read].sort().join("")) {
          sure = false;
          problems.push(`${color} ${k + 1}: read ${read.join(", ")}`);
        }
        rules[color][k + 1] = [...new Set(read)].sort();
        cells.push({ color, n: k + 1, letters: rules[color][k + 1], box: { x0: cell.x0, y0: cell.y0, x1: cell.x1, y1: cell.y1 }, sure });
      });
    }
    return { ok: !problems.length, rules, problems, cells };
  }
  var ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"];
  function wireManualText(rules, stamp = "") {
    const lines = [];
    for (const color of ["red", "blue", "black"]) {
      lines.push(color[0].toUpperCase() + color.slice(1));
      for (let n = 1; n <= 9; n++) {
        const L = rules[color] && rules[color][n] || [];
        if (!L.length) continue;
        const list = L.length === 1 ? L[0] : L.length === 2 ? `${L[0]} or ${L[1]}` : `${L.slice(0, -1).join(", ")} or ${L[L.length - 1]}`;
        lines.push(`* ${ORD[n - 1]} ${color} occurrence: cut if connected to ${list}.`);
      }
      lines.push("");
    }
    return (stamp ? stamp + "\n" : "") + lines.join("\n").trim();
  }
  var isWireManual = (res) => Boolean(res && res.rules && res.cells && res.cells.length >= 20);

  // src/modules/wireseq/wireseqRules.js
  var wireseqRules_exports = {};
  __export(wireseqRules_exports, {
    WS_DEFAULT_MANUAL: () => WS_DEFAULT_MANUAL,
    WS_STAGES: () => WS_STAGES,
    wsBlankStage: () => wsBlankStage,
    wsCountsBefore: () => wsCountsBefore,
    wsParseManual: () => wsParseManual,
    wsParseQuick: () => wsParseQuick,
    wsReadImage: () => wsReadImage,
    wsSolveAll: () => wsSolveAll
  });
  var WS_DEFAULT_MANUAL = `Red
* first red occurrence: cut if connected to A, B or C.
* second red occurrence: cut if connected to A.
* third red occurrence: cut if connected to B.
* fourth red occurrence: cut if connected to C.
* fifth red occurrence: cut if connected to A, B or C.
* sixth red occurrence: cut if connected to B or C.
* seventh red occurrence: cut if connected to B or C.
* eighth red occurrence: cut if connected to A or B.
* ninth red occurrence: cut if connected to C.

Blue
* first blue occurrence: cut if connected to A.
* second blue occurrence: cut if connected to A or C.
* third blue occurrence: cut if connected to A or B.
* fourth blue occurrence: cut if connected to B.
* fifth blue occurrence: cut if connected to C.
* sixth blue occurrence: cut if connected to A or C.
* seventh blue occurrence: cut if connected to B.
* eighth blue occurrence: cut if connected to A or B.
* ninth blue occurrence: cut if connected to A or B.

Black
* first black occurrence: cut if connected to A or B.
* second black occurrence: cut if connected to B.
* third black occurrence: cut if connected to A.
* fourth black occurrence: cut if connected to B.
* fifth black occurrence: cut if connected to A or B.
* sixth black occurrence: cut if connected to A, B or C.
* seventh black occurrence: cut if connected to A, B or C.
* eighth black occurrence: cut if connected to A or C.
* ninth black occurrence: cut if connected to C.`;
  var WS_ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9 };
  function wsParseManual(text) {
    const out = {};
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim().replace(/^[*\u2022\-]+/, "").trim().toLowerCase();
      const m = line.match(/^(\w+)\s+(red|blue|black)\s+occurrence:.*connected to\s+(.+?)\.?$/);
      if (!m || !(m[1] in WS_ORD)) continue;
      const letters = new Set((m[3].match(/\b[abc]\b/g) || []).map((s) => s.toUpperCase()));
      (out[m[2]] = out[m[2]] || {})[WS_ORD[m[1]]] = letters;
    }
    return out;
  }
  var WS_STAGES = 5;
  var wsBlankStage = () => [{ c: null, d: null }, { c: null, d: null }, { c: null, d: null }];
  function wsSolveAll(stages, rules) {
    const counts = { red: 0, blue: 0, black: 0 };
    return stages.map((stage) => stage.map((w, i) => {
      if (!w.c || !w.d) return { i, state: "empty" };
      counts[w.c]++;
      const n = counts[w.c];
      const rule = rules[w.c] && rules[w.c][n];
      if (!rule) return { i, w, n, state: "norule" };
      return { i, w, n, state: rule.has(w.d) ? "cut" : "skip" };
    }));
  }
  function wsCountsBefore(stages, stageIdx) {
    const c = { red: 0, blue: 0, black: 0 };
    for (let s = 0; s < stageIdx; s++) stages[s].forEach((w) => {
      if (w.c && w.d) c[w.c]++;
    });
    return c;
  }
  function wsParseQuick(text) {
    const out = { panel: [null, null, null], count: 0, clear: false };
    const t = (text || "").trim();
    if (!t) return out;
    if (/^(CLEAR|RESET|NONE|EMPTY)$/i.test(t)) {
      out.clear = true;
      return out;
    }
    let next = 1;
    for (const tok of t.split(/[\s,;]+/).filter(Boolean)) {
      const T = tok.trim().toUpperCase();
      if (!T) continue;
      const nm = T.match(/^([123])[-:]?(NONE|CLEAR|EMPTY)$/);
      if (nm) {
        out.panel[+nm[1] - 1] = { c: null, d: null };
        out.count++;
        continue;
      }
      let slot = null, rest = T;
      const sm = T.match(/^([123])[-:/]*(.*)$/);
      if (sm) {
        slot = +sm[1];
        rest = sm[2];
      }
      rest = rest.replace(/^[^A-Z0-9]+/, "");
      const m = rest.match(/^(.*?)[-:\sTO]*([ABC])$/);
      if (!m) continue;
      const cs = m[1].replace(/[^A-Z]/g, ""), dest = m[2];
      let c = null;
      if (cs === "RED" || cs === "R") c = "red";
      else if (cs === "BLACK" || cs === "BK" || cs === "BLK" || cs === "K") c = "black";
      else if (["BLUE", "BL", "BLU", "U", "B"].includes(cs)) c = "blue";
      if (!c) continue;
      if (slot === null) slot = next++;
      if (slot >= 1 && slot <= 3) {
        out.panel[slot - 1] = { c, d: dest };
        out.count++;
      }
    }
    return out;
  }
  function wsReadImage(img) {
    const { data: d, width: W, height: H } = img;
    const px = (x, y) => {
      const i = (y * W + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    };
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
      if (r > 105 && r - g > 25 && r - b > 25) return "red";
      if (b > 85 && b - r > 18 && b - g > 10) return "blue";
      if (av < darkMed - 6 && av < 50 && ch < 22) return "black";
      return null;
    };
    const LX = 0.234 * W, RX = 0.764 * W;
    const Y = [0.3136, 0.507, 0.702].map((f) => f * H);
    const tol = Math.max(2, Math.round(W / 160));
    const bez = (t) => t * t * (3 - 2 * t);
    const stage = [];
    for (let p = 0; p < 3; p++) {
      const best = { c: null, d: null, f: 0 };
      for (let dst = 0; dst < 3; dst++) {
        const hit = { red: 0, blue: 0, black: 0 };
        const N = 60;
        let tot = 0;
        for (let k = 4; k <= N - 4; k++) {
          const t = k / N, x = LX + (RX - LX) * t, y = Y[p] + (Y[dst] - Y[p]) * bez(t);
          tot++;
          const seen = {};
          for (let dy = -tol; dy <= tol; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = Math.round(x + dx), YY = Math.round(y + dy);
            if (X < 0 || X >= W || YY < 0 || YY >= H) continue;
            const kd = kind(...px(X, YY));
            if (kd) seen[kd] = 1;
          }
          for (const kd in seen) hit[kd]++;
        }
        for (const kd of ["red", "blue", "black"]) {
          const f = hit[kd] / tot;
          if (f > best.f) Object.assign(best, { c: kd, d: "ABC"[dst], f });
        }
      }
      stage.push(best.f >= 0.55 ? { c: best.c, d: best.d } : { c: null, d: null });
    }
    const dotXs = [0.4, 0.45, 0.5, 0.55, 0.6];
    const bins = [0, 0, 0, 0, 0];
    for (let y = Math.floor(H * 0.77); y <= Math.floor(H * 0.88); y++) {
      for (let x = Math.floor(W * 0.33); x <= Math.floor(W * 0.67); x++) {
        const [r, g, b] = px(x, y);
        if (r > 200 && g > 140 && g < 215 && b < 150 && r - b > 70) {
          const xf = x / W;
          let bd = Infinity, bi = -1;
          for (let s = 0; s < 5; s++) {
            const dd = Math.abs(xf - dotXs[s]);
            if (dd < 0.024 && dd < bd) {
              bd = dd;
              bi = s;
            }
          }
          if (bi >= 0) bins[bi]++;
        }
      }
    }
    let stageNo = null, maxCount = 0;
    bins.forEach((n, s) => {
      if (n > maxCount) {
        maxCount = n;
        stageNo = s + 1;
      }
    });
    if (maxCount < 6) stageNo = null;
    return { wires: stage, stageNo };
  }

  // conso-logic-entry.js
  var conso_logic_entry_default = {
    mines: Object.freeze({ ...minesSolver_exports, ...minesVision_exports }),
    queens: Object.freeze({ ...queensConstants_exports, ...queensSolver_exports, ...queensVision_exports }),
    search: Object.freeze({ ...searchGlyphs_exports, ...searchOCR_exports, ...searchSolver_exports }),
    password: Object.freeze({ ...passwordSolver_exports, ...passwordVision_exports }),
    switches: Object.freeze({ ...switchesSolver_exports, ...switchesVision_exports }),
    diagram: Object.freeze({ ...diagramCore_exports }),
    wof: Object.freeze({ ...wofSolver_exports, ...wofOCR_exports }),
    logic: Object.freeze({ ...logicSolver_exports }),
    complexwires: Object.freeze({ ...complexwiresConstants_exports, ...complexwiresVision_exports }),
    symbols: Object.freeze({ ...symbolsConstants_exports, ...symbolsVision_exports }),
    button: Object.freeze({ ...buttonSolver_exports, ...buttonVision_exports }),
    piano: Object.freeze({ ...pianoSolver_exports, ...pianoVision_exports }),
    morse: Object.freeze({ ...morseDecoder_exports, ...gif_exports }),
    maze: Object.freeze({ ...mazeSolver_exports, ...mazeVision_exports }),
    simons: Object.freeze({ ...simonsSolver_exports, ...gif_exports }),
    knobs: Object.freeze({ ...knobManual_exports, ...knobSolver_exports, ...knobVision_exports }),
    wireseq: Object.freeze({ ...wireseqManual_exports, ...wireseqRules_exports })
  };
  return __toCommonJS(conso_logic_entry_exports);
})();
window.BombLogic = __BombLogic.default;
