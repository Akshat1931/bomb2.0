// GENERATED from bomb_boomed (2026-11-24 12:11) by scripts/build-conso-logic.mjs — do not edit here.
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
    const groups2 = /* @__PURE__ */ new Map();
    live.forEach((con) => {
      const g = find(con.cells[0].name);
      if (!groups2.has(g)) groups2.set(g, { cells: /* @__PURE__ */ new Map(), cons: [] });
      const grp = groups2.get(g);
      grp.cons.push(con);
      con.cells.forEach((c) => grp.cells.set(c.name, c));
    });
    const MAX_NODES = 2e6;
    for (const grp of groups2.values()) {
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
        for (let px2 = cx0; px2 < cx1 && px2 < w; px2++) {
          const idx = (py * w + px2) * 4;
          const pr = data[idx], pg = data[idx + 1], pb = data[idx + 2];
          rSum += pr;
          gSum += pg;
          bSum += pb;
          count++;
          if (pr > 160 && pg < 70 && pb < 70) flagPx++;
          cellPixels.push({ px: px2, py, pr, pg, pb });
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
        const sat2 = maxC > 0 ? delta / maxC : 0;
        if (hue >= 245 && hue <= 305 && sat2 > 0.16 || pb > pg + 15 && pr > pg + 10) {
          purplePx++;
        } else if (hue >= 185 && hue <= 242 && sat2 > 0.16 || pb > pr + 20 && pg >= pr - 8 && pb > pg + 8) {
          bluePx++;
        } else if (hue >= 85 && hue <= 165 && sat2 > 0.16 || pg > pr + 15 && pg > pb + 5) {
          greenPx++;
        } else if ((hue >= 340 || hue <= 20) && sat2 > 0.2 || pr > pg + 25 && pr > pb + 25) {
          redPx++;
        } else if (hue >= 20 && hue <= 50 && sat2 > 0.25 || pr > pg + 15 && pg > pb + 15) {
          amberPx++;
        } else if (hue >= 165 && hue <= 188 && sat2 > 0.16 || pg > pr + 15 && pb > pr + 15) {
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
          for (let px2 = cx0; px2 < cx1 && px2 < w; px2++) {
            const idx = (py * w + px2) * 4;
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
      const isInk5 = isBrightBackground ? lumArray[i] < threshold : lumArray[i] >= threshold;
      binary[i] = isInk5 ? 0 : 255;
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
  async function recognizeCell(worker2, padCanvas) {
    const psms = ["10", "6"];
    const candidates2 = [];
    for (const psm of psms) {
      try {
        await worker2.setParameters({
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ012568",
          tessedit_pageseg_mode: psm,
          user_defined_dpi: "150"
        });
        const { data } = await worker2.recognizeWithin(2500, padCanvas);
        const res = { letter: sanitizeSearchLetter(data?.text), conf: Number(data?.confidence ?? 0) };
        if (res.letter) {
          candidates2.push(res);
          if (res.conf >= 60) {
            return { letter: res.letter, confidence: Math.round(res.conf) };
          }
        }
      } catch (_) {
      }
    }
    if (candidates2.length > 0) {
      candidates2.sort((a, b) => b.conf - a.conf);
      return {
        letter: candidates2[0].letter,
        confidence: Math.round(candidates2[0].conf || 50)
      };
    }
    return { letter: "?", confidence: 0 };
  }
  async function recognizeCellConsensus(_worker, padCanvas) {
    const reads = await Promise.all(["6", "8", "13", "10"].map(async (psm) => {
      try {
        const w = await ensureOCRWorker();
        await w.setParameters({
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ012568",
          tessedit_pageseg_mode: psm,
          user_defined_dpi: "300"
        });
        const { data } = await w.recognizeWithin(4e3, padCanvas);
        return { letter: sanitizeSearchLetter(data?.text), conf: Number(data?.confidence ?? 0) };
      } catch (_) {
        return null;
      }
    }));
    const rawResults = reads.filter((r) => r && r.letter);
    if (!rawResults.length) return { letter: "?", confidence: 0 };
    const groups2 = {};
    for (const r of rawResults) {
      const g = groups2[r.letter] || (groups2[r.letter] = { letter: r.letter, count: 0, confs: [], maxConf: 0 });
      g.count++;
      g.confs.push(r.conf);
      g.maxConf = Math.max(g.maxConf, r.conf);
    }
    const options = Object.values(groups2).map((g) => ({
      ...g,
      score: g.count * 60 + g.maxConf + g.confs.reduce((a, b) => a + b, 0) / g.count
    }));
    options.sort((a, b) => b.score - a.score);
    return { letter: options[0].letter, confidence: Math.round(options[0].maxConf || options[0].confs[0] || 50) };
  }

  // src/modules/search/searchGlyphs.js
  var GLYPH_N = 16;
  function cellFeature(data, W2, H, r, c) {
    const { rowCenters, colCenters, cellW, cellH } = getSearchGrid(W2, H);
    const cw = Math.round(cellW * 0.86), ch = Math.round(cellH * 0.86);
    const x0 = Math.max(0, Math.round(colCenters[c] - cw / 2)), y0 = Math.max(0, Math.round(rowCenters[r] - ch / 2));
    const w = Math.min(W2 - x0, cw), h = Math.min(H - y0, ch);
    if (w < 6 || h < 6) return null;
    const L = new Float32Array(w * h);
    const sorted = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * W2 + x0 + x) * 4;
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
        const p = stack.pop(), px2 = p % w, py = p / w | 0;
        area++;
        if (px2 === 0 || py === 0 || px2 === w - 1 || py === h - 1) edge = true;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = px2 + dx, ny = py + dy;
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
              const letter = grid5x5[cr]?.[cc];
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

  // src/modules/search/searchWords.js
  var searchWords_exports = {};
  __export(searchWords_exports, {
    MASTER_SEARCH_WORDS: () => MASTER_SEARCH_WORDS
  });
  var MASTER_SEARCH_WORDS = [
    "ABLE ACID ALSO ARCH AREA ATOM BAKE BALL BAND BANK BASE BATH BEAM BEAR BEAT BELL BELT BEST BIRD BLUE",
    "BOAT BODY BOLD BOOK BOOT BOWL BURN CAFE CAGE CAKE CALL CALM CAMP CAPE CARD CARE CART CASE CAST CAVE",
    "CELL CHAT CHEF CHIP CITY CLAY CLIP CLUB COAL COAT CODE COIN COLD COMB COOK COOL COPY CORE CORN COST",
    "CREW CROP CUBE CURE CURL DARK DATA DAWN DEAL DECK DEEP DESK DIAL DICE DIET DIRT DISH DOCK DOOR DOVE",
    "DRAW DROP DRUM DUCK DUNE DUST DUTY EACH EARN EAST EASY EDGE EMIT EPIC EVEN EXAM EXIT FACE FACT FAIR",
    "FALL FARM FAST FATE FEAR FEED FEEL FEET FELL FELT FILE FILL FILM FIND FINE FIRE FIRM FISH FLAG FLAT",
    "FLOW FOAM FOLD FOLK FONT FOOD FOOT FORK FORM FORT FOUL FREE FROG FROM FUEL FULL FUSE GAIN GAME GATE",
    "GAVE GEAR GIFT GIRL GIVE GLAD GLOW GOAL GOLD GOLF GONE GOOD GRAB GRAY GREW GRID GRIM GROW GULF GUST",
    "HACK HAIL HAIR HALF HALL HALT HAND HANG HARD HARM HARP HASH HATE HAVE HAWK HAZE HEAD HEAL HEAP HEAR",
    "HEAT HELD HELP HERO HIDE HIGH HILL HINT HIRE HOLD HOLE HOME HOOK HOPE HORN HOST HOUR HUGE HUNT HURT",
    "ICON IDEA IDLE INCH INTO IRON ITEM JACK JADE JAZZ JOIN JOKE JUMP JURY JUST KEEN KEEP KEPT KICK KILL",
    "KIND KING KISS KITE KNEE KNOT KNOW LACE LACK LAID LAKE LAMP LAND LANE LAST LATE LAVA LAWN LEAD LEAF",
    "LEAN LEFT LEND LENS LESS LIFE LIFT LIKE LIME LINE LINK LION LIST LIVE LOAD LOAN LOCK LOFT LOGO LONG",
    "LOOK LOOP LORD LOSE LOSS LOST LOVE LUCK LUMP LUNG MADE MAIL MAIN MAKE MALE MALL MANY MAPLE MARK MARS",
    "MASK MASS MATE MATH MAZE MEAL MEAN MEAT MEET MELT MEMO MENU MESH MESS MILD MILE MILK MILL MIND MINE",
    "MINT MISS MIST MODE MOLD MOON MORE MOSS MOST MOVE MUCH MULE MUST MUTE MYTH NAIL NAME NAVY NEAR NEAT",
    "NECK NEED NEST NEWS NEXT NICE NICK NINE NODE NONE NOON NORM NOSE NOTE NOUN NOVA NUMB OATH OBEY ODDS",
    "OKAY ONCE ONLY ONTO OPEN ORAL OVEN OVER PACE PACK PAGE PAID PAIN PAIR PALM PANE PARK PART PASS PAST",
    "PEAK PEAR PEEL PEER PICK PIER PILE PINE PINK PIPE PLAN PLAY PLOT PLUG PLUS POEM POET POLE POLL POND",
    "POOL POOR PORT POST POUR PRAY PREY PULL PUMP PURE PUSH QUIT RACE RACK RAFT RAGE RAID RAIL RAIN RANK",
    "RARE RATE READ REAL REAR REED REEL RELY RENT REST RICE RICH RIDE RING RISE RISK ROAD ROAR ROBE ROCK",
    "ROLE ROLL ROOF ROOM ROOT ROPE ROSE RUIN RULE RUSH RUST SAFE SAIL SAKE SALE SALT SAME SAND SAVE SCAN",
    "SEAL SEAT SEED SEEK SEEM SEEN SELF SELL SEND SENT SHIP SHOP SHOT SHOW SHUT SICK SIDE SIGN SILK SING",
    "SINK SITE SIZE SKIN SKIP SLAB SLAM SLAP SLIM SLIP SLOT SLOW SNAP SNOW SOAK SOAP SOFA SOFT SOIL SOLD",
    "SOLE SOME SONG SOON SORT SOUL SOUP SOUR SPAN SPIN SPOT STAR STAY STEM STEP STEW STOP SUCH SUIT SURE",
    "SURF SWAN SWIM TAIL TAKE TALE TALK TALL TANK TAPE TASK TEAM TEAR TELL TENT TERM TEST TEXT THAN THAT",
    "THEM THEN THEY THIN THIS TICK TIDE TILE TILL TIME TINY TIRE TOAD TOLD TOLL TONE TOOK TOOL TORN TOSS",
    "TOUR TOWN TRAP TREE TREK TRIM TRIP TRUE TUBE TUNE TURN TWIN TYPE TYPO UNIT UPON URGE USED USER VAIN",
    "VALE VAST VEIL VEIN VENT VERB VERY VEST VICE VIEW VINE VISA VOID VOTE WADE WAGE WAIT WAKE WALK WALL",
    "WANT WARD WARM WARN WASH WAVE WEAK WEAR WEED WEEK WELL WENT WERE WEST WHAT WHEN WHIP WIDE WIFE WILD",
    "WILL WIND WINE WING WINK WIPE WIRE WISE WISH WITH WOLF WOOD WOOL WORD WORK WORM WORN WRAP YARD YARN",
    "YEAR YELL YOGA YOKE YOUR ZERO ZONE ZOOM"
  ].join(" ");

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
    const W2 = Math.round(img.naturalWidth * sc), H = Math.round(img.naturalHeight * sc);
    const cv = document.createElement("canvas");
    cv.width = W2;
    cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, W2, H);
    return g.getImageData(0, 0, W2, H);
  }
  function findLetterBoxes(imgData) {
    const { data, width: W2, height: H } = imgData;
    const mask = new Uint8Array(W2 * H);
    const colInk = new Int32Array(W2);
    for (let p = 0, i = 0; p < W2 * H; p++, i += 4) {
      if (isInk(data[i], data[i + 1], data[i + 2])) {
        mask[p] = 1;
        colInk[p % W2]++;
      }
    }
    const runs4 = [];
    let start = -1;
    for (let x = 0; x <= W2; x++) {
      const on = x < W2 && colInk[x] > 0;
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        runs4.push([start, x - 1]);
        start = -1;
      }
    }
    const merged = [];
    for (const r of runs4) {
      const last = merged[merged.length - 1];
      if (last && r[0] - last[1] <= 2) last[1] = r[1];
      else merged.push([...r]);
    }
    let boxes = merged.map(([x0, x1]) => {
      let y0 = H, y1 = -1, n = 0;
      for (let y = 0; y < H; y++) for (let x = x0; x <= x1; x++) if (mask[y * W2 + x]) {
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
    return { mask, W: W2, H, boxes };
  }
  function glyphCanvas(mask, W2, boxes, gap = 0) {
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
        if (mask[(b.y0 + y) * W2 + b.x0 + x]) g.fillRect(ox + Math.floor(x * scale), oy + Math.floor(y * scale), Math.ceil(scale), Math.ceil(scale));
      }
      ox += widths[i] + gap;
    });
    return cv;
  }
  var clean = (t) => (t || "").toUpperCase().replace(/0/g, "O").replace(/1/g, "I").replace(/5/g, "S").replace(/8/g, "B").replace(/2/g, "Z").replace(/6/g, "G").replace(/[^A-Z]/g, "");
  async function readPasswordRow(img, allowed = null, onStatus = () => {
  }) {
    const { mask, W: W2, boxes } = findLetterBoxes(toData(img));
    if (boxes.length !== 5) {
      return { ok: false, reason: `Found ${boxes.length} letters instead of 5 \u2014 type the row instead.` };
    }
    onStatus("Starting OCR\u2026");
    const worker2 = await ensureOCRWorker();
    onStatus("Reading the row\u2026");
    let line = "", lineConf = 0;
    try {
      await worker2.setParameters({ tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", tessedit_pageseg_mode: "7" });
      const { data } = await worker2.recognize(glyphCanvas(mask, W2, boxes, 28));
      line = clean(data && data.text);
      lineConf = Number(data && data.confidence || 0);
    } catch (e) {
    }
    const letters = line.length === 5 ? line.split("") : Array(5).fill("");
    const unsure = Array(5).fill(line.length === 5 && lineConf < 60);
    const redo = [0, 1, 2, 3, 4].filter((i) => !(letters[i] && !(allowed && allowed[i] && !allowed[i].has(letters[i]))));
    if (redo.length) onStatus(`Reading ${redo.length} letter${redo.length > 1 ? "s" : ""} on their own\u2026`);
    const recs = await Promise.all(redo.map(async (i) => recognizeCell(await ensureOCRWorker(), glyphCanvas(mask, W2, [boxes[i]]))));
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
      for (const px2 of peaks) {
        const x0 = Math.max(0, px2 - halfMinDist);
        const x1 = Math.min(w, px2 + halfMinDist);
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
    for (const px2 of peaks) {
      const x0 = Math.max(0, px2 - halfTrackW);
      const x1 = Math.min(w, px2 + halfTrackW);
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
    var GW3 = 12, GH3 = 16;
    var TEMPLATES = { A: [], B: [], C: [] };
    function addTemplate(letter, grid) {
      if (TEMPLATES[letter]) TEMPLATES[letter].push(grid);
    }
    function prep(img) {
      var W2 = img.width, H = img.height, d = img.data;
      var lum6 = new Float32Array(W2 * H), sat2 = new Float32Array(W2 * H);
      for (var i = 0, p = 0; i < W2 * H; i++, p += 4) {
        var r = d[p], g = d[p + 1], b = d[p + 2];
        lum6[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        sat2[i] = mx ? (mx - mn) / mx : 0;
      }
      return { W: W2, H, lum: lum6, sat: sat2 };
    }
    function isBright(P, x, y) {
      if (x < 0 || y < 0 || x >= P.W || y >= P.H) return false;
      var i = y * P.W + x;
      return P.lum[i] > 165 && P.sat[i] < 0.3;
    }
    function houghAcc(P, pts, r, acc) {
      var W2 = P.W, H = P.H;
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
          if (cx >= 0 && cx < W2 && cy >= 0 && cy < H) acc[cy * W2 + cx]++;
        }
      }
    }
    function rawMax(acc) {
      var m = 0;
      for (var i = 0; i < acc.length; i++) if (acc[i] > m) m = acc[i];
      return m;
    }
    function smooth3(P, acc) {
      var W2 = P.W, H = P.H, tmp = new Int32Array(W2 * H), out = new Int32Array(W2 * H);
      for (var y = 0; y < H; y++) for (var x = 0; x < W2; x++) {
        var s = acc[y * W2 + x];
        if (x > 0) s += acc[y * W2 + x - 1];
        if (x < W2 - 1) s += acc[y * W2 + x + 1];
        tmp[y * W2 + x] = s;
      }
      for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W2; x2++) {
        var t = tmp[y2 * W2 + x2];
        if (y2 > 0) t += tmp[(y2 - 1) * W2 + x2];
        if (y2 < H - 1) t += tmp[(y2 + 1) * W2 + x2];
        out[y2 * W2 + x2] = t;
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
      var W2 = P.W, H = P.H, all = [];
      for (var y = 0; y < H; y++) for (var x = 0; x < W2; x++) if (isBright(P, x, y)) all.push(x, y);
      var N2 = all.length / 2;
      if (N2 < 80) return [];
      var stepP = Math.max(1, Math.ceil(N2 / 1800)), pts = [];
      for (var i = 0; i < N2; i += stepP) pts.push(all[2 * i], all[2 * i + 1]);
      var m = Math.min(W2, H);
      var rMin = Math.max(8, Math.round(0.08 * m)), rMax = Math.round(0.28 * m);
      var acc = new Int32Array(W2 * H);
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
        var cy = Math.floor(bi / W2), cx = bi % W2;
        cands.push({ x: cx, y: cy, r: R });
        for (var yy = Math.max(0, cy - guard); yy <= Math.min(H - 1, cy + guard); yy++)
          for (var xx = Math.max(0, cx - guard); xx <= Math.min(W2 - 1, cx + guard); xx++) sm2[yy * W2 + xx] = 0;
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
      var cxm = Math.round((bx0 + bx1) / 2), cym = Math.round((by0 + by1) / 2), W2 = P.W, H = P.H;
      function scan(x, y, dx, dy, maxd2) {
        for (var t2 = 0; t2 <= maxd2; t2++) {
          var px2 = Math.round(x + dx * t2), py = Math.round(y + dy * t2);
          if (px2 < 0 || py < 0 || px2 >= W2 || py >= H) return -1;
          if (P.lum[py * W2 + px2] < 24) return t2;
        }
        return -1;
      }
      var maxd = 0.6 * Math.min(W2, H);
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
      var W2 = P.W;
      for (var y = Math.ceil(rect.y0); y <= rect.y1; y += 2) {
        for (var x = Math.ceil(rect.x0); x <= rect.x1; x += 2) {
          var rm = regionMaskAt(cs, x, y);
          if (rm.edge < 5) continue;
          var i = y * W2 + x;
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
    function classify3(lums) {
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
      var out = new Float32Array(GW3 * GH3), SS = 4;
      for (var gy = 0; gy < GH3; gy++) for (var gx = 0; gx < GW3; gx++) {
        var s = 0;
        for (var sy = 0; sy < SS; sy++) for (var sx = 0; sx < SS; sx++) {
          var px2 = Math.min(w - 1, Math.floor((gx + (sx + 0.5) / SS) / GW3 * w));
          var py = Math.min(h - 1, Math.floor((gy + (sy + 0.5) / SS) / GH3 * h));
          s += cov[py * w + px2];
        }
        out[gy * GW3 + gx] = s / (SS * SS);
      }
      return out;
    }
    function gridToStr(g) {
      var rows = [];
      for (var y = 0; y < GH3; y++) {
        var r = "";
        for (var x = 0; x < GW3; x++) r += Math.min(9, Math.round(g[y * GW3 + x] * 9));
        rows.push(r);
      }
      return rows.join("");
    }
    function strToGrid(s) {
      var g = new Float32Array(GW3 * GH3);
      for (var i = 0; i < GW3 * GH3; i++) g[i] = (s.charCodeAt(i) - 48) / 9;
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
      var c = cs[idx], W2 = P.W, H = P.H, bgs = [];
      var pix = [];
      var x0 = Math.floor(c.x - c.r), x1 = Math.ceil(c.x + c.r), y0 = Math.floor(c.y - c.r), y1 = Math.ceil(c.y + c.r);
      for (var y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (var x = Math.max(0, x0); x <= Math.min(W2 - 1, x1); x++) {
        var rm = regionMaskAt(cs, x, y);
        if (rm.mask !== 1 << idx || rm.edge < 6) continue;
        var i = y * W2 + x;
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
        var px2 = bx0 + xx, py = by0 + yy;
        var l = px2 >= 0 && py >= 0 && px2 < W2 && py < H ? P.lum[py * W2 + px2] : bg;
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
      var flags = classify3(sm.lums);
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
      var k = names.length, M = 1 << k, N2 = 1 << M, FULL = N2 - 1;
      var best = new Array(N2).fill(null), buckets = [];
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
      GW: GW3,
      GH: GH3,
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

  // src/utils/discordText.js
  var discordText_exports = {};
  __export(discordText_exports, {
    discordPlain: () => discordPlain
  });
  var KEEP = "\0";
  function discordPlain(text) {
    if (text == null) return "";
    const src = String(text);
    if (!/[*_~|`>#\-\[\\]/.test(src)) return src;
    return src.split(/\r?\n/).flatMap((line) => {
      if (/^\s*```\w*\s*$/.test(line)) return [];
      let l = line.replace(/\\([\\*_~`|>#\-\[\]()])/g, (m, c) => `${KEEP}${c.charCodeAt(0)}${KEEP}`);
      l = l.replace(/^```\w*\s*|```\s*$/g, "");
      l = l.replace(/^\s*>>>\s?/, "").replace(/^\s*>\s/, "").replace(/^\s*>$/, "");
      l = l.replace(/^\s*-#\s+/, "").replace(/^\s*#{1,3}\s+/, "");
      l = l.replace(/^(\s*)[-*•]\s+/, "$1");
      let before;
      do {
        before = l;
        l = l.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/~~(.+?)~~/g, "$1").replace(/\|\|(.+?)\|\|/g, "$1");
        l = l.replace(/(^|[\s(\[{"'])\*(\S(?:[^*\n]*?\S)?)\*(?=$|[\s.,:;!?)\]}"'=–-])/g, "$1$2");
        l = l.replace(/(^|[^\w])_(\S(?:[^_\n]*?\S)?)_(?![\w])/g, "$1$2");
      } while (l !== before);
      l = l.replace(/`([^`]*)`/g, "$1");
      l = l.replace(/\[([^\]]+)\]\((?:https?:)?[^)\s]+\)/g, "$1");
      return [l.replace(new RegExp(`${KEEP}(\\d+)${KEEP}`, "g"), (m, c) => String.fromCharCode(Number(c)))];
    }).join("\n");
  }

  // src/modules/wof/wofSolver.js
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
    text = discordPlain(text);
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
    const label2 = btns[look];
    const list = R.step2[label2];
    if (!list) return { ok: false, look, label: label2, msg: 'NO LIST FOR "' + label2 + '"' };
    const on = new Set(btns);
    const ans = list.find((w) => on.has(w));
    if (!ans) return { ok: false, look, label: label2, list, msg: "NO LIST WORD IS ON A BUTTON" };
    return { ok: true, look, label: label2, list, ans, hit: btns.indexOf(ans) };
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
  async function readRegion(worker2, src, W2, H, reg, vocab) {
    const sx = W2 / 440, sy = H / 440;
    const x = Math.round(reg[0] * sx), y = Math.round(reg[1] * sy);
    const w = Math.max(1, Math.round(reg[2] * sx)), h = Math.max(1, Math.round(reg[3] * sy));
    const f = Math.max(3, Math.round(160 / h));
    const c = document.createElement("canvas");
    c.width = w * f;
    c.height = h * f;
    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.imageSmoothingQuality = "high";
    cx.drawImage(src, x, y, w, h, 0, 0, c.width, c.height);
    const px2 = cx.getImageData(0, 0, c.width, c.height).data;
    let bright = 0;
    for (let i = 0; i < px2.length; i += 16) {
      if (0.299 * px2[i] + 0.587 * px2[i + 1] + 0.114 * px2[i + 2] > 110) bright++;
    }
    const ink = bright / (px2.length / 16);
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
        await worker2.setParameters({ tessedit_char_whitelist: WL, tessedit_pageseg_mode: psm, user_defined_dpi: "300" });
        const { data } = await worker2.recognize(pad);
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
    const worker2 = await ensureOCRWorker();
    const W2 = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const src = document.createElement("canvas");
    src.width = W2;
    src.height = H;
    src.getContext("2d").drawImage(img, 0, 0);
    onStatus("Reading display and buttons\u2026");
    const dv = rules.displayWords.filter((w) => w !== BLANK);
    const [dr, ...btnReads] = await Promise.all([
      readRegion(worker2, src, W2, H, REG_DISP, dv),
      ...REG_BTN.map(async (reg) => readRegion(await ensureOCRWorker(), src, W2, H, reg, rules.buttonLabels))
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
    text = discordPlain(text);
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
    const W2 = w + 2, H = h + 2, bg = new Uint8Array(W2 * H).fill(1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) bg[(y + 1) * W2 + x + 1] = 0;
    const { comps } = labelComponents(bg, W2, H, false);
    const holes2 = comps.filter((c) => c.x0 > 0 && c.y0 > 0 && c.x1 < W2 - 1 && c.y1 < H - 1 && c.area >= Math.max(4, 0.012 * w * h));
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
    const runs4 = [];
    for (let y = 0; y < h; y++) {
      let r = 0;
      for (let x = 0; x <= w; x++) {
        if (x < w && m[y * w + x]) r++;
        else if (r) {
          runs4.push(r);
          r = 0;
        }
      }
    }
    for (let x = 0; x < w; x++) {
      let r = 0;
      for (let y = 0; y <= h; y++) {
        if (y < h && m[y * w + x]) r++;
        else if (r) {
          runs4.push(r);
          r = 0;
        }
      }
    }
    runs4.sort((a, b) => a - b);
    const stroke = runs4.length ? runs4[runs4.length >> 1] / g.tileH : NaN;
    const pts = [];
    for (let y = Math.floor(0.1 * h); y < Math.ceil(0.9 * h); y++) {
      for (let x = 0; x < w; x++) if (m[y * w + x]) {
        pts.push([(h - 1 - y) / h, x / h]);
        break;
      }
    }
    let lean = NaN;
    if (pts.length >= 3) {
      const mu = pts.reduce((a, p) => a + p[0], 0) / pts.length, mx = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      let sxy = 0, syy = 0;
      for (const [u, x] of pts) {
        sxy += (u - mu) * (x - mx);
        syy += (u - mu) ** 2;
      }
      if (syy > 0) lean = sxy / syy;
    }
    return {
      stem,
      stroke,
      lean,
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
  var GREY_INK = 0.79;
  var ITALIC_LEAN = 0.1;
  function isGreekGlyph(f) {
    if (f.lean >= ITALIC_LEAN) return true;
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
    const glyphs = groupRows(tiles).map((r) => r.map((t) => {
      const g = extractGlyph(L, w, t, thr, { level, gmax });
      return g ? { t, g, f: measure(g) } : null;
    }));
    const cells = glyphs.flat().filter(Boolean);
    const boldInk = cells.some((c) => c.f.hRel >= SHORT && c.f.stroke >= 0.125);
    const greyScale = !boldInk && gmax < 215 ? GREY_INK : 1;
    const rows = glyphs.map((r) => r.map((cell) => {
      if (!cell) return null;
      const { t, g, f } = cell;
      f.bright *= greyScale;
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
    const cx = sx / n, cy = Math.round(sy / n), px2 = (x, y) => {
      const i = (y * w + x) * 4;
      return (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1e3;
    };
    const panel = px2(Math.round(cx), Math.max(0, cy - Math.round(0.06 * h)));
    const runs4 = [];
    let start = -1, last = -9;
    for (let x = Math.floor(0.1 * w); x < Math.floor(0.9 * w); x++) {
      const dot = Math.abs(px2(x, cy) - panel) > 6;
      if (dot) {
        if (start < 0) start = x;
        last = x;
      } else if (start >= 0 && x - last > 3) {
        runs4.push([start, last]);
        start = -1;
      }
    }
    if (start >= 0) runs4.push([start, last]);
    const dots = runs4.filter((r) => r[1] - r[0] >= 0.012 * w);
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
  function cwReadDiagramPixels(img, W2, H) {
    const d = img.data, bin = new Uint8Array(W2 * H);
    for (let i = 0; i < W2 * H; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      if (r * 0.299 + g * 0.587 + b * 0.114 < 85 && Math.max(r, g, b) < 110) bin[i] = 1;
    }
    const seen = new Uint8Array(W2 * H), stack = new Int32Array(W2 * H * 2), blobs3 = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W2; x++) {
      const p = y * W2 + x;
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
          if (nx < 0 || nx >= W2 || ny < 0 || ny >= H) continue;
          const q = ny * W2 + nx;
          if (bin[q] === 1 && !seen[q]) {
            seen[q] = 1;
            stack[sp++] = nx;
            stack[sp++] = ny;
          }
        }
      }
      const w = maxX - minX + 1, h = maxY - minY + 1;
      if (w >= 5 && w <= 70 && h >= 8 && h <= 70 && n >= 25 && n <= 1500) blobs3.push({ minX, minY, maxX, maxY, w, h, cx: sx / n, cy: sy / n });
    }
    return blobs3.map((b) => {
      const cell = new Uint8Array(480);
      for (let r = 0; r < 24; r++) {
        const yy = Math.min(b.maxY, b.minY + Math.floor(r * b.h / 24));
        for (let c = 0; c < 20; c++) {
          const xx = Math.min(b.maxX, b.minX + Math.floor(c * b.w / 20));
          cell[r * 20 + c] = bin[yy * W2 + xx];
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
      return { nx: b.cx / W2, ny: b.cy / H, letter, score: best };
    });
  }
  function cwReadDiagramImage(im) {
    const W2 = 710, H = Math.max(1, Math.round(im.naturalHeight * (W2 / im.naturalWidth)));
    const cv = document.createElement("canvas");
    cv.width = W2;
    cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#fff";
    g.fillRect(0, 0, W2, H);
    g.drawImage(im, 0, 0, W2, H);
    const glyphs = cwReadDiagramPixels(g.getImageData(0, 0, W2, H), W2, H);
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
    const { data, width: W2, height: H } = img;
    const at2 = (x, y) => {
      const i = (y * W2 + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const isRed2 = (r, g, b) => r > 170 && g < 120 && b < 120;
    const isBlue = (r, g, b) => b > 170 && r < 120 && b - r > 90;
    const isWhite2 = (r, g, b) => r > 215 && g > 215 && b > 215;
    const isYellow2 = (r, g, b) => r > 200 && g > 170 && b < 175 && r - b > 60;
    const yA = Math.round(H * 0.42), yB = Math.round(H * 0.66), rows = yB - yA;
    const xA = Math.round(W2 * 0.08), xB = Math.round(W2 * 0.92);
    const hits = new Array(W2).fill(0);
    for (let x = xA; x < xB; x++) for (let y = yA; y < yB; y++) {
      const [r, g, b] = at2(x, y);
      if (isRed2(r, g, b) || isBlue(r, g, b) || isWhite2(r, g, b)) hits[x]++;
    }
    const cols = [];
    let cur = null, gap = 0;
    for (let x = xA; x < xB; x++) {
      if (hits[x] > rows * 0.12) {
        if (!cur) cur = { x0: x, x1: x };
        cur.x1 = x;
        gap = 0;
      } else if (cur && ++gap > 3) {
        if (cur.x1 - cur.x0 >= W2 * 0.012) cols.push(cur);
        cur = null;
        gap = 0;
      }
    }
    if (cur && cur.x1 - cur.x0 >= W2 * 0.012) cols.push(cur);
    const yellowIn = (xc, ya, yb) => {
      let n = 0;
      for (let x = Math.max(0, Math.round(xc - W2 * 0.05)); x <= Math.min(W2 - 1, xc + W2 * 0.05); x++) {
        for (let y = Math.round(H * ya); y < H * yb; y++) {
          const [r, g, b] = at2(x, y);
          if (isYellow2(r, g, b)) n++;
        }
      }
      return n > W2 * H * 15e-5;
    };
    return cols.map((c) => {
      let nr = 0, nb = 0, nw = 0;
      for (let x = c.x0; x <= c.x1; x++) for (let y = yA; y < yB; y++) {
        const [r, g, b] = at2(x, y);
        if (isRed2(r, g, b)) nr++;
        else if (isBlue(r, g, b)) nb++;
        else if (isWhite2(r, g, b)) nw++;
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
  function syClassify(bits2) {
    if (!bits2 || !bits2.length || !bits2[0] || !bits2[0].length) {
      return { symbol: "?", score: 0 };
    }
    const H = bits2.length, W2 = bits2[0].length;
    let on = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W2; x++) if (bits2[y][x]) on++;
    const density = on / (H * W2);
    const sc = Math.min(14 / W2, 14 / H), tw = Math.max(1, Math.round(W2 * sc)), th = Math.max(1, Math.round(H * sc));
    const ox = Math.floor((16 - tw) / 2), oy = Math.floor((16 - th) / 2);
    const v = new Float32Array(256);
    let n = 0;
    for (let y = 0; y < th; y++) {
      const sy = Math.min(H - 1, Math.floor(y / sc));
      for (let x = 0; x < tw; x++) {
        const sx = Math.min(W2 - 1, Math.floor(x / sc));
        if (bits2[sy][sx]) {
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
    const norm2 = Math.sqrt(ss);
    if (norm2 === 0) return { symbol: "?", score: 0 };
    let best = "?", bs = -999;
    for (const [k, t] of Object.entries(SY_TPL)) {
      if (!t.norm) continue;
      let dot = 0;
      for (let i = 0; i < 256; i++) dot += v[i] * t.vec[i];
      const s = dot / (norm2 * t.norm);
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
    const { data, width: W2 } = img;
    let minX = w, maxX = -1, minY = h, maxY = -1;
    const ink = [];
    for (let y = 0; y < h; y++) {
      const row = new Uint8Array(w);
      for (let x = 0; x < w; x++) {
        if (y < margin || y >= h - margin || x < margin || x >= w - margin) continue;
        if (skip && skip(y, x)) continue;
        if (syGray(data, ((y0 + y) * W2 + (x0 + x)) * 4) < thresh) {
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
    const { data, width: W2, height: H } = img;
    const isLight = (i) => syGray(data, i) > 150;
    const rowN = new Uint32Array(H);
    let maxN = 0;
    for (let y = 0; y < H; y++) {
      let n = 0;
      for (let x = 0; x < W2; x++) if (isLight((y * W2 + x) * 4)) n++;
      rowN[y] = n;
      if (n > maxN) maxN = n;
    }
    const minSide = Math.max(40, Math.min(W2, H) * 0.08);
    const rowThr = Math.max(minSide * 0.6, Math.min(W2 * 0.45, maxN * 0.4));
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
      for (let y = y0; y < y1; y++) for (let x = 0; x < W2; x++) {
        const i = (y * W2 + x) * 4, r = data[i], b = data[i + 2];
        if (syGray(data, i) > 120 || r > 150 && r - b > 60) n++;
      }
      return n >= Math.max(15, (y1 - y0) * W2 * 2e-3);
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
      const runs4 = [];
      let s = -1, last = -1;
      for (let x = 0; x < W2; x++) {
        let n = 0;
        for (let y = b.y1; y < b.y2; y++) if (isLight((y * W2 + x) * 4)) n++;
        if (n > bh * 0.45) {
          if (s < 0) s = x;
          last = x;
        } else if (s >= 0 && x - last > colGap) {
          runs4.push([s, last + 1]);
          s = -1;
        }
      }
      if (s >= 0) runs4.push([s, last + 1]);
      if (!runs4.length) runs4.push([0, W2]);
      for (const [x1, x2] of runs4) {
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
    const { rects, hasHeader, groups: groups2 } = syLayoutPanels(img);
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
    return { panels, hasHeader, groups: groups2 };
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
    const { data, width: W2, height: H } = img;
    const white = new Uint8Array(W2 * H);
    for (let i = 0; i < W2 * H; i++) {
      if (data[i * 4] > 195 && data[i * 4 + 1] > 195 && data[i * 4 + 2] > 195) white[i] = 1;
    }
    const seen = new Uint8Array(W2 * H), stack = new Int32Array(W2 * H * 2), tiles = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W2; x++) {
        const p = y * W2 + x;
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
            if (nx < 0 || nx >= W2 || ny < 0 || ny >= H) continue;
            const q = ny * W2 + nx;
            if (white[q] && !seen[q]) {
              seen[q] = 1;
              stack[sp++] = nx;
              stack[sp++] = ny;
            }
          }
        }
        const bw = maxX - minX + 1, bh = maxY - minY + 1;
        if (n > 500 && bw >= 30 && bh >= 30 && bw <= W2 * 0.6 && bh <= H * 0.6) {
          tiles.push({ x: minX, y: minY, bw, bh, n, cx: sx / n, cy: sy / n });
        }
      }
    }
    const inside = (a, b) => a !== b && a.x >= b.x && a.y >= b.y && a.x + a.bw <= b.x + b.bw && a.y + a.bh <= b.y + b.bh;
    const keys = tiles.filter((t) => !tiles.some((o) => inside(t, o)));
    tiles.length = 0;
    tiles.push(...keys.sort((a, b) => b.n - a.n).slice(0, 4));
    if (tiles.length >= 4) {
      const midY = tiles.reduce((s, t) => s + t.cy, 0) / tiles.length;
      tiles.sort((a, b) => {
        const at2 = a.cy < midY, bt = b.cy < midY;
        return at2 !== bt ? at2 ? -1 : 1 : a.cx - b.cx;
      });
    }
    const out = [null, null, null, null];
    for (let i = 0; i < Math.min(4, tiles.length); i++) {
      const t = tiles[i];
      const res = syReadKeypadTile(img, t);
      if (res && res.symbol !== "?") out[i] = res.symbol;
    }
    return { buttons: out, tiles: tiles.length };
  }
  var SY_KEYPAD = {
    OMEGA: [
      // 15 tiles
      "0000000000000000",
      "0002661002651000",
      "0038500000167200",
      "0287100000028710",
      "0594000000005940",
      "0892000000003970",
      "0892000000003980",
      "0892000000003970",
      "0594000000005930",
      "0187200000038710",
      "0027720000376100",
      "0001354004420000",
      "0221126006211320",
      "0687777017778840",
      "0488885006888730",
      "0000000000000000"
    ],
    YAT: [
      // 16 tiles
      "0000000000000000",
      "0016888740000000",
      "0003798410000000",
      "0122697322000000",
      "0663697357100000",
      "0630496027100000",
      "0100497113100000",
      "0000499767631000",
      "0000497323687200",
      "0000496000169600",
      "0000496000059800",
      "0000496000059800",
      "0000496000169700",
      "0001697213687200",
      "0026777776531000",
      "0000000000000000"
    ],
    COPYRIGHT: [
      // 13 tiles
      "0000000000000000",
      "0000144554311000",
      "0003531112453100",
      "0036211222126210",
      "0162148768502520",
      "0340495104600440",
      "0521871001200270",
      "0612961000000170",
      "0612961000000270",
      "0522872101200370",
      "0331594114601530",
      "0151158658512500",
      "0024112222125100",
      "0002521112351000",
      "0000134544200000",
      "0000000000000000"
    ],
    LAMBDA_STROKE: [
      // 15 tiles
      "0000000000000000",
      "0157631200000000",
      "0386577510000000",
      "0252377300000000",
      "0012687200000000",
      "0004437400000000",
      "0000038610000000",
      "0000169820000000",
      "0000386650000000",
      "0001673352000000",
      "0004851164000000",
      "0016720045100000",
      "0048400026314500",
      "0167200004647700",
      "0142000001576300",
      "0000000000000000"
    ],
    OT: [
      // 19 tiles
      "0000000000000000",
      "0000255200100000",
      "0004841025763000",
      "0048400175248300",
      "0287100582017710",
      "0594001870005930",
      "0793002970005940",
      "0892003960005950",
      "0792003970005950",
      "0693002971006940",
      "0395001893028820",
      "0068200597259500",
      "0027720179887100",
      "0001564359995440",
      "0000023443345310",
      "0000000000000000"
    ],
    PSI: [
      // 15 tiles
      "0000000000000000",
      "0320001650000230",
      "0571001880000750",
      "0392000870002930",
      "0393000870003930",
      "0393000870004930",
      "0294000870005920",
      "0185000870006810",
      "0048200870028400",
      "0003544884453000",
      "0000112881110000",
      "0000000870000000",
      "0000001880000000",
      "0000003883000000",
      "0000000000000000",
      "0000000000000000"
    ],
    DOUBLE_CROSS: [
      // 11 tiles
      "0000000000000000",
      "0000001001541000",
      "0000157314984000",
      "0000279878972000",
      "0000158999950000",
      "0000002799984100",
      "0000001699999600",
      "0046313896579600",
      "0279888972014200",
      "0158999950000000",
      "0002799984100000",
      "0001699999610000",
      "0003896579610000",
      "0015983014200000",
      "0002650000000000",
      "0000000000000000"
    ],
    STAR_SOLID: [
      // 16 tiles
      "0000000000000000",
      "0000000120000000",
      "0000000450000000",
      "0000001781000000",
      "0000003882000000",
      "0222226996322220",
      "0378889999888730",
      "0037999999997300",
      "0002599999962000",
      "0000189999810000",
      "0000289999930000",
      "0000498558950000",
      "0000773103771000",
      "0001510000151000",
      "0000100000010000",
      "0000000000000000"
    ],
    STAR_HOLLOW: [
      // 24 tiles
      "0000000000000000",
      "0000000340000000",
      "0000000750000000",
      "0000001771000000",
      "0000004442000000",
      "0233337117333320",
      "0596553004556950",
      "0036200000036300",
      "0002540000452000",
      "0000270000520000",
      "0000340330520000",
      "0000635555360000",
      "0001973013680000",
      "0002820000273000",
      "0001000000000000",
      "0000000000000000"
    ],
    ZHE: [
      // 16 tiles
      "0000000000000000",
      "0685015663017850",
      "0445301850054430",
      "0001501840150000",
      "0000511840330000",
      "0000241841610000",
      "0000077987400000",
      "0000572853830000",
      "0003931840681000",
      "0018601840185000",
      "0058101850039200",
      "0463014662006860",
      "0000000000000580",
      "0000000000000170",
      "0000000000000050",
      "0000000000000000"
    ],
    KOPPA: [
      // 9 tiles
      "0000000000000000",
      "0000037887400000",
      "0000583113860000",
      "0003920000293000",
      "0006700000067000",
      "0009500000059000",
      "0009400000059000",
      "0009500000059000",
      "0006700000066000",
      "0002930000393000",
      "0000485224850000",
      "0000026997300000",
      "0000000570000000",
      "0000000570000000",
      "0000000450000000",
      "0000000000000000"
    ],
    INV_QUESTION: [
      // 15 tiles
      "0000000000000000",
      "0000000373000000",
      "0000000495000000",
      "0000000141000000",
      "0000000000000000",
      "0000000061000000",
      "0000000071000000",
      "0000001671000000",
      "0000038510000000",
      "0000296000000000",
      "0000592000000000",
      "0000892000000000",
      "0000594002710000",
      "0000188316910000",
      "0000015877400000",
      "0000000000000000"
    ]
  };
  var SY_KEYPAD_TPL = {};
  for (const [k, rows] of Object.entries(SY_KEYPAD)) {
    const v = Float32Array.from(rows.join(""), Number);
    const mean = v.reduce((a, x) => a + x, 0) / 256;
    let ss = 0;
    for (let i = 0; i < 256; i++) {
      v[i] -= mean;
      ss += v[i] * v[i];
    }
    SY_KEYPAD_TPL[k] = { vec: v, norm: Math.sqrt(ss) };
  }
  function syReadKeypadTile(img, t) {
    const { data, width: W2 } = img, w = t.bw, h = t.bh;
    const mg = Math.max(4, Math.round(Math.min(w, h) * 0.12));
    const cornerW = Math.floor(w * 0.32), cornerH = Math.floor(h * 0.32);
    const gray = (x, y) => syGray(data, ((t.y + y) * W2 + t.x + x) * 4);
    const inTile = (x, y) => y >= mg && y < h - mg && x >= mg && x < w - mg && !(y < cornerH && x < cornerW);
    const vals = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inTile(x, y)) vals.push(gray(x, y));
    if (!vals.length) return null;
    vals.sort((a, b) => a - b);
    const ink = vals[Math.floor(vals.length * 0.01)], paper = vals[Math.floor(vals.length * 0.6)];
    if (paper - ink < 40) return null;
    const thr = paper - 0.5 * (paper - ink);
    const m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inTile(x, y) && gray(x, y) < thr) m[y * w + x] = 1;
    const lab = new Int32Array(w * h), keep = /* @__PURE__ */ new Set(), stack = [];
    const c0 = 0.3 * w, c1 = 0.7 * w, r0 = 0.3 * h, r1 = 0.7 * h;
    let id = 0;
    for (let p = 0; p < w * h; p++) {
      if (!m[p] || lab[p]) continue;
      lab[p] = ++id;
      stack.push(p);
      let x0 = w, x1 = -1, y0 = h, y1 = -1;
      while (stack.length) {
        const q = stack.pop(), qx = q % w, qy = q / w | 0;
        if (qx < x0) x0 = qx;
        if (qx > x1) x1 = qx;
        if (qy < y0) y0 = qy;
        if (qy > y1) y1 = qy;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = qx + dx, ny = qy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const r = ny * w + nx;
          if (m[r] && !lab[r]) {
            lab[r] = id;
            stack.push(r);
          }
        }
      }
      if (x1 >= c0 && x0 <= c1 && y1 >= r0 && y0 <= r1) keep.add(id);
    }
    let minX = w, maxX = -1, minY = h, maxY = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (keep.has(lab[y * w + x])) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (maxX < 0) return null;
    const inkAt = (x, y) => keep.has(lab[y * w + x]) ? Math.min(1, Math.max(0, (paper - gray(x, y)) / (paper - ink))) : 0;
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const sc = Math.min(14 / bw, 14 / bh), tw = Math.max(1, Math.round(bw * sc)), th = Math.max(1, Math.round(bh * sc));
    const ox = Math.floor((16 - tw) / 2), oy = Math.floor((16 - th) / 2);
    const v = new Float32Array(256);
    for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
      const ya = ty / sc, yb = Math.min(bh, (ty + 1) / sc), xa = tx / sc, xb = Math.min(bw, (tx + 1) / sc);
      let sum = 0, area = 0;
      for (let y = Math.floor(ya); y < Math.ceil(yb); y++) for (let x = Math.floor(xa); x < Math.ceil(xb); x++) {
        const a = (Math.min(y + 1, yb) - Math.max(y, ya)) * (Math.min(x + 1, xb) - Math.max(x, xa));
        if (a > 0) {
          sum += inkAt(minX + x, minY + y) * a;
          area += a;
        }
      }
      v[(oy + ty) * 16 + ox + tx] = area ? sum / area : 0;
    }
    const mean = v.reduce((a, x) => a + x, 0) / 256;
    let ss = 0;
    for (let i = 0; i < 256; i++) {
      v[i] -= mean;
      ss += v[i] * v[i];
    }
    const norm2 = Math.sqrt(ss);
    if (!norm2) return null;
    let best = "?", bs = -2;
    for (const [k, tp] of Object.entries(SY_KEYPAD_TPL)) {
      let dot = 0;
      for (let i = 0; i < 256; i++) dot += v[i] * tp.vec[i];
      if (dot / (norm2 * tp.norm) > bs) {
        bs = dot / (norm2 * tp.norm);
        best = k;
      }
    }
    if (best === "STAR_SOLID" || best === "STAR_HOLLOW") {
      const cx = (minX + maxX) / 2, cy = minY + 0.55 * (maxY - minY), r = Math.max(1, 0.08 * bw);
      let sum = 0, n = 0;
      for (let y = Math.round(cy - r); y <= Math.round(cy + r); y++) for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++) {
        sum += gray(x, y);
        n++;
      }
      best = paper - sum / n > 0.5 * (paper - ink) ? "STAR_SOLID" : "STAR_HOLLOW";
    }
    return { symbol: best, score: bs };
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
    text = discordPlain(text);
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
    const W2 = Math.max(1, Math.round(iw * sc)), H = Math.max(1, Math.round(ih * sc));
    const cv = document.createElement("canvas");
    cv.width = W2;
    cv.height = H;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W2, H);
    const d = ctx.getImageData(0, 0, W2, H).data;
    const px2 = (x, y) => {
      const i = (y * W2 + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    };
    const tally = /* @__PURE__ */ new Map();
    for (let y = Math.floor(H * 0.2); y < H * 0.85; y += 3) {
      for (const x of [Math.floor(W2 * 0.12), Math.floor(W2 * 0.88)]) {
        const p = px2(x, y);
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
    const x0 = Math.floor(W2 * 0.06), x1 = Math.ceil(W2 * 0.94), y0 = Math.floor(H * 0.18), y1 = Math.ceil(H * 0.9);
    const isFg = (x, y) => dist(px2(x, y), bg) > 38;
    let sx = Math.floor(W2 / 2), sy = Math.floor(H / 2);
    if (!isFg(sx, sy)) {
      let found = false;
      for (let r = 2; r < Math.min(W2, H) * 0.15 && !found; r += 2) {
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
    const seen = new Uint8Array(W2 * H);
    const stack = [sy * W2 + sx];
    seen[sy * W2 + sx] = 1;
    let bx0 = W2, by0 = H, bx1 = 0, by1 = 0, area = 0;
    const buckets = {};
    while (stack.length) {
      const k = stack.pop(), x = k % W2, y = k / W2 | 0;
      area++;
      if (x < bx0) bx0 = x;
      if (x > bx1) bx1 = x;
      if (y < by0) by0 = y;
      if (y > by1) by1 = y;
      const p = px2(x, y), bk = colorBucket(...p);
      buckets[bk] = buckets[bk] || { n: 0, r: 0, g: 0, b: 0 };
      buckets[bk].n++;
      buckets[bk].r += p[0];
      buckets[bk].g += p[1];
      buckets[bk].b += p[2];
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) continue;
        const q = ny * W2 + nx;
        if (!seen[q] && isFg(nx, ny)) {
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
    if (area < W2 * H * 0.02) return { ok: false, reason: "Button region too small \u2014 crop the screenshot to the module." };
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
      const p = px2(tx0 + x, ty0 + y), o = (y * tw + x) * 4;
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
    const dseen = new Uint8Array(W2 * H);
    for (let y = dy0; y < dy1; y++) for (let x = x0; x < x1; x++) {
      const k = y * W2 + x;
      if (dseen[k]) continue;
      const isDot = (xx, yy) => dist(px2(xx, yy), bg) > 22;
      if (!isDot(x, y)) continue;
      const st = [k];
      dseen[k] = 1;
      let n = 0, ax = 0, ar = 0, ag = 0, ab = 0, minx = x, maxx = x, miny = y, maxy = y;
      while (st.length) {
        const q = st.pop(), qx = q % W2, qy = q / W2 | 0;
        const pp = px2(qx, qy);
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
          const r2 = ny * W2 + nx;
          if (dseen[r2]) continue;
          if (isDot(nx, ny)) {
            dseen[r2] = 1;
            st.push(r2);
          }
        }
      }
      const bw = maxx - minx + 1, bh = maxy - miny + 1;
      if (n >= 12 && bw < W2 * 0.08 && bh < H * 0.08 && bw / bh > 0.6 && bw / bh < 1.6) {
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
    let label2 = "", labelRaw = "", labelSure = false;
    if (res.hasInk) {
      try {
        onStatus("Reading the label\u2026");
        const worker2 = await ensureOCRWorker();
        let best = { w: "", d: 99, amb: true };
        for (const psm of ["8", "7"]) {
          await worker2.setParameters({ tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", tessedit_pageseg_mode: psm, user_defined_dpi: "300" });
          const { data } = await worker2.recognize(res.labelCanvas);
          const txt = String(data.text || "").trim();
          const r = matchWord(txt, vocab);
          if (r.d < best.d) {
            best = r;
            labelRaw = txt;
          }
          if (best.d === 0) break;
        }
        const ok = best.w && best.d <= Math.max(1, Math.floor((best.len || 1) * 0.34));
        label2 = ok ? best.w : "";
        labelSure = ok && best.d === 0 && !best.amb;
      } catch (e) {
        res.ocrError = e.message;
      }
    }
    return { ...res, label: label2, labelRaw, labelSure };
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
    t = discordPlain(t);
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
    const N2 = w * h, L = new Float32Array(N2);
    for (let i = 0; i < N2; i++) L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    const srt = L.slice().sort(), bg = srt[N2 >> 1], mx = srt[Math.floor(N2 * 0.995)];
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
    const seen = new Uint8Array(N2), comps = [];
    for (let y = ya; y <= yb; y++) {
      for (let x = xL; x <= xR; x++) {
        const i = y * w + x;
        if (seen[i] || L[i] <= bt) continue;
        const st = [i], px2 = [];
        seen[i] = 1;
        while (st.length) {
          const j = st.pop();
          px2.push(j);
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
        if (px2.length >= 6) comps.push(px2);
      }
    }
    const info = comps.map((px2) => {
      let x0 = w, x1 = 0, y0 = h, y1 = 0;
      const ry = {};
      for (const j of px2) {
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
      return { x0, x1, y0, y1, ry, px: px2, n: px2.length };
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
        const label2 = b[i + 1];
        if (label2 === 249) {
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
        const px2 = CX - left, py = CY - top;
        let bright = prevBright, rgb = prevRgb;
        if (ct && px2 >= 0 && px2 < fw && py >= 0 && py < fh) {
          const ci = lzwGetPixelIndex(lzw, minCS, py * fw + px2);
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
      for (const px2 of entry) {
        if (outPos === targetIdx) return px2;
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
    const W2 = d[p] | d[p + 1] << 8, H = d[p + 2] | d[p + 3] << 8;
    p += 4;
    const fl = d[p++];
    p += 2;
    let gct = null;
    if (fl & 128) {
      const n = 2 << (fl & 7);
      gct = d.subarray(p, p + n * 3);
      p += n * 3;
    }
    let cv = new Uint8ClampedArray(W2 * H * 4);
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
        const label2 = d[p++];
        if (label2 === 249) {
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
              if (dx >= W2) continue;
              const ci = idx[sy + x];
              if (ci === gce.trans) continue;
              const o2 = (dy * W2 + dx) * 4;
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
            if (dx < W2 && dy < H) cv.fill(0, (dy * W2 + dx) * 4, (dy * W2 + dx) * 4 + 4);
          }
        } else if (gce.disp === 3 && saved) cv = saved;
        gce = { delay: 0, trans: -1, disp: 0 };
      } else break;
    }
    return { w: W2, h: H, frames };
  }
  function gifLzwFull(minCode, data, npix) {
    const clear = 1 << minCode, eoi = clear + 1;
    let size = minCode + 1, next = eoi + 1, mask = (1 << size) - 1;
    const prefix = new Uint16Array(4096), suffix = new Uint8Array(4096), stack = new Uint8Array(4097), out = new Uint8Array(npix);
    for (let i = 0; i < clear; i++) suffix[i] = i;
    let bits2 = 0, nb = 0, op = 0, old = -1, first = 0;
    for (let i = 0; i < data.length; i++) {
      bits2 |= data[i] << nb;
      nb += 8;
      while (nb >= size) {
        let code = bits2 & mask;
        bits2 >>= size;
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
    const N2 = MAZE_SIZE;
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
          if (nr >= 0 && nr < N2 && nc >= 0 && nc < N2 && !visited.has(`${nr}_${nc}`)) {
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
    const W2 = Math.max(1, Math.round(iw * sc)), H = Math.max(1, Math.round(ih * sc));
    const cv = getWorkCanvas();
    cv.width = W2;
    cv.height = H;
    const ctx = getWorkContext();
    ctx.clearRect(0, 0, W2, H);
    ctx.drawImage(img, 0, 0, W2, H);
    return { data: ctx.getImageData(0, 0, W2, H).data, W: W2, H, canvas: cv };
  }
  function mzSplitStrip(W2, H) {
    if (!W2 || !H) return [];
    const tall = H >= W2;
    const n = Math.max(1, Math.round(tall ? H / W2 : W2 / H));
    const step = (tall ? H : W2) / n;
    return Array.from({ length: n }, (_, i) => tall ? { x: 0, y: Math.round(i * step), w: W2, h: Math.round((i + 1) * step) - Math.round(i * step) } : { x: Math.round(i * step), y: 0, w: Math.round((i + 1) * step) - Math.round(i * step), h: H });
  }
  var blankGrid = () => Array.from({ length: MAZE_SIZE }, () => Array.from({ length: MAZE_SIZE }, () => ({ u: false, d: false, l: false, r: false })));
  function mzWallsFromData(data, W2, H, rect = { x: 0, y: 0, w: W2, h: H }) {
    const { x: ox, y: oy, w, h } = rect;
    const N2 = MAZE_SIZE;
    const lum6 = new Uint8Array(w * h), lt = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const j = ((oy + y) * W2 + ox + x) * 4, r = data[j], g = data[j + 1], b = data[j + 2];
      const L = 0.299 * r + 0.587 * g + 0.114 * b;
      lum6[y * w + x] = L;
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
    const cw = gw / N2, ch = gh / N2, TOL = Math.max(2, Math.round(0.17 * cw)), DARK = 140, NEED = 0.7;
    const dark = (x, y) => lum6[y * w + x] < DARK;
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
    for (let r = 0; r < N2; r++) for (let c = 0; c < N2; c++) {
      if (r === 0) grid[r][c].u = true;
      if (r === N2 - 1) grid[r][c].d = true;
      if (c === 0) grid[r][c].l = true;
      if (c === N2 - 1) grid[r][c].r = true;
      if (c < N2 - 1 && vWall(r, c)) {
        grid[r][c].r = true;
        grid[r][c + 1].l = true;
        count++;
      }
      if (r < N2 - 1 && hWall(r, c)) {
        grid[r][c].d = true;
        grid[r + 1][c].u = true;
        count++;
      }
    }
    return { grid, geom: { gx: gx + ox, gy: gy + oy, gw, gh }, count, fallback };
  }
  function mzReadManual(data, W2, H) {
    return mzSplitStrip(W2, H).map((rect) => ({ rect, ...mzWallsFromData(data, W2, H, rect) }));
  }
  function detectMazeWalls(img) {
    const { data, W: W2, H } = imageData(img);
    return mzWallsFromData(data, W2, H).grid;
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
    const N2 = MAZE_SIZE, cw = gw / N2, ch = gh / N2;
    let rSX = 0, rSY = 0, rCnt = 0;
    let ySX = 0, ySY = 0, yCnt = 0;
    for (let py = 0; py < h; py++) {
      for (let px2 = 0; px2 < w; px2++) {
        const idx = (py * w + px2) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if (r > 180 && g < 100 && b < 100) {
          rSX += px2;
          rSY += py;
          rCnt++;
        } else if (r > 180 && g > 180 && b < 100) {
          ySX += px2;
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
        r: Math.min(N2 - 1, Math.max(0, Math.floor((ry - gy) / ch))),
        c: Math.min(N2 - 1, Math.max(0, Math.floor((rx - gx) / cw)))
      };
    }
    if (yCnt > 0) {
      const yx = ySX / yCnt, yy = ySY / yCnt;
      goalPos = {
        r: Math.min(N2 - 1, Math.max(0, Math.floor((yy - gy) / ch))),
        c: Math.min(N2 - 1, Math.max(0, Math.floor((yx - gx) / cw)))
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
  function siTileRGB(data, W2, H) {
    const r = Math.max(2, Math.round(Math.min(W2, H) * 0.025)), o = {};
    for (const k in SI_POS) {
      const cx = Math.round(SI_POS[k][0] * W2), cy = Math.round(SI_POS[k][1] * H);
      const s = [0, 0, 0];
      let n = 0;
      for (let y = Math.max(0, cy - r); y <= Math.min(H - 1, cy + r); y++) {
        for (let x = Math.max(0, cx - r); x <= Math.min(W2 - 1, cx + r); x++) {
          const i = (y * W2 + x) * 4;
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
  function siStageOf(data, W2, H) {
    let n = 0;
    for (const fx of [0.38, 0.442, 0.5, 0.558, 0.62]) {
      const cx = Math.round(fx * W2), cy = Math.round(0.264 * H);
      let m = 0;
      for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
        if (x < 0 || y < 0 || x >= W2 || y >= H) continue;
        const i = (y * W2 + x) * 4;
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
  function siReadManual(data, W2, H) {
    const cls2 = new Int8Array(W2 * H).fill(-1), keys = Object.keys(SI_REF);
    for (let p = 0, i = 0; p < W2 * H; p++, i += 4) {
      for (let k = 0; k < 4; k++) {
        if (dist2([data[i], data[i + 1], data[i + 2]], SI_REF[keys[k]]) <= CELL_TOL) {
          cls2[p] = k;
          break;
        }
      }
    }
    const seen = new Uint8Array(W2 * H), stack = new Int32Array(W2 * H), cells = [];
    for (let p0 = 0; p0 < W2 * H; p0++) {
      if (cls2[p0] < 0 || seen[p0]) continue;
      const k = cls2[p0];
      let sp = 0, n = 0, x0 = W2, x1 = -1, y0 = H, y1 = -1;
      stack[sp++] = p0;
      seen[p0] = 1;
      while (sp) {
        const p = stack[--sp], x = p % W2, y = (p - x) / W2;
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (x > 0 && cls2[p - 1] === k && !seen[p - 1]) {
          seen[p - 1] = 1;
          stack[sp++] = p - 1;
        }
        if (x < W2 - 1 && cls2[p + 1] === k && !seen[p + 1]) {
          seen[p + 1] = 1;
          stack[sp++] = p + 1;
        }
        if (y > 0 && cls2[p - W2] === k && !seen[p - W2]) {
          seen[p - W2] = 1;
          stack[sp++] = p - W2;
        }
        if (y < H - 1 && cls2[p + W2] === k && !seen[p + W2]) {
          seen[p + W2] = 1;
          stack[sp++] = p + W2;
        }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (bw >= W2 * 0.08 && bh >= H * 0.08 && n >= bw * bh * 0.5) {
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
        const i = (y * W2 + x) * 4, h = hueClass(data[i], data[i + 1], data[i + 2]);
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
  function siAnalyzeFrames(frames, W2, H) {
    const rgb = frames.map((fr) => siTileRGB(fr.data, W2, H));
    if (!rgb.some(siLooksLikeSimon)) {
      return { color: null, flashes: [], stage: 0, warn: false, strip: "", thumbIndex: 0, notSimon: true };
    }
    const cols = siClassify(rgb);
    const fl = siToFlashes(cols);
    const last = fl.length ? fl[fl.length - 1].c : null;
    const stage = siStageOf(frames[0].data, W2, H);
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
  function pieces(mask, W2, H) {
    const seen = new Uint8Array(W2 * H), out = [];
    const stack = [];
    for (let s = 0; s < W2 * H; s++) {
      if (!mask[s] || seen[s]) continue;
      seen[s] = 1;
      stack.push(s);
      let n = 0, sx = 0, sy = 0, x0 = W2, y0 = H, x1 = -1, y1 = -1;
      while (stack.length) {
        const p = stack.pop(), x = p % W2, y = (p - x) / W2;
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
            if (nx < 0 || ny < 0 || nx >= W2 || ny >= H) continue;
            const q = ny * W2 + nx;
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
  function readKnobManual(data, W2, H) {
    const edge = /* @__PURE__ */ new Map();
    const add2 = (x, y) => {
      const i = (y * W2 + x) * 4;
      const k = `${data[i] >> 2},${data[i + 1] >> 2},${data[i + 2] >> 2}`;
      edge.set(k, (edge.get(k) || 0) + 1);
    };
    for (let x = 0; x < W2; x++) {
      add2(x, 0);
      add2(x, H - 1);
    }
    for (let y = 0; y < H; y++) {
      add2(0, y);
      add2(W2 - 1, y);
    }
    const page = [...edge.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map((v) => Number(v) * 4 + 2);
    const notPage = new Uint8Array(W2 * H);
    const xMask = new Uint8Array(W2 * H), oMask = new Uint8Array(W2 * H), tMask = new Uint8Array(W2 * H);
    for (let p = 0, i = 0; p < W2 * H; p++, i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if ((r - page[0]) ** 2 + (g - page[1]) ** 2 + (b - page[2]) ** 2 > 60) notPage[p] = 1;
      if (isX(r, g, b)) xMask[p] = 1;
      else if (isO(r, g, b)) oMask[p] = 1;
      else if (isTitle(r, g, b)) tMask[p] = 1;
    }
    const panelBoxes = pieces(notPage, W2, H).filter((c) => c.n >= W2 * H * 0.08);
    if (panelBoxes.length !== 4) return { ok: false, reason: `found ${panelBoxes.length} panels (need 4)`, dirs: null, panels: [], problems: [] };
    const inBox = (c, b) => c.cx >= b.x0 && c.cx <= b.x1 && c.cy >= b.y0 && c.cy <= b.y1;
    const marks = [
      ...pieces(xMask, W2, H).map((c) => ({ ...c, v: "X" })),
      ...pieces(oMask, W2, H).map((c) => ({ ...c, v: "O" }))
    ];
    const big = marks.map((m) => m.n).sort((a, b) => b - a)[Math.min(marks.length - 1, 20)] || 1;
    const cells = marks.filter((m) => m.n >= big * 0.3);
    const titleBits = pieces(tMask, W2, H);
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
    text = discordPlain(text);
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
  function lampBlobs(cls2, W2, H) {
    const seen = new Uint8Array(W2 * H), stack = new Int32Array(W2 * H), out = [];
    const min = Math.min(W2, H) * 0.04, max = Math.min(W2, H) * 0.12;
    for (let p0 = 0; p0 < W2 * H; p0++) {
      if (!cls2[p0] || seen[p0]) continue;
      const k = cls2[p0];
      let sp = 0, n = 0, x0 = W2, x1 = -1, y0 = H, y1 = -1;
      stack[sp++] = p0;
      seen[p0] = 1;
      while (sp) {
        const p = stack[--sp], x = p % W2, y = (p - x) / W2;
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (x > 0 && cls2[p - 1] === k && !seen[p - 1]) {
          seen[p - 1] = 1;
          stack[sp++] = p - 1;
        }
        if (x < W2 - 1 && cls2[p + 1] === k && !seen[p + 1]) {
          seen[p + 1] = 1;
          stack[sp++] = p + 1;
        }
        if (y > 0 && cls2[p - W2] === k && !seen[p - W2]) {
          seen[p - W2] = 1;
          stack[sp++] = p - W2;
        }
        if (y < H - 1 && cls2[p + W2] === k && !seen[p + W2]) {
          seen[p + W2] = 1;
          stack[sp++] = p + W2;
        }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (bw >= min && bw <= max && bh >= min && bh <= max && Math.abs(bw - bh) <= Math.max(bw, bh) * 0.3 && n >= bw * bh * 0.45) {
        out.push({ lit: k === 1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, size: Math.max(bw, bh) });
      }
    }
    return out;
  }
  function readKnobLeds(data, W2, H) {
    const cls2 = new Uint8Array(W2 * H);
    for (let p = 0, i = 0; p < W2 * H; p++, i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      cls2[p] = isLit(r, g, b) ? 1 : isUnlit(r, g, b) ? 2 : 0;
    }
    const blobs3 = lampBlobs(cls2, W2, H).sort((a, b) => a.cy - b.cy);
    if (blobs3.length === 12) {
      const top = blobs3.slice(0, 6).sort((a, b) => a.cx - b.cx), bot = blobs3.slice(6).sort((a, b) => a.cx - b.cx);
      const size = blobs3[0].size;
      const flat = (row) => row[5].cy - row[0].cy < size * 0.5 && Math.abs(row[0].cy - row[5].cy) < size;
      const sameRows = Math.min(...bot.map((b) => b.cy)) - Math.max(...top.map((t) => t.cy)) > size;
      if (flat(top) && flat(bot) && sameRows) {
        return { state: [...top, ...bot].map((b) => b.lit ? 1 : 0), how: "lamps" };
      }
    }
    const rad = Math.max(2, Math.round(Math.min(W2, H) * 0.025));
    const state = [], lampLike = [];
    for (const fy of GRID_Y) for (const fx of GRID_X) {
      const cx = Math.round(fx * W2), cy = Math.round(fy * H);
      let lit = 0, unlit = 0, n = 0;
      for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
        if (x < 0 || y < 0 || x >= W2 || y >= H) continue;
        n++;
        const c = cls2[y * W2 + x];
        if (c === 1) lit++;
        else if (c === 2) unlit++;
      }
      state.push(lit > n * 0.3 ? 1 : 0);
      lampLike.push(lit + unlit > n * 0.5);
    }
    let gapsClear = 0;
    for (const fy of GRID_Y) for (let c = 0; c < 5; c++) {
      const x = Math.round((GRID_X[c] + GRID_X[c + 1]) / 2 * W2), y = Math.round(fy * H);
      if (x >= 0 && y >= 0 && x < W2 && y < H && !cls2[y * W2 + x]) gapsClear++;
    }
    if (lampLike.filter(Boolean).length >= 11 && gapsClear >= 9) return { state, how: "grid" };
    return null;
  }
  async function detectKnobStateFromImage(img) {
    const W2 = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const canvas = document.createElement("canvas");
    canvas.width = W2;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const leds = readKnobLeds(ctx.getImageData(0, 0, W2, H).data, W2, H);
    if (leds) return leds.state;
    try {
      const worker2 = await ensureOCRWorker();
      await worker2.setParameters({ tessedit_char_whitelist: "XO01 \n\r	", tessedit_pageseg_mode: "6", user_defined_dpi: "150" });
      const { data } = await worker2.recognize(canvas);
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
        const p = st.pop(), px2 = p % w, py = p / w | 0;
        n++;
        if (px2 < x0) x0 = px2;
        if (px2 > x1) x1 = px2;
        if (py < y0) y0 = py;
        if (py > y1) y1 = py;
        for (const q of [p - 1, p + 1, p - w, p + w]) {
          if (q < 0 || q >= w * h) continue;
          if (q === p - 1 && px2 === 0 || q === p + 1 && px2 === w - 1) continue;
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
  function holes(lab, id, W2, g) {
    const w = g.w + 2, h = g.h + 2, bg = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = g.x0 + x - 1, Y = g.y0 + y - 1;
      const inside = x > 0 && y > 0 && x < w - 1 && y < h - 1;
      bg[y * w + x] = inside && lab[Y * W2 + X] === id ? 0 : 1;
    }
    const { comps } = components(bg, w, h);
    return comps.filter((c) => c.x0 > 0 && c.y0 > 0 && c.x1 < w - 1 && c.y1 < h - 1 && c.n >= 2).length;
  }
  function letterOf(lab, g, W2) {
    const at2 = (x, y) => lab[(g.y0 + y) * W2 + g.x0 + x] === g.id;
    const rowWidth = (y) => {
      let a = -1, b = -1;
      for (let x = 0; x < g.w; x++) if (at2(x, y)) {
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
      for (let x = 0; x < lw; x++) if (at2(x, y)) {
        leftRows++;
        break;
      }
    }
    const straightLeft = leftRows >= g.h * 0.85;
    const h = holes(lab, g.id, W2, g);
    if (h >= 2) return "B";
    if (h === 1) return pointed || !straightLeft ? "A" : "B";
    return pointed ? "A" : "C";
  }
  function readWireManual(data, W2, H) {
    const problems = [];
    const ink = new Uint8Array(W2 * H);
    for (let p = 0; p < W2 * H; p++) ink[p] = d2(data, p * 4, PAGE) > 120 ? 1 : 0;
    const { comps } = components(ink, W2, H);
    const big = comps.filter((c) => c.w >= W2 * 0.08 && c.h >= H * 0.04 && c.n >= c.w * c.h * 0.6);
    if (big.length < 30) return { ok: false, problems: ["not the Wire Sequences manual (table cells not found)"] };
    const mean = (b) => {
      const s = [0, 0, 0];
      let n = 0;
      for (let y = Math.round(b.y0 + b.h * 0.15); y <= b.y1 - b.h * 0.15; y++) for (let x = b.x0 + 3; x <= b.x1 - 3; x++) {
        const i = (y * W2 + x) * 4;
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
    const ylab = new Uint8Array(W2 * H);
    for (let p = 0; p < W2 * H; p++) ylab[p] = isYellow(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]) ? 1 : 0;
    const { lab, comps: glyphs } = components(ylab, W2, H);
    for (const [color, head] of cols) {
      const col = big.filter((b) => b.y0 > lineY && Math.abs(b.cx - head.cx) < head.w * 0.4).sort((a, b) => a.y0 - b.y0);
      if (col.length !== 9) problems.push(`${color}: ${col.length} cells (need 9)`);
      col.slice(0, 9).forEach((cell, k) => {
        const inCell = glyphs.filter((g) => g.x0 >= cell.x0 && g.x1 <= cell.x1 && g.y0 >= cell.y0 && g.y1 <= cell.y1);
        const tall = Math.max(0, ...inCell.map((g) => g.h));
        const letters = inCell.filter((g) => g.h >= tall * 0.7).sort((a, b) => a.x0 - b.x0);
        let read = letters.map((g) => letterOf(lab, g, W2));
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
    text = discordPlain(text);
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
    const { data: d, width: W2, height: H } = img;
    const px2 = (x, y) => {
      const i = (y * W2 + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    };
    const lum6 = [];
    for (let y = Math.floor(H * 0.35); y <= Math.floor(H * 0.65); y += 3) {
      for (let x = Math.floor(W2 * 0.35); x <= Math.floor(W2 * 0.65); x += 3) {
        const [r, g, b] = px2(x, y), av = (r + g + b) / 3, ch = Math.max(r, g, b) - Math.min(r, g, b);
        if (av >= 15 && av <= 75 && ch < 20) lum6.push(av);
      }
    }
    lum6.sort((a, b) => a - b);
    const darkMed = lum6.length ? lum6[Math.floor(lum6.length / 2)] : 40;
    const kind = (r, g, b) => {
      const av = (r + g + b) / 3, ch = Math.max(r, g, b) - Math.min(r, g, b);
      if (r > 105 && r - g > 25 && r - b > 25) return "red";
      if (b > 85 && b - r > 18 && b - g > 10) return "blue";
      if (av < darkMed - 6 && av < 50 && ch < 22) return "black";
      return null;
    };
    const LX = 0.234 * W2, RX = 0.764 * W2;
    const Y = [0.3136, 0.507, 0.702].map((f) => f * H);
    const tol = Math.max(2, Math.round(W2 / 160));
    const bez = (t) => t * t * (3 - 2 * t);
    const stage = [];
    for (let p = 0; p < 3; p++) {
      const best = { c: null, d: null, f: 0 };
      for (let dst = 0; dst < 3; dst++) {
        const hit = { red: 0, blue: 0, black: 0 };
        const N2 = 60;
        let tot = 0;
        for (let k = 4; k <= N2 - 4; k++) {
          const t = k / N2, x = LX + (RX - LX) * t, y = Y[p] + (Y[dst] - Y[p]) * bez(t);
          tot++;
          const seen = {};
          for (let dy = -tol; dy <= tol; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = Math.round(x + dx), YY = Math.round(y + dy);
            if (X < 0 || X >= W2 || YY < 0 || YY >= H) continue;
            const kd = kind(...px2(X, YY));
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
      for (let x = Math.floor(W2 * 0.33); x <= Math.floor(W2 * 0.67); x++) {
        const [r, g, b] = px2(x, y);
        if (r > 200 && g > 140 && g < 215 && b < 150 && r - b > 70) {
          const xf = x / W2;
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

  // src/modules/limbo/limboSolver.js
  var limboSolver_exports = {};
  __export(limboSolver_exports, {
    LIMBO_COLORS: () => LIMBO_COLORS,
    SLOT_NAMES: () => SLOT_NAMES,
    limboBlobs: () => limboBlobs,
    limboColorName: () => limboColorName,
    solveLimbo: () => solveLimbo
  });
  var LIMBO_COLORS = ["red", "orange", "yellow", "green", "blue", "purple"];
  var SLOT_NAMES = ["top", "upper right", "lower right", "bottom", "lower left", "upper left"];
  var ARC_BULGE = 0.28;
  function isKeyPixel(r, g, b) {
    return r + g + b > 450 && Math.max(r, g, b) - Math.min(r, g, b) < 60;
  }
  function isGlowPixel(r, g, b) {
    return r > 150 && r - b > 50 && g > 150;
  }
  function dist3(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function getPlayArea(W2, H) {
    return {
      x0: Math.round(W2 * 0.08),
      x1: Math.round(W2 * 0.92),
      y0: Math.round(H * 0.17),
      y1: Math.round(H * 0.92)
    };
  }
  function limboColorName(r, g, b) {
    const max_c = Math.max(r, g, b);
    const min_c = Math.min(r, g, b);
    if (max_c < 90 || max_c - min_c < 70) return null;
    const delta = max_c - min_c;
    let hue;
    if (max_c === r) {
      hue = ((g - b) / delta + 6) % 6;
    } else if (max_c === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    hue *= 60;
    if (hue < 15 || hue >= 330) return "red";
    if (hue < 38) return "orange";
    if (hue < 70) return "yellow";
    if (hue < 170) return "green";
    if (hue < 250) return "blue";
    return "purple";
  }
  function limboBlobs(data, W2, H) {
    const { x0, x1, y0, y1 } = getPlayArea(W2, H);
    const mask = new Uint8Array(W2 * H);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * W2 + x) * 4;
        if (isKeyPixel(data[i], data[i + 1], data[i + 2])) mask[y * W2 + x] = 1;
      }
    }
    const min_pixels = Math.max(6, Math.round(W2 * H * 7e-4));
    const blobs3 = [];
    const stack = [];
    for (let start = 0; start < mask.length; start++) {
      if (mask[start] !== 1) continue;
      let count = 0;
      let sum_x = 0;
      let sum_y = 0;
      mask[start] = 2;
      stack.push(start);
      while (stack.length > 0) {
        const p = stack.pop();
        const px2 = p % W2;
        const py = (p - px2) / W2;
        count++;
        sum_x += px2;
        sum_y += py;
        for (const q of [p - 1, p + 1, p - W2, p + W2]) {
          if (q < 0 || q >= mask.length || mask[q] !== 1) continue;
          if (Math.abs(q % W2 - px2) > 1) continue;
          mask[q] = 2;
          stack.push(q);
        }
      }
      if (count >= min_pixels) {
        blobs3.push({ x: sum_x / count, y: sum_y / count, n: count });
      }
    }
    return blobs3;
  }
  function countColourPixels(data, W2, H) {
    const { x0, x1, y0, y1 } = getPlayArea(W2, H);
    let count = 0;
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const i = (y * W2 + x) * 4;
        if (limboColorName(data[i], data[i + 1], data[i + 2])) count++;
      }
    }
    return count;
  }
  function orderSlots(blobs3) {
    let center_x = 0;
    let center_y = 0;
    for (const blob of blobs3) {
      center_x += blob.x;
      center_y += blob.y;
    }
    center_x /= blobs3.length;
    center_y /= blobs3.length;
    const angleOf = (blob) => (Math.atan2(blob.x - center_x, -(blob.y - center_y)) + 2 * Math.PI + Math.PI / 6) % (2 * Math.PI);
    const sorted = blobs3.slice().sort((a, b) => angleOf(a) - angleOf(b));
    const slots = [];
    for (const blob of sorted) {
      slots.push({ x: blob.x, y: blob.y });
    }
    return slots;
  }
  function getPairings(items) {
    if (items.length === 0) return [[]];
    const first = items[0];
    const rest = items.slice(1);
    const result = [];
    for (let j = 0; j < rest.length; j++) {
      const others = [];
      for (let k = 0; k < rest.length; k++) {
        if (k !== j) others.push(rest[k]);
      }
      for (const sub_pairing of getPairings(others)) {
        result.push([[first, rest[j]], ...sub_pairing]);
      }
    }
    return result;
  }
  function getArcPoint(A, B, t, side) {
    const mid_x = (A.x + B.x) / 2;
    const mid_y = (A.y + B.y) / 2;
    const half_x = (B.x - A.x) / 2;
    const half_y = (B.y - A.y) / 2;
    const u = -Math.cos(Math.PI * t);
    const v = side * ARC_BULGE * Math.sin(Math.PI * t) ** 2;
    return {
      x: mid_x + u * half_x - v * half_y,
      y: mid_y + u * half_y + v * half_x
    };
  }
  function getPairingCost(pairs, slots, move_frames) {
    const frame_count = move_frames.length;
    let total_cost = 0;
    for (const [a, b] of pairs) {
      const A = slots[a];
      const B = slots[b];
      let best = Infinity;
      for (const side of [1, -1]) {
        let cost2 = 0;
        for (let k = 0; k < frame_count; k++) {
          const blobs3 = move_frames[k];
          const t = (k + 1) / (frame_count + 1);
          const expected = [getArcPoint(A, B, t, side), getArcPoint(B, A, t, side)];
          for (const point of expected) {
            let nearest = Infinity;
            for (const blob of blobs3) {
              nearest = Math.min(nearest, dist3(blob, point));
            }
            cost2 += nearest;
          }
        }
        best = Math.min(best, cost2);
      }
      total_cost += best;
    }
    return total_cost;
  }
  function solveLimbo(frames, W2, H, startOverride = null) {
    if (frames.length === 0) return { ok: false, reason: "no frames" };
    const unit = Math.min(W2, H);
    const tolerance = unit * 0.025;
    const colour_counts = [];
    let colour_max = -Infinity;
    for (const frame of frames) {
      const count = countColourPixels(frame.data, W2, H);
      colour_counts.push(count);
      colour_max = Math.max(colour_max, count);
    }
    let reveal_frame = -1;
    if (colour_max > 40) {
      reveal_frame = frames.length - 1;
      while (reveal_frame > 0 && colour_counts[reveal_frame - 1] > colour_max * 0.5) {
        reveal_frame--;
      }
    }
    const last_shuffle = reveal_frame >= 0 ? reveal_frame : frames.length;
    const frame_blobs = [];
    for (let f2 = 0; f2 < last_shuffle; f2++) {
      frame_blobs.push(limboBlobs(frames[f2].data, W2, H));
    }
    let first_rest = -1;
    for (let f2 = 0; f2 < frame_blobs.length; f2++) {
      if (frame_blobs[f2].length === 6) {
        first_rest = f2;
        break;
      }
    }
    if (first_rest < 0) return { ok: false, reason: "could not find the six keys \u2014 is this a Limbo GIF?" };
    const slots = orderSlots(frame_blobs[first_rest]);
    const isAtSlot = (blobs3, slot) => {
      for (const blob of blobs3) {
        if (dist3(blob, slot) <= tolerance) return true;
      }
      return false;
    };
    const isRestFrame = (blobs3) => {
      if (blobs3.length !== 6) return false;
      for (const slot of slots) {
        if (!isAtSlot(blobs3, slot)) return false;
      }
      return true;
    };
    let first_move = frame_blobs.length;
    for (let f2 = first_rest + 1; f2 < frame_blobs.length; f2++) {
      if (!isRestFrame(frame_blobs[f2])) {
        first_move = f2;
        break;
      }
    }
    const glow_counts = new Array(6).fill(0);
    const radius = unit * 0.1;
    for (let f2 = 0; f2 < Math.max(first_move, 1); f2++) {
      const data = frames[f2].data;
      for (let k = 0; k < slots.length; k++) {
        const slot = slots[k];
        let count = 0;
        for (let y = Math.max(0, Math.round(slot.y - radius)); y < Math.min(H, slot.y + radius); y++) {
          for (let x = Math.max(0, Math.round(slot.x - radius)); x < Math.min(W2, slot.x + radius); x++) {
            const j = (y * W2 + x) * 4;
            if (isGlowPixel(data[j], data[j + 1], data[j + 2])) count++;
          }
        }
        glow_counts[k] = Math.max(glow_counts[k], count);
      }
    }
    const glow_order = [];
    for (let k = 0; k < glow_counts.length; k++) {
      glow_order.push([glow_counts[k], k]);
    }
    glow_order.sort((a, b) => b[0] - a[0]);
    const detected_start = glow_order[0][0] > 0 ? glow_order[0][1] : null;
    const start_sure = detected_start !== null && glow_order[0][0] > 3 * (glow_order[1][0] + 5);
    const start = startOverride !== null && startOverride !== void 0 ? startOverride : detected_start;
    const moves = [];
    let f = first_rest;
    while (f < frame_blobs.length) {
      if (isRestFrame(frame_blobs[f])) {
        f++;
        continue;
      }
      const move_start = f;
      while (f < frame_blobs.length && !isRestFrame(frame_blobs[f])) f++;
      const move_frames = frame_blobs.slice(move_start, f);
      const moved_slots = [];
      for (let k = 0; k < slots.length; k++) {
        let off_count = 0;
        for (const blobs3 of move_frames) {
          if (!isAtSlot(blobs3, slots[k])) off_count++;
        }
        if (off_count * 2 >= move_frames.length && off_count > 0) moved_slots.push(k);
      }
      const move = { frames: [move_start, f - 1], pairs: [], cost: 0, margin: Infinity, warn: "" };
      if (moved_slots.length < 2 || moved_slots.length % 2 !== 0) {
        move.warn = `${moved_slots.length} key(s) moved \u2014 expected pairs`;
      } else {
        const scored = [];
        for (const pairing of getPairings(moved_slots)) {
          scored.push({ p: pairing, c: getPairingCost(pairing, slots, move_frames) });
        }
        scored.sort((a, b) => a.c - b.c);
        const scale = move_frames.length * moved_slots.length * unit;
        move.pairs = scored[0].p;
        move.cost = scored[0].c / scale;
        move.margin = scored.length > 1 ? (scored[1].c - scored[0].c) / scale : Infinity;
      }
      moves.push(move);
    }
    const path = [];
    let current_slot = start;
    if (current_slot !== null) {
      for (const move of moves) {
        for (const [a, b] of move.pairs) {
          if (current_slot === a) {
            current_slot = b;
          } else if (current_slot === b) {
            current_slot = a;
          }
        }
        path.push(current_slot);
      }
    }
    let colors = null;
    if (reveal_frame >= 0) {
      const data = frames[reveal_frame].data;
      colors = [];
      for (const slot of slots) {
        const votes = {};
        for (let y = Math.max(0, Math.round(slot.y - radius)); y < Math.min(H, slot.y + radius); y++) {
          for (let x = Math.max(0, Math.round(slot.x - radius)); x < Math.min(W2, slot.x + radius); x++) {
            const j = (y * W2 + x) * 4;
            const name = limboColorName(data[j], data[j + 1], data[j + 2]);
            if (name) votes[name] = (votes[name] || 0) + 1;
          }
        }
        let best_name = null;
        let best_count = 0;
        for (const [name, count] of Object.entries(votes)) {
          if (count > best_count) {
            best_name = name;
            best_count = count;
          }
        }
        colors.push(best_name);
      }
    }
    let unsure_moves = 0;
    for (const move of moves) {
      if (move.warn || move.margin < 0.01) unsure_moves++;
    }
    return {
      ok: true,
      slots,
      start,
      detectedStart: detected_start,
      startSure: start_sure,
      moves,
      unsureMoves: unsure_moves,
      path,
      end: current_slot,
      colors,
      revealFrame: reveal_frame,
      answer: current_slot !== null && colors && colors[current_slot] ? colors[current_slot] : ""
    };
  }

  // src/modules/pipes/pipesSolver.js
  var pipesSolver_exports = {};
  __export(pipesSolver_exports, {
    DIRS: () => DIRS2,
    E: () => E,
    N: () => N,
    S: () => S,
    W: () => W,
    isSolved: () => isSolved,
    pieceKind: () => pieceKind,
    pressText: () => pressText,
    rotCW: () => rotCW,
    solvePipes: () => solvePipes
  });
  var N = 1;
  var E = 2;
  var S = 4;
  var W = 8;
  var DIRS2 = [[N, 0, -1, S], [E, 1, 0, W], [S, 0, 1, N], [W, -1, 0, E]];
  function rotCW(m, times = 1) {
    let r = m & 15;
    for (let i = 0; i < (times % 4 + 4) % 4; i++) r = (r << 1 | r >> 3) & 15;
    return r;
  }
  var bits = (m) => (m & 1) + (m >> 1 & 1) + (m >> 2 & 1) + (m >> 3 & 1);
  function pieceKind(m) {
    const b = bits(m);
    if (b === 0) return "empty";
    if (b === 1) return "end";
    if (b === 2) return m === (N | S) || m === (E | W) ? "straight" : "elbow";
    if (b === 3) return "tee";
    return "cross";
  }
  function isSolved(masks, cols, rows) {
    let edges = 0, cells = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const m = masks[y * cols + x];
        if (!m) continue;
        cells++;
        for (const [bit, dx, dy, opp] of DIRS2) {
          if (!(m & bit)) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return false;
          if (!(masks[ny * cols + nx] & opp)) return false;
          edges++;
        }
      }
    }
    edges /= 2;
    if (edges !== cells - 1) return false;
    const start = masks.findIndex((m) => m);
    if (start < 0) return false;
    const seen = new Uint8Array(masks.length);
    const st = [start];
    seen[start] = 1;
    let n = 1;
    while (st.length) {
      const p = st.pop(), x = p % cols, y = (p - x) / cols;
      for (const [bit, dx, dy] of DIRS2) {
        if (!(masks[p] & bit)) continue;
        const q = (y + dy) * cols + x + dx;
        if (!seen[q]) {
          seen[q] = 1;
          n++;
          st.push(q);
        }
      }
    }
    return n === cells;
  }
  function solvePipes(cells, cols, rows, dir = 1) {
    const colors = [...new Set(cells.map((c) => c.color).filter(Boolean))];
    const k = colors.length;
    const idx = cells.map((c) => colors.indexOf(c.color));
    const seen = /* @__PURE__ */ new Map();
    const total = 4 ** k;
    const press = new Array(k).fill(0);
    for (let code = 0; code < total; code++) {
      let c = code;
      for (let i = 0; i < k; i++) {
        press[i] = c % 4;
        c = (c - press[i]) / 4;
      }
      const masks = cells.map((cell, i) => idx[i] < 0 ? cell.mask : rotCW(cell.mask, dir * press[idx[i]]));
      if (!isSolved(masks, cols, rows)) continue;
      const key = masks.join(",");
      const sum = press.reduce((a, b) => a + b, 0);
      if (!seen.has(key) || seen.get(key).total > sum) {
        seen.set(key, { presses: Object.fromEntries(colors.map((col, i) => [col, press[i]])), total: sum, masks });
      }
    }
    const solutions = [...seen.values()].sort((a, b) => a.total - b.total);
    return { colors, solutions };
  }
  function pressText(presses, colors) {
    const parts = colors.filter((c) => presses[c]).map((c) => `${c[0].toUpperCase()}${c.slice(1)} \xD7${presses[c]}`);
    return parts.length ? parts.join(", ") : "no presses";
  }

  // src/modules/pipes/pipesVision.js
  var pipesVision_exports = {};
  __export(pipesVision_exports, {
    pipeColorName: () => pipeColorName,
    readPipes: () => readPipes
  });
  var isTile = (r, g, b) => Math.abs(r - 42) <= 1 && Math.abs(g - 47) <= 1 && Math.abs(b - 56) <= 1;
  var isGap = (r, g, b) => Math.abs(r - 31) <= 3 && Math.abs(g - 34) <= 3 && Math.abs(b - 40) <= 3;
  var isPipe = (r, g, b) => Math.max(r, g, b) > 100;
  function pipeColorName(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (mx < 90 || d < 60) return null;
    let h;
    if (mx === r) h = ((g - b) / d + 6) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 15 || h >= 335) return "red";
    if (h < 38) return "orange";
    if (h < 70) return "yellow";
    if (h < 165) return "green";
    if (h < 195) return "cyan";
    if (h < 250) return "blue";
    if (h < 290) return "purple";
    return "pink";
  }
  function runs(profile, minLen) {
    const out = [];
    let s = -1;
    for (let i = 0; i <= profile.length; i++) {
      const on = i < profile.length && profile[i];
      if (on && s < 0) s = i;
      if (!on && s >= 0) {
        if (i - s >= minLen) out.push([s, i]);
        s = -1;
      }
    }
    return out;
  }
  function readPipes(data, Wd, Hd) {
    const tileCol = new Float64Array(Wd), tileRow = new Float64Array(Hd);
    for (let y = 0; y < Hd; y++) {
      for (let x = 0; x < Wd; x++) {
        const p = (y * Wd + x) * 4;
        if (isTile(data[p], data[p + 1], data[p + 2])) {
          tileCol[x]++;
          tileRow[y]++;
        }
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
    if (bx1 - bx0 < Wd * 0.2 || by1 - by0 < Hd * 0.2) return { ok: false, reason: "could not find the pipe tiles" };
    const gapCol = new Float64Array(Wd), gapRow = new Float64Array(Hd);
    for (let y = by0; y < by1; y++) {
      for (let x = bx0; x < bx1; x++) {
        const p = (y * Wd + x) * 4;
        if (isGap(data[p], data[p + 1], data[p + 2])) {
          gapCol[x]++;
          gapRow[y]++;
        }
      }
    }
    const minTile = Math.round(Math.min(Wd, Hd) * 0.05);
    const xs = runs(Array.from(gapCol.subarray(bx0, bx1), (v) => v < (by1 - by0) * 0.5), minTile).map(([a0, a1]) => [a0 + bx0, a1 + bx0]);
    const ys = runs(Array.from(gapRow.subarray(by0, by1), (v) => v < (bx1 - bx0) * 0.5), minTile).map(([a0, a1]) => [a0 + by0, a1 + by0]);
    if (xs.length < 2 || ys.length < 2) return { ok: false, reason: "could not find the pipe tiles" };
    const cells = [];
    let colored = 0;
    for (const [y0, y1] of ys) {
      for (const [x0, x1] of xs) {
        const cx = Math.round((x0 + x1) / 2), cy = Math.round((y0 + y1) / 2);
        const tw = x1 - x0, th = y1 - y0;
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

  // src/modules/hangman/hangmanSolver.js
  var hangmanSolver_exports = {};
  __export(hangmanSolver_exports, {
    HANGMAN_DEFAULT_WORDS: () => HANGMAN_DEFAULT_WORDS,
    bestGuess: () => bestGuess,
    candidates: () => candidates,
    looksLikeHangmanList: () => looksLikeHangmanList,
    outcomes: () => outcomes,
    parseHangmanWords: () => parseHangmanWords,
    positionsOf: () => positionsOf,
    revealed: () => revealed
  });
  var HANGMAN_DEFAULT_WORDS = `SPEAKING CRANKING STICKING SLASHING BATTERED
FLASHING WOUNDING RUMBLING CREAKING CLICKING
FREAKING MATTERED CLANKING FLICKING MUMBLING
SMASHING BREAKING FUMBLING CRASHING SNEAKING
PATTERED TATTERED BUMBLING TRICKING BLANKING`;
  function parseHangmanWords(text) {
    let t = String(text || "");
    const head = t.match(/^\s*words\s*:?\s*$/im);
    if (head) t = t.slice(head.index + head[0].length);
    let words = t.match(/\b[A-Z]{3,}\b/g) || [];
    if (words.length < 5 && head) words = (t.match(/\b[a-zA-Z]{3,}\b/g) || []).map((w) => w.toUpperCase());
    return [...new Set(words)];
  }
  function looksLikeHangmanList(text) {
    const t = String(text || "");
    const words = parseHangmanWords(t);
    if (/hangman/i.test(t)) return words.length >= 5;
    return words.length >= 10 && words.every((w) => w.length === words[0].length) && words[0].length >= 6;
  }
  var positionsOf = (word, letter) => {
    const out = [];
    for (let i = 0; i < word.length; i++) if (word[i] === letter) out.push(i);
    return out;
  };
  function candidates(words, guesses, length = null) {
    return words.filter((w) => (length == null || w.length === length) && guesses.every((g) => positionsOf(w, g.letter).join() === [...g.positions].sort((a, b) => a - b).join()));
  }
  function outcomes(cands, letter) {
    const groups2 = /* @__PURE__ */ new Map();
    for (const w of cands) {
      const k = positionsOf(w, letter).join();
      if (!groups2.has(k)) groups2.set(k, []);
      groups2.get(k).push(w);
    }
    return [...groups2.entries()].map(([k, ws]) => ({ positions: k ? k.split(",").map(Number) : [], words: ws })).sort((a, b) => (b.positions.length ? 1 : 0) - (a.positions.length ? 1 : 0) || b.words.length - a.words.length);
  }
  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  function bestGuess(cands, memo = /* @__PURE__ */ new Map()) {
    if (cands.length <= 1) return null;
    const key = cands.join(",");
    if (memo.has(key)) return memo.get(key);
    const options = [];
    for (const L of LETTERS) {
      const groups2 = outcomes(cands, L);
      if (groups2.length >= 2) options.push({ letter: L, groups: groups2 });
    }
    if (!options.length) {
      memo.set(key, null);
      return null;
    }
    let best = null;
    if (cands.length > 40) {
      for (const o of options) {
        const big = Math.max(...o.groups.map((g) => g.words.length));
        const sq = o.groups.reduce((a, g) => a + g.words.length ** 2, 0);
        if (!best || big < best.big || big === best.big && sq < best.sq) best = { ...o, big, sq };
      }
      const sub2 = best.groups.map((g) => cost(g.words, memo));
      best = { letter: best.letter, groups: best.groups, worst: 1 + Math.max(...sub2.map((r) => r.worst)), total: sub2.reduce((a, r, i) => a + r.total + best.groups[i].words.length, 0) };
    } else {
      for (const o of options) {
        let worst = 0, total = 0;
        for (const g of o.groups) {
          const r = cost(g.words, memo);
          worst = Math.max(worst, 1 + r.worst);
          total += g.words.length + r.total;
          if (best && worst > best.worst) break;
        }
        if (!best || worst < best.worst || worst === best.worst && total < best.total) best = { letter: o.letter, groups: o.groups, worst, total };
      }
    }
    const out = { letter: best.letter, worst: best.worst, average: best.total / cands.length, total: best.total, groups: best.groups };
    memo.set(key, out);
    return out;
  }
  function cost(words, memo) {
    const b = bestGuess(words, memo);
    return b ? { worst: b.worst, total: b.total } : { worst: 0, total: 0 };
  }
  function revealed(length, guesses) {
    const out = Array(length).fill("_");
    for (const g of guesses) for (const p of g.positions) if (p < length) out[p] = g.letter;
    return out;
  }

  // src/modules/hangman/hangmanVision.js
  var hangmanVision_exports = {};
  __export(hangmanVision_exports, {
    GLYPH_H: () => GLYPH_H,
    GLYPH_W: () => GLYPH_W,
    SEED_GLYPHS: () => SEED_GLYPHS,
    decodeGlyph: () => decodeGlyph,
    encodeGlyph: () => encodeGlyph,
    glyphScore: () => glyphScore2,
    readHangman: () => readHangman
  });
  var GLYPH_W = 12;
  var GLYPH_H = 16;
  var isSlot = (r, g, b) => Math.abs(r - 43) <= 4 && Math.abs(g - 48) <= 4 && Math.abs(b - 56) <= 4;
  var isInk2 = (r, g, b) => Math.max(r, g, b) > 130;
  var isFigure = (r, g, b) => Math.min(r, g, b) > 200;
  function runs2(on, minLen) {
    const out = [];
    let s = -1;
    for (let i = 0; i <= on.length; i++) {
      const v = i < on.length && on[i];
      if (v && s < 0) s = i;
      if (!v && s >= 0) {
        if (i - s >= minLen) out.push([s, i]);
        s = -1;
      }
    }
    return out;
  }
  function glyphOf(data, W2, x0, y0, x1, y1) {
    let gx0 = x1, gx1 = x0 - 1, gy0 = y1, gy1 = y0 - 1;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = (y * W2 + x) * 4;
        if (isInk2(data[p], data[p + 1], data[p + 2])) {
          if (x < gx0) gx0 = x;
          if (x > gx1) gx1 = x;
          if (y < gy0) gy0 = y;
          if (y > gy1) gy1 = y;
        }
      }
    }
    if (gx1 < gx0) return null;
    let w = gx1 - gx0 + 1, h = gy1 - gy0 + 1;
    const cx = (gx0 + gx1 + 1) / 2, cy = (gy0 + gy1 + 1) / 2;
    if (w / h < GLYPH_W / GLYPH_H) w = h * GLYPH_W / GLYPH_H;
    else h = w * GLYPH_H / GLYPH_W;
    const out = new Float32Array(GLYPH_W * GLYPH_H);
    const S2 = 3;
    for (let gy = 0; gy < GLYPH_H; gy++) {
      for (let gx = 0; gx < GLYPH_W; gx++) {
        let n = 0;
        for (let sy = 0; sy < S2; sy++) {
          for (let sx = 0; sx < S2; sx++) {
            const x = Math.floor(cx - w / 2 + (gx + (sx + 0.5) / S2) * w / GLYPH_W);
            const y = Math.floor(cy - h / 2 + (gy + (sy + 0.5) / S2) * h / GLYPH_H);
            if (x < x0 || y < y0 || x >= x1 || y >= y1) continue;
            const p = (y * W2 + x) * 4;
            if (isInk2(data[p], data[p + 1], data[p + 2])) n++;
          }
        }
        out[gy * GLYPH_W + gx] = n / (S2 * S2);
      }
    }
    return out;
  }
  function glyphScore2(a, b) {
    if (!a || !b) return -1;
    let ma = 0, mb = 0;
    for (let i = 0; i < a.length; i++) {
      ma += a[i];
      mb += b[i];
    }
    ma /= a.length;
    mb /= b.length;
    let d = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      const x = a[i] - ma, y = b[i] - mb;
      d += x * y;
      na += x * x;
      nb += y * y;
    }
    return d / Math.sqrt(na * nb + 1e-9);
  }
  var encodeGlyph = (g) => Array.from(g, (v) => Math.round(v * 9)).join("");
  var decodeGlyph = (s) => Float32Array.from(String(s), (c) => Number(c) / 9);
  var SEED_GLYPHS = {
    // 2026-11-22 screenshot, T in the 3rd of 9 blanks
    T: "133333333331799999999993999999999999953599995359000399993000000399993000000399993000000399993000000399993000000399993000000399993000000399993000000399993000000399971000000288600000000022000000"
  };
  function readHangman(data, W2, H) {
    const ix0 = Math.round(W2 * 0.08), ix1 = Math.round(W2 * 0.92);
    let by0 = -1, by1 = -1;
    for (let y = Math.round(H * 0.55); y < Math.round(H * 0.95); y++) {
      let n = 0;
      for (let x = ix0; x < ix1; x++) {
        const p = (y * W2 + x) * 4;
        if (isSlot(data[p], data[p + 1], data[p + 2])) n++;
      }
      if (n > (ix1 - ix0) * 0.3) {
        if (by0 < 0) by0 = y;
        by1 = y;
      } else if (by0 >= 0 && y - by1 > 3) break;
    }
    if (by0 < 0) return { ok: false, reason: "could not find the blanks" };
    const bh = by1 - by0 + 1;
    const col = new Array(W2).fill(false);
    for (let x = ix0; x < ix1; x++) {
      let n = 0;
      for (let y = by0; y <= by1; y++) {
        const p = (y * W2 + x) * 4;
        if (isSlot(data[p], data[p + 1], data[p + 2])) n++;
      }
      col[x] = n > bh * 0.2;
    }
    const spans = runs2(col, Math.max(6, Math.round(W2 * 0.03)));
    if (spans.length < 3) return { ok: false, reason: "could not find the blanks" };
    const slots = spans.map(([x0, x1]) => {
      let ink2 = 0;
      for (let y = by0; y <= by1; y++) {
        for (let x = x0; x < x1; x++) {
          const p = (y * W2 + x) * 4;
          if (isInk2(data[p], data[p + 1], data[p + 2])) ink2++;
        }
      }
      const filled = ink2 > (x1 - x0) * bh * 0.04;
      return { x0, x1, filled, glyph: filled ? glyphOf(data, W2, x0, by0, x1, by1 + 1) : null };
    });
    let ink = 0, fx0 = W2, fx1 = -1, fy0 = H, fy1 = -1;
    for (let y = Math.round(H * 0.15); y < by0 - 2; y++) {
      for (let x = ix0; x < ix1; x++) {
        const p = (y * W2 + x) * 4;
        if (isFigure(data[p], data[p + 1], data[p + 2])) {
          ink++;
          if (x < fx0) fx0 = x;
          if (x > fx1) fx1 = x;
          if (y < fy0) fy0 = y;
          if (y > fy1) fy1 = y;
        }
      }
    }
    const scale = W2 * H / (440 * 440);
    const figure = {
      ink: Math.round(ink / scale),
      // in 440×440 pixels, so pictures of other sizes compare
      headOnly: ink > 0 && fy1 - fy0 + 1 <= (fx1 - fx0 + 1) * 1.25
    };
    return { ok: true, length: slots.length, slots, figure };
  }

  // src/modules/hangman/hangmanShot.js
  var hangmanShot_exports = {};
  __export(hangmanShot_exports, {
    applyShot: () => applyShot,
    learnShapes: () => learnShapes,
    shapeBook: () => shapeBook
  });
  var LETTERS2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var SAME_SHAPE = 0.9;
  var KNOWN_SHAPE = 0.93;
  var PART_INK = 30;
  function shapeBook(saved) {
    const book = {};
    for (const [k, list] of Object.entries(SEED_GLYPHS)) book[k] = [decodeGlyph(list)];
    for (const [k, list] of Object.entries(saved || {})) {
      book[k] = (book[k] || []).concat((list || []).map(decodeGlyph));
    }
    return book;
  }
  function learnShapes(saved, learned) {
    const out = { ...saved || {} };
    for (const { letter, glyph } of learned) {
      if (!glyph) continue;
      out[letter] = [encodeGlyph(glyph), ...out[letter] || []].slice(0, 6);
    }
    return out;
  }
  function bestShape(glyph, book, skip) {
    let best = null, score = -1, second = -1;
    for (const [letter, list] of Object.entries(book)) {
      if (skip.has(letter)) continue;
      const s = Math.max(...list.map((g) => glyphScore2(glyph, g)));
      if (s > score) {
        second = score;
        score = s;
        best = letter;
      } else if (s > second) second = s;
    }
    return { letter: best, score, margin: score - second };
  }
  function applyShot(state, shot) {
    const L = shot.length;
    const filled = shot.slots.map((s) => s.filled);
    let guesses = state.guesses || [];
    const events = [], unresolved = [], learned = [];
    const knownPos = guesses.flatMap((g) => g.positions);
    const changed = state.length != null && (state.length !== L || knownPos.some((p) => !filled[p]) || state.prev && shot.figure.ink + PART_INK < state.prev.ink);
    const newBomb = changed && (guesses.length > 0 || Boolean(state.prev));
    if (changed) guesses = [];
    const first = !state.prev || changed;
    const known = new Set(guesses.flatMap((g) => g.positions));
    const fresh = filled.map((f, i) => f && !known.has(i) ? i : -1).filter((i) => i >= 0);
    const groups2 = [];
    for (const i of fresh) {
      const g = shot.slots[i].glyph;
      const grp = groups2.find((gr) => glyphScore2(gr.glyph, g) >= SAME_SHAPE);
      if (grp) grp.positions.push(i);
      else groups2.push({ positions: [i], glyph: g });
    }
    let pendingUsed = false;
    for (const grp of groups2) {
      const used = new Set(guesses.map((g) => g.letter));
      const fits = (X) => !used.has(X) && candidates(state.words, [...guesses, { letter: X, positions: grp.positions }], L).length > 0;
      const listHasWords = candidates(state.words, guesses, L).length > 0;
      const shape = bestShape(grp.glyph, state.book || {}, used);
      let letter = null, how = "";
      const P = state.pending;
      if (shape.letter && shape.score >= KNOWN_SHAPE && shape.margin >= 0.08) {
        letter = shape.letter;
        how = "shape";
      } else if (P && !pendingUsed && !used.has(P) && (!listHasWords || fits(P))) {
        const pShape = state.book && state.book[P] ? bestShape(grp.glyph, { [P]: state.book[P] }, /* @__PURE__ */ new Set()).score : null;
        if (pShape === null || pShape >= 0.6) {
          letter = P;
          how = "guess";
          pendingUsed = true;
        }
      }
      if (!letter && listHasWords) {
        const options = [...LETTERS2].filter(fits);
        if (options.length === 1) {
          letter = options[0];
          how = "list";
        } else {
          unresolved.push({ positions: grp.positions, options, glyph: grp.glyph });
          continue;
        }
      }
      if (!letter) {
        unresolved.push({ positions: grp.positions, options: [], glyph: grp.glyph });
        continue;
      }
      guesses = [...guesses, { letter, positions: grp.positions.slice().sort((a, b) => a - b) }];
      learned.push({ letter, glyph: grp.glyph });
      events.push({ type: "hit", letter, positions: grp.positions, how });
    }
    if (!groups2.length) {
      const grew = state.prev && !changed && shot.figure.ink > state.prev.ink + PART_INK;
      if (grew) {
        const used = new Set(guesses.map((g) => g.letter));
        const P = state.pending;
        if (P && !used.has(P)) {
          guesses = [...guesses, { letter: P, positions: [] }];
          events.push({ type: "miss", letter: P });
        } else {
          unresolved.push({ positions: [], options: [], glyph: null });
        }
      } else if (!first) {
        events.push({ type: "same" });
      }
    }
    if (first && (changed || !(state.guesses || []).length) && shot.figure.ink > 0) {
      const shown = new Set(guesses.map((g) => g.letter)).size;
      if (!(shot.figure.headOnly && shown === 1)) events.push({ type: "started" });
    }
    return { guesses, length: L, newBomb, events, unresolved, learned };
  }

  // src/modules/astrology/astroRefs.js
  var astroRefs_exports = {};
  __export(astroRefs_exports, {
    ASTRO_REFS: () => ASTRO_REFS
  });
  var ASTRO_REFS = [
    { "name": "Andromeda", "quad": "TR", "aspect": 1.9333, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAMADAAAAwB8AAAD4fwAAAPx/AAAA/nAAAAAO8P/+/w/g////B8Dvw8cDwIPDxwPAg8PHA8CDw8cDwIPDxwPA78/HA+D///8H8D9+fD5wAAAAPn8AAAD+fwAAAPwfAAAA+AMAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Antlia", "quad": "BL", "aspect": 0.5862, "bits": "AOD/BwAA8P8PAAD4AB8AADgAHAAAPgB8AAAeAHgAAB8A+AAADwD4AAAPAPgAAA8A8AAADwDwAAAPAPAAAA8A8AAADwDwAAAPAPAAAA8A8AAADwDwAAAPAPgAAA8A+AAA////AAD///8AAP7/fwAA/v9/AAAAfgAAAAAeAAAAAB4AAAAAHgAAAAAYAAAAAH4AAAAAfgAAAOD/BwAA+P8PAAD4GA8AAPgYHwAAPh58AAAefngAAB5+eAAAH374AAAPfvgAAA9+8AA=" },
    { "name": "Apus", "quad": "BL", "aspect": 0.5484, "bits": "AAwAAAAAfAAAAAD8AQAAAPwHAAAAwAcAAADADwAAAAAPAAAAABwAAAAAHAAAAAAcAAAAAD8AAADA/wMAAPj/DwAA+BwPAAD8HB8AAHwcPgAAHhw+AAAOHDgAAA4cOAAADhx4AAAOHHgAAAAcAAAAABwAAAAAHAAAAAAcAAAAABwAAAAAHAAAAAAcAAAAABwAAAAAHAAAAAAcAAAAABwAAAAAHAAAAAAcAAAAABwAAAAAHAAAAAAcAAAAABwAAAAAHAAAAAAcAAA=" },
    { "name": "Aquarius", "quad": "BR", "aspect": 2.5, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/gfgPwD/D/z/wA9//vzzBn4+4PMA/A/A/wD8D8D/AAAAAAAAAAAAAAAAAAAA/APADwD/D/B/AP8P8H8ABz588OAH/n/w/wD8P+D/AOADAD4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Aquila", "quad": "TL", "aspect": 1.0323, "bits": "AAAAOAAAAAA+AAAAAD4AAACAPwAAAMA/AAAA4AEAAADwAAAAAHAAAAAAcAAAAABwAAAAAHwAAAAA/wEAAAD/AQAA4P8HAAD4/z8AAP99/gHAP3z4A8APMMAD/A8wwD//ATAA/38AMAD+/wEwAP/8ATAAf/wDMMB/4D8w+AcA/zH+AQD49z8AAPD3DwAA8P8PAAAA/wEAAAD+AAAAADwAAAAAMAAAAAA8AAAAAHwAAAAAfAAAAAB8AAAAAHwAAAAAfAAAAAB8AAA=" },
    { "name": "Ara", "quad": "BL", "aspect": 1, "bits": "AAAwAAAAAPgAAAAA+AAAAADwAAAAAPAAAAAA8AAAAADwAAAAAPAAAAAA8AAAAAD4AAAAAPwAAAAAPAAAAAAcAAAAAAwAAAAADAAAAAAMAAAAAAwAAAAADAAABwAcAMAPABwA4D8AGADwfwAAAP5/AAAA/v8DAAD//w8A4P/n////5wf+///hB/7//+EH+P8f4AcA/ADABwAAAOAHAAAA4AcAAADgBwAAAOAHAAAA4AcAAADgBwAAAOD///////////////////8=" },
    { "name": "Aries", "quad": "TR", "aspect": 1, "bits": "8H8A/g/8/8P/P/7g5wd/PgDnAHwOAH4AcA8AfgDwBwB+AOAHAD4A4AcAPADABwA8AMADADwAwAMAPADABwA8AMAHADwA4A8APADwDwA8APAOADwAcA4APABwAAA8AAAAADwAAAAAPAAAAAA8AAAAADwAAAAAPAAAAAA8AAAAADwAAAAAPAAAAAA8AAAAADwAAAAAPAAAAAA8AAAAADwAAAAAPAAAAAA8AAAAADwAAAAAPAAAAAA8AAAAADwAAAAAPAAAAAA8AAA=" },
    { "name": "Auriga", "quad": "TR", "aspect": 1, "bits": "AAA8AAAAwP8DAADw5x8AAPgAHwAAeAAeAAB8AD4AABwAOAAAHgB4AAAOAHgAAA4AeAAADgBwAAAOAHAAAA4AcAAADgBwAAAOAHAAAA4AcAAADgBwAAAOAHAAAA4AcAAHDgBw4AcOAHDgBw4AcOAHDgBw4AcOAHDgBw4AcOAHDgBw4AcOAHDgPw4AcPz//////////////w8A8P8HAAAA4AcAAADgBwAAAOAHAAAA4AcAAADgBwAAAOAHAAAA4AcAAADgAAAAAMA=" },
    { "name": "Bo\xF6tes", "quad": "TL", "aspect": 0.3548, "bits": "AAA/AAAAwP8BAADw/wMAAPCHAwAA8IADAADwgA8AAPAADwAAcAAPAABwAAAAAPAAAAAA8AEAAADwBwAAAMAHAAAAwAcAAADADwAAAIAPAAAAAB8AAAAAHAAAAAAcAAAAABwAAAAAHAAAAAA8AAAAADwAAAAAPAAAAAA8AAAAABwAAAAAHAAAAAAcAAAAABgAAAAAGAAAAAAYAAAAABgAAAAAGAAAAAAYAAAAABwAAAAAHAAAAAAcAAAAADwAAAAAPAAAAAAcAAA=" },
    { "name": "Caelum", "quad": "BR", "aspect": 0.9697, "bits": "AAwAAAAAHgAAAIAfAAAAwB8AAADgHwAAAOAYAAAA8DgAAAB4OAAAAH44AAAAfzgAAAD//wAAAP//AAAA//8AAACA/wEAAAD4AwAAAOAHAAAAgA8AAAAADwAAAAA/AAAAAH4AAAAA/AAAAADwAQAAAOABAAAA4AcAAADADwAAAIAfAAAAAD8AAAAAfPgAAAB4+AAAAPj5AAAA8HMAAADgdwAAAMB/AAAAAH8AAAAAfgAAAAB+AAAAAHwAAAAA+AAAAADwAAAAAMA=" },
    { "name": "Camelopardalis", "quad": "TR", "aspect": 0.5667, "bits": "APADAAAA/A8AAAA/HwAAAB8cAAAADzwAAAAPPAAAAAw8AAAAADwAAAAAPAAAAAA8AAAAABwAAAAAHAAAAAAcAAAAAB8AAAAADwAAAAAPAAAAgAMAAACAAwAAAMADAAAAwAEAAADwAPAAAPgA8AAAOADwAAA4APAAABwA8AAAHwDwAAAfAPAAAA8A8AAAHwD4AAD///8AAP///wAA/wD/AAAPAPAAAA8A8AAADwDwAAAPAPAAAA8A8AAADwDwAAAPAPAAAA8A8AA=" },
    { "name": "Cancer", "quad": "TR", "aspect": 1.0323, "bits": "AAB/AAAA8P8HAADw/wcAAP//PwCAfwD8AMAfAPADwAMAwAfAAQCAB8ABAIAHAAAAAB8AAAAAPgAAAAA4AAAAADhgAADAf/wfAPh//j8A/H8OeAAe+A5wAA7wD3AADvAPcAAO8A9wAA7wD3AADvAPcAAOcA94AB5wfjwAPH7+PwD8P/4PAPAfHAAAAAAcAAAAAHwAAAAAeAAAAAD4AACAAeAAAIAB4AEAwAPADwDwA4AfAPwBAPz//wAA8P8fAADw/x8AAID/BwA=" },
    { "name": "Canes Venatici", "quad": "TL", "aspect": 0.625, "bits": "gP/n/wGA////AYD///8BAB8A+AAAHAA4AAA4ADgAADgAPAAAeAAeAABwAA4AAHAADgAA4IEHAADggwcAAIDDBwAAgMcBAAAAxwEAAADvAAAAAP8AAAAA/gAAgP///wGA////AQD///8AAP///wAAHAD4AAA8ADgAADgAOAAAOAAcAAB4AB4AAPABDgAA4IEPAADggQcAAICDBwAAgMMHAACA5wEAAADvAAAAAO8AAAAAfgAAAAB+AAAAAH4AAAAAPAAAAAA8AAA=" },
    { "name": "Canis Major", "quad": "BR", "aspect": 1.0323, "bits": "AAD/AP4A4P///wDg//9/APz//38A/38AeIAfcAA4wAPwAD7AAeAAHuAB4AAf+ADAAQd8AMCHBxwAgIcDDACAhwMOAIDPAw4AAP4BDgAA/gAPAAD8AAcAADwABwAAPAAHAAA4AAcAADAABwAAAAAHAAAAAAcAAAAADwAAAAAPAAAAAA4AAAAADgAAAAAOAAAAAB4AAAAAfAAAAAB4AAAAAHgAAAAA+AAAwAHgAwDwA4APAPwDAH+A/wAAeIA/AAD4/z8AAOD/DwA=" },
    { "name": "Canis Minor", "quad": "TR", "aspect": 0.6875, "bits": "gD8A/APA////A8D///8DgA8A8AOADwDwAQAPAPAAAB8A8AAAHAD4AAA8ADwAADgAHAAAcAAcAABwAB4AAHAADgAA4IEPAADggQcAAICDAQAAgMMBAACA5wEAAADvAQAAAO8AAAAAfgAAAAB+AAAAAHwAAAAAPAAAAAA8AAAAADwAAAAAPAAAAAB8AAAAAHAAAAAAcAAAAABgAAAAAOAAAAAA4AEAAADAAQAAAMABAAAAgA8AAACAPwAAAAD+AQAAAPgBAAAAwAE=" },
    { "name": "Capricornus", "quad": "BL", "aspect": 0.9375, "bits": "AAAA8B8AAAD4PwAAABx+AAAADngAAAAOcAAAAAZwAACAB3AAAIAPcAAAgA9wAAAADjAAAAAeOP4B/v8//gH+/x/+Af7/B8ABDjgAwAMO8ADAAw7wAIADDsABgAMOwAOAAwaAAwADB4ADAAMHgAcADwcABwCPAwAfAIwDAB4AjAMAPgCcAwA+AJwBAHgA/AEAeAD8AQBwAPwBAHAA/IEPcAD4gQ9wAPgBDngAeAAOOAB4APwfAHgA/B8AcAD4BwBwAMADADAAAAA=" },
    { "name": "Carina", "quad": "BR", "aspect": 1, "bits": "AP7///8A/v///4D/////gA8AAOCABwAA4MAHAADgwAMAAODgAwAAcOAAAABw4AAAAHDgDjxwPHgOPHg8fA48eB48Djx4BjwOPHgHPg488AMODhj4AQ4OGHgADw6YfwD///9/AP///z8A////MAAADhgwAAAOGDAAAA4YMAAADhgwAAAOGDAAAA4YMAAADhgwAAAOGDAAAA4YMAAADhgwAAAOGDAAAA4YcAAADjxwAAAOPHAAAA48eAAADjx4AAAOPHgAAAwYAAA=" },
    { "name": "Cassiopeia", "quad": "TR", "aspect": 1.7647, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAOAAAAAA4AAAAADwAAA8APAAADwAcAAAfgAwAAB/ADwAwP8APgDA9wAOB+DjAA4/8OMDD/9/wAcH/H8ABwfAPwDGA8A/AM4DAA8A/gMABgD8AAAAAPwAAAAA/AAAAADwAAAAAHAAAAAAYAAAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Centaurus", "quad": "BL", "aspect": 1.0333, "bits": "gB8AAADgfwAAAOB7AAAA4PsAAAD48AAAAHjwAQAAePABAAD48AEAAPjwAAAA4P8AAADAfwAAAAAOAAAAAA4AAAAADgAAAAAOAAAAAA4AAAAADgAAAAAOAAAA//8PAAD//w8AAP//DwDg//8PAOAADgAA4AAOAADgAA4AAOAADgAA4AAOAADgAP4H4P8A/gfg/wD+////AP7///8AHgAA/AAOAADgAA4AAOAADgAA4AAOAADgAA4AAOAADgAA4AAOAADgAA4AAOA=" },
    { "name": "Cepheus", "quad": "TR", "aspect": 0.6563, "bits": "AAAAgAPAARjAA8ADPMADwAf/4APAB//gA8CP9/EDwP/3/wPA/+H/A8D5gN8DwPkAxwPAAQDAA8ADAMADwAMAwAPA////A8D///8DwP///wPA////AwA8HAAAAHwcAAAAfBwAAAB4HAAAAPgcAAAA4B0AAADAHwAAAIAfAAAAAB8AAAAAPwAAAAA/AAAAgB8AAACAHwAAAMAfAAAA4B8AAAD4HQAAAPwcAAAAfBwAAAA8HAAAADwcAAAAABwAAAAAHAAAAAAYAAA=" },
    { "name": "Cetus", "quad": "BR", "aspect": 1.9375, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgP8AAADg/wEAAODzAQAA/PMPAHB8AB8AcD4AHwDwDgAcAPAOADwA8A8APADgBwA4AOAHADgAwAcAOADABwA4AMAPADgA4A4A8ADgDgDwAGA+APAAcHwA4AN++P///z/g////H+D///8fgP///wMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Chamaeleon", "quad": "BL", "aspect": 2.0625, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwA/4DwDwD/wfAP4P/j+APw8PfoAHDwdwwAcPB3DwAY8H4PAAj4fDeACPh8MYAA+HwxwAD8/DHAAP/8MOAA/+4A4ADwBgDgAPAHAOAA8AcP4AD/x//////z//////H/8AAP4BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Circinus", "quad": "BL", "aspect": 0.6667, "bits": "AOAAAAAA4AAAAADwAAAAAPAAAAAA8AEAAADwAQAAAPABAAAA+AEAAAD4AQAAAPgDAAAAuAMAAAC4AwAAALgDAAAAnAMAAACc/wAAAPz/BwAA/P8fAAD8BxwAAP4HPAAAHg54AAAODvABgA8O8AGABw7gAYAHDuADgAc+4APABzzAA8AHPMADwAc8wAPABwDAA8AHAMADwAcA4AOABwDgA4APAOABAA4A8AEADgBwAAAeAHgAAPwAPAAA+MMfAADg/w8AAAD/AQA=" },
    { "name": "Columba", "quad": "BR", "aspect": 0.7419, "bits": "AADgPwAAAPz/AwCA//8HAIAfwAcAgA8ABwDADwAHAPAHAAAA+AAAAAB4AAAAAHwAAAAAHgAAAIAfAAAA4H8AAADgfwAAAOD/AAAAAPgBAAAA8AEAAADAAQAAAMAHAAAAgAcAAACABwAAAIAHAAAAgAcAAACABwAAAIAHAAAAgA8AAAAADwAAAAAPAAAAAA8AAAAAHAAAAAA8AAAAADgAAAAAOAAAAADwAQAAAPADAAAAgAMAAACAfwAAAAD/BwAAAPgHAAAAwAc=" },
    { "name": "Coma Berenices", "quad": "TL", "aspect": 1, "bits": "AAAAcAAAAABwAAAAAHAAAAAAcAAAAABwAAAAAHAAAAAAcAAAAABwAAAAAHAAAAAA/v8AAID//wAA4P/xAADwcwAAAPAwAAAA8DgAAAD4PgAAADgfAAAAOA8AAAD/DwAHgP8DAAfw/wEAD/g9AAAOeBwAAA54HAAAPnwfAAB8nA8AAHycBwAA/P8HAADg/wEAAMD/AAAAAB4AAAAAHAAAAAAcAAAAAHwAAAAA+AAAAADwAAAAAPAfAAAAwB8AAACAHwAAAAAcAAA=" },
    { "name": "Corona Australis", "quad": "BL", "aspect": 1.7222, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAGADABwA4AOAPADwA8A8APADwfwA8AP7/AP8A//8D/8D/5wP/wOfnj//x54ef5/nhB/7nf+AH+IEf4AfwgQ/gB/DnD+AH8P8P4Af4/x/gB3g/HuAHeD8e4Ad8GD7g/x8A+P//HwD4//////////////8PAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Corona Borealis", "quad": "TL", "aspect": 1.875, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwA+AOAHAD4A8AcAPADwDmA8Y3DO////fP7///8//AD/wD98AH4AD3wAfgAPfAA+AA58AD4ADnwAPgAOfAA+AA48ADwADjwAPAAOMAA8AA48ADwADvz///8P/P///w/8////D/z///8PcAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Corvus", "quad": "BL", "aspect": 0.5333, "bits": "AAAMAAAAAD4AAAAOPnAAAA4+cAAADj58AAA+PnwAAD4+PgAAPA4OAABwDAYAAHAMBwAA8MwHAADgzAMAAODMAwAA4O8DAADA/wAAAAD/AAAAAH8AAAAAfwAAAAB+AAAAAD4AAAAAPAAAAAA8AAAAAAwAAAAADAAAAAAMAAAAAAwAAAAADAAAAAAMAAAAAAwAAAAADAAAAAAMAAAAAAwAAAAADgAAAAA+AAAAAD4AAAAAPgAAAAA+AAAAAD4AAAAAPgAAAAA+AAA=" },
    { "name": "Crater", "quad": "BL", "aspect": 1.1852, "bits": "AAAAAAAAAAAAAAAAAAAABwAAAHAHAAAA8A8AAADwDwAAAPAPAAAAcA8AAABwDgAAAHAeAAAAeBwAAAA4HAAAADh8AAAAPvgAAAAf+AAAgAfgAwDAB8ADAMABwA8A+AEAfwD+AAD///8AgO//8QGAAwDAAcADAMABwAEAwAPgAQCAB+AAAAAH4AAAAAf4AAAAH3gAAAAefAAAAD4eAAAAeB4AAAB4/gMAwH//////////////DwAAAPAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Crux", "quad": "BL", "aspect": 0.6452, "bits": "AAB8AAAAAHwAAAAAfAAAAAA8AAAAADwAAAAAPAAAAAA8AAAAADwAAAAAPAAAAAA8AAAAADwAAID///8BgP///wGA////AYD///8BAAAwAAAAADAAAAAAMAAAAAAwAAAAADAAAAAAMAAAAAAwAAAAADAAAAAAMAAAAGAwDgAA4LEPAADgsQ8AAOC9DwAA4L8HAADA/wcAAMD/AwAAAP8DAAAA/wMAAAD/AAAAAH4AAAAAfgAAAAB+AAAAAHwAAAAAPAAAAAAwAAA=" },
    { "name": "Cygnus", "quad": "TL", "aspect": 1.0323, "bits": "wH8AAADg/wMAAODgAwAA/OAHAAB8AA8AAB4APgAADgA+AAAOADwAAA4APAAADgA8AAAOADwAAAAAPgAAAAA+AAAAAD4AAAAADwAAAIAPAAAA4AcAAADgAwAAAPgDAAAAfAAAAAA/AAAAgA8AAACAAwAAAMADAAAA4AEAAAD4AP8AAHjw/w8AePD/DwB8/P8/AJ7///8B3g8A8APuAQCAB+4AAAAH/gAAAB9+AAAAPh4AAAB4//////////////////////////8=" },
    { "name": "Delphinus", "quad": "TL", "aspect": 1.0667, "bits": "AAAAAAD//w8AAP//PwAA/v9/AAAcAHwAAHgAcAAAeADwAAD4AOAAAOAB4AEAwAHAAQDAAYAHAMADgAcAgP/xDwCA//8fAAD//x8AAAAAPAAAAAD8AAAAAPgBAAAAwAMAAADAAwAAAIADAAAAgAcAAAAAHwAAAAAeAAAAAB4AAAAAOAAAAAA4AAAAAHgAAAAAcAAAAABwAAAAAHAAAAAA8AAAAADwAAAAAOAAAAAA4AAAAADgAAAAAOAAAAAA4AAAAADgAAAAAAA=" },
    { "name": "Dorado", "quad": "BR", "aspect": 1.0345, "bits": "AAwAAAAADAAAAODnAwAA/OcHAAD8AA8AAHwADgAAcAA8AADwAHwAAOAAfAAA4ABwAADAA3AAAMAD8AAA/wfgAAD/B+AAAP4HwAAA/gfAAwA+AMADADwAAAMAcAAABwDwBwAHAOA/AAcAwD8ABgAA/wAOAAD/Bw4AAOB/PAAAAH88AAAA8D8AAADwfwAAAMD/AAAAAP4AAAAA8AMAAADwPwAAAOD/AAAAwP8AAADA8wAAAMD3AAAAAAcAAAAABwAAAAAPAAAAAA8=" },
    { "name": "Draco", "quad": "TL", "aspect": 0.625, "bits": "AB8A/ACA////AYD///8BgP///wAAADwAAAAAPAAAAAA8AAAAADwAAAAAPAAAAAA8AAAAADwAAAAAPAAAAAB8AAAAgP8HAACA/wcAAID/DwAA4P8fAADwPTwAAHA8+AAAcDzwAABwPMAAAHA8wAEAcDzAAQDgPYABAOA9gAEAgD+AAQCAP4ABAAA+gAEAAACAAQAAAIABAAAAwAEADwDAAQAfAPAAAH8A+AAAfAA4AADwAx4AAPDPHwCA//8PAID//wcAgP//AAA=" },
    { "name": "Equuleus", "quad": "TL", "aspect": 0.9677, "bits": "/38AAAD/fwAAAP9/AAAAAHwAAAAAfAAAAAB8AAAAAHwAAAAAfAAAAAB8AAAAAHwAAAAAcAAAAABwAAAAAHAAAAAAcAAAAABwAADwAHAAAPAAcAAA8ABwAADwAHAAAPAAcAAA8ABwAADwAHAAAPAAcAAA8ABwAADwAHAAAPAA8P///wDw////APD///8A8P///wBwAADwAHAAAPAAcAAA8ABwAADwAHwAAPAAfAAA8AB8AADwAHwAAPAAfAAA8AB8AADwAHAAAPA=" },
    { "name": "Eridanus", "quad": "BR", "aspect": 0.6333, "bits": "AAw4wAAAHDjwAQAcOPABABgwwAEAGPDAAQAY8MABABjwwAEAGDDAAQAcOMABAB888AEAHzz4AAAPPPgAgAMPOACAAw84AIADDxgAgAEPGACAAw8YAIADDzgAgA8f+AAADxz4AAAfPPAAAB888AEAHDjAAQAYMMABABjwwAEAGPDAAQAc8MABABwwwAEAHzjwAQAfPPgBAA88+AAADxw4AIADDzgAgAMPOACAAQ8YAIABDxgAgAMPGACADx84AIAPHDgAAA8cOAA=" },
    { "name": "Fornax", "quad": "BR", "aspect": 1, "bits": "/////3//////////////BwAAAPAHAAAA8AcAAADwBwAAAPAHAAAA4AcAAADgBwAAAGAHgP8AYAfg/wdgB/DDD2AHeAAeYAc4ABxgBxwAPGAHHAA8YAccADhgBxwAOGAHHAA4YAccADhgBxwAOGAHHAA4YAccADhgBxwAOGAHHAA4YAccADhgB/z/P2AH/P8/YAf8/z9gBwwAOOAHDAA44AccADjgBxwAOPAHHAA48AccADjw/x8A/P//////////////BgAAAGA=" },
    { "name": "Gemini", "quad": "TR", "aspect": 1, "bits": "DwAAAPB/AAAA/v8DAMD//AMAwD/A////A8D///8DAP7/fwAADgBwAAAOAHAAAA4AcAAADgBwAAAOAHAAAA4AcAAADgBwAAAOAHAAAA4AcAAADgBwAAAOAHAAAA4AcAAADgBwAAAOAHAAAA4AcAAADgBwAAAOAHAAAA4AcAAADgBwAAAOAHAAAA4AcAAADgBwAAAOAHAAAA4AcAAADgBwAAAOAHAAAP7/fwDA////A8D///8D/AcA4D//BwDg/38AAAD+DwAAAPA=" },
    { "name": "Grus", "quad": "BR", "aspect": 0.7, "bits": "AAAYAADAg//BA8DD/8EDwMPBwQGAw4HDAYDDgcMBgMOB8wGAA4DzAAAPwPEAAB/A+QAAPPA/AAA48B8AAMD/AwAAwP8DAAAAPwAAAAAPAAAAgAMAAADAAwAAAMABAAAAwAEAAADAgQMAAMCBAwAAwMEDAADAwQEAAID/AQAAgP8BAAAAPAAAAAAcAAAAABwAAAAAHAAAAAAcAAAAABwAAAAAHAAAAAAcAAAAABwAAAAAHAAAAAAcAAAAABwAAAAAHAAAAAAcAAA=" },
    { "name": "Hercules", "quad": "TL", "aspect": 1.0333, "bits": "AAwAcAAAHgBwAAAeAHAAAB4AcAAAHgBwAAAeAHAAAB4AcAAAHgBwAAAeAHAAAB4AcAAAHgBwAAAeAHAAAB4AcAAAHgDwAQAcgP8fAByA/x8AHOD/fwAc8HP+ABz4cPAADPhw4A8MPHDgPxw/cOB+nB9wAPz/D3AA+P8HcAD4/wdwAID/AHAAAB4AcAAAHgBwAAAeAHAAAB4AcAAAHgBwAAAeAHAAAB4AcAAAHgBwAAAeAHAAAB4AcAAAHgBwAAAeAHAAAB4AcAA=" },
    { "name": "Horologium", "quad": "BR", "aspect": 1.0333, "bits": "APD/DwAA/P8/AAB8OD4AgH84/gHABzjgA+ADOMAH4AA4AAf4ADgAH3wAOAA+PAAYADw+ADgAfA4AOABwDgA4AHAPADgA8A8AOADgBwA4AOAHADgA4AcAOADgBwD4P+AHAPg/4AcAODjgBwA4OOAHAAAA4A8AAADgDwAAAOAPAAAA8A4AAADwPgAAAHA+AAAAcD4AAAB8PAAAAD58AAAAPvgAAAAf4AAAAAfgBwDgB8AfAPgDAP4AfwAA/AA/AAD8/z8AAID/AQA=" },
    { "name": "Hydra", "quad": "BL", "aspect": 1, "bits": "AAA8AAAAgP8BAADA5wMAAMCBAwAAwIEDAADAgQMAAMCBAwAAwOEDAADA4QMAAMD3AwAAgP8BAAAA/AEAAADgAQAAAOABAAAA4AEA4P/gAQD8/+8BAPzA7wEA/8D/AQA/AP8A8A4A/AH8AAD8D/8AAPwPPwAA//8/4P8f/wf8/w8AAPz7BwAA/vsfAAA/gD8AYA+A/wDwAID/A/8AgPcDfwCA9/9/AICH/x8AgA8AAAAADwAAAAAfAAAAAB8AAAAAHAAAAAAYAAA=" },
    { "name": "Hydrus", "quad": "BR", "aspect": 1.0333, "bits": "AAA4AAAAAPgAAAAA+AAAAAD4AAAAAPAAAMB/4AEAwH/gAQD8/+cBAP7znwEAfoC/AWAOAPwB8AAA+AHwAAD4A/4AAPD/f4B/8P8fgH/wAAD4//8AAP7//wAAf4A/AGAPAD8AYAYA/wDwBgD/AfwAAP//fwCA5/8/AIAH+AEAgAf4AQCABwAAAIAHAAAAAAcAAAAA/wAAAID/AwAAwOcDAADAgQMAAMCBAwAAwIEDAADAgQMAAMDnAwAAgOcBAACA/wEAAAD/AAA=" },
    { "name": "Indus", "quad": "BL", "aspect": 1.3636, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAP4H8AMA/gfwAwD8B+ADAOAH4AcA8AfADwD8BwAPAHwHADwAPgcAfAA/BwDwwA8OAODAAw4AwOMDPgDA9wN+//////////////////////////8AwP8AfgDA4wA+AODAAw4A8MAHDgB8AA8HAHwADgcAPgA8BwA/AHwHwA8A/AfABwDwB+ADAPwH4AMA/gfgAAD+BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Lacerta", "quad": "TR", "aspect": 0.5333, "bits": "AAA8AAAAAD4AAAAAPgAAAAAOAAAAAAYAAAAABgAAAAAGAAAAAAYAAAAABgAAAAAOAAAAAP5/AAAA/n8AAAz8fAAAfv98AAD+/wAAAPD/AAAAAOAAAAAA4AAAAADAAAAAAMAAAAAAwAAAAADgAAAA4OcAAADg5wAAAPx/AAAA/H9wAAA8/H8AAAD8fwAAAA4DAAAADgMAAAAGAAAAAAYAAAAABgAAAAAGAAAAAA4AAAAADgAAAAAOAAAAAD4AAAAAPAAAAAA8AAA=" },
    { "name": "Leo", "quad": "TL", "aspect": 0.8, "bits": "AMDnAwAA8OcHAAD8AD8AAHwAPgAAPAA8AAA+AHwAAA4AcAAADgBwAAAPAHAAAA8A8AAADwDwAAAOAPAAAA4AcAAADgBwAAA+AHAAADwAcAAAPABwAAB8AHAAAH4APAAAfgA8AOD/ADwA8P8APADw4AAOAHDgAA4AcOADDgBw4AMOAPDgAA8A8OAABwDgfwAHAOB/AAcAAAAABwAAAAAHAAAAwAcAAADABwAAAMAHDgAAwAcOAAAABw4AAAAPDwAAAP4HAAAA/AM=" },
    { "name": "Leo Minor", "quad": "TL", "aspect": 1.0333, "bits": "wH8AAAD4/wEAAPjzAQAA/PMHAAA+gA8AAA4AHwAADgAcAAAPABwAAAcAPAAABwA8AAAHADwAAAcAPAAABwA8AAAPADwAAA8APAAADgA8AAAOAD8AAH7AHwAA/P8fAADg/xkAAAAAGAAAAAAcAAAAABwAAAAAPAAAAAA8AAAAADwAAAAAPAAAAAA8AAAAADwAAAAAPADgAAA8AOAAADwA8AAAPADwAAA4APAAAPgA8AAA+AF8AADwAz4AAOADHgAA4P8fAAAA/wM=" },
    { "name": "Lepus", "quad": "BR", "aspect": 0.6, "bits": "AMAAAwAA4MMHAADgwwcAAOAABwAA4AAHAADgAAcAAOAABwAAwAADAADAAAMAAMAAAwAAwAADAADAAAMAAMAAAwAAwAADAADAAAMAAMAAAwAA4AAHAADgAAcAAODABwAA4MAHAADg5wcAAODnBwAA8AA/AABwAD4AADwAPAAAPgB8AAAOAHAAAA4AcAAADgBwAAAPAPAAAA8A8AAADgBwAAAOAHAAAA4AcAAAPgB8AAA8ADwAAHAAPgAA8AA/AADw/w8AAMD/AwA=" },
    { "name": "Libra", "quad": "BL", "aspect": 1.7647, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgAAAAB+AAAA4P8HAADw/w8AAPwDPwAAfAA+AAA+AHwAAD4AfAAAPgB8AAAOAHAAAA8A8MD/DwDw//8PAPD/Bg4AcOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAPD//////////////wAAwP//AADA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Lupus", "quad": "BL", "aspect": 0.9677, "bits": "DwAAAAAPAAAAAB8AAAAAPgAAAAA+AAAAAD4AAAAA+AAAAAD4AAAAAPAAAAAA8AEAAADgAQAAAOD/////gP////8A/////wD/////AAcAAHwAHgAAHwAeAAAfAD4AAB8APACADwB8AIAHAHAAwAcAYADAAQDgAcABAOAD4AEAwAPgAADAA+AAAMAH+AAAAAd8AAAADzwAAAA+PgAAAD4OAAAAPg4AAAD8DwAAAPwHAAAA8AcAAADwBwAAAOADAAAA4AMAAADAAAA=" },
    { "name": "Lynx", "quad": "TR", "aspect": 2.4615, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADw/w8AAPD/DwAA////AMA/PPwD+AM8wB/8ATwAP3wAPAA+fgA8AP4fADwA+B8APAD4/gA8AH/8ADwAH/wBPIAf4A888AeA/33+AQD4/z8AAID/AQAAgP8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Lyra", "quad": "TL", "aspect": 1.1538, "bits": "AAAAAAAAAAAAAPwAAAA//AAAAD/vAwDAf+8/AP//x////+PH////48D///8DwP///wPAczzuA8BzPM4DwHM8zgPgczzOA+BwPM4H4HA8DgdwcDwOB3BwPA4PcHA8Dg5wcDwODnxwPA4OfHA8Dg58cDwODnxwPA4OfHA8Dg58cDwODnBwPA4PcHA8Dg/w////B/D///8H4P///wfgAwDAA8AHAOADwA8A8AMAfwD+AAB8AD4AAPD/DwAA8P8PAAAAAAAAAAAAAAA=" },
    { "name": "Mensa", "quad": "BR", "aspect": 2.3077, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwHAPA//z8A/v8PPgB+/Af8AA/gB/zDD+AA/P8/AAD8/zwAAAwAPAAADgA8AAAPAHAAAAcAcAAABwDgAAAHAOAAwAcA4APAAwDAA+D/AP8D4P///wfg////BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Microscopium", "quad": "BL", "aspect": 0.9677, "bits": "APD/DwAA8P8PAADw/w8AAHCABwAAcIAHAABwgAcAAHCABwAAcIAHAABwAAYAAHAABgAAcAAGAABwAAYAAHAABgAAcAAGAABwAAYAAHAADgAAcAA+AABwAD4AAHAAfgAAcID/AABwgP8BAHCAxwEAcICHAQBwgIcHAHCAjw8AcIAPHwBwgA8cAPDBDxwA4OMHHADA/wB4AAD/AHgAAH4AcAAAfgBwAAA+APAAAAwA8AAAAADwAAAAAPD///////////////////8=" },
    { "name": "Monoceros", "quad": "TR", "aspect": 1.0333, "bits": "DwAAAAAPAAAAAA8AAAAAPwAAAAB8AAAAAPgAAAAA4AAAAADgAwAAAMAPAAAA/v8/AAD+/z8AAP7/HwAA/v8fAAAAAB8AAAAADwAAAAAPAAAAgA8AAACABwAAAMAHAAAAwAEAAADAAADgAPAAAOAA8AAA4AD4AADgAHgAAOAAeAAA4AB8AADgAP7//v8A/v/+/wD+////AP7///8AHgAA4AAOAADgAA4AAOAADgAA4AAOAADgAA4AAOAADgAA4AAOAADgAA4AAOA=" },
    { "name": "Musca", "quad": "BL", "aspect": 1.1481, "bits": "AAAAAAAAAAAAAMAfAPgD4P8A/wfg/wD/B/j/4f8f/MD3Az9+AP8Afg4A/wBwDgD/AHAGADwA4AcAPADgBwA8AGADADgAYAcAOADgBwA4AOAOADgA8A4AOABwDgA4AHB+ADgAfvwAGAA//AMYwD/gAxjAH+AHGOAfwA8Y8AMAfjh+AAB8OD4AAPz/PwAA+P8fAADA5wMAAMCBAwAAwIEDAADAgQMAAMCBAwAAwOcDAACA5wEAAID/AQAAAP8AAAAAAAAAAAAAAAA=" },
    { "name": "Norma", "quad": "BL", "aspect": 1, "bits": "AwAAAAAHAAAAAA8AAAAAHwAAAAAfAAAAAH8AAAAA/wAAAAD/AQAAAOcDAAAAxwMAAACHDwAAAIcfAAAAZz8AAADnfAAAAOd4AAAA5/EBAADn8wMAAOfvBwAA558PAADnHw8AAOc8PgAA5zx+AADn+P0AAOfw8QEA5+DhAQDngMMHAOeAzw8A5wC/HwDnAH4+AOcAfDwA5wDw+ADnAPD5Aef///cD5///xwfn//+HBwcAAAAfBwAAAD//////f/////////////8=" },
    { "name": "Octans", "quad": "BR", "aspect": 1, "bits": "AAAwAAAAADwAAAAAfAAAAAB+AAAAAH4AAAAAfgAAAAD+AAAAAO8AAAAA7wEAAADHAQAAAMcBAACAxwEAAICDBwAA4IMHAADggQcAAOABBgAA4AEOAADwAQ4AAPD/HwAA8P8fAAD4fR4AAPh9PgAAPDw4AAAcPDgAABwwMAAAHDDwAAAfMPAAAA8wwAGADzDAAYADMMABgAMwgAPAAzCAA88DMIDn/wEwgP//ATAA//wBPAB//B88+H/g////BwD///8BAID/BwA=" },
    { "name": "Ophiuchus", "quad": "BL", "aspect": 1.0333, "bits": "AAwAcAAAHgBwAAAeAHAAAB4AcAAAHgBwAAAeAHAAAB4AcAAAHgBwAAAeAHAAAB4AcAAADABwAAAMAHAAAAwAcACA/wBwAPj/B3AA+P8HcAD8/w9wAH6MH3AAPww/cAAPDDxwAAAM+HDgABz4cPAAHvBx/AAe8P9/AB6A/x8AHoD/HwAeAP4DAB4AcAAAHgBwAAAeAHAAAB4AcAAAHgBwAAAcAHgAABwAeAAAfAB4AAD4AD4AAPgBHwAA8AEPAADw/w8AAID/AQA=" },
    { "name": "Orion", "quad": "TR", "aspect": 4, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+AP+gD/8D//Bfx6fx/fxD/yD/+AP/IP/4A/8g//gD/yD/+Aen8f38P6P//F/+AP+wD8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Pavo", "quad": "BL", "aspect": 1, "bits": "AMA/AAAAwP8BAPjD/x8A/s+BPwD+zwE+AP/fAX4Av98B8AH+zwHAA/zDAQAD/MMBAAf8xwEAHv7PAQAeD84BADwPzgEAMA/eAQAwB94BAHAA3gEAYADOAQBgAM4BAGCAzwEAYIDPAQDgwMcBAMDAwwEAwODDAQDA+MABAMB8wAEAwDzAAQDAPsABAOAOwA8A4A/APwDgD8D/A/APwPkDcA/A+T9wD8CB/38O8AH4fw7wAOB/PvgA4H/8/gAAPvgfAAAAgAcAAAA=" },
    { "name": "Pegasus", "quad": "TR", "aspect": 1, "bits": "AAAAAH4AAADgfwAAAPh/AAAA/gMAAAA+AAAAAD8AAACADwAAAOADAAAA4AEABw7wAQD/D/AAAP8P+AAAhg84AACADzgAAIAPPAAAgA8cAAAABhwAAAAGHAAAAAYcAAAABhwAAAAGHADwAAYcAPAABhwA8AAGHADwAAYcAHAABhwAYAAGHABgAAYcAGAA/v//fwD+//9/AP7//38ABgAAYAAGAABgAA4AAGCADwAAcIAPAABwgA8AAPCADwAA8IAPAADwgA8AAPA=" },
    { "name": "Perseus", "quad": "TR", "aspect": 1.3913, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB78/z94/vz/P3/+/P8/f/79/79/wAM8wAOAAzzwAQAPPPAAAA888AAADzz4AAAfPjgAB5z/OfAH/P8/8Af8gT/wD/yBP/AOPAA+cB48ADx4fBwAOD54HAA4HvgfAPgf4B8A+AfAHwD4AwAfAPgAABwAOAAAHAA4AAA8ADwAADgAHgAA+IEPAADwgQcAAPD/BwAAgP8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Phoenix", "quad": "BR", "aspect": 1.4762, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4AAAOgP8D8A6A/wPwDsD/A/APwOcP4A/wAQ/gB/AADuAH8AAOwAfwAA7ABwAAD8AHAAAP4AYAAA/gDgCAD+AOAOAPYDwA8ANwfADwATx4APAAPPgA8AA+4H8w/h/A/7//B4D/v/8BgP///wEA+P8fAAAA/AAAAAA8AAAAADgAAAAAOAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Pictor", "quad": "BR", "aspect": 0.7813, "bits": "AAAYAAAAABwAAAAAHAAAAAA/AAAAAD8AAAAAPwAAAP7/PwAA/v8/AAD+/z8AAI7/PAAAjv89AADO/z0AAM79PQAAzp0/AADOnDMAAO6cMwAA7pw3AAD+HD8AAH4cPwAAfhw+AAA+HD4AAD4cPgAAPhw8AAD+HD8AAP4cPwAA/v8/AAD+/38AAA8ccAAABxzwAAAHHOAAwAMc4ADAAxzgA8ADHMAD4AMcwAPgARzAA/ABHMAH8AEcwAdwAByAD3AAHIAPcAAYAAY=" },
    { "name": "Pisces", "quad": "TR", "aspect": 1.1111, "bits": "AAAAAAAAAAAAAAADAMAAAA8A4AMAPwDwAwA/APAAADwAfAAAfAB+AADwAD4AAOAADgAA4AAHAADgAwcAAMDDBwAAAMMDAAAAxwAAAADHAAAAAOcAAAAA5gAAAADmAAD///////////////////8AAOYAAAAA5gAAAADHAAAAAMcAAAAAwwMAAMDDAwAAwMMHAADAAwcAAOAABwAA8AAPAAD8AD4AAHwAPgAAPgD8AAA/APwDAA8A8AMABwDgAwAAAAAAAAAAAAA=" },
    { "name": "Piscis Austrinus", "quad": "BR", "aspect": 0.7419, "bits": "AMCAAwAA8IEDAADw4QMAAMDnAwAAgOcBAACA9wEAAID/AQAAAP8AAAAAPAAAAAA8AAAAADwAAAAAPAAAAAD/AAAAAP8AAACA/wAAAIDnAQAAwOcBAADA4QEA4P///wPg////B+D///8HAPgAHwAAeAAeAAB8AD4AAHwAPgAAHgA4AAAeADgAAB4AeAAADgBwAAAOAHAAAA4AMAAADAAwAAAMADgAABwAOAAAfAAeAAB4AB4AAPiBHwAA8P8PAADA/wMAAAD/AAA=" },
    { "name": "Puppis", "quad": "BR", "aspect": 1.0323, "bits": "AADwBwAAAPAfAAAA8B8AAADw/wAAAAD8AQAAAPADAAAAgAcAAAAABwAAAAAfAAAAAD4AAAAAOAAAAAB4AAAAAHAAAAAAcAAAAABwAAAAAOAAAAAA4AAAAADgAPz//P8A/P///wD8////ADwAAOAAHAAA4AAcAADgABwAAOAAHAAA4A4fAADgDh8AAOD/HwAA4P8fAADgDhgAAOAOAAAA4AYAAADgBgAAAOAGAAAA4A4AAADg/v/////+//////7//////v////8=" },
    { "name": "Pyxis", "quad": "BR", "aspect": 0.9394, "bits": "AAAYAAAAABgAAP7///9//v///3/+////fw4APABwDgA8AHAOADwAcA4A/ABwDgD/AHAOAP8AcA4A/wBwDgD/AHAOAP8AcA6A5wFwDoDnAWAOgOcBYA6A5wFgDsDnA2AOwIEDYA7A/wNgDsD/A2AOwP8DYA7A/wNgDgAAAGAOAAAAYA4AAABgDgAAAGAOAAAAYA4AAABwDgAAAHAOAAAAcA4AAABwDgAAAHAOAAAAcA4AAABwDgAAAHD+////f/7///9//v///38=" },
    { "name": "Reticulum", "quad": "BR", "aspect": 1.0333, "bits": "AMD/AwAA/P8fAAB8AB8AgH8AfwDADwDwA+ADAOAH4AAAAAf4AAAAH3wAAAAfPgAAAD4+AAAAfA4AAAB8DwAcAHwPwP8BcAf4/w9wB/j/D3CH//9/8P9/AP///wcA8P//AAAA/38AAAD+/wcA4P//HwD+/8f/9//zB/z3H/AH/P8f8AfA/wNwDwA/AHAOABwAcA4AHAB8PgAcADx8ABwAPvgAHAAf4AAcAAfgAxzAB8APHPADgH8c/gEAfBw+AAD8/z8AAPD/AwA=" },
    { "name": "Sagitta", "quad": "TL", "aspect": 1.0333, "bits": "DgAAAAA/AAAAAD8AAAAAPwAAAAB+AAAAAPwAAAAA4AAAAADgAwAAAMAHAAAAgA8AAAAAHgAAAAAcAAAAAHwAAAAA+AAAAADwAQAAAMABAAAAwAcAAACAHwAAAIA/AAAAAD8AAAAA/AEAAAD8AwAAAPgfAAAA+H8AAADwfgAAAPD/AwAA4PE/AADgw/8AAIAD/gAAgAP+AACAD/AAAAAPAAAAAB8AAAAAHgAAAAAeAAAAAD4AAAAAeAAAAAB4AAAAAHgAAAAAeAA=" },
    { "name": "Sagittarius", "quad": "BL", "aspect": 1, "bits": "AAAA8P8AAADw/wAAAPD/AAAAAP4AAAAA/gAAAAD/AAAAwP8AAADg4wAAAODjAAAA8OMAHgB44AB+AD4AAP4AHwAA+AAPAAD4gA8AAPDhAwAAwPcBAACA9wAAAID/AAAAAD8AAAAAPwAAAID/AAAAgPcAAADA9wEAAPDhDwAA+IAfAAB4AB8AAHwAPwAAHgA+AIAPADgAwAcAAADAAwAAAOADAAAA+AMAAAD+AAAAAH4AAAAAfwAAAAA/AAAAAA8AAAAABwAAAAA=" },
    { "name": "Scorpius", "quad": "BL", "aspect": 1.2917, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAB8AAAAAP7//x8A/v//HwD///8/AI8fPHgABw4ceAAHDhx4AAcOHHAABw4ccAAHDhxwAAYOHHAAAA4ccAAADhxwAAAOHDAAAA4cMAAADhwwAAAOHDAAAA4cMAAADhxw/gAOHHD+AA4ccP4ADhxw/gAOHHB+AA4ceH4ADhx4fgAOHHh+AAAAcHAAAABwfAAAAPB/AAAAwD8AAADAPwAAAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Sculptor", "quad": "BR", "aspect": 0.7333, "bits": "AADnAAAAwOcHAADgAwcAAOAABwAAcAAOAABwAA4AAHAADgAAcAAOAABwAA4AAPAADwAA4AMHAADAAwcAwP///wPA////A8D///8DAHAAPgAAcAA8AABwADwAADwAPAAAPAA8AAA8ADwAADwAPAAADABwAAAMAHAAAD4AfAAA/v9/AAD+//8AAA4A8AAABwDgAAAHAOAAAAcA4AAABwDAAAAHAMADwAcAwAPAAwDAA8ADAMADwAMAwAPgAwDAB+ADAMAHwAAAAAc=" },
    { "name": "Scutum", "quad": "BL", "aspect": 1.0323, "bits": "/////3//////f/////9//////38HAD4AcAcAPgBwBwA+AHAHADwAYAcAPABgB/z/H2AH/P8fYAf8/x9gBwAMAGAHAAwAYAcADABwBwAMAHAHAAwAcAcADABwBwAMAHAHAAwA8AcADADwBwAMAHAHAAwAcAcADABwBwAMAHAPAAwAeA4ADAA4DgAMADgeAAwAPhwADAAeeAAMAB/4AAyAB+AADIAD4AE+wAPADz74AYA/Pv4AAPz/PwAA+P8PAAD4/w8AAOD/AQA=" },
    { "name": "Serpens", "quad": "TL", "aspect": 1.6316, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAHAAAA4D8AAADwf+B/AHDw+P8AePD4/wB44Pz/B3jwfoAPcPA/AA/wfQ8AD+B9DwAf4H8HABzAfwcAHABgAwAcAGADABwAYAcAHABgBwA8AHAPADwAcA8AOABwDwD4AHx+APABP3wA4P8/eACA/x8AAAD+BwAAAP4HAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Sextans", "quad": "BL", "aspect": 1.24, "bits": "AAAAAAAAAAAAAAAAAAAAAAAYAAAAABgAAAAAPAAAAAA8AAAAAP8AAAAA/wAAAAD/AAAAgP8BAACA/wEAAMD/AwAAwJ0DAADAnQMAAPCcDwAA+BgfAAB4GB4AAHgYHgAAfBg+AAAcGDgAAA4YeAAADhhwAIAPGPABgAcY4AHABxzgA8ADHMAD5gMcwGP/AzzA//9/PP7//v///3/4////H/j///8f4P+9/wcA/v9/AADw/w8AAPD/DwAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Taurus", "quad": "TR", "aspect": 0.7333, "bits": "4AAAwAPgAADAA+AAAMAD4AAAwAPgAwDAA+ADAOADwAMA4APAAwDgAAAHAHAAAA8AfAAAfgA/AAB8AA8AAOD/AwAA8P8HAAD84z8AADwAPgAADgBwAAAPAPAAwAcA8ADAAwDgAOADAMAD4AMAwAPgAADAA+AAAMAD4AAAwAfgAADAB+AAAMAH4AAAwAfgAADAA+AAAMAD4AMAwAPAAwDAA8ADAOAAwAcA8AAADwB8AAAOAHwAADwAPgAA/MA/AADg/wcAAAB/AAA=" },
    { "name": "Telescopium", "quad": "BL", "aspect": 1, "bits": "AAAAAGAAAAAA/AAAAAD8AAAAAH4AAAAAPgAAAAA/AAAAwB8AAADgBwAAAOADAAAA8AMAAAB4AAAAAD4AAAAAHwAAAAAPAAAAgA8AAADgAwAAAPABAAAA8AAAAAD4AAAAADwAAAAAPwAAAIAfAAAAgB8AAADAHwAAAPAdAAAA+BgAAAB4GAAAAHwYAAAAHhgAAIAPGAAAwAcYAADABxgAAOAHGAAA+AMYAAD8ABwAAHwAHAAAfgA8AAA//P8/AA/8/z8ABvz/PwA=" },
    { "name": "Triangulum", "quad": "TR", "aspect": 0.5313, "bits": "AP7/fwAA/v9/AAD+/38AAD4AfAAAPAA8AAA8ADwAAHwAPAAAfAA+AAB4AB4AAHgAHgAAeAAeAAB4AB4AAHgABwAA4AAHAADgAAcAAOAABwAA4AAHAADAAQMAAMCBAwAAwIEDAADAgQMAAMCBAwAAgOcBAACA5wEAAIDnAQAAgOcBAACA/wEAAAD/AAAAAP8AAAAA/wAAAAD/AAAAAP8AAAAAPAAAAAA8AAAAADwAAAAAPAAAAAA8AAAAABwAAAAAGAAAAAAYAAA=" },
    { "name": "Triangulum Australe", "quad": "BL", "aspect": 1.1429, "bits": "AAAAAAAAAAAAAAAAPAAAAAA8AAAAADwAAAAAfgAAAAD+AAAAAP8AAAAA7wEAAADnAQAAgMMBAACAwwcAAOCDBwAA8IEPAABwAA4AAHAADgAAeAAeAAA4ABwAADwAOAAAHAA4AAAMAPAAAA8A8AAAD//wAYD///8BgP///wHA/4H/A8D/gf8H4B8A8AfgAQCAH+AAAAAfeAAAAB58AAAAPh4AAAB4/gAAAH/+AAAAf///////////////AQCA/wAAAAAAAAAAAAA=" },
    { "name": "Tucana", "quad": "BR", "aspect": 0.7333, "bits": "AAD8AwAAAPwHAAAA/D8AAAB8PAAAAHxwAAAAfPAAAAB8wAAAADzAAAAAMMADAAAwwAMAADAABwAAMAAHAABwwAcAAPD/BwAA8P8HAABwAAcAADAAAAAAMAAAAAAwAAAAADAAAAAAMAAAAAAwAAAAADAAAAAAMAAAAAAwAAAAADAAAADA/wcAAMD/BwAAcDA+AAB8MH4AAD4w8AAADjDgAAAHPMADwAc8wAPAB3zAA8ADfMADwAN8AAfgA3wAB+ADfAAH4AN8AAc=" },
    { "name": "Ursa Major", "quad": "TL", "aspect": 2, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAPwAAAPj/AwAA/OAHAAAeAA8AAA4ADgAADgAOAAAPAD4AAA8AfgBwDwD+//8HAP7//wAA/AF/AAD8AX8AADwAcAAAfAB4AABwADgAAOAAGAAA4AEfAADA/wcAAID/AwAAAP4BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Ursa Minor", "quad": "TL", "aspect": 0.5484, "bits": "AAAcAAAAAB8AAAAAHwAAAAAPAAAAAA8AAACADwAAAIAHAAAAgAcAAACAAQAAAIABAAAAgAEAAACABwAAAIAHAAAAgAcAAACABwAAAIAPAAAAAB8AAAAAHwAAAAA/AAAAAPwAAAAA/wEAAID/AQAAgOcBAADA5w8AAPCBDwAA+AA/AAB4AD4AAH4AfgAAfgB4AAB+AH4AAPwAPgAA+AAeAAD4AR8AAMDnDwAAwP8DAACA/wEAAID/AQAAAPwAAAAAPAAAAAAYAAA=" },
    { "name": "Vela", "quad": "BR", "aspect": 1.0667, "bits": "AAAAAAD4//////j//////P///398AD4AeBwAPAA4HgA8AD4OADwAPg4APAAeDgA8AB4GAAwAHwYADAAfBgAMAAcHAAwABwcADAAHBwAMAAcHAAwABwcADAAHBwAMAAcHAAwABwcADAAHBwAMAAcGAAwABw4ADAAfDgAMAB4OAAwAHg4ADAA+HgAMAD4cAAwAPhwADAA4/P+//3/8//////j/////AAA8AAAAADwAAAAAPAAAAAA+AAAAAD4AAAAAPgAAAAAAAAA=" },
    { "name": "Virgo", "quad": "BL", "aspect": 1.3333, "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAA/vv3DwD+//8fAA8fPjwABx8+OAAHHz74HwcfPvg/Dx8++HkODz44cAYMDDhwAAwMOPAADAw48AAMDDhwAAwMOHAADAw4cAAMDDg4AAwMODgADAw4PgAMDDgeAAwMOB4ADwy4BwAPPvgHAB++/wEAH77/AAAMjD8AAAAAOAAAAAD4AAAAAPADAAAAwAMAAACAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" },
    { "name": "Volans", "quad": "BR", "aspect": 1, "bits": "/gAAAAD/BwAAAP8/AAAABz4AAAADcP8/AAPw//8AA/wD/gcD/APgBwfOBwAPB88HAD/Oww8APswDDwA8/AAOAAD8AA4AAPADPgAA4AM8AADwDzwAAPB/fAAAMP9zAAAw/HMAADzg5wAAPOD/AAA8AP4DADwA8AMAPADABwA8AMA/AHAAAP8DcAAA/wNwAADOD/AAAM5/8AAAPv/gAAA8/OADADxg4AcAfGDADwBwAAAPAHAAAA8A8AAADwDwAwAGAOADAAAA4AA=" },
    { "name": "Vulpecula", "quad": "TL", "aspect": 1.1481, "bits": "AAAAAAAAAAAAAAcAAADwDwAAAPAPAAAA8A8AAAD8PgAAAHw+AAAAPjwAAAA+fAAAAD54AAAAH/gAAAAH4AAAwAfgAADAA+ADAMADwAcA4AOABwDgAYAHAGAAgP//fwAA/v9/AAD+/z8AAHwAPgAAeAAeAAB4AB4AAPgAHwAA8IAPAADwgAMAAPCBAwAAwOcDAADA9wEAAID/AQAAgP8AAACA/wAAAAD/AAAAADwAAAAAPAAAAAA8AAAAABwAAAAAAAAAAAAAAAA=" }
  ];

  // src/modules/astrology/astrologyVision.js
  var astrologyVision_exports = {};
  __export(astrologyVision_exports, {
    GLYPH_N: () => GLYPH_N2,
    QUADS: () => QUADS,
    QUAD_NAMES: () => QUAD_NAMES,
    distMap: () => distMap,
    glyphCost: () => glyphCost,
    nameGlyph: () => nameGlyph,
    normGlyph: () => normGlyph,
    packBits: () => packBits,
    readDefuser: () => readDefuser,
    readSkyMap: () => readSkyMap,
    segmentSkyMap: () => segmentSkyMap,
    unpackBits: () => unpackBits
  });
  var GLYPH_N2 = 40;
  var isInk3 = (r, g, b, minMax) => {
    const mx = Math.max(r, g, b);
    return mx > minMax && mx - Math.min(r, g, b) < 60;
  };
  var isBrass = (r, g, b) => r > 180 && b < 150 && r - b > 60;
  function dilate(mask, W2, H, r) {
    const tmp = new Uint8Array(W2 * H), out = new Uint8Array(W2 * H);
    for (let y = 0; y < H; y++) {
      let last = -1e9;
      for (let x = 0; x < W2; x++) {
        if (mask[y * W2 + x]) last = x;
        if (x - last <= r) tmp[y * W2 + x] = 1;
      }
      last = 1e9;
      for (let x = W2 - 1; x >= 0; x--) {
        if (mask[y * W2 + x]) last = x;
        if (last - x <= r) tmp[y * W2 + x] = 1;
      }
    }
    for (let x = 0; x < W2; x++) {
      let last = -1e9;
      for (let y = 0; y < H; y++) {
        if (tmp[y * W2 + x]) last = y;
        if (y - last <= r) out[y * W2 + x] = 1;
      }
      last = 1e9;
      for (let y = H - 1; y >= 0; y--) {
        if (tmp[y * W2 + x]) last = y;
        if (last - y <= r) out[y * W2 + x] = 1;
      }
    }
    return out;
  }
  function label(mask, W2, H) {
    const lab = new Int32Array(W2 * H);
    let n = 0;
    const st = [];
    for (let s = 0; s < W2 * H; s++) {
      if (!mask[s] || lab[s]) continue;
      n++;
      lab[s] = n;
      st.push(s);
      while (st.length) {
        const p = st.pop(), px2 = p % W2, py = (p - px2) / W2;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const x = px2 + dx, y = py + dy;
          if (x < 0 || y < 0 || x >= W2 || y >= H) continue;
          const q = y * W2 + x;
          if (mask[q] && !lab[q]) {
            lab[q] = n;
            st.push(q);
          }
        }
      }
    }
    return { lab, n };
  }
  function glyphBoxes(ink, W2, H, r, minPx) {
    const { lab, n } = label(r > 0 ? dilate(ink, W2, H, r) : ink, W2, H);
    const box = Array.from({ length: n + 1 }, () => ({ x0: W2, y0: H, x1: 0, y1: 0, n: 0 }));
    for (let y = 0; y < H; y++) for (let x = 0; x < W2; x++) {
      const i = y * W2 + x;
      if (!ink[i]) continue;
      const b = box[lab[i]];
      b.n++;
      if (x < b.x0) b.x0 = x;
      if (y < b.y0) b.y0 = y;
      if (x + 1 > b.x1) b.x1 = x + 1;
      if (y + 1 > b.y1) b.y1 = y + 1;
    }
    return box.slice(1).filter((b) => b.n >= minPx);
  }
  function normGlyph(ink, W2, b) {
    const w = b.x1 - b.x0, h = b.y1 - b.y0, s = Math.max(w, h);
    const ox = b.x0 - (s - w) / 2, oy = b.y0 - (s - h) / 2;
    const N2 = GLYPH_N2, bits2 = new Uint8Array(N2 * N2), f = s / N2;
    for (let gy = 0; gy < N2; gy++) {
      for (let gx = 0; gx < N2; gx++) {
        const sx0 = ox + gx * f, sy0 = oy + gy * f;
        let on = 0, tot = 0;
        for (let y = Math.floor(sy0); y < Math.ceil(sy0 + f); y++) {
          for (let x = Math.floor(sx0); x < Math.ceil(sx0 + f); x++) {
            tot++;
            if (x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1 && ink[y * W2 + x]) on++;
          }
        }
        if (tot && on / tot > 0.2) bits2[gy * N2 + gx] = 1;
      }
    }
    return { bits: bits2, aspect: w / h };
  }
  function edt1(f, n) {
    const d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let s;
      while (true) {
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        if (s <= z[k]) {
          k--;
          if (k < 0) {
            k = 0;
            break;
          }
        } else break;
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) ** 2 + f[v[k]];
    }
    return d;
  }
  function distMap(bits2) {
    const N2 = GLYPH_N2, INF = 1e9, g = new Float64Array(N2 * N2);
    for (let i = 0; i < N2 * N2; i++) g[i] = bits2[i] ? 0 : INF;
    const col = new Float64Array(N2);
    for (let x = 0; x < N2; x++) {
      for (let y = 0; y < N2; y++) col[y] = g[y * N2 + x];
      const d = edt1(col, N2);
      for (let y = 0; y < N2; y++) g[y * N2 + x] = d[y];
    }
    const row = new Float64Array(N2);
    for (let y = 0; y < N2; y++) {
      for (let x = 0; x < N2; x++) row[x] = g[y * N2 + x];
      const d = edt1(row, N2);
      for (let x = 0; x < N2; x++) g[y * N2 + x] = Math.sqrt(d[x]);
    }
    return g;
  }
  function glyphCost(a, b) {
    if (!a.dt) a.dt = distMap(a.bits);
    if (!b.dt) b.dt = distMap(b.bits);
    let sa = 0, na = 0, sb = 0, nb = 0;
    for (let i = 0; i < a.bits.length; i++) {
      if (a.bits[i]) {
        sa += b.dt[i];
        na++;
      }
      if (b.bits[i]) {
        sb += a.dt[i];
        nb++;
      }
    }
    if (!na || !nb) return 99;
    return (sa / na + sb / nb) / 2 + 3 * Math.abs(Math.log(a.aspect / b.aspect));
  }
  function nameGlyph(g, refs) {
    const sc = refs.map((r) => ({ name: r.name, cost: glyphCost(g, r) })).sort((a, b) => a.cost - b.cost);
    return { name: sc[0].name, cost: sc[0].cost, second: sc[1] ? sc[1].name : null, margin: sc[1] ? sc[1].cost - sc[0].cost : 99 };
  }
  function packBits(bits2) {
    const bytes = new Uint8Array(Math.ceil(bits2.length / 8));
    bits2.forEach((v, i) => {
      if (v) bytes[i >> 3] |= 1 << (i & 7);
    });
    let s = "";
    bytes.forEach((b) => {
      s += String.fromCharCode(b);
    });
    return typeof btoa === "function" ? btoa(s) : Buffer.from(bytes).toString("base64");
  }
  function unpackBits(b64) {
    const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    const bits2 = new Uint8Array(GLYPH_N2 * GLYPH_N2);
    for (let i = 0; i < bits2.length; i++) bits2[i] = bin.charCodeAt(i >> 3) >> (i & 7) & 1;
    return bits2;
  }
  var QUADS = ["TL", "TR", "BL", "BR"];
  var QUAD_NAMES = { TL: "top-left", TR: "top-right", BL: "bottom-left", BR: "bottom-right" };
  function brassLine(brass, W2, H, vertical, lo, hi) {
    let best = -1, bestN = 0;
    const len = vertical ? W2 : H;
    for (let p = Math.floor(lo * len); p < Math.ceil(hi * len); p++) {
      let n = 0;
      if (vertical) {
        for (let y = 0; y < H; y++) n += brass[y * W2 + p];
      } else {
        for (let x = 0; x < W2; x++) n += brass[p * W2 + x];
      }
      if (n > bestN) {
        bestN = n;
        best = p;
      }
    }
    return { at: best, n: bestN };
  }
  function segmentSkyMap(data, W2, H) {
    const brass = new Uint8Array(W2 * H), ink = new Uint8Array(W2 * H);
    for (let i = 0, p = 0; i < W2 * H; i++, p += 4) {
      if (isBrass(data[p], data[p + 1], data[p + 2])) brass[i] = 1;
      else if (isInk3(data[p], data[p + 1], data[p + 2], 90)) ink[i] = 1;
    }
    const vx = brassLine(brass, W2, H, true, 0.3, 0.7), hy = brassLine(brass, W2, H, false, 0.3, 0.7);
    const midX = vx.n > H * 0.3 ? vx.at : W2 / 2, midY = hy.n > W2 * 0.3 ? hy.at : H / 2;
    const fl = brassLine(brass, W2, H, true, 0, 0.1), fr = brassLine(brass, W2, H, true, 0.9, 1);
    const ft = brassLine(brass, W2, H, false, 0, 0.1), fb = brassLine(brass, W2, H, false, 0.9, 1);
    const X0 = fl.n > H * 0.3 ? fl.at + 3 : 0, X1 = fr.n > H * 0.3 ? fr.at - 3 : W2;
    const Y0 = ft.n > W2 * 0.3 ? ft.at + 3 : 0, Y1 = fb.n > W2 * 0.3 ? fb.at - 3 : H;
    const band = Math.max(2, Math.round(3 * W2 / 1024));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W2; x++) {
        if (x < X0 || x >= X1 || y < Y0 || y >= Y1 || Math.abs(x - midX) <= band || Math.abs(y - midY) <= band) ink[y * W2 + x] = 0;
      }
    }
    const unit = W2 / 1024;
    const minPx = Math.max(8, Math.round(30 * unit * unit));
    let boxes = null;
    const tried = /* @__PURE__ */ new Set();
    for (const k of [3, 3.5, 2.5, 4, 2, 4.5, 5]) {
      const r = Math.max(1, Math.round(k * unit));
      if (tried.has(r)) continue;
      tried.add(r);
      const b = glyphBoxes(ink, W2, H, r, minPx);
      if (!boxes || Math.abs(b.length - 88) < Math.abs(boxes.length - 88)) boxes = b;
      if (b.length === 88) break;
    }
    const glyphs = boxes.map((b) => {
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      return { box: b, cx, cy, quad: (cy < midY ? "T" : "B") + (cx < midX ? "L" : "R"), g: normGlyph(ink, W2, b) };
    });
    return { ink, glyphs, midX, midY };
  }
  function readSkyMap(data, W2, H, refs) {
    const seg = segmentSkyMap(data, W2, H);
    const glyphs = seg.glyphs.map(({ g, ...rest }) => ({ ...rest, ...nameGlyph(g, refs) }));
    const byName = {}, best = {}, dupes = [];
    glyphs.forEach((g) => {
      if (best[g.name]) {
        dupes.push(g.name);
        if (best[g.name].cost <= g.cost) return;
      }
      best[g.name] = g;
      byName[g.name] = g.quad;
    });
    return { glyphs, byName, midX: seg.midX, midY: seg.midY, dupes };
  }
  function readDefuser(data, W2, H, refs, inkMin = 190) {
    const sx0 = Math.round(W2 * 0.11), sx1 = Math.round(W2 * 0.89), sy0 = Math.round(H * 0.2), sy1 = Math.round(H * 0.665);
    const sw = sx1 - sx0, sh = sy1 - sy0;
    const star = new Uint8Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const p = ((y + sy0) * W2 + x + sx0) * 4;
      if (Math.min(data[p], data[p + 1], data[p + 2]) > 200) star[y * sw + x] = 1;
    }
    const blobs3 = glyphBoxes(star, sw, sh, 0, Math.max(3, Math.round(W2 * H * 4e-5)));
    const sizes = blobs3.map((b) => b.n).sort((a, b) => a - b);
    const med2 = sizes.length ? sizes[sizes.length >> 1] : 0;
    const bigBlobs = blobs3.filter((b) => b.n > med2 * 2.4).length;
    const starBlobs = blobs3.map((b) => ({ x: sx0 + (b.x0 + b.x1) / 2, y: sy0 + (b.y0 + b.y1) / 2, n: b.n }));
    const by0 = Math.round(H * 0.705), by1 = Math.round(H * 0.885);
    const edges = [0.1, 0.295, 0.5, 0.705, 0.9].map((f) => Math.round(W2 * f));
    const buttons = [];
    for (let k = 0; k < 4; k++) {
      const x0 = edges[k], x1 = edges[k + 1], w = x1 - x0, h = by1 - by0;
      const cornerX = Math.round(W2 * 0.055), cornerY = Math.round(H * 0.04);
      const inCorner = (x, y) => x < cornerX && y < cornerY;
      let peak = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (inCorner(x, y)) continue;
        const p = ((y + by0) * W2 + x + x0) * 4;
        if (Math.max(data[p], data[p + 1], data[p + 2]) - Math.min(data[p], data[p + 1], data[p + 2]) < 60) peak = Math.max(peak, data[p], data[p + 1], data[p + 2]);
      }
      const cut = Math.max(110, Math.min(inkMin, peak * 0.62));
      const ink = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = ((y + by0) * W2 + x + x0) * 4;
        if (isInk3(data[p], data[p + 1], data[p + 2], cut)) ink[y * w + x] = 1;
      }
      const parts = glyphBoxes(ink, w, h, 0, 2).filter((b2) => !(b2.x1 <= cornerX + 1 && b2.y1 <= cornerY + 1));
      for (let y = 0; y < cornerY; y++) for (let x = 0; x < cornerX; x++) if (!parts.some((b2) => x >= b2.x0 && x < b2.x1 && y >= b2.y0 && y < b2.y1)) ink[y * w + x] = 0;
      if (!parts.length) {
        buttons.push(null);
        continue;
      }
      const b = parts.reduce((a, c) => ({ x0: Math.min(a.x0, c.x0), y0: Math.min(a.y0, c.y0), x1: Math.max(a.x1, c.x1), y1: Math.max(a.y1, c.y1), n: a.n + c.n }));
      const glyph = normGlyph(ink, w, b);
      buttons.push({ glyph, box: { x0: b.x0 + x0, y0: b.y0 + by0, x1: b.x1 + x0, y1: b.y1 + by0 }, ...nameGlyph(glyph, refs) });
    }
    return { stars: blobs3.length, starBlobs, bigBlobs, buttons };
  }

  // src/modules/astrology/astrologySolver.js
  var astrologySolver_exports = {};
  __export(astrologySolver_exports, {
    ASTRO_DEFAULT_STARS: () => ASTRO_DEFAULT_STARS,
    CONSTELLATIONS: () => CONSTELLATIONS,
    DEFAULT_QUADS: () => DEFAULT_QUADS,
    astroRefs: () => astroRefs,
    canonConstellation: () => canonConstellation,
    looksLikeStarList: () => looksLikeStarList,
    parseStarList: () => parseStarList,
    solveAstrology: () => solveAstrology
  });
  var CONSTELLATIONS = ASTRO_REFS.map((r) => r.name);
  var DEFAULT_QUADS = Object.fromEntries(ASTRO_REFS.map((r) => [r.name, r.quad]));
  var refCache = null;
  function astroRefs() {
    if (!refCache) refCache = ASTRO_REFS.map((r) => ({ name: r.name, aspect: r.aspect, bits: unpackBits(r.bits) }));
    return refCache;
  }
  var ASTRO_DEFAULT_STARS = `Constellations by number of stars
3: Chamaeleon, Corvus, Draco, Gemini, Norma, Ursa Major
4: Cassiopeia, Lacerta, Phoenix
5: Andromeda, Apus, Corona Australis, Horologium, Indus
6: Orion, Pyxis, Sagitta, Scorpius, Sculptor, Virgo
7: Octans, Tucana
8: Aquarius, Cancer, Circinus, Pegasus, Scutum
9: Columba, Coma Berenices, Leo, Ophiuchus, Taurus, Ursa Minor
10: Aries, Hydrus, Monoceros, Piscis Austrinus
11: Ara, Crater, Perseus
12: Canes Venatici
13: Aquila, Canis Minor, Libra, Lupus, Microscopium, Pavo, Serpens
14: Lepus, Pisces
15: Fornax, Lynx, Telescopium, Triangulum, Volans
16: Caelum, Canis Major, Capricornus, Pictor
17: Corona Borealis, Delphinus, Leo Minor, Sagittarius
18: Antlia, Carina, Cygnus, Dorado, Grus, Hercules, Hydra, Triangulum Australe
19: Puppis
20: Auriga, Camelopardalis, Mensa, Musca
21: Eridanus, Lyra, Sextans
22: Reticulum, Vela, Vulpecula
23: Bo\xF6tes, Cepheus
24: Centaurus, Cetus, Crux, Equuleus`;
  var fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  var ALIASES = { scorpio: "Scorpius", capricorn: "Capricornus", serpenscaput: "Serpens", serpenscauda: "Serpens", bootes: "Bo\xF6tes" };
  var BY_FOLD = Object.fromEntries(CONSTELLATIONS.map((n) => [fold(n), n]));
  function canonConstellation(s) {
    const f = fold(s);
    return BY_FOLD[f] || ALIASES[f] || null;
  }
  function looksLikeStarList(text) {
    const l = parseStarList(text);
    return l.count >= 20 && Object.keys(l.byCount).length >= 5;
  }
  function parseStarList(text) {
    text = discordPlain(text);
    const byCount = {}, unknown = [];
    let count = 0;
    String(text || "").split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*(\d{1,3})\s*[:=\-–]\s*(.+)$/);
      if (!m) return;
      const n = Number(m[1]);
      m[2].split(/[,;]/).map((s) => s.trim()).filter(Boolean).forEach((w) => {
        const c = canonConstellation(w);
        if (!c) {
          unknown.push(w);
          return;
        }
        (byCount[n] = byCount[n] || []).push(c);
        count++;
      });
    });
    return { byCount, unknown, count };
  }
  function solveAstrology(stars, buttons, quads, list) {
    const names = (list.byCount[stars] || []).slice();
    const targets = names.map((name) => ({ name, quad: quads[name] || null }));
    const targetQuads = new Set(targets.map((t) => t.quad).filter(Boolean));
    const rows = buttons.map((name, i) => {
      const quad = name ? quads[name] || null : null;
      return { n: i + 1, name, quad, hits: quad ? targets.filter((t) => t.quad === quad).map((t) => t.name) : [] };
    });
    const matched = rows.filter((r) => r.hits.length);
    const perQuad = {};
    rows.forEach((r) => {
      if (r.quad) perQuad[r.quad] = (perQuad[r.quad] || 0) + 1;
    });
    const alone = rows.filter((r) => r.quad && perQuad[r.quad] === 1).map((r) => r.n);
    let problem = "";
    if (!names.length) problem = `No constellation has ${stars} stars in the list.`;
    else if (rows.some((r) => !r.name)) problem = "A button symbol was not read \u2014 pick it by hand.";
    else if (targets.some((t) => !t.quad)) problem = `Not on the sky map: ${targets.filter((t) => !t.quad).map((t) => t.name).join(", ")}.`;
    else if (matched.length === 0) problem = "No button shares a quadrant with those constellations \u2014 check the star count and the symbols.";
    else if (matched.length > 1) problem = `${matched.length} buttons match (${matched.map((r) => r.n).join(", ")}) \u2014 the rule says exactly one, so a read is wrong. Check the star count and the symbols.`;
    return { targets, rows, answer: !problem && matched.length === 1 ? matched[0].n : null, problem, alone, targetQuads: [...targetQuads] };
  }

  // src/modules/cube/cubeSolver.js
  var cubeSolver_exports = {};
  __export(cubeSolver_exports, {
    FACES: () => FACES,
    SOLVED: () => SOLVED,
    searchCube: () => searchCube
  });
  var FACES = "URFDLB";
  var SOLVED = "WRGYOB";
  var rot = (n, v) => {
    const c = [n[1] * v[2] - n[2] * v[1], n[2] * v[0] - n[0] * v[2], n[0] * v[1] - n[1] * v[0]];
    const d = n[0] * v[0] + n[1] * v[1] + n[2] * v[2];
    return v.map((_, i) => -c[i] + n[i] * d);
  };
  var DEF = {
    U: (r, c) => [[c - 1, 1, r - 1], [0, 1, 0]],
    R: (r, c) => [[1, 1 - r, 1 - c], [1, 0, 0]],
    F: (r, c) => [[c - 1, 1 - r, 1], [0, 0, 1]],
    D: (r, c) => [[c - 1, -1, 1 - r], [0, -1, 0]],
    L: (r, c) => [[-1, 1 - r, c - 1], [-1, 0, 0]],
    B: (r, c) => [[1 - c, 1 - r, -1], [0, 0, -1]]
  };
  var FL = [];
  var IDX = {};
  for (const f of FACES) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        FL.push(DEF[f](r, c));
      }
    }
  }
  FL.forEach(([p, n], i) => IDX[p + "|" + n] = i);
  var PERMS = [];
  var PINV = [];
  FACES.split("").forEach((f) => {
    const n = DEF[f](1, 1)[1];
    const p = FL.map(
      ([pos, nm], i) => pos[0] * n[0] + pos[1] * n[1] + pos[2] * n[2] > 0 ? IDX[rot(n, pos) + "|" + rot(n, nm)] : i
    );
    const p3 = p.map((_, i) => p[p[p[i]]]);
    PERMS.push(p, p3);
  });
  PERMS.forEach((P) => {
    const q = [];
    P.forEach((v, i) => q[v] = i);
    PINV.push(q);
  });
  var MN = [];
  FACES.split("").forEach((f) => MN.push(f, f + "'"));
  var OPP = [3, 4, 5, 0, 1, 2];
  async function searchCube(obs, maxD, tick) {
    const vis = [], want = [];
    obs.forEach((c, i) => {
      if (c) {
        vis.push(i);
        want.push(SOLVED.indexOf(c));
      }
    });
    const start = new Uint8Array(54);
    for (let i = 0; i < 54; i++) start[i] = i / 9 | 0;
    const bufs = [start];
    for (let i = 1; i <= maxD; i++) bufs.push(new Uint8Array(54));
    const seq = [];
    let hits, seen, L;
    const nv = vis.length;
    const dfs = (d, only) => {
      const s = bufs[d];
      for (let m = 0; m < 12; m++) {
        if (d === 0 && only >= 0 && m !== only) continue;
        if (d > 0) {
          const pm = seq[d - 1];
          if ((m ^ 1) === pm) continue;
          if (d > 1 && pm === m && seq[d - 2] === m) continue;
          const fp = pm >> 1, fm = m >> 1;
          if (OPP[fp] === fm && fm < fp) continue;
        }
        seq[d] = m;
        if (d === L - 1) {
          const Q = PINV[m];
          let ok = true;
          for (let k = 0; k < nv; k++) {
            if (s[Q[vis[k]]] !== want[k]) {
              ok = false;
              break;
            }
          }
          if (ok) {
            const P = PERMS[m], t = bufs[d + 1];
            for (let i = 0; i < 54; i++) t[P[i]] = s[i];
            const key = t.join("");
            if (!seen.has(key)) {
              seen.add(key);
              hits.push(seq.slice(0, L));
            }
          }
        } else {
          const P = PERMS[m], t = bufs[d + 1];
          for (let i = 0; i < 54; i++) t[P[i]] = s[i];
          dfs(d + 1, -1);
        }
        if (hits.length >= 40) return;
      }
    };
    const startTime = Date.now();
    for (L = 0; L <= maxD; L++) {
      hits = [];
      seen = /* @__PURE__ */ new Set();
      if (L === 0) {
        if (vis.every((i, k) => start[i] === want[k])) return { len: 0, sols: [""] };
        continue;
      }
      await new Promise((r) => setTimeout(r, 0));
      if (Date.now() - startTime > 4e3) {
        return { timeout: true, len: L, sols: [] };
      }
      for (let f = 0; f < 12; f++) {
        dfs(0, f);
        if (tick && await tick(L, f) === false) return { cancelled: true, len: L };
        if (hits.length >= 40) break;
      }
      if (hits.length) {
        return {
          len: L,
          sols: hits.map((h) => h.slice().reverse().map((m) => MN[m ^ 1]).join(" "))
        };
      }
    }
    return null;
  }

  // src/modules/cube/cubeVision.js
  var cubeVision_exports = {};
  __export(cubeVision_exports, {
    COLOR_NAMES: () => COLOR_NAMES,
    COLS: () => COLS,
    POS: () => POS,
    at: () => at,
    cls: () => cls,
    detectCubeStickers: () => detectCubeStickers,
    sampleMedianRGB: () => sampleMedianRGB
  });
  var COLS = { W: "#f4f3ee", R: "#c8221b", G: "#0a9b4a", Y: "#f0c800", O: "#ff7a14", B: "#1f5fd1" };
  var COLOR_NAMES = { W: "White", R: "Red", G: "Green", Y: "Yellow", O: "Orange", B: "Blue" };
  function cls(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d / (mx || 1) < 0.25) return "W";
    let h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    return h < 13 || h > 340 ? "R" : h < 38 ? "O" : h < 85 ? "Y" : h < 190 ? "G" : "B";
  }
  var at = (g, a, b, c) => [
    g.V[0] + (a * g.p[0] + b * g.q[0] + c * g.d[0]) / 3,
    g.V[1] + (a * g.p[1] + b * g.q[1] + c * g.d[1]) / 3
  ];
  var POS = {
    U: (g, r, c) => at(g, 2.5 - c, 2.5 - r, 0),
    F: (g, r, c) => at(g, 2.5 - c, 0, 0.5 + r),
    R: (g, r, c) => at(g, 0, 0.5 + c, 0.5 + r)
  };
  function detectCubeStickers(img, data) {
    if (!img || !data) return null;
    const W2 = img.naturalWidth || img.width, H = img.naturalHeight || img.height, d = data.data;
    const m = new Uint8Array(W2 * H);
    for (let i = 0; i < W2 * H; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx ? (mx - mn) / mx : 0;
      m[i] = mx > 89 && (s > 0.45 || s < 0.2 && mx > 153) ? 1 : 0;
    }
    const lab = new Uint8Array(W2 * H), comps = [], st = [];
    for (let i = 0; i < W2 * H; i++) {
      if (!m[i] || lab[i]) continue;
      let a = 0, x0 = W2, y0 = H, x1 = 0, y1 = 0;
      st.length = 0;
      st.push(i);
      lab[i] = 1;
      while (st.length) {
        const k = st.pop(), x = k % W2, y = k / W2 | 0;
        a++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (x > 0 && m[k - 1] && !lab[k - 1]) {
          lab[k - 1] = 1;
          st.push(k - 1);
        }
        if (x < W2 - 1 && m[k + 1] && !lab[k + 1]) {
          lab[k + 1] = 1;
          st.push(k + 1);
        }
        if (y > 0 && m[k - W2] && !lab[k - W2]) {
          lab[k - W2] = 1;
          st.push(k - W2);
        }
        if (y < H - 1 && m[k + W2] && !lab[k + W2]) {
          lab[k + W2] = 1;
          st.push(k + W2);
        }
      }
      if (a > 150) comps.push({ a, x0, y0, x1, y1 });
    }
    comps.sort((p, q) => p.a - q.a);
    let best = null;
    for (let i = 0; i < comps.length; i++) {
      let j = i;
      while (j + 1 < comps.length && comps[j + 1].a <= comps[i].a * 1.3) j++;
      const n = j - i + 1;
      if (n >= 27 && n <= 30 && (!best || n < best[1] - best[0] + 1)) best = [i, j];
    }
    if (!best) return null;
    const c = comps.slice(best[0], best[1] + 1);
    return {
      x0: Math.min(...c.map((o) => o.x0)),
      x1: Math.max(...c.map((o) => o.x1)),
      y0: Math.min(...c.map((o) => o.y0)),
      y1: Math.max(...c.map((o) => o.y1))
    };
  }
  function sampleMedianRGB(img, data, x, y, sc) {
    if (!data) return [0, 0, 0];
    const W2 = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const h = Math.max(2, Math.round(sc * 3)), a = [];
    for (let j = -h; j <= h; j++) {
      for (let i = -h; i <= h; i++) {
        const X = Math.round(x + i), Y = Math.round(y + j);
        if (X < 0 || Y < 0 || X >= W2 || Y >= H) continue;
        const k = (Y * W2 + X) * 4;
        a.push([data.data[k], data.data[k + 1], data.data[k + 2]]);
      }
    }
    a.sort((p, q) => p[0] + p[1] + p[2] - q[0] - q[1] - q[2]);
    return a[a.length >> 1] || [0, 0, 0];
  }

  // src/utils/glyph.js
  var glyph_exports = {};
  __export(glyph_exports, {
    GH: () => GH,
    GW: () => GW,
    decodeShape: () => decodeShape,
    encodeShape: () => encodeShape,
    glyphScore: () => glyphScore3,
    inkGlyph: () => inkGlyph,
    shapeScore: () => shapeScore
  });
  var GW = 12;
  var GH = 16;
  function inkGlyph(data, W2, x0, y0, x1, y1, ink) {
    let gx0 = x1, gx1 = x0 - 1, gy0 = y1, gy1 = y0 - 1;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = (y * W2 + x) * 4;
        if (ink(data[p], data[p + 1], data[p + 2])) {
          if (x < gx0) gx0 = x;
          if (x > gx1) gx1 = x;
          if (y < gy0) gy0 = y;
          if (y > gy1) gy1 = y;
        }
      }
    }
    if (gx1 < gx0) return null;
    let w = gx1 - gx0 + 1, h = gy1 - gy0 + 1;
    const aspect = w / h;
    const cx = (gx0 + gx1 + 1) / 2, cy = (gy0 + gy1 + 1) / 2;
    if (w / h < GW / GH) w = h * GW / GH;
    else h = w * GH / GW;
    const out = new Float32Array(GW * GH);
    const S2 = 3;
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        let n = 0;
        for (let sy = 0; sy < S2; sy++) {
          for (let sx = 0; sx < S2; sx++) {
            const x = Math.floor(cx - w / 2 + (gx + (sx + 0.5) / S2) * w / GW);
            const y = Math.floor(cy - h / 2 + (gy + (sy + 0.5) / S2) * h / GH);
            if (x < gx0 || y < gy0 || x > gx1 || y > gy1) continue;
            const p = (y * W2 + x) * 4;
            if (ink(data[p], data[p + 1], data[p + 2])) n++;
          }
        }
        out[gy * GW + gx] = n / (S2 * S2);
      }
    }
    return { v: out, aspect };
  }
  function shapeScore(a, b) {
    if (!a || !b) return -1;
    let ma = 0, mb = 0;
    for (let i = 0; i < a.length; i++) {
      ma += a[i];
      mb += b[i];
    }
    ma /= a.length;
    mb /= b.length;
    let d = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      const x = a[i] - ma, y = b[i] - mb;
      d += x * y;
      na += x * x;
      nb += y * y;
    }
    return d / Math.sqrt(na * nb + 1e-9);
  }
  var encodeShape = (g) => Array.from(g, (v) => Math.round(v * 9)).join("");
  var decodeShape = (s) => Float32Array.from(String(s), (c) => Number(c) / 9);
  var glyphScore3 = (glyph, ref) => shapeScore(glyph.v, ref.v) - 0.5 * Math.abs(Math.log(glyph.aspect / ref.aspect));

  // src/modules/circuit/circuitDigits.js
  var circuitDigits_exports = {};
  __export(circuitDigits_exports, {
    DIGIT_REFS: () => DIGIT_REFS
  });
  var DIGIT_REFS = [
    { ch: "4", font: "game", aspect: 0.818, fp: "000000233000000004999300000009999300000089999300000299999300001996999300005993999300049913999300089703999300699999999997999999999999699999999998033335999532000003999000000003995000000001320000" },
    { ch: "\u03A9", font: "game", aspect: 1.344, fp: "000000000000000000000000000000000000000023320000001698896100006610016600037000000730066000000660066000000660056000000660028100002820568920029865333310013333000000000000000000000000000000000000" },
    { ch: "2", font: "game", aspect: 0.71, fp: "000399993000029999999700099970299970299900039990699900039990699700039990233100179980000002799940000038999500000599983000004999720000049995000000099990000024699999999996699999999992699999999990" },
    { ch: "0", font: "game", aspect: 0.774, fp: "000366664100026999999710079994389970499940029992699900009997899900007999999500006999999300006999999300006999999700006999899900007999699900009997299920029992079973389970026999999710000366664100" },
    { ch: "1", font: "game", aspect: 0.406, fp: "000000047200000004899300000489999300001599999300000017999300000006999300000003999300000003999300000003999300000003999300000003999300000003999300000003999300000003997100000003994000000003940000" },
    { ch: "2", font: "game", aspect: 0.71, fp: "000399993000029999999920079970299970099900039990699900009994699900019990233300079980000002699940000028999500000589983000004999720000049995000000089991000004499999999996699999999996699999999990" },
    { ch: "\u03A9", font: "game", aspect: 1.344, fp: "000000000000000000000000000000000000000033330000001896688100007610014700047000000740066000000660066000000570056000000650018200002720568920029865333310013333000000000000000000000000000000000000" },
    { ch: "6", font: "game", aspect: 0.735, fp: "000000474000000028999000000589983000005999620000019997100000059984320000399999999700399999999950799952179992999930039993999930039999599930039995399940049993179985589991028999999820000479986000" },
    { ch: "1", font: "game", aspect: 0.394, fp: "000000279000000027999000000799999000000999999000000017999000000006999000000006999000000006999000000006999000000006999000000006999000000006999000000006999000000006999000000006995000000005840000" },
    { ch: "0", font: "game", aspect: 0.758, fp: "000379952000007999999700089997799960499940179990899930039996999900039996999900039999999900039999999900039999999900039999999900039996899930039996499940179990089995799960007999999700000379952000" },
    { ch: "8", font: "game", aspect: 0.774, fp: "002566666300028999999940089973359992099930009993099930009993099973159992059999799940007999999910058999999971499973369997799910008999999700006999799900006999499943338997059999999971003666666310" },
    { ch: "0", font: "Amaranth-Bold", aspect: 0.778, fp: "000236653000004999999610059999999970299960189993699910029996799900009998999900009999999900009999999900009999999900009999899900009997699910019996499971079992079999999950016999999400000356632000" },
    { ch: "1", font: "Amaranth-Bold", aspect: 0.516, fp: "000000599900000016999900000489999900009999999900005997999900000830999900000000999900000000999900000000999900000000999900000000999900000000999900000000999900000000999900000000999900000000999900" },
    { ch: "2", font: "Amaranth-Bold", aspect: 0.71, fp: "002369986200069999999930089999999990029963699991004000099993000000099990000000399990000001899950000007999800000069999300000499994000001999950000009999733332069999999996399999999996499999999996" },
    { ch: "3", font: "Amaranth-Bold", aspect: 0.667, fp: "002579974100079999999710059999999950018743699960000000499960000005999920003799999300003999999500000799999960000200299992000000069993022000079993059743799991089999999970289999999710003589974100" },
    { ch: "4", font: "Amaranth-Bold", aspect: 0.803, fp: "000033320000000499920000000799800000003999400000006999000000029994666600069990999600099960999600599943999733799999999996999999999996666666999864000000999600000000999600000000999600000000333200" },
    { ch: "5", font: "Amaranth-Bold", aspect: 0.677, fp: "009999999980019999999960039999999930039995333310069993000000069992330000089999999500099999999950048999999990001100399993000000069993010000089993069743799991099999999980299999999810013589974100" },
    { ch: "6", font: "Amaranth-Bold", aspect: 0.73, fp: "000147998520002899999930029999999800079996103400499970000000699930000000999958999500999999999970999994489994999930039997899930039999599930039999199970049995069997689981017999999820000479974200" },
    { ch: "7", font: "Amaranth-Bold", aspect: 0.689, fp: "599999999996399999999996099999999996033333499992000000399970000000799940000001999920000005999700000007999300000029999000000059997000000099992000000299990000000699960000000999920000002999700000" },
    { ch: "8", font: "Amaranth-Bold", aspect: 0.714, fp: "001369974100018999999920089996699980399980099993299990099992089996699970028999999810002899999100028999999940199998899992499980089995699940049996599950059995299996699992049999999940002479974200" },
    { ch: "9", font: "Amaranth-Bold", aspect: 0.73, fp: "002589973000039999999600299986799950799930189981999900059994999900039996999930039999599984499999079999999999006999859997000000049995000000089991003201699970018999999810059999998200025899741000" },
    { ch: "0", font: "LilitaOne-Regular", aspect: 0.797, fp: "000046640000003999999300039999999930199999999991599995599995699950059996999920029999999900009999999900009999899920029999699960079996599997799995099999999991039999999930003999999300000046640000" },
    { ch: "1", font: "LilitaOne-Regular", aspect: 0.478, fp: "005999999600006999999600006999999600006999999600001337999600000006999600000006999600000006999600000006999600000006999600000006999600000006999600000006999600000006999600000006999600000005999500" },
    { ch: "2", font: "LilitaOne-Regular", aspect: 0.632, fp: "004689975100069999999700089999999950069999999960018333999960000000999960000001999950000006999900000039999400000289996100001899981000008999810000069999999980099999999990069999999980049999999940" },
    { ch: "3", font: "LilitaOne-Regular", aspect: 0.629, fp: "004689976100069999999910069999999950049999999960006434899940000000799900000467999300000899997100000699999810000133799960000000399980016201899990069999999970099999999940099999999600016699964000" },
    { ch: "4", font: "LilitaOne-Regular", aspect: 0.779, fp: "000013565310000059999930000199999930000699999930004999899930007998699930049994699930099970699930599910699930999999999998799999999999399999999999056667999975000003999930000003999930000001353310" },
    { ch: "5", font: "LilitaOne-Regular", aspect: 0.603, fp: "009999999900009999999900009999999900009999999900009993000000009995310000009999998200009999999800006668999950000001899960000000699960013001999960069868999950069999999910069999998200036899761000" },
    { ch: "6", font: "LilitaOne-Regular", aspect: 0.696, fp: "000057998610001899999930016999999920049999999600089996103100199990000000399996666300699999999960699999999991699970179994599960039996299990049995099996499992049999999980006999999920000569975100" },
    { ch: "7", font: "LilitaOne-Regular", aspect: 0.667, fp: "099999999950399999999992399999999992299999999990033333999970000003999930000005999900000019999800000039999400000059999100000199999000000399996000000699993000000999992000002999970000006999930000" },
    { ch: "8", font: "LilitaOne-Regular", aspect: 0.71, fp: "000579986000007999999810069999999960089995599990099990099990079993199960039999799810006999999810069999999981299992399993599970079996699971179996499997799994299999999991039999999930002689986100" },
    { ch: "9", font: "LilitaOne-Regular", aspect: 0.681, fp: "000579974000018999999700079999999950299999999980399961399993399930079993399960069993299997799993059999999993005999999993000233399992000000599980018868999950039999999810069999999100016899861000" },
    { ch: "0", font: "PatuaOne-Regular", aspect: 0.691, fp: "000579986100007999999810059961179960079920029990299700009993399600007994699600006996699600006996699600006996699600006995599600006993399900009991099920029970069971179940018999999600001689964000" },
    { ch: "1", font: "PatuaOne-Regular", aspect: 0.418, fp: "000568990000003999990000001999990000000039990000000039990000000039990000000039990000000039990000000039990000000039990000000039990000000039990000000039990000000279994000000999999300000999999200" },
    { ch: "2", font: "PatuaOne-Regular", aspect: 0.687, fp: "005689986200089999999830099900069960079800039990046300059980000000089960000000599930000004999500000049998000000299980000002999920000028999300330189993004993399943337993399999999993299999999993" },
    { ch: "3", font: "PatuaOne-Regular", aspect: 0.632, fp: "036699864000069999999700069930299920036600069960000000069940000000299910001335998200003999996200001535899930000000189960000000049990000000039990000000089960045334799930079999999500046899661000" },
    { ch: "4", font: "PatuaOne-Regular", aspect: 0.739, fp: "000057300000000199600000000499326310000899059930003994089930007992099930039950099930079920099930399600099930699433399953899999999999366666699976000000099930000001699960000006999993000005999992" },
    { ch: "5", font: "PatuaOne-Regular", aspect: 0.627, fp: "069999999600069999999600069976666400069930000000069930000000069943310000069999997300008999999920002000699960000000069990000000069990000000069990000000079960066334899940089999999400056899762000" },
    { ch: "6", font: "PatuaOne-Regular", aspect: 0.662, fp: "000003770000000059992000000699720000004998000000009992000000059960000000079967995200099999999920399974379970399900029991399900009993299910009993089930029991069971179960018999999700001689965000" },
    { ch: "7", font: "PatuaOne-Regular", aspect: 0.687, fp: "399999999993399999999993399833319993399500059970033000189950000000599800000000799600000003999100000005998000000019992000000049980000000089940000000299920000000899600000001999200000005998000000" },
    { ch: "8", font: "PatuaOne-Regular", aspect: 0.691, fp: "001579986200007999999910059961169960069900019960069920009960069971039940019999899700005999999500039988999940189920389992499600018995699600006996599810008993199973379970049999999810004689976100" },
    { ch: "9", font: "PatuaOne-Regular", aspect: 0.662, fp: "001679974000018999999600079961289940199910039960399900019990399910009992089951029993049999999992004999999990000133359960000000079930000000499800000001999300000038995000000299840000000077100000" },
    { ch: "0", font: "Rokkitt_wght_ExtraBold", aspect: 0.847, fp: "000000000000000599995000019999999910079997899970499950079994699910049996899900019998999900009999999900009999899900019998699910049996499950079994079997899970019999999910000599995000000000000000" },
    { ch: "1", font: "Rokkitt_wght_ExtraBold", aspect: 0.491, fp: "000000366000002589996000009999996000009999996000006399996000000099996000000099996000000099996000000099996000000099996000000099996000000099996000000099996000004699998600006999999900006999999900" },
    { ch: "2", font: "Rokkitt_wght_ExtraBold", aspect: 0.754, fp: "001689984000079999999810299999999970899930399990999700069990999600079990333200399980000000999930000018999400000179997100001899970233017999710699069999100699699999999999999999999999999999999999" },
    { ch: "3", font: "Rokkitt_wght_ExtraBold", aspect: 0.763, fp: "000379995200017999999950189999999992499961069995269700009996001200039994000026699982000039999810000039999960000013369994003100007997489700006999599961069997189999999994028999999950000479985100" },
    { ch: "4", font: "Rokkitt_wght_ExtraBold", aspect: 0.807, fp: "000000133310000000599930000005999930000038999930000189999930000699699930005994399930039960399930299810399930799866799976999999999999666666799976000023599953000069999999000069999999000023333333" },
    { ch: "5", font: "Rokkitt_wght_ExtraBold", aspect: 0.759, fp: "399999999993399999999993399976668993399930006993399930004662399932330000399999999500399999999971269996799994002500039997000000007999036400007998799940169996499999999992058999999830002589974100" },
    { ch: "6", font: "Rokkitt_wght_ExtraBold", aspect: 0.695, fp: "000003410000000019984000000059997000000299981000000899940000004999800000018999974100049999999920199999999980499971179994699930039996699930039996499971179994089999999970029999999920001479974100" },
    { ch: "7", font: "Rokkitt_wght_ExtraBold", aspect: 0.789, fp: "666666666666999999999999999999999998996000079995996000399993996000899970664001999930000005999900000019999600000039999100000079997000000399995000000699991000001899950000005999930000006666600000" },
    { ch: "8", font: "Rokkitt_wght_ExtraBold", aspect: 0.712, fp: "002489974200039999999820089999999980299971179992399930039993099981189990069999999960007999999700089999999980299951169992699900009996699900009996499961179994099999999980039999999830002489974200" },
    { ch: "9", font: "Rokkitt_wght_ExtraBold", aspect: 0.683, fp: "001479974100018999999910089999999980399971179993399930049993399930039993399960079993189997799981028999999930001699999900000008999200000049997000000189992000000699940000000389810000000014300000" },
    { ch: "\u03A9", font: "Rokkitt_wght_ExtraBold", aspect: 1.103, fp: "000000000000000000000000000033330000006999999500089997799970499930049994699400004996999300003999899300003998699300003995189700007981259951169942699993399996233331133332000000000000000000000000" },
    { ch: "0", font: "Acme-Regular", aspect: 0.766, fp: "000048995000001899999810018999999970069920029994299500005996699300003997699300003999999300003999999300003999999300003997799300003996699500004994499910008980079996689930018999999400001599961000" },
    { ch: "1", font: "Acme-Regular", aspect: 0.429, fp: "000000035200000035999300002999999300003999999300000000999300000000999300000000999300000000999300000000999200000000999000000000999200000000999300000000999300000000999300000000999300000000999300" },
    { ch: "2", font: "Acme-Regular", aspect: 0.698, fp: "002369985100039999999710069999999950067520179960030000039960000000069960000000299910000001899500000008996000000079970000000699700000004996100000039961000000089976689996399999999995599999999993" },
    { ch: "3", font: "Acme-Regular", aspect: 0.672, fp: "005689965000019999999500039733799910022000089930000000069920000000089900000334799200000999997200000999999930000000369990000000008993000000006993055000008991099866689960199999999710035899973000" },
    { ch: "4", font: "Acme-Regular", aspect: 0.758, fp: "000000668900000006999900000019999900000189899900000498399900002993399900006960399800049810399600189400399600498333599733999999999999999999999998000000399900000000399900000000399900000000399900" },
    { ch: "5", font: "Acme-Regular", aspect: 0.667, fp: "009966667990009999999960009978999960009930003320009930000000009930000000009999962000009999999700001357999960000000059991000000008993000000006992044000029970089766689930299999999300036999952000" },
    { ch: "6", font: "Acme-Regular", aspect: 0.672, fp: "000001761000000018999300000079993000000699820000003998100000008991000000059956997300089999999930099973389990399500019992399300007993399500006993099800009990069986679960018999999600001599973000" },
    { ch: "7", font: "Acme-Regular", aspect: 0.651, fp: "099998699992199999999990399998669980131000049930000000099800000000499400000000999100000004994000000009990000000049940000000099900000000399700000001899400000004999000000008998000000001364000000" },
    { ch: "8", font: "Acme-Regular", aspect: 0.688, fp: "000469975100006999999710059973489940079700029960099700009940089961039810059998688200016999997100002999999830038833899982289300038993599300004993699600005993199976669960039999999610002599974100" },
    { ch: "9", font: "Acme-Regular", aspect: 0.672, fp: "000469976000006999999700059983489960099910019990299600005992399700003993199910005991099986679990039999999980002799569940000000199800000001899200000038995000000599960000003999800000000137100000" },
    { ch: "0", font: "BubblegumSans-Regular", aspect: 0.833, fp: "000003300000000599995000017999999710059961169950199600006991699200002996699000000996999000000999999000000999999000000999699000000996599400004995089930039990039999999930001699996100000013310000" },
    { ch: "1", font: "BubblegumSans-Regular", aspect: 0.409, fp: "000004660000000589960000003999960000003659960000000009960000000009960000000009960000000009960000000009960000000009960000000009960000000009960000000009960000000039986100000099999300000099666200" },
    { ch: "2", font: "BubblegumSans-Regular", aspect: 0.677, fp: "046699976200399999999930399963489981399500019993398100019991164000059960000000399920000001899400000006996000000049980000000599810000005998200000059983000000399973333563399999999992399999999970" },
    { ch: "3", font: "BubblegumSans-Regular", aspect: 0.697, fp: "026999764000059999999700056334899930000000079960000000089940000133899700000799997000000999999610000333699980000000028992021000006996694000006996698000019992699833599970499999999600269999661000" },
    { ch: "4", font: "BubblegumSans-Regular", aspect: 0.699, fp: "000000389300000002995000000018999900000069889900000399369900001896069900006981069900029940069900089800069900399866689964699999999993299999999960000000069900000000069900000000069920000000068620" },
    { ch: "5", font: "BubblegumSans-Regular", aspect: 0.652, fp: "026689999900059999999930069976666610089930000000099930000000099999952000099999999400066666999940000000269980000000029992015200009993399300029991399400079950399977999810399999996100299996620000" },
    { ch: "6", font: "BubblegumSans-Regular", aspect: 0.727, fp: "000003679800000179999900000799974300008998100000049981000000099930000000499989974200699999999940699733489992699300006996699300001996699600001996299930007995079998689990007999999830000579976100" },
    { ch: "7", font: "BubblegumSans-Regular", aspect: 0.638, fp: "066666666750099999999990099966689960099400089810088000599200000002996000000006991000000019960000000079910000000199800000000599400000000799200000001999000000003997000000003996000000002996000000" },
    { ch: "8", font: "BubblegumSans-Regular", aspect: 0.773, fp: "000156665100005999999830079996679981199920008993399910018991189973179940018999998300003999998400049994799960399930039995799500005999999300004998799700018996599976689981048999999710001566663000" },
    { ch: "9", font: "BubblegumSans-Regular", aspect: 0.727, fp: "001679975000018999999810089986799970599500018992699000004996699100001996699610000996299997668996028999999996000346667993000000029990000000079940000001799800013379998100009999971000008976200000" },
    { ch: "0", font: "Eczar_wght_SemiBold", aspect: 0.758, fp: "000259973000004999999600039960289950089910039992499900009996699600006996799500004999999300003999999300003999899500003999699700006996599900008996189940019981059982059950006999999600000379973000" },
    { ch: "1", font: "Eczar_wght_SemiBold", aspect: 0.615, fp: "000004630000000179990000015999990000079979990000034239990000000039990000000039990000000039990000000039990000000039990000000039990000000039990000000039990000000039990000003599994330059999999980" },
    { ch: "2", font: "Eczar_wght_SemiBold", aspect: 0.723, fp: "003679975000279999999700399900399950399700049980399400039990199300069980000000199960000000899810000007999300000069995000000599950000003999500194039997000496289970134996699989999996499999999994" },
    { ch: "3", font: "Eczar_wght_SemiBold", aspect: 0.672, fp: "014689965000089999999600099600699930099300089960099300069960033000089930000000599600000479995000000699999810000233699970000000049991000000019993065100019992099973049980299999999720026699965100" },
    { ch: "4", font: "Eczar_wght_SemiBold", aspect: 0.831, fp: "000000030000000000599600000003999600000018999600000179799600000697699600003991699600028940699600089700699600599433799733699999999999366666899863000000699600000001799600000089999990000033333330" },
    { ch: "5", font: "Eczar_wght_SemiBold", aspect: 0.708, fp: "039999999980039999999990039940039980059930006960069930002320079900000000099999997100099999999920039767999992000000059994000000006996041000006995298300006993499984349981499999999820015679975100" },
    { ch: "6", font: "Eczar_wght_SemiBold", aspect: 0.727, fp: "000001567960000058999960000799999960008995000120049970000000099920000000499801465300699629999940699637369992699600007996699600004996699900003996199950006996059994128991005999999930000368986200" },
    { ch: "7", font: "Eczar_wght_SemiBold", aspect: 0.692, fp: "699999999970699999999992699533337993699300019970399200079930000000399600000000999100000005996000000009992000000059980000000199920000000599800000001899500000005999000000007998000000002572000000" },
    { ch: "8", font: "Eczar_wght_SemiBold", aspect: 0.672, fp: "000569985100017996799820049940049960099930009990099940019980059995049940018999799500001899997000004999999810059981699970099930069991399910007993399920006992099940019990028998689820001679976100" },
    { ch: "9", font: "Eczar_wght_SemiBold", aspect: 0.712, fp: "001689963000028999999600189950399940399900039991699600019993699700008994499910006996299961006996049999927994004899939993000033239991000000069940013000399800039998998100009999950000008966100000" },
    { ch: "\u03A9", font: "Eczar_wght_SemiBold", aspect: 1.121, fp: "000000000000000000000000000023320000001799997100018950289810059800019960099600007990099600006990099600006980059800007950828920029818941881088149999994399999333331133333000000000000000000000000" },
    { ch: "0", font: "Laila-Bold", aspect: 0.792, fp: "000146620000005999999300059976799930199700059990599400019992699100006996999000005996999000003997999000003997999300003996699500004996599700006992199920018980059996689930005999999300000146620000" },
    { ch: "1", font: "Laila-Bold", aspect: 0.375, fp: "000068960000000799994000000739996000000006996000000006996000000006996000000006996000000006996000000006996000000006996000000006996000000006996000000006996000000006996000000006996000000002795000" },
    { ch: "2", font: "Laila-Bold", aspect: 0.732, fp: "001679964000039999999710299950299960399930079991399982069993169981069993000000099980000000399950000001899700000007998100000179971000003899500000059972000012799999999998899999999997279999999861" },
    { ch: "3", font: "Laila-Bold", aspect: 0.667, fp: "000369986000006999999810019843699940003000079960000000069940000000399600000027997000000499999710000467999960000000069991000000007993069100004992199600005990099983349930069999999300003699761000" },
    { ch: "4", font: "Laila-Bold", aspect: 0.778, fp: "000000365000000006999300000069999300000698899300004970699300019910699300079400699300198000699300695000699300897666899764999999999997599999999972000000699300000000699300000000699600000000056200" },
    { ch: "5", font: "Laila-Bold", aspect: 0.644, fp: "000156666700002999999900006999999600009933331000009900000000039701320000039899998300059999999920028666799970000000049990000000005990059200003990099810006960099997689910069999998300004699750000" },
    { ch: "6", font: "Laila-Bold", aspect: 0.708, fp: "000015797100000399975100003999200000019992000000069960000000199910000000399903797300699818999950699613799992699700049994599900006996399910003995189950003993049995028980006999999920000369975100" },
    { ch: "7", font: "Laila-Bold", aspect: 0.648, fp: "047999999993299999999992399999999960010000019810000000069400000000397000000001892000000006960000000039910000000089700000000499400000000899300000000999300000000999500000000799940000000179700000" },
    { ch: "8", font: "Laila-Bold", aspect: 0.708, fp: "001579965000029976799710079700179950399400019991399800009993299982009980059999629950008999999600049999999810399505899981599300169993699300006996499600003994289940017992029998689930000569975100" },
    { ch: "9", font: "Laila-Bold", aspect: 0.708, fp: "001679862000029999999500189611599930499300079970699300029993699600009993599940009995299999609995039999709993001666009993000000029981000000079950000000499910000004999200001679992000002897510000" },
    { ch: "0", font: "MerriweatherSans_wght_ExtraBold", aspect: 0.808, fp: "000023330000002799998400038999999940189961169981499910019995699900009996899600007998999600006999999600006999799700006997699900009996399920019993189971169971039999999820002899997200000033320000" },
    { ch: "1", font: "MerriweatherSans_wght_ExtraBold", aspect: 0.417, fp: "000000376200000138999300002999999300002999999300000437999300000006999300000006999300000006999300000006999300000006999300000006999300000006999300000006999300000006999300000006999300000006999300" },
    { ch: "2", font: "MerriweatherSans_wght_ExtraBold", aspect: 0.722, fp: "003689965000289999999710699999999950096201699990010000099990000000099990000000099990000000399950000000799910000004999300000039995000000399940000003998300000059996689996699999999996599999999996" },
    { ch: "3", font: "MerriweatherSans_wght_ExtraBold", aspect: 0.658, fp: "005689965000299999999700089999999920054000699960000000399950000000799910000137999400000999996000000899999810000233499970000000079992000000079993000000599980067679999940069999999500046999651000" },
    { ch: "4", font: "MerriweatherSans_wght_ExtraBold", aspect: 0.861, fp: "000000000000000057400000000199950000000699910000000999500000004999100000008994066600049981099900089940099900399800399900699999999999799999999999133333599933000000399900000000399900000000000000" },
    { ch: "5", font: "MerriweatherSans_wght_ExtraBold", aspect: 0.667, fp: "039999999980049999999960069999999950069930000000079930000000099933333000099999999710099999999970085333699990000000089993000000069993000000199990000014899970399999999810399999996100299976510000" },
    { ch: "6", font: "MerriweatherSans_wght_ExtraBold", aspect: 0.731, fp: "000000366100000017999300000399994100004999600000019996000000079980000000299935999610599929999971899906679994999900019998999900006999699910006997399940009994079994389981018999999820001569975100" },
    { ch: "7", font: "MerriweatherSans_wght_ExtraBold", aspect: 0.718, fp: "699999999993699999999996699999999994466666689990000000089970000000399930000000799800000001999400000006999200000018997000000049994000000089990000000299970000000799930000002999800000006999600000" },
    { ch: "8", font: "MerriweatherSans_wght_ExtraBold", aspect: 0.753, fp: "001679976200039999999930199963369990599900009993699900009992499981049980089999899820018999999100018999999940199965999993699800169997999300009999899600009997599953379994069999999960002679986200" },
    { ch: "9", font: "MerriweatherSans_wght_ExtraBold", aspect: 0.722, fp: "001569975100028999999810089983499970599900049992699600019996699600009996699900009996499976609996089999929995006999659990000000199960000000699800000007999300000389993000005999720000001963000000" },
    { ch: "\u03A9", font: "MerriweatherSans_wght_ExtraBold", aspect: 0.973, fp: "000000000000000003310000001699996200039999999930199973379991599700007995699300003996699300003996699300003996399400004993089700007980018930029810999992089999999993099999333331033333000000000000" },
    { ch: "0", font: "Rambla-Bold", aspect: 0.667, fp: "000579975000007999999700039997799940089950059990099900009990199700007991399600006993399600006993399600006993399600006993199700007991099900009990099950059990059997799930008999999700000679975000" },
    { ch: "1", font: "Rambla-Bold", aspect: 0.453, fp: "000004699600000579999600004999999600000984799600000200699600000000699600000000699600000000699600000000699600000000699600000000699600000000699600000000699600000000699600000000699600000000699600" },
    { ch: "2", font: "Rambla-Bold", aspect: 0.631, fp: "003689964000019999999400007966899920002100079950000000039960000000049950000000099910000000699600000004998000000039992000000299930000002899500000017996000000079996666660099999999990099999999970" },
    { ch: "3", font: "Rambla-Bold", aspect: 0.612, fp: "015689963000069999999200039999999800014000399930000000099930000000199800000466899400000699997000000699999810000000179950000000039990000000039990010000069970039966999930079999999600046699963000" },
    { ch: "4", font: "Rambla-Bold", aspect: 0.781, fp: "000001666600000004999900000029999900000089999900000599699900001997399900008993399900049950399900189910399900799866799966999999999999666666799966000000399900000000399900000000399900000000266600" },
    { ch: "5", font: "Rambla-Bold", aspect: 0.615, fp: "039999999900039999999900039986666600039960000000039960000000039987975100039999999800039999999930003710189960000000049990000000039990000000049980024200179950049976899920079999999300004689963000" },
    { ch: "6", font: "Rambla-Bold", aspect: 0.621, fp: "000026998620000499999910003999999700008997000000039990000000049963653000069999999600099999999930099950169960099930039990099930039990069930039980049970069950029997799920005999999500000479964000" },
    { ch: "7", font: "Rambla-Bold", aspect: 0.594, fp: "069999999960069999999960046666689930000000299810000000599400000001899200000005996000000008993000000049970000000069940000000199910000000599700000000699400000000899300000001999100000003997000000" },
    { ch: "8", font: "Rambla-Bold", aspect: 0.652, fp: "000569975000005999999600029997799920039940049930039930049930029981089920006998799400001899997000018996999810059950169960299910019992399900009993299930039991069996699950028999999810001679975100" },
    { ch: "9", font: "Rambla-Bold", aspect: 0.621, fp: "000469974000005999999500029997799920059950079940089930039960099930039990099930039990069961059990039999999990006999999960000356369940000000099930000000899800007999999300019999994000026899620000" },
    { ch: "0", font: "YsabeauInfant_wght_Black", aspect: 0.742, fp: "000369975000005999999810029999999950199990199992399960079993699930059996799930039999999930039999999930039999999930039997799940049995499970069993399991099980069999999920018999999400000579963000" },
    { ch: "1", font: "YsabeauInfant_wght_Black", aspect: 0.484, fp: "000002699900000579999900007999999900003999999900000985999900000203999900000003999900000003999900000003999900000003999900000003999900000003999900000003999900000003999900000003999900000003999900" },
    { ch: "2", font: "YsabeauInfant_wght_Black", aspect: 0.662, fp: "000369985100006999999810059999999960299943699980036600199990000000099970000000499960000000999920000006999600000049997000000399981000003999930000029999633462189999999993199999999993079999999993" },
    { ch: "3", font: "YsabeauInfant_wght_Black", aspect: 0.712, fp: "000369986300006999999920049999999980199940099993002500069993000000089960000033899810000099999200000099999960000002399992000000049995015800039996499960049993189999999981028999999820002689965100" },
    { ch: "4", font: "YsabeauInfant_wght_Black", aspect: 0.797, fp: "000000666600000003999900000018999900000079999900000499999900002999799900008994699900059970699900399910699900899866899966799999999999499999999999033333799933000000699900000000699900000000466600" },
    { ch: "5", font: "YsabeauInfant_wght_Black", aspect: 0.677, fp: "009999999990009999999990029999999990039995333330039993000000039993000000039999995100039999999920026679999991000000699993000000099993001000399993048534999992189999999950279999999710004699964000" },
    { ch: "6", font: "YsabeauInfant_wght_Black", aspect: 0.727, fp: "000000266900000037999900000499999920004999984000019999600000089995000000199993565300599999999960699997899993699960079996699960069996699960069996499970069995089998799980018999999810001679976000" },
    { ch: "7", font: "YsabeauInfant_wght_Black", aspect: 0.688, fp: "399999999993599999999980699999999940466666899930000002999800000005999400000008999200000049997000000069994000000199992000000599970000000899940000003999910000006999700000019999300000059999100000" },
    { ch: "8", font: "YsabeauInfant_wght_Black", aspect: 0.697, fp: "000569986200017999999930069997899990099960069990099960069990089996179930039999999500003999999300007999999950079971699992299940079995699930039996699960059993299998699980059999999810002689975000" },
    { ch: "9", font: "YsabeauInfant_wght_Black", aspect: 0.727, fp: "000679975000038999999810089997899980599960089993699960069996699960069996699970069996499997699996069999999995003666599991000000799980000006999920000499999500059999995000029999730000009662000000" },
    { ch: "\u03A9", font: "YsabeauInfant_wght_Black", aspect: 1.015, fp: "000000000000000000000000001469975100019999999930189973489992599800019996799600008998999600006999799600006996599800009994089920039970679981189976999993399999999993399999000000000000000000000000" },
    { ch: "0", font: "YsabeauInfant_wght_ExtraBold", aspect: 0.723, fp: "000369975000004999999600039997899950079960089980299910049993599900009996699900009996699900009996699900009996699900009996699900009995499920019992189970069960059998799820006999999400000579963000" },
    { ch: "1", font: "YsabeauInfant_wght_ExtraBold", aspect: 0.46, fp: "000000389600000148999600002999999600002999999600000662999600000000999600000000999600000000999600000000999600000000999600000000999600000000999600000000999600000000999600000000999600000000999600" },
    { ch: "2", font: "YsabeauInfant_wght_ExtraBold", aspect: 0.656, fp: "000569975100018999999700079986999930289510299950014100069960000000079940000000299930000000599700000003999200000028995000000189961000001899610000018996100000089999999993399999999993199999999993" },
    { ch: "3", font: "YsabeauInfant_wght_ExtraBold", aspect: 0.692, fp: "000369986100006999999830059973599960059700069990001100039990000000069960000002799810000099998100000099999930000000289991000000019995014200009996389700019994289983389970048999999810002689965000" },
    { ch: "4", font: "YsabeauInfant_wght_ExtraBold", aspect: 0.781, fp: "000000366200000001899600000006999600000049999600000199999600000899599600005995399600029970399600089910399600599633599733899999999999599999999999033333599733000000399600000000399600000000266400" },
    { ch: "5", font: "YsabeauInfant_wght_ExtraBold", aspect: 0.641, fp: "006999999960009999999960009999999960009990000000009990000000009993300000009999996100009999999910012003599980000000079990000000039990000000059990017300499980089999999930069999999400003699963000" },
    { ch: "6", font: "YsabeauInfant_wght_ExtraBold", aspect: 0.692, fp: "000000267700000016999910000389998510001899941000007999200000059993000000079972665100299999999930499996799980699900069993699900019996599910009995299940029992079993389960018999999810001579965000" },
    { ch: "7", font: "YsabeauInfant_wght_ExtraBold", aspect: 0.698, fp: "299999999993399999999980499999999950000000299920000000499700000000899500000004999000000007996000000029993000000069980000000199960000000599920000000799700000003999500000006999100000019995000000" },
    { ch: "8", font: "YsabeauInfant_wght_ExtraBold", aspect: 0.662, fp: "000469996300006999999940059983389980069940019990069950009970069994059930018999999500001899998100005999999930049950599970089900039993399900009993399910009991089983369950038999999710002689965000" },
    { ch: "9", font: "YsabeauInfant_wght_ExtraBold", aspect: 0.703, fp: "001679986100018999999810089973399980299910049991699900019993699900009996499960019995199997699993029999989991001333289980000000499940000004999800000169999100036999982000029999410000009632000000" },
    { ch: "\u03A9", font: "YsabeauInfant_wght_ExtraBold", aspect: 1, fp: "000000000000000000000000001469975100038999999940189820039992599300005996799000000998999000000999899000000997599200001994199700006980359930039953999990099999999990099999000000000000000000000000" }
  ];

  // src/modules/circuit/circuitVision.js
  var circuitVision_exports = {};
  __export(circuitVision_exports, {
    classifyColor: () => classifyColor,
    components: () => components2,
    readCircuit: () => readCircuit
  });
  var PANEL = [31, 34, 40];
  var WIRE = [203, 213, 225];
  function classifyColor(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, s = mx - mn;
    if (s < 30) return l > 200 ? "white" : "gray";
    let h;
    if (mx === r) h = (g - b) / s * 60;
    else if (mx === g) h = (2 + (b - r) / s) * 60;
    else h = (4 + (r - g) / s) * 60;
    if (h < 0) h += 360;
    if (h < 14 || h >= 330) return "red";
    if (h < 36) return "orange";
    if (h < 70) return "yellow";
    if (h < 175) return "green";
    if (h < 245) return "blue";
    return "violet";
  }
  var isAmber = (r, g, b) => r > 200 && g > 120 && g < 190 && b < 70;
  var PAGE2 = [22, 25, 29];
  var FRAME = [44, 48, 54];
  function findPanel(data, W2, H) {
    const d22 = (i, c) => (data[i] - c[0]) ** 2 + (data[i + 1] - c[1]) ** 2 + (data[i + 2] - c[2]) ** 2;
    const mask = new Uint8Array(W2 * H);
    for (let p = 0; p < W2 * H; p++) {
      const i = p * 4, dp = d22(i, PANEL);
      mask[p] = dp <= 300 && dp < d22(i, PAGE2) && dp < d22(i, FRAME) ? 1 : 0;
    }
    const { comps } = components2(mask, W2, H, false);
    const big = comps.sort((a, b) => b.n - a.n)[0];
    if (!big || big.n < W2 * H * 0.15) return { x0: 0, y0: 0, x1: W2 - 1, y1: H - 1 };
    const pad = 3;
    return { x0: big.x0 + pad, y0: big.y0 + pad, x1: big.x1 - pad, y1: big.y1 - pad };
  }
  function components2(mask, w, h, conn8 = true) {
    const lab = new Int32Array(w * h), comps = [];
    for (let s = 0; s < w * h; s++) {
      if (!mask[s] || lab[s]) continue;
      const id = comps.length + 1, st = [s];
      lab[s] = id;
      let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0, sx = 0, sy = 0;
      while (st.length) {
        const p = st.pop(), px2 = p % w, py = p / w | 0;
        n++;
        sx += px2;
        sy += py;
        if (px2 < x0) x0 = px2;
        if (px2 > x1) x1 = px2;
        if (py < y0) y0 = py;
        if (py > y1) y1 = py;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!conn8 && dx && dy) continue;
          const nx = px2 + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (mask[q] && !lab[q]) {
            lab[q] = id;
            st.push(q);
          }
        }
      }
      comps.push({ id, x0, y0, x1, y1, n, cx: sx / n, cy: sy / n });
    }
    return { lab, comps };
  }
  function readCircuit(data, W2, H) {
    const P = findPanel(data, W2, H);
    const w = P.x1 - P.x0 + 1, h = P.y1 - P.y0 + 1;
    if (w < 40 || h < 40) return { ok: false, error: "Circuit panel not found" };
    const px2 = (x, y) => ((P.y0 + y) * W2 + P.x0 + x) * 4;
    const ink = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = px2(x, y);
      const d = Math.max(Math.abs(data[i] - PANEL[0]), Math.abs(data[i + 1] - PANEL[1]), Math.abs(data[i + 2] - PANEL[2]));
      ink[y * w + x] = d > 22 ? 1 : 0;
    }
    const r = Math.max(3, Math.round(Math.min(w, h) * 0.02));
    const solid = ink.slice();
    {
      const { lab: hl, comps: holes2 } = components2(ink.map((v) => 1 - v), w, h, false);
      const fill = new Uint8Array(holes2.length + 1);
      for (const c of holes2) {
        if (c.x0 > 0 && c.y0 > 0 && c.x1 < w - 1 && c.y1 < h - 1 && Math.max(c.x1 - c.x0, c.y1 - c.y0) < r * 5) fill[c.id] = 1;
      }
      for (let p = 0; p < w * h; p++) if (fill[hl[p]]) solid[p] = 1;
    }
    const sat2 = new Int32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      sat2[(y + 1) * (w + 1) + x + 1] = solid[y * w + x] + sat2[y * (w + 1) + x + 1] + sat2[(y + 1) * (w + 1) + x] - sat2[y * (w + 1) + x];
    }
    const boxSum = (x0, y0, x1, y1) => sat2[(y1 + 1) * (w + 1) + x1 + 1] - sat2[y0 * (w + 1) + x1 + 1] - sat2[(y1 + 1) * (w + 1) + x0] + sat2[y0 * (w + 1) + x0];
    const core = new Uint8Array(w * h);
    const side = 2 * r + 1, need = side * side * 0.82;
    for (let y = r; y < h - r; y++) for (let x = r; x < w - r; x++) {
      if (boxSum(x - r, y - r, x + r, y + r) >= need) core[y * w + x] = 1;
    }
    const { comps: cores } = components2(core, w, h);
    const resistors = [];
    for (const c of cores) {
      const x0 = Math.max(0, c.x0 - r), y0 = Math.max(0, c.y0 - r), x1 = Math.min(w - 1, c.x1 + r), y1 = Math.min(h - 1, c.y1 + r);
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const long = Math.max(bw, bh), short = Math.min(bw, bh);
      if (long / short < 1.3 || short < r * 2.5) continue;
      const hist = /* @__PURE__ */ new Map();
      for (let y = y0 + 2; y <= y1 - 2; y++) for (let x = x0 + 2; x <= x1 - 2; x++) {
        const i = px2(x, y);
        const k = data[i] >> 3 << 10 | data[i + 1] >> 3 << 5 | data[i + 2] >> 3;
        hist.set(k, (hist.get(k) || 0) + 1);
      }
      let bestK = 0, bestN = -1;
      hist.forEach((n, k) => {
        if (n > bestN) {
          bestN = n;
          bestK = k;
        }
      });
      const rgb = [(bestK >> 10 & 31) * 8 + 4, (bestK >> 5 & 31) * 8 + 4, (bestK & 31) * 8 + 4];
      if ((rgb[0] - WIRE[0]) ** 2 + (rgb[1] - WIRE[1]) ** 2 + (rgb[2] - WIRE[2]) ** 2 < 22 ** 2) continue;
      if ((rgb[0] - PANEL[0]) ** 2 + (rgb[1] - PANEL[1]) ** 2 + (rgb[2] - PANEL[2]) ** 2 < 40 ** 2) continue;
      let flat = 0, area = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = px2(x, y);
        area++;
        if ((data[i] - rgb[0]) ** 2 + (data[i + 1] - rgb[1]) ** 2 + (data[i + 2] - rgb[2]) ** 2 <= 1600) flat++;
      }
      if (flat < area * 0.4) continue;
      let tx0 = w, ty0 = h, tx1 = -1, ty1 = -1;
      for (let y = Math.max(0, y0 - 2); y <= Math.min(h - 1, y1 + 2); y++) for (let x = Math.max(0, x0 - 2); x <= Math.min(w - 1, x1 + 2); x++) {
        const i = px2(x, y);
        if ((data[i] - rgb[0]) ** 2 + (data[i + 1] - rgb[1]) ** 2 + (data[i + 2] - rgb[2]) ** 2 > 1600) continue;
        if (x < tx0) tx0 = x;
        if (x > tx1) tx1 = x;
        if (y < ty0) ty0 = y;
        if (y > ty1) ty1 = y;
      }
      const box = tx1 >= 0 ? { x0: tx0, y0: ty0, x1: tx1, y1: ty1 } : { x0, y0, x1, y1 };
      resistors.push({ ...box, rough: { x0, y0, x1, y1 }, horizontal: box.x1 - box.x0 >= box.y1 - box.y0, rgb, color: classifyColor(...rgb) });
    }
    if (!resistors.length) return { ok: false, error: "No resistors found \u2014 paste the Circuit screenshot" };
    const wireColour = (i) => {
      const mx = Math.max(data[i], data[i + 1], data[i + 2]), mn = Math.min(data[i], data[i + 1], data[i + 2]);
      return mx - mn < 45 && mx > 140;
    };
    const inRes = (x, y) => resistors.some((q) => {
      if (x >= q.x0 - 2 && x <= q.x1 + 2 && y >= q.y0 - 2 && y <= q.y1 + 2) return true;
      const R = q.rough;
      return x >= R.x0 - 1 && x <= R.x1 + 1 && y >= R.y0 - 1 && y <= R.y1 + 1 && !wireColour(px2(x, y));
    });
    const cond = new Uint8Array(w * h), amber = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!ink[y * w + x] || inRes(x, y)) continue;
      cond[y * w + x] = 1;
      const i = px2(x, y);
      if (isAmber(data[i], data[i + 1], data[i + 2])) amber[y * w + x] = 1;
    }
    const { lab, comps: wires } = components2(cond, w, h);
    const nodeAt = (q, end) => {
      const midX = q.x0 + q.x1 >> 1, midY = q.y0 + q.y1 >> 1;
      const spread2 = q.horizontal ? q.y1 - q.y0 >> 1 : q.x1 - q.x0 >> 1;
      const votes = /* @__PURE__ */ new Map();
      for (let d = 2; d <= r * 3 + 4; d++) {
        for (let s = -spread2; s <= spread2; s++) {
          let x, y;
          if (q.horizontal) {
            x = end ? q.x1 + d : q.x0 - d;
            y = midY + s;
          } else {
            x = midX + s;
            y = end ? q.y1 + d : q.y0 - d;
          }
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const L = lab[y * w + x];
          if (L) votes.set(L, (votes.get(L) || 0) + 1);
        }
        if (votes.size) break;
      }
      let best = null, bn = 0;
      votes.forEach((n, L) => {
        if (n > bn) {
          bn = n;
          best = L;
        }
      });
      return best;
    };
    resistors.forEach((q) => {
      q.a = nodeAt(q, 0);
      q.b = nodeAt(q, 1);
    });
    const { comps: dots } = components2(amber, w, h);
    const minDot = Math.max(6, r * r * 0.6);
    const terminals = dots.filter((d) => d.n >= minDot).map((d) => {
      const counts = /* @__PURE__ */ new Map();
      for (let y = d.y0; y <= d.y1; y++) for (let x = d.x0; x <= d.x1; x++) {
        const L = lab[y * w + x];
        if (L) counts.set(L, (counts.get(L) || 0) + 1);
      }
      let node = null, bn = 0;
      counts.forEach((n, L) => {
        if (n > bn) {
          bn = n;
          node = L;
        }
      });
      return { x: P.x0 + d.cx, y: P.y0 + d.cy, node };
    }).sort((p, q) => p.x - q.x || p.y - q.y);
    const out = resistors.sort((p, q) => p.y0 - q.y0 || p.x0 - q.x0).map((q) => ({
      x: P.x0 + q.x0,
      y: P.y0 + q.y0,
      w: q.x1 - q.x0 + 1,
      h: q.y1 - q.y0 + 1,
      horizontal: q.horizontal,
      rgb: q.rgb,
      color: q.color,
      a: q.a,
      b: q.b
    }));
    const unconnected = out.filter((q) => q.a == null || q.b == null).length;
    let error = null;
    if (terminals.length !== 2) error = `Found ${terminals.length} orange terminal${terminals.length === 1 ? "" : "s"} (need 2)`;
    else if (unconnected) error = `${unconnected} resistor${unconnected > 1 ? "s" : ""} not connected to a wire on both ends`;
    return {
      ok: !error,
      error,
      panel: P,
      resistors: out,
      terminals,
      A: terminals[0] ? terminals[0].node : null,
      B: terminals[1] ? terminals[1].node : null,
      nodeCount: wires.length
    };
  }

  // src/modules/circuit/circuitLegend.js
  var circuitLegend_exports = {};
  __export(circuitLegend_exports, {
    classifyDigit: () => classifyDigit,
    encodeShape: () => encodeShape,
    legendToManual: () => legendToManual,
    readLegend: () => readLegend
  });
  var lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  var dist22 = (data, i, c) => (data[i] - c[0]) ** 2 + (data[i + 1] - c[1]) ** 2 + (data[i + 2] - c[2]) ** 2;
  function modeColour(data, W2, x0, y0, x1, y1) {
    const hist = /* @__PURE__ */ new Map();
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = (y * W2 + x) * 4;
        const k = data[i] >> 3 << 10 | data[i + 1] >> 3 << 5 | data[i + 2] >> 3;
        hist.set(k, (hist.get(k) || 0) + 1);
      }
    }
    let bestK = 0, bestN = -1;
    hist.forEach((n2, k) => {
      if (n2 > bestN) {
        bestN = n2;
        bestK = k;
      }
    });
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = (y * W2 + x) * 4;
        if ((data[i] >> 3 << 10 | data[i + 1] >> 3 << 5 | data[i + 2] >> 3) !== bestK) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }
  var refCache2 = null;
  var builtIn = () => refCache2 = refCache2 || DIGIT_REFS.map((r) => ({ ch: r.ch, aspect: r.aspect, v: decodeShape(r.fp) }));
  function classifyDigit(glyph, learned = {}) {
    const refs = builtIn().concat(Object.entries(learned).flatMap(([ch, list]) => list.map((r) => ({ ch, aspect: r.aspect, v: decodeShape(r.fp) }))));
    const best = {};
    for (const r of refs) {
      const s = glyphScore3(glyph, r);
      if (!(r.ch in best) || s > best[r.ch]) best[r.ch] = s;
    }
    const ranked = Object.entries(best).sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return { ch: null, score: 0, margin: 0, second: null };
    return { ch: ranked[0][0], score: ranked[0][1], margin: ranked.length > 1 ? ranked[0][1] - ranked[1][1] : 1, second: ranked[1] ? ranked[1][0] : null };
  }
  function splitWide(c, inkAt) {
    const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1;
    const parts = Math.round(w / (h * 0.62));
    if (parts < 2) return [c];
    const col = [];
    for (let x = c.x0; x <= c.x1; x++) {
      let n = 0;
      for (let y = c.y0; y <= c.y1; y++) if (inkAt(x, y)) n++;
      col.push(n);
    }
    const cuts = [];
    for (let k = 1; k < parts; k++) {
      const mid = Math.round(w * k / parts), lo = Math.max(1, mid - Math.round(h * 0.2)), hi = Math.min(w - 2, mid + Math.round(h * 0.2));
      let at2 = mid;
      for (let x = lo; x <= hi; x++) if (col[x] < col[at2]) at2 = x;
      cuts.push(c.x0 + at2);
    }
    const edges = [c.x0, ...cuts, c.x1 + 1];
    return edges.slice(0, -1).map((x0, k) => ({ ...c, x0, x1: edges[k + 1] - 1, split: true }));
  }
  function readLegend(data, W2, H, learned = {}) {
    const edge = /* @__PURE__ */ new Map();
    const addEdge = (x, y) => {
      const i = (y * W2 + x) * 4;
      const k = `${data[i] >> 2},${data[i + 1] >> 2},${data[i + 2] >> 2}`;
      edge.set(k, (edge.get(k) || 0) + 1);
    };
    for (let x = 0; x < W2; x++) {
      addEdge(x, 0);
      addEdge(x, H - 1);
    }
    for (let y = 0; y < H; y++) {
      addEdge(0, y);
      addEdge(W2 - 1, y);
    }
    const page = [...edge.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map((v) => Number(v) * 4 + 2);
    const mask = new Uint8Array(W2 * H);
    for (let p = 0; p < W2 * H; p++) if (dist22(data, p * 4, page) > 1600) mask[p] = 1;
    const { comps } = components2(mask, W2, H, false);
    const boxes = comps.filter((c) => {
      const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
      return c.n >= W2 * H * 0.01 && bw / bh >= 1.4 && bw / bh <= 6 && c.n >= bw * bh * 0.6;
    });
    if (boxes.length < 2) return { ok: false, reason: "no colour chips found", chips: [] };
    const rowH = Math.min(...boxes.map((b) => b.y1 - b.y0 + 1)) * 0.5;
    boxes.sort((a, b) => Math.abs(a.cy - b.cy) < rowH ? a.x0 - b.x0 : a.cy - b.cy);
    const chips = boxes.map((b) => {
      const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
      const ix0 = b.x0 + Math.round(bw * 0.05), ix1 = b.x1 - Math.round(bw * 0.05);
      const iy0 = b.y0 + Math.round(bh * 0.1), iy1 = b.y1 - Math.round(bh * 0.1);
      const rgb = modeColour(data, W2, ix0, iy0, ix1, iy1);
      const fillL = lum(...rgb);
      let light = 0, dark = 0, lo = 255, hi = 0;
      for (let y = iy0; y <= iy1; y++) {
        for (let x = ix0; x <= ix1; x++) {
          const i = (y * W2 + x) * 4, L = lum(data[i], data[i + 1], data[i + 2]);
          if (L > fillL + 50) light++;
          if (L < fillL - 50) dark++;
          if (L < lo) lo = L;
          if (L > hi) hi = L;
        }
      }
      const isLight = light >= dark;
      const cut = isLight ? (fillL + hi) / 2 : (fillL + lo) / 2;
      const ink = (r, g, bl) => isLight ? lum(r, g, bl) > cut : lum(r, g, bl) < cut;
      const inkAt = (x, y) => {
        const i = (y * W2 + x) * 4;
        return ink(data[i], data[i + 1], data[i + 2]);
      };
      const iw = ix1 - ix0 + 1, ih = iy1 - iy0 + 1;
      const tmask = new Uint8Array(iw * ih);
      for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) tmask[y * iw + x] = inkAt(ix0 + x, iy0 + y) ? 1 : 0;
      const glyphs = components2(tmask, iw, ih, true).comps.filter((c) => c.n >= ih * 0.15).map((c) => ({ x0: c.x0 + ix0, x1: c.x1 + ix0, y0: c.y0 + iy0, y1: c.y1 + iy0 })).sort((p, q) => p.x0 - q.x0);
      const merged = [];
      for (const g of glyphs) {
        const last = merged[merged.length - 1];
        if (last && g.x0 <= last.x1 + 1) {
          last.x0 = Math.min(last.x0, g.x0);
          last.x1 = Math.max(last.x1, g.x1);
          last.y0 = Math.min(last.y0, g.y0);
          last.y1 = Math.max(last.y1, g.y1);
        } else merged.push({ ...g });
      }
      const run = [];
      for (let k = merged.length - 1; k >= 0; k--) {
        const g = merged[k];
        if (!run.length) {
          run.unshift(g);
          continue;
        }
        const tall = Math.max(...run.map((q) => q.y1 - q.y0 + 1));
        if (g.y1 - g.y0 + 1 < tall * 0.6 || run[0].x0 - g.x1 - 1 > tall * 0.45) break;
        run.unshift(g);
      }
      const readBox = (g) => {
        const glyph = inkGlyph(data, W2, g.x0, g.y0, g.x1 + 1, g.y1 + 1, ink);
        return { box: g, glyph, ...glyph ? classifyDigit(glyph, learned) : { ch: null, score: 0, margin: 0 } };
      };
      const read = run.flatMap((g) => {
        const whole = readBox(g);
        if (whole.score >= 0.75) return [whole];
        const parts = splitWide(g, inkAt);
        if (parts.length < 2) return [whole];
        const split = parts.map(readBox);
        return split.reduce((a, q) => a + q.score, 0) / split.length > whole.score ? split : [whole];
      });
      const digits = read.filter((g) => g.ch !== "\u03A9");
      const value = digits.length && digits.every((g) => g.ch && /\d/.test(g.ch)) ? String(Number(digits.map((g) => g.ch).join(""))) : null;
      const sure = value !== null && digits.every((g) => g.score >= 0.75 && g.margin >= 0.1);
      return { box: { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }, rgb, color: classifyColor(...rgb), value, glyphs: read, digits, sure, light: isLight };
    });
    return { ok: true, chips };
  }
  function legendToManual(chips) {
    return chips.filter((c) => c.value !== null).map((c) => `${c.color[0].toUpperCase()}${c.color.slice(1)} = ${c.value} \u03A9`).join("\n");
  }

  // src/modules/circuit/circuitSolver.js
  var circuitSolver_exports = {};
  __export(circuitSolver_exports, {
    CIRCUIT_COLORS: () => CIRCUIT_COLORS,
    CIRCUIT_DEFAULT_MANUAL: () => CIRCUIT_DEFAULT_MANUAL,
    formatOhms: () => formatOhms,
    parseCircuitManual: () => parseCircuitManual,
    solveCircuit: () => solveCircuit
  });
  var CIRCUIT_DEFAULT_MANUAL = `Red = 2 \u03A9
Orange = 6 \u03A9
Yellow = 16 \u03A9
Green = 20 \u03A9
Blue = 4 \u03A9
Violet = 8 \u03A9
White = 10 \u03A9
Gray = 12 \u03A9`;
  var CIRCUIT_COLORS = ["red", "orange", "yellow", "green", "blue", "violet", "white", "gray"];
  var ALIAS = { purple: "violet", grey: "gray", silver: "gray" };
  function parseCircuitManual(text) {
    text = discordPlain(text);
    const out = {};
    const re = /\b([a-z]+)\s*[=:–-]\s*(\d+(?:\.\d+)?)/gi;
    let m;
    while (m = re.exec(String(text || ""))) {
      const c = ALIAS[m[1].toLowerCase()] || m[1].toLowerCase();
      if (CIRCUIT_COLORS.includes(c)) out[c] = m[2];
    }
    return out;
  }
  var babs = (a) => a < 0n ? -a : a;
  var gcd = (a, b) => {
    a = babs(a);
    b = babs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1n;
  };
  var F = (n, d = 1n) => {
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    return [n / g, d / g];
  };
  var add = (a, b) => F(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
  var sub = (a, b) => F(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
  var mul = (a, b) => F(a[0] * b[0], a[1] * b[1]);
  var div = (a, b) => F(a[0] * b[1], a[1] * b[0]);
  var fromDecimal = (s) => {
    const [i, f = ""] = String(s).split(".");
    return F(BigInt(i + f), 10n ** BigInt(f.length));
  };
  function formatOhms(fr) {
    const [n, d] = fr;
    const dec = Number(n) / Number(d);
    const short = String(Math.round(dec * 100) / 100);
    return { exact: d === 1n ? String(n) : `${n}/${d}`, decimal: short, isInteger: d === 1n, value: dec };
  }
  function solveCircuit(resistors, A, B, manual) {
    const values = resistors.map((r) => manual[r.color] != null ? manual[r.color] : null);
    const missing = [...new Set(resistors.filter((r, i) => values[i] == null).map((r) => r.color))];
    if (missing.length) return { ok: false, values, error: `No value for ${missing.join(", ")} in the manual` };
    if (A == null || B == null) return { ok: false, values, error: "Need two orange terminals" };
    if (A === B) return { ok: true, values, ohms: formatOhms([0n, 1n]), note: "terminals are shorted" };
    const adj = /* @__PURE__ */ new Map();
    const link = (x, y) => {
      if (!adj.has(x)) adj.set(x, []);
      adj.get(x).push(y);
    };
    resistors.forEach((r) => {
      link(r.a, r.b);
      link(r.b, r.a);
    });
    const seen = /* @__PURE__ */ new Set([A]), stack = [A];
    while (stack.length) for (const y of adj.get(stack.pop()) || []) if (!seen.has(y)) {
      seen.add(y);
      stack.push(y);
    }
    if (!seen.has(B)) return { ok: false, values, error: "The terminals are not connected (open circuit)" };
    const nodes = [...seen].filter((n) => n !== B);
    const idx = new Map(nodes.map((n, i) => [n, i]));
    const N2 = nodes.length;
    const M = Array.from({ length: N2 }, () => Array.from({ length: N2 + 1 }, () => [0n, 1n]));
    resistors.forEach((r, k) => {
      if (!seen.has(r.a) || r.a === r.b) return;
      const g = div([1n, 1n], fromDecimal(values[k]));
      const ia = idx.get(r.a), ib = idx.get(r.b);
      if (ia != null) M[ia][ia] = add(M[ia][ia], g);
      if (ib != null) M[ib][ib] = add(M[ib][ib], g);
      if (ia != null && ib != null) {
        M[ia][ib] = sub(M[ia][ib], g);
        M[ib][ia] = sub(M[ib][ia], g);
      }
    });
    M[idx.get(A)][N2] = [1n, 1n];
    for (let c = 0; c < N2; c++) {
      let p = c;
      while (p < N2 && M[p][c][0] === 0n) p++;
      if (p === N2) return { ok: false, values, error: "Could not solve the circuit" };
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < N2; r++) {
        if (r === c || M[r][c][0] === 0n) continue;
        const f = div(M[r][c], M[c][c]);
        for (let k = c; k <= N2; k++) M[r][k] = sub(M[r][k], mul(f, M[c][k]));
      }
    }
    const a = idx.get(A);
    return { ok: true, values, ohms: formatOhms(div(M[a][N2], M[a][a])) };
  }

  // src/modules/chess/chessVision.js
  var chessVision_exports = {};
  __export(chessVision_exports, {
    BANKS: () => BANKS,
    DARK_SQUARE: () => DARK_SQUARE,
    FG_DIST: () => FG_DIST,
    LAMBDA: () => LAMBDA,
    LEGACY_WHITE: () => LEGACY_WHITE,
    LIGHT_SQUARE: () => LIGHT_SQUARE,
    NEW_TEMPLATES: () => NEW_TEMPLATES,
    SEG: () => SEG,
    SEG_L2: () => SEG_L2,
    TEMPLATE_SIZE: () => TEMPLATE_SIZE,
    buildFeature: () => buildFeature,
    classify: () => classify2,
    correlation: () => correlation,
    detectBoardColor: () => detectBoardColor,
    findBoards: () => findBoards,
    findRuns: () => findRuns,
    imageToData: () => imageToData,
    readBoard: () => readBoard,
    rnd: () => rnd,
    segDist: () => segDist,
    squareMask: () => squareMask
  });
  var TEMPLATE_SIZE = 32;
  var LEGACY_WHITE = {
    p: { h: 0.721, w: 0.548, cells: "0000000000158787787742000000000000000000146889888898863100000000000000001678999999988751000000000000000389899998999999862000000000000005898999999989987650000000000000058989899999999976510000000000000689898999999888765100000000000006888989999998987740000000000000069898899999999897410000000000001799899999999999986200000000000259999998999989999885200000000005799989899999999889962000000000078998799999999988999520000000000789999889999988899996300000000002689999998998999999830000000000001568998899989997543100000000000001489998999999975300000000000000003798999999899762000000000000000147889899998997760000000000000003798999999999976620000000000000279989899999989978620000000000024889989999999998976300000000001669898999999999999666610000000269989889999999999989867520000038878989999999999999999976520001587898999999999999999989886410238889999999999999999999899867415688998999999999999999999899886378989999999999999999999999998875899988988888888888888888887899988999999999999999999999999999999823799999999999999999999999999953" },
    b: { h: 0.879, w: 0.733, cells: "0000000000002499965200000000000000000000000498688866200000000000000000000025989999893000000000000000000000589888898930000000000000000000005899899699300000000000000000000058999996995000000000000000000003699999998963000000000000000000459889998899998000000000000000008998899989999995100000000000001598889989899999995000000000000058988999889999899999100000000006666999969899888698894000000000289799999969998899898890000000005998899999999989999996800000000069989999899999999999896300000002899899998869998999999976100000038999999998999989999999862000000369999996989999899999898660000003696999998898989999998996600000036989999988688999999999864000000389999999999999999999998620000002699899999999999999998962000000003998899999999999999996900000001259988999999999999999896320000236699999999999999999999966650024698998888888888888888888995630399889988888888888888888898986906998999999999999999999999998969399999999999999999999999999998995999866666666666666666666666688969999999999999999999999999999999958986666666666666666666666668995" },
    n: { h: 0.863, w: 0.726, cells: "0000000005895200000000000000000000000000299999530000000000000000000000005999999966330000000000000000000389999999988850000000000000000049999988999999995000000000000000599989998889999992000000000000069999899999999999993000000000000899989999999998899995000000000059999999999999999889960000000000999889999999999999999961000000169989999998889999999899630000036999999998998999999999999300000899998999998999899999988993000019998999999866999999999989630003999899956236999899999999996300023399523333699989999999999963000233663333369999899999999999630000233333229999989999999999996300000233320599998999999999999933000000000009998999999999999993300000000006999699999999999998633000000000599989999999999999896320000000003699899999999999986333000000022266998999999999999933322000003336999999999999999999666333000669999999999999999999999999633049999998888888888888888889999661899999999999999999999999999999939998999999999999999999999998999699998666666666666666666666689999999999999999999999999999999999965999999999999999999999999999665" },
    q: { h: 0.905, w: 0.935, cells: "000000000689991003999640000000000000000048999992399999840000000004444001999999999999999600044440689999449998889449888999449999747999999499799994499989944999999679999994499999444999999449999997998999944498979449999944498979999979999444988894499899444989999999889994449987944999994449798999249989944499798999989944999899421499779949997999999799449799944100498779999999999897999979999200002998989999999998989998999980000014999999999979999999989799200000039989999799898899998998992000000299899898999799998989989900000002497997979999999779994992000000004998999999999999999999910000000019989999999999999998999000000000039999999999999999989940000000000297999999999999998999200000000002997999999999999999992000000000024997999999999999899300000000000249999999999999989993100000000004499999999999999999942000000001444999999999999999999442000000024997999999999999999799940000000399899999999999999999999910000004997999999999999999999899200000199998777777777777777999997000001999999999999999999999999970000006999999999999999999999984000" },
    k: { h: 0.904, w: 0.904, cells: "0000000000001999997000000000000000000000000089999984000000000000000000000019999799998000000000000000000000299979499992000000000000000000002999897899920000000000000000000029998998999100000000000000004444044989799930044440000000007899999999897999999999774000007999999999998997999999999996000499999999999499997999999999994007998799999999999999999999799980799989999999999999999999999899949997999887779999999987788999799799799988444989999998944499994999999999894444989999899444999979999989997994249899999994499999799999799979944499999999944997994999497999989944999999999449999979973997999899949999999999989999999003998999899999999999999999979990029999999789999999999899998999100049988999988899999899999899920000049979999999999999999979994000000049989999999999999998999200000000249999999999999999999941000000004449999999999999999999430000000449988999999999999998799920000034999999999999999999999999420000499979999999999999999997999200004999877777777777777777799992000049999999999999999999999999920000199999999999999999999999999100" },
    r: { h: 0.815, w: 0.74, cells: "00000000022229999951222000000000000000444468999999996444220000000000045799999999999999997620000000001689999999999999999998300000000017999899998899999999997000000000179997699989949994799970000000001799699788999988898999700000000014997999999999999989993000000000129969999999999999897720000000001277887777777777788944200000000001679999999999999999421000000000002479987777777799944100000000000014998999999998797410000000000003797999999999997994100000000000057978999999999989973000000000000799789999999999897500000000000089999999999999999976000000000000999899999999999999761000000000029998999999999999899920000000001499799999999999998999400000000017996999999999999989996000000000179969999999999999899970000000113999989999999999998999742000001447999999999999999999997440001134799999999999999999999974441027799988999999999999999978999760299997899999999999999999998999918999899999999999999999999997999499987777777777777777777777778994999999999999999999999999999999969999999999999999999999999999999779999999999999999999999999999993" }
  };
  var NEW_TEMPLATES = {
    black: {
      r: { h: 0.631, w: 0.558, cells: "000001112333357988653333221100000000011123333579886533332211000000000113556667898887666654220000000012368888999999999998875310000000135799999999999999999864100000001358999999999999999988641000000013589999999999999999886310000000124688999999999999988753000000000124778999999999999765220000000001246688888888899987542100000000000155778888888888764211000000000001457788888888887531110000000000014578999889999875311100000000000156899999999999863111000000000002779999999999999853110000000000137899999999999998642100000000012488999999999999997522000000000125889999999999999976220000000012368899999999999999874200000000124688999999999999998853000000001257999999999999999988631000000012579999999999999999886410000000124788999999999999998853100000001456888888888888888877541000111246667787777777777777776642212234577777888888888888887777543233468899999999999999999999998653556789999999999999999999999988658899999999999999999999999999998899999999999999999999999999999999777999999999999999999999999988766789999999999999999999999999876" },
      n: { h: 0.656, w: 0.55, cells: "000000002258987533321100000000000000000022589875333211000000000000000001357999876555321000000000000000126889999888886532000000000000112389999999999988641100000000001135999999999999998631100000000012569999999999999998531000000000246799999999999999987421000000024688999999999999999986420000111368999999989999999999886310001125899999988889999999999874210022369999998777789999999998752100335888888876556899999999998631003357888876554568999999999986310022467765444345789999999999863100112355442223568899999999998631000001111111368899999999999986310000001111124789999999999999863100000000013468999999999999998631000000000156799999999999999985210000000002678999999999999988641000000000127889999999999999875310000000001267899999999999987632100000000112567888888888887764321000111133445556666666666665544321112223555566666666666666666555432133457777888888888888888888776543556888999999999999999999999988657788999999999999999999999999988788899999999999999999999999999988889999999999999999999999999998766799999888888888888888888999876" },
      k: { h: 0.684, w: 0.649, cells: "000000000001246898631000000000000000000000012468986310000000000000000000000136799975100000000000000000000001478999862000000000000000000000014889998620000000000000000000000147899986200000000000000000111112257999631111111000000001123222223679997422223322110033357888888889999998888888887522445789999999999999999999999987425579999999999999999999999999987477799999888999999999998889999987889999875467999999998665678999989999987421248999998863223689999999999852111169999988411113799999889988631111488999872011136899987789998520014789998620112589999777899986200147899986201136899997667899986323699999984225788998644468999976458999999865589999985211279999999999999999999999976211125789999999999999999999998642100024788999999999999999999873100000135679999999999999999875421000000111356666666666666664111000000000001345555555555554421110000000012335677777777777776543200000001256799999999999999998764110000046788999999999999999998873200001478999999999999999999999852000015899999999999999999999999520000147899999999999999999999984200" },
      p: { h: 0.558, w: 0.383, cells: "0000000112345789998744311100000000000001123457899987443111000000000000012246789999986642110000000000000134678999999877641100000000000012558999999999998532000000000000125689999999999986320000000000001255899999999999863200000000000012458999999999998532000000000000125589999999999986320000000000001256899999999999863210000000000013669999999999999753110000000000137799999999999998642100000000012478999999999999986421000000000124779999999999998754210000000000136689999999999986431100000000001245788999999988742200000000000001235789999999765211000000000000012256899999997642110000000000000123578999999976421100000000000001336789999999776311000000000000124578999999998875220000000000001255899999999999853210000000000123678999999999998754210000000112468899999999999998753210001111346899999999999999998754211122235678999999999999999988764322333578899999999999999999988865445556888999999999999999999998765577788999999999999999999999998877999999999999999999999999999999988888999999999999999999999999988877789999999999999999999999999877" },
      b: { h: 0.66, w: 0.542, cells: "0000000000012368886411000000000000000000000123688864110000000000000000000001357999752100000000000000000000025789998632000000000000000000001368999986310000000000000000000014689988742100000000000000000011368899885321000000000000000000236799997643222100000000000001125689999855334554210000000000012368999987444467775210000000000135899999863346889874210000000012469999997533578999864310000000146899998864446899998874200000002579999988544468999999862100000136899999875355789999998741000001479999998754668999999998410000015799999998767899999999985200000257999999998788999999999852000002579999999999999999999998520000015799999999999999999999985200000146899999999999999999999741000000368999999999999999999986210000001468999999999999999998741000000013579999999999999999875310000001234577887777777778886543110000113456778877777778888776542111223456788888888888888888887654324456889999999999999999999998775466789999999999999999999999998877888999999999999999999999999999888889999999999999999999999999998877899999999999999999999999999987" },
      q: { h: 0.711, w: 0.724, cells: "0000000012688852235898620000100000000000126888522368986200001000112222002478887545789974100222213357652136899986568999852124666366898743368999875689997523578987888988533578998545899974236789988899986422689985458998522478998888999864215899854589984124789987557899852158999756898742358998642258998632589997668987424688885211268997546899987899986467998610111589987678999999999876889985100003799987899999999999888998630000026899999999999999999999985200000147999999999999999999999741000001379999999999999999999987310000012689999999999999999999851000000125899999999999999999998510000000137899999999999999999863100000001268999999999999999998621000000001479999999999999999874100000000003699999999999999998621000000000025999999999999999985210000000000138899999999999998741000000000001367888888888888875310000000000124678888888888888754211000000013577889888888888998775310000001357899999999999999999875310000015799999999999999999999974100000268999999999999999999999851000002589999999999999999999997510000014799999999999999999999863100" }
    },
    white: {
      p: { h: 0.587, w: 0.437, cells: "00000000001356788876431100000000000000000013567888764311000000000000000011235689988754310000000000000001345667999998775411000000000000014567899999998864211000000000000256789999999988643210000000000002567899999999886432100000000000125678999999998864321000000000001267889999999998763210000000000113789999999999998743100000000011247899999999999998652100000000113578999999999999987631000000001356789999999999999987420000000013578899999999999999874200000000125799999999999999998742000000000135889999999999998864210000000000014688999999998875210000000000000135789999999988741100000000000001457899999999776411000000000000025688999999998875211000000000011367889999999988754310000000001135788999999999987654210000000023568899999999999987653200000001357899999999999999987753210011125789999999999999999998765320011246789999999999999999988764311223788999999999999999999998865324457899999999999999999999998754355678999999999999999999999998766777899999999999999999999998888878888998888888888888888888888988877889888888888888888888888898887" },
      b: { h: 0.709, w: 0.594, cells: "0000000000002357875310000000000000000000000024678863100000000000000000000001588888875100000000000000000000137889999873100000000000000000001378999998731000000000000000000014789999987310000000000000000000258999999885200000000000000000114788999999975200000000000000013478899999999986210000000000000257889999999999984200000000000014888999998999999986110000000001258899999989999999983100000000025688999988999999999864000000001368899999768899999988851000000125899999987788999999998621000001378999999988889999999986210000025889999999998899999999864200000258999999999999999999998653000002688999999999999999999986530000025889999999999999999999865300000158899999999999999999998631000001478999999999999999999885210000013689999999999999999999862100000147899999999999999999998631000014789999999999999999999998641011378999999999999999999999998731346899999999999999999999999998636688999999999999999999999999987688899999999999999999999999999987889999999999999999999999999999888888766666666666666666666667788866887777777777777777777777777886" },
      n: { h: 0.687, w: 0.582, cells: "0000000023686421000000000000000000000000237864210000000000000000000000002489875421111000000000000000000136999886444431100000000000000012579999887787753100000000000011358899999888998865210000000000124789999999999999884200000000001258899999999999999875210000000124789999999999999998986200000001257899999999999999999874000000135789999999999999999999851000112578899999999999999999988510002247899999999999999999999986310033588899999999999999999999874200556888988888999999999999998753005567888777889999999999999987530022345445566788899999999999876400122444322356888999999999998764000012332112578999999999999987640000001001258899999999999999775300000000025689999999999999997753000000001478999999999999999976210000001125889999999999999999851100000023589999999999999999998510000012567999999999999999999997530011257889999999999999999999987511225789999999999999999999999986424568999999999999999999999999987656679999999999999999999999999887777899999999999999999999999999888899989999999999999999999999998877888777777777777777777777778877" },
      q: { h: 0.727, w: 0.748, cells: "0000000012567632346786420000000000000000125786324577875200000000002211001478775788888984011222102235422115888878999999862235553155787664238998679999998646788875789887753378985688898766568999879999986424789845778986654689999988999862256798568789844446899998667998622457985688998433468999864468986345579967999973345789876422568985776799889999843478997642003469988877999999998556789865200013699999989999999998888998531000027999999999999999999999985200000279999999999999999999998641000002789999999999999999999864300000014689999999999999999998532000000025899999999999999999985310000000038999999999999999999863100000000289999999999999999998630000000002789999999999999999875100000000015689999999999999997641000000000045899999999999999864210000000001479999999999999999631000000000014799999999999999998520000000001278999999999999999987510000000035899999999999999999986310000001589999999999999999999975200000037899999999999999999999863100000388999999999999999999999841000003888888888888888888888898510000037766666666666666666666774100" },
      k: { h: 0.736, w: 0.715, cells: "0000000000000167897100000000000000000000000002679971000000000000000000000001468899963100000000000000000000137899999982000000000000000000001479999999720000000000000000000013778999985100000000000000000000125689998630000000000000001222222467899987522222210000001145666667788999988766666642100025568888889999999999888887651111588899999999999999999999998752336899999999999999999999999998746669999988779999999988889999998877899998754479999999776568999999888999987655789999998766689999999999998765247789999985356899999999999987442366899999833558999998888999876634668999998445678999985568999987667789999997666899988722479999888888899999998888998775004679999999999999999999999877310035689999999999999999999997762000125689999999999999999999986420000146799999999999999999999842000000247999999999999999999986200000003479999999999999999999862100000256899999999999999999999742000013688999999999999999999999741000257899999999999999999999997520002578988999999999999999999976300025787656666666666666666679873000136976777777777777777777776520" },
      r: { h: 0.654, w: 0.585, cells: "000000001244568988876543210000000000000013446789998876542100000000000012458888999998888754210000000001246899999999999999775200000000124788999999999999998863000000001258899999999999999988641000000012589999999999999999886310000000124799999999999999998752000000001148999999999999999976320000000011379999999999999998652100000000002589999999999999987510000000000014789999999999999875100000000000136689999999999998640000000000001356899999999999885400000000000014669999999999998754100000000000257899999999999987541000000000113699999999999999985520000000001137899999999999999865210000000011379999999999999998663100000000114799999999999999998742000000001158999999999999999988530000000012589999999999999999885310000000146899999999999999998875100000014689999999999999999999873100001468999999999999999999999864101136899999999999999999999998863122489999999999999999999999998535558999999999999999999999999987666789999999999999999999999999888777999888888888888888888888899987789877777777777777777777777898866777777777777777777777777777876" }
    }
  };
  function decodeBank(def, sizeScale) {
    const out = {};
    for (const t in def) {
      out[t] = {
        h: def[t].h * sizeScale,
        w: def[t].w * sizeScale,
        cells: Float32Array.from(def[t].cells.padEnd(TEMPLATE_SIZE * TEMPLATE_SIZE, "0"), (d) => Number(d) / 9)
      };
    }
    return out;
  }
  var BANKS = {
    white: [decodeBank(NEW_TEMPLATES.white, 1), decodeBank(LEGACY_WHITE, 0.833)],
    black: [decodeBank(NEW_TEMPLATES.black, 1)]
  };
  var LIGHT_SQUARE = [200, 176, 138];
  var DARK_SQUARE = [122, 90, 58];
  var SEG = [DARK_SQUARE[0] - LIGHT_SQUARE[0], DARK_SQUARE[1] - LIGHT_SQUARE[1], DARK_SQUARE[2] - LIGHT_SQUARE[2]];
  var SEG_L2 = SEG[0] * SEG[0] + SEG[1] * SEG[1] + SEG[2] * SEG[2];
  var FG_DIST = 40;
  var LAMBDA = 0.3;
  var rnd = (v) => Math.floor(v + 0.5);
  function segDist(r, g, b) {
    const px2 = r - LIGHT_SQUARE[0], py = g - LIGHT_SQUARE[1], pz = b - LIGHT_SQUARE[2];
    let t = (px2 * SEG[0] + py * SEG[1] + pz * SEG[2]) / SEG_L2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px2 - t * SEG[0], dy = py - t * SEG[1], dz = pz - t * SEG[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  function findRuns(counts, thr, minLen, gap) {
    const out = [];
    let start = -1, last = -1;
    for (let i = 0; i < counts.length; i++) {
      if (counts[i] >= thr) {
        if (start < 0) start = i;
        last = i;
      } else if (start >= 0 && i - last > gap) {
        out.push([start, last + 1]);
        start = -1;
      }
    }
    if (start >= 0) out.push([start, last + 1]);
    return out.filter((r) => r[1] - r[0] >= minLen);
  }
  function findBoards(data, W2, H, rect) {
    const x0 = rect ? rect.x0 : 0, y0 = rect ? rect.y0 : 0;
    const x1 = rect ? rect.x1 : W2, y1 = rect ? rect.y1 : H;
    const rw = x1 - x0, rh = y1 - y0;
    const m = new Uint8Array(rw * rh);
    const rowC = new Int32Array(rh), colC = new Int32Array(rw);
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        const i = ((y0 + y) * W2 + x0 + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (segDist(r, g, b) < 22) {
          m[y * rw + x] = 1;
          rowC[y]++;
          colC[x]++;
        }
      }
    }
    const maxOf = (a) => {
      let v = 0;
      for (const n of a) if (n > v) v = n;
      return v;
    };
    const minSide = Math.max(30, Math.floor(Math.min(rw, rh) * 0.12));
    const rr = findRuns(rowC, maxOf(rowC) * 0.2, minSide, 3);
    const cr = findRuns(colC, maxOf(colC) * 0.2, minSide, 3);
    const boards = [];
    for (const [r0, r1] of rr) {
      for (const [c0, c1] of cr) {
        const sr = new Int32Array(r1 - r0), sc = new Int32Array(c1 - c0);
        let total = 0;
        for (let y = r0; y < r1; y++) for (let x = c0; x < c1; x++) {
          if (m[y * rw + x]) {
            sr[y - r0]++;
            sc[x - c0]++;
            total++;
          }
        }
        if (total < 0.075 * (r1 - r0) * (c1 - c0)) continue;
        const mr = maxOf(sr) * 0.25, mc = maxOf(sc) * 0.25;
        let ya = -1, yb = -1, xa = -1, xb = -1;
        for (let i = 0; i < sr.length; i++) if (sr[i] >= mr) {
          if (ya < 0) ya = i;
          yb = i;
        }
        for (let i = 0; i < sc.length; i++) if (sc[i] >= mc) {
          if (xa < 0) xa = i;
          xb = i;
        }
        const w = xb - xa + 1, h = yb - ya + 1;
        if (w < minSide || h < minSide) continue;
        boards.push({ x: x0 + c0 + xa, y: y0 + r0 + ya, w, h });
      }
    }
    return boards;
  }
  function squareMask(data, W2, board, row, col) {
    const cw = board.w / 8, ch = board.h / 8;
    const mg = Math.max(1, rnd(Math.min(cw, ch) * 0.08));
    const l = rnd(board.x + col * cw) + mg, r = rnd(board.x + (col + 1) * cw) - mg;
    const t = rnd(board.y + row * ch) + mg, b = rnd(board.y + (row + 1) * ch) - mg;
    const w = r - l, h = b - t;
    if (w < 3 || h < 3) return null;
    let mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = ((t + y) * W2 + l + x) * 4;
        if (segDist(data[i], data[i + 1], data[i + 2]) > FG_DIST) mask[y * w + x] = 1;
      }
    }
    const clean2 = new Uint8Array(w * h);
    let count = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        let nb = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const yy = y + dy, xx = x + dx;
          if (yy >= 0 && yy < h && xx >= 0 && xx < w && mask[yy * w + xx]) nb++;
        }
        if (nb > 0) {
          clean2[y * w + x] = 1;
          count++;
        }
      }
    }
    return { mask: clean2, w, h, count, cw, ch };
  }
  function buildFeature(sq) {
    const { mask, w, h, cw, ch } = sq;
    let left = w, right = -1, top = h, bottom = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
    if (right < 0) return null;
    const bw = right - left + 1, bh = bottom - top + 1;
    const cells = new Float32Array(TEMPLATE_SIZE * TEMPLATE_SIZE);
    for (let fy = 0; fy < TEMPLATE_SIZE; fy++) {
      const y0 = top + Math.floor(fy * bh / TEMPLATE_SIZE);
      const y1 = Math.max(y0 + 1, top + Math.floor((fy + 1) * bh / TEMPLATE_SIZE));
      for (let fx = 0; fx < TEMPLATE_SIZE; fx++) {
        const x0 = left + Math.floor(fx * bw / TEMPLATE_SIZE);
        const x1 = Math.max(x0 + 1, left + Math.floor((fx + 1) * bw / TEMPLATE_SIZE));
        let sum = 0, tot = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          sum += mask[y * w + x];
          tot++;
        }
        cells[fy * TEMPLATE_SIZE + fx] = tot ? sum / tot : 0;
      }
    }
    return { cells, relH: bh / ch, relW: bw / cw };
  }
  function correlation(a, b, mirror) {
    const size = TEMPLATE_SIZE;
    let meanA = 0, meanB = 0;
    for (let i = 0; i < a.length; i++) {
      meanA += a[i];
      meanB += b[i];
    }
    meanA /= a.length;
    meanB /= b.length;
    let dot = 0, nA = 0, nB = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const va = a[y * size + (mirror ? size - 1 - x : x)] - meanA;
      const vb = b[y * size + x] - meanB;
      dot += va * vb;
      nA += va * va;
      nB += vb * vb;
    }
    return dot / Math.sqrt(nA * nB + 1e-9);
  }
  function classify2(feature, color) {
    const banks = BANKS[color];
    const scores = {};
    for (const bank of banks) {
      for (const type in bank) {
        const tp = bank[type];
        const shape = Math.max(correlation(feature.cells, tp.cells, false), correlation(feature.cells, tp.cells, true));
        const s = shape - LAMBDA * (Math.abs(feature.relH - tp.h) + Math.abs(feature.relW - tp.w));
        if (scores[type] === void 0 || s > scores[type]) scores[type] = s;
      }
    }
    let best = "p", bs = -Infinity, second = -Infinity;
    for (const t in scores) {
      if (scores[t] > bs) {
        second = bs;
        bs = scores[t];
        best = t;
      } else if (scores[t] > second) second = scores[t];
    }
    return { type: best, margin: bs - second };
  }
  function readBoard(data, W2, board, color) {
    const pieces2 = Array(64).fill("");
    const unsure = /* @__PURE__ */ new Set();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = squareMask(data, W2, board, row, col);
        if (!sq || sq.count < sq.w * sq.h * 0.05) continue;
        const f = buildFeature(sq);
        if (!f || f.relH < 0.35 * 0.8) continue;
        const c = classify2(f, color);
        const idx = row * 8 + col;
        pieces2[idx] = color === "white" ? c.type.toUpperCase() : c.type;
        if (c.margin < 0.06) unsure.add(idx);
      }
    }
    return { pieces: pieces2, unsure };
  }
  function detectBoardColor(data, W2, board) {
    let sumLum = 0, count = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = squareMask(data, W2, board, r, c);
        if (!sq || sq.count < sq.w * sq.h * 0.05) continue;
        const f = buildFeature(sq);
        if (!f || f.relH < 0.28) continue;
        const cw = board.w / 8, ch = board.h / 8;
        const mg = Math.max(1, rnd(Math.min(cw, ch) * 0.08));
        const left = rnd(board.x + c * cw) + mg;
        const top = rnd(board.y + r * ch) + mg;
        for (let y = 0; y < sq.h; y++) {
          for (let x = 0; x < sq.w; x++) {
            if (sq.mask[y * sq.w + x]) {
              const idx = ((top + y) * W2 + left + x) * 4;
              sumLum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              count++;
            }
          }
        }
      }
    }
    return count && sumLum / count > 115 ? "white" : "black";
  }
  function imageToData(img) {
    let W2 = img.naturalWidth || img.width || 100;
    let H = img.naturalHeight || img.height || 100;
    const MAXDIM = 1200;
    const scl = Math.min(1, MAXDIM / Math.max(W2, H));
    W2 = Math.round(W2 * scl);
    H = Math.round(H * scl);
    const cv = document.createElement("canvas");
    cv.width = W2;
    cv.height = H;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W2, H);
    return { cv, data: ctx.getImageData(0, 0, W2, H).data, W: W2, H };
  }

  // src/modules/chess/chessEngine.js
  var chessEngine_exports = {};
  __export(chessEngine_exports, {
    ENGINE_URLS: () => ENGINE_URLS,
    SUPERSEDED: () => SUPERSEDED,
    askEngine: () => askEngine,
    attachEngineForTests: () => attachEngineForTests,
    cancelSearch: () => cancelSearch,
    kingInCheck: () => kingInCheck,
    legalSan: () => legalSan,
    moveValue: () => moveValue,
    multiPvCollector: () => multiPvCollector,
    parseFen: () => parseFen,
    scoreAllMoves: () => scoreAllMoves,
    startEngine: () => startEngine,
    stopEngineListener: () => stopEngineListener,
    toFen: () => toFen
  });

  // conso:conso-stockfish-source
  var INLINE_ENGINE = "inline:stockfish";
  var loadStockfishSource = () => fetch("https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js").then((r) => {
    if (!r.ok) throw new Error("stockfish.js " + r.status);
    return r.text();
  });

  // src/modules/chess/chessEngine.js
  var ENGINE_URLS = [
    INLINE_ENGINE,
    "/stockfish.js",
    "stockfish.js",
    "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js",
    "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js"
  ];
  var worker = null;
  var engineReady = null;
  var lastStatus = "Engine offline";
  var statusListeners = /* @__PURE__ */ new Set();
  var busy = false;
  var active = null;
  var idleWaiters = [];
  function emitStatus(text) {
    lastStatus = text;
    statusListeners.forEach((fn) => {
      try {
        fn(text);
      } catch (e) {
      }
    });
  }
  function onEngineLine(line) {
    if (line.startsWith("bestmove")) {
      busy = false;
      const a = active;
      active = null;
      const waiters = idleWaiters;
      idleWaiters = [];
      if (a) a.onBest(line.split(" ")[1]);
      waiters.forEach((f) => f());
      return;
    }
    if (active) active.onLine(line);
  }
  function whenIdle(ms) {
    if (!busy) return Promise.resolve(true);
    return new Promise((resolve) => {
      const f = () => {
        clearTimeout(t);
        resolve(true);
      };
      const t = setTimeout(() => {
        idleWaiters = idleWaiters.filter((x) => x !== f);
        resolve(false);
      }, ms);
      idleWaiters.push(f);
    });
  }
  function dropEngine() {
    if (worker) {
      try {
        worker.terminate();
      } catch (e) {
      }
    }
    worker = null;
    engineReady = null;
    busy = false;
    active = null;
    const waiters = idleWaiters;
    idleWaiters = [];
    waiters.forEach((f) => f());
  }
  function startEngine(onStatusChange) {
    if (onStatusChange) {
      statusListeners.add(onStatusChange);
      onStatusChange(lastStatus);
    }
    if (engineReady) return engineReady;
    const onStatus = emitStatus;
    engineReady = (async () => {
      onStatus("Loading Stockfish\u2026");
      for (const url of ENGINE_URLS) {
        try {
          let source = "";
          try {
            source = url === INLINE_ENGINE ? await loadStockfishSource() : await (await fetch(url)).text();
          } catch (e) {
          }
          if (source) {
            const blobUrl = URL.createObjectURL(new Blob([source], { type: "application/javascript" }));
            worker = new Worker(blobUrl);
          } else {
            worker = new Worker(url);
          }
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("timeout")), 5e3);
            worker.onmessage = (event) => {
              if (String(event.data).includes("readyok")) {
                clearTimeout(timeout);
                resolve();
              }
            };
            worker.onerror = reject;
            worker.postMessage("uci");
            worker.postMessage("isready");
          });
          busy = false;
          active = null;
          worker.onmessage = (event) => onEngineLine(String(event.data));
          onStatus("Stockfish ready \u2713");
          return true;
        } catch (error) {
          if (worker) {
            try {
              worker.terminate();
            } catch (e) {
            }
          }
          worker = null;
        }
      }
      onStatus("\u26A0 Engine load failed (check network/stockfish.js)");
      return false;
    })();
    return engineReady;
  }
  function attachEngineForTests(w) {
    worker = w;
    busy = false;
    active = null;
    idleWaiters = [];
    current = null;
    worker.onmessage = (event) => onEngineLine(String(event.data));
    engineReady = Promise.resolve(true);
  }
  function stopEngineListener(onStatusChange) {
    statusListeners.delete(onStatusChange);
  }
  var SUPERSEDED = Symbol("superseded");
  var current = null;
  async function search(fen, milliseconds, owner, multiPV, onLine) {
    if (!worker) await startEngine();
    if (!worker) return null;
    while (current && current.owner !== owner) await current.done;
    if (current) current.cancel(SUPERSEDED);
    let markDone;
    const me = { owner, done: new Promise((r) => {
      markDone = r;
    }) };
    current = me;
    return new Promise((resolve) => {
      let settled = false;
      let timer = 0;
      let mine = null;
      const finish = (val) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (mine && active === mine) {
          active = null;
          try {
            worker.postMessage("stop");
          } catch (e) {
          }
        }
        if (current === me) current = null;
        markDone();
        resolve(val);
      };
      me.cancel = finish;
      (async () => {
        if (!await whenIdle(5e3)) {
          dropEngine();
          await startEngine();
        }
        if (settled) return;
        if (!worker) {
          finish(null);
          return;
        }
        let stopSent = false;
        const stop = () => {
          if (!stopSent && active === mine) {
            stopSent = true;
            worker.postMessage("stop");
          }
        };
        mine = { onLine: (line) => {
          if (onLine) onLine(line, stop);
        }, onBest: (uci) => finish(uci) };
        active = mine;
        busy = true;
        worker.postMessage("ucinewgame");
        worker.postMessage(`setoption name MultiPV value ${multiPV}`);
        worker.postMessage("position fen " + fen);
        worker.postMessage("go movetime " + milliseconds);
        timer = setTimeout(() => finish(null), milliseconds + 4e3);
      })();
    });
  }
  function cancelSearch(owner) {
    if (current && current.owner === owner && current.cancel) current.cancel(SUPERSEDED);
  }
  function askEngine(fen, milliseconds, onInfo, owner = "default", { settle = false } = {}) {
    let lastPv = "";
    let stable = 0;
    return search(fen, milliseconds, owner, 1, (line, stop) => {
      if (!line.startsWith("info") || !line.includes(" score ")) return;
      const depth = (line.match(/ depth (\d+)/) || [])[1] || "";
      const cp = (line.match(/score cp (-?\d+)/) || [])[1] || "";
      const mate = (line.match(/score mate (-?\d+)/) || [])[1] || "";
      if (onInfo) onInfo({ depth, cp, mate });
      if (mate && +mate > 0 && +depth >= Math.min(12, +mate * 2 + 2)) {
        stop();
        return;
      }
      if (settle) {
        const pv = (line.match(/ pv (\S+)/) || [])[1] || "";
        if (pv) {
          stable = pv === lastPv ? stable + 1 : 0;
          lastPv = pv;
        }
        if (+depth >= 14 && stable >= 6) stop();
      }
    });
  }
  function legalSan(fen, uci) {
    if (!uci) return null;
    if (typeof window === "undefined" || typeof window.Chess === "undefined") return uci;
    try {
      const m = new window.Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      return m ? m.san : null;
    } catch (e) {
      return null;
    }
  }
  var moveValue = (m) => m.mate != null ? m.mate > 0 ? 1e5 - m.mate : -1e5 - m.mate : m.cp;
  function multiPvCollector() {
    const slots = /* @__PURE__ */ new Map();
    return {
      line(text) {
        if (!text.startsWith("info") || !text.includes(" multipv ")) return null;
        const idx = +((text.match(/ multipv (\d+)/) || [])[1] || 0);
        const uci = (text.match(/ pv (\S+)/) || [])[1];
        const cp = text.match(/score cp (-?\d+)/), mate = text.match(/score mate (-?\d+)/);
        if (!idx || !uci || !cp && !mate) return null;
        const m = { uci, depth: +((text.match(/ depth (\d+)/) || [])[1] || 0), cp: cp ? +cp[1] : null, mate: mate ? +mate[1] : null };
        slots.set(idx, m);
        return m;
      },
      /** every move once, worst first */
      moves() {
        const byMove = /* @__PURE__ */ new Map();
        [...slots.keys()].sort((a, b) => a - b).forEach((k) => {
          const m = slots.get(k);
          byMove.set(m.uci, { ...m, value: moveValue(m) });
        });
        return [...byMove.values()].sort((a, b) => a.value - b.value);
      }
    };
  }
  async function scoreAllMoves(fen, milliseconds, onInfo, owner = "default") {
    const col = multiPvCollector();
    const best = await search(fen, milliseconds, owner, 256, (line) => {
      const m = col.line(line);
      if (m && onInfo) onInfo({ depth: m.depth });
    });
    if (best === SUPERSEDED || best === null) return best;
    return col.moves();
  }
  function toFen(boardState, side = "w") {
    const ranks = [];
    for (let row = 0; row < 8; row++) {
      let text = "";
      let empty = 0;
      for (let col = 0; col < 8; col++) {
        const piece = boardState[row * 8 + col];
        if (!piece) {
          empty++;
          continue;
        }
        if (empty) text += empty;
        empty = 0;
        text += piece;
      }
      if (empty) text += empty;
      ranks.push(text);
    }
    return ranks.join("/") + (side === "b" ? " b" : " w") + " - - 0 1";
  }
  function kingInCheck(board, color) {
    const white = color === "w";
    const kingSq = board.indexOf(white ? "K" : "k");
    if (kingSq < 0) return false;
    const kr = Math.floor(kingSq / 8), kc = kingSq % 8;
    const enemy = (ch) => Boolean(ch) && (white ? ch === ch.toLowerCase() : ch === ch.toUpperCase());
    const at2 = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8 ? board[r * 8 + c] : null;
    const is = (ch, type) => enemy(ch) && ch.toLowerCase() === type;
    const pr = white ? kr - 1 : kr + 1;
    if (is(at2(pr, kc - 1), "p") || is(at2(pr, kc + 1), "p")) return true;
    for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) {
      if (is(at2(kr + dr, kc + dc), "n")) return true;
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if ((dr || dc) && is(at2(kr + dr, kc + dc), "k")) return true;
      }
    }
    const slide = (dirs, types) => dirs.some(([dr, dc]) => {
      for (let r = kr + dr, c = kc + dc; r >= 0 && r < 8 && c >= 0 && c < 8; r += dr, c += dc) {
        const ch = board[r * 8 + c];
        if (!ch) continue;
        return enemy(ch) && types.includes(ch.toLowerCase());
      }
      return false;
    });
    return slide([[1, 0], [-1, 0], [0, 1], [0, -1]], "rq") || slide([[1, 1], [1, -1], [-1, 1], [-1, -1]], "bq");
  }
  function parseFen(fen) {
    const placement = (fen || "").trim().split(/\s+/)[0] || "";
    const rows = placement.split("/");
    if (rows.length !== 8) return null;
    const newMerged = Array(64).fill("");
    const newWhite = Array(64).fill("");
    const newBlack = Array(64).fill("");
    rows.forEach((text, row) => {
      let col = 0;
      for (const ch of text) {
        if (/\d/.test(ch)) {
          col += Number(ch);
        } else if (col < 8) {
          const idx = row * 8 + col;
          newMerged[idx] = ch;
          if (ch === ch.toUpperCase()) newWhite[idx] = ch;
          else newBlack[idx] = ch;
          col++;
        }
      }
    });
    return { merged: newMerged, white: newWhite, black: newBlack };
  }

  // src/core/leftPage.js
  var leftPage_exports = {};
  __export(leftPage_exports, {
    leftSinceLastAction: () => leftSinceLastAction
  });
  var lastActAt = -Infinity;
  var lastLeftAt = -Infinity;
  var now = () => typeof performance !== "undefined" ? performance.now() : Date.now();
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const act = () => {
      lastActAt = now();
    };
    const left = () => {
      lastLeftAt = now();
    };
    for (const ev of ["pointerdown", "touchstart", "keydown", "paste", "drop", "change", "input"]) window.addEventListener(ev, act, true);
    window.addEventListener("blur", left);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") left();
    });
  }
  function leftSinceLastAction(actAt = lastActAt, leftAt = lastLeftAt, hidden = typeof document !== "undefined" && document.visibilityState === "hidden") {
    return hidden || leftAt > actAt;
  }

  // src/modules/blackjack/blackjackSolver.js
  var blackjackSolver_exports = {};
  __export(blackjackSolver_exports, {
    RANKS: () => RANKS,
    TABLE_DEALERS: () => TABLE_DEALERS,
    bjAdvice: () => bjAdvice,
    bustChance: () => bustChance,
    handTotal: () => handTotal,
    rankValue: () => rankValue,
    tableRows: () => tableRows
  });
  var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  var rankValue = (r) => r === "A" ? 11 : ["10", "J", "Q", "K"].includes(r) ? 10 : Number(r);
  function handTotal(ranks) {
    let t = 0, aces = 0;
    for (const r of ranks) {
      if (r === "A") {
        aces++;
        t += 1;
      } else t += rankValue(r);
    }
    const soft = aces > 0 && t + 10 <= 21;
    return { total: soft ? t + 10 : t, soft };
  }
  var dealerName = (d) => d === 11 ? "A" : String(d);
  function decide(total, soft, d) {
    if (total >= 21) return { action: "STAND", why: total === 21 ? "21 \u2014 stand" : "" };
    if (soft) {
      if (total >= 19) return { action: "STAND", why: `soft ${total}: always stand` };
      if (total === 18) return d <= 8 ? { action: "STAND", why: "soft 18: stand against 2\u20138" } : { action: "HIT", why: "soft 18: hit against 9, 10, A" };
      return { action: "HIT", why: `soft ${total}: always hit (an ace can't make you bust)` };
    }
    if (total >= 17) return { action: "STAND", why: `${total}: always stand` };
    if (total <= 11) return { action: "HIT", why: `${total}: always hit (no card can make you bust)` };
    if (total === 12) return d >= 4 && d <= 6 ? { action: "STAND", why: "12: stand against 4\u20136 (the dealer is likely to bust)" } : { action: "HIT", why: "12: hit against 2, 3 and 7\u2013A" };
    return d <= 6 ? { action: "STAND", why: `${total}: stand against 2\u20136 (the dealer is likely to bust)` } : { action: "HIT", why: `${total}: hit against 7\u2013A` };
  }
  function bjAdvice(player, dealer) {
    if (!player || !player.length) return null;
    const { total, soft } = handTotal(player);
    if (total > 21) return { action: null, total, soft, bust: true, why: `${total} \u2014 bust` };
    if (dealer) {
      const d = rankValue(dealer);
      return { ...decide(total, soft, d), total, soft, bust: false, dealer: dealerName(d) };
    }
    const all = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((d) => decide(total, soft, d));
    if (all.every((a) => a.action === all[0].action)) return { ...all[0], total, soft, bust: false };
    return { action: null, total, soft, bust: false, needsDealer: true, why: "depends on the dealer\u2019s card" };
  }
  function bustChance(player) {
    if (!player || !player.length) return 0;
    return RANKS.filter((r) => handTotal([...player, r]).total > 21).length / RANKS.length;
  }
  var TABLE_DEALERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  function tableRows() {
    const rows = [];
    rows.push({ label: "\u2264 11", total: 11, soft: false });
    for (let t = 12; t <= 16; t++) rows.push({ label: String(t), total: t, soft: false });
    rows.push({ label: "17+", total: 17, soft: false });
    rows.push({ label: "soft \u2264 17", total: 17, soft: true });
    rows.push({ label: "soft 18", total: 18, soft: true });
    rows.push({ label: "soft 19+", total: 19, soft: true });
    return rows.map((r) => ({ ...r, cells: TABLE_DEALERS.map((d) => decide(r.total, r.soft, d).action) }));
  }

  // src/modules/blackjack/blackjackVision.js
  var blackjackVision_exports = {};
  __export(blackjackVision_exports, {
    GH: () => GH,
    GW: () => GW,
    classifyRank: () => classifyRank,
    decodeShape: () => decodeShape,
    encodeShape: () => encodeShape,
    inkGlyph: () => inkGlyph2,
    readBlackjack: () => readBlackjack,
    shapeScore: () => shapeScore
  });

  // src/modules/blackjack/blackjackRefs.js
  var RANK_REFS = [
    { rank: "7", font: "game", aspect: 0.75, fp: "399999999997599999999972973333379930320000069710000000698400000001796000000003996000000027992000000059990000000099970000000099930000000099930000000699930000000699720000000699300000000697100000" },
    { rank: "5", font: "game", aspect: 0.7, fp: "005999999960009999999940009995333300009951000000009930000000009930000000049976666200069999999700046400279972000000039996000000017996464000006996699600039984489731359960029997999920003599995300" },
    { rank: "6", font: "game", aspect: 0.714, fp: "000001396000000035996000000499932000003998200000015994000000079990000000099999999300299999999950699933339990699900009990699900009996699900009996299900009996099933339990059999999950013799997310" },
    { rank: "10", font: "dejavu22", aspect: 1.625, fp: "000000000000000000000000000000000000000000000000366200025630479300285494069300790099069300990099069300990099069300790099379530285494666660025630000000000000000000000000000000000000000000000000" },
    { rank: "2", font: "dejavu22", aspect: 0.688, fp: "006999993000699999999930693000699930630000069993000000069993000000069993000000069993000000069993000000699930000006999300000069993000000699930000006999300000069993000000699999999993699999999993" },
    { rank: "3", font: "dejavu22", aspect: 0.688, fp: "006999993000699999999930630000699993000000069993000000069993000000069993000000699930006999999300006999999930000000699993000000069993000000006993000000069993000000699993699999999930006999993000" },
    { rank: "4", font: "dejavu22", aspect: 0.813, fp: "000001333300000015999900000039999900000279999900002797799900003972699900009960699900099600699900996000699900996000699900999999999999666666899966000000699900000000699900000000699900000000233300" },
    { rank: "5", font: "dejavu22", aspect: 0.75, fp: "099999999900099999999900099000000000099000000000099000000000099000000000099999990000099999999900000000099990000000099990000000009999000000009999000000099990900000099990999999999900009999990000" },
    { rank: "6", font: "dejavu22", aspect: 0.75, fp: "000009999000009999999990099990000090099900000000999000000000999009999000999999999900999990099990999900009999999900009999999900009999999900009999999900009999099990099990009999999900000099990000" },
    { rank: "7", font: "dejavu22", aspect: 0.688, fp: "699999999993699999999993000000069993000000069993000000699930000000699930000006999300000006999300000006999300000069993000000069993000000699930000000699930000000699300000006999300000006993000000" },
    { rank: "8", font: "dejavu22", aspect: 0.75, fp: "000999990000099999999900999900099990999900009990999000009990999900009990099900099990009999999000009999999900999900099990999000009999999000009999999000009999999900099990099999999990000999990000" },
    { rank: "9", font: "dejavu22", aspect: 0.813, fp: "000133310000003599953100069973379700099720069960699600027990999600006996999600006999099600069999099960069999009999999999000266626990000000027990000000279960033333799700035999953100001333310000" },
    { rank: "A", font: "dejavu22", aspect: 1.063, fp: "000000000000000000000000000046640000000179971000000399993000000397793000003994499300007990099700009970079900049976679940069866668960179600006971397200002793664000000466000000000000000000000000" },
    { rank: "J", font: "dejavu22", aspect: 0.35, fp: "000003996000000003996000000003996000000003996000000003996000000003996000000003996000000003996000000003996000000003996000000003996000000003996000000003996000000015994000000479990000000697330000" },
    { rank: "K", font: "dejavu22", aspect: 0.938, fp: "000000000000333100003331999300049951999300489710999315994000999359970000999799510000999997100000999999510000999799950000999359994000999315998400999300489951999300049995333100003333000000000000" },
    { rank: "Q", font: "dejavu22", aspect: 0.842, fp: "000000000000002379995200048953379862399600006993399400000999799000000999999000000999999000000999599000000999399600000999289710027993027976689951000069999000000000289710000000027972000000000000" },
    { rank: "10", font: "dejavu30", aspect: 1.636, fp: "000000000000000000000000000000000000000000000000366200015620779300198794039300591078039300690069039300690069039300591078679760198794666660015620000000000000000000000000000000000000000000000000" },
    { rank: "2", font: "dejavu30", aspect: 0.682, fp: "135999973100399999999740399999999960260000499993000000059993000000059993000000099982000000499960000005999700000049997100000489932000029998200000289992000000399999999993399999999993399999999993" },
    { rank: "3", font: "dejavu30", aspect: 0.727, fp: "033999995310099999999970099999999990040000289996000000069996000000179990000333599970000999999310000999999950000333379994000000027996200000006996662000048996699999999994499999999860033999953200" },
    { rank: "4", font: "dejavu30", aspect: 0.773, fp: "000002666600000009999900000049999900000398899900002796699900007992699900029930699900289710699900596000699900992000699900999999999999999999999999999999999999000000699900000000699900000000466600" },
    { rank: "5", font: "dejavu30", aspect: 0.773, fp: "266666666640399999999960399999999960399600000000399600000000399866640000399999999920399999999982264000479993000000039997000000039999000000039997660000479993999999999960379999999520000266640000" },
    { rank: "6", font: "dejavu30", aspect: 0.773, fp: "000006662000003599999971049999999993179974000062399930000000399712662000999999999920999999999982999970028999999930006999799930006999399930006999399970028995049999999982005999999920000046640000" },
    { rank: "7", font: "dejavu30", aspect: 0.727, fp: "699999999996699999999996699999999996000000069994000000069990000000399930000000599820000000999600000006999400000028999000000039995000000159972000000399930000000999600000002999400000006999000000" },
    { rank: "8", font: "dejavu30", aspect: 0.773, fp: "000266662000179999999920399999999982399930039993399930039993399930039993047999999740007999999700179976679971799710039997999600006999999600017999999820039999399999999982139999999920000266662000" },
    { rank: "9", font: "dejavu30", aspect: 0.773, fp: "000266600000029999999500289999999940999820079971999600039993999600039993999600039999999820079999399999999999179999999999000266217993000000059993260000499971399999999700179999995100002666200000" },
    { rank: "A", font: "dejavu30", aspect: 1, fp: "000000000000000000000000000399960000000499993000001799994000003995797100005991399300006990199500039930099600099953359930199999999970399766668991797100004993996000003997000000000000000000000000" },
    { rank: "J", font: "dejavu30", aspect: 0.357, fp: "000000999000000000999000000000999000000000999000000000999000000000999000000000999000000000999000000000999000000000999000000000999000000000999000000002999000000339997000000999971000000999300000" },
    { rank: "K", font: "dejavu30", aspect: 0.909, fp: "000000000000666000026662999000179950999002799510999028995000999179950000999799510000999999000000999999200000999689830000999049982000999004999200999000489830999000049982666000004666000000000000" },
    { rank: "Q", font: "dejavu30", aspect: 0.846, fp: "000000000000002689986200059999999710399820068991799400005993997100003997996000003999996000003999997100003997799400006993299843368971047999999610001379997100000000199500000000028950000000000000" },
    { rank: "10", font: "lib22", aspect: 1.4, fp: "000000000000000000000000000000000000013100003310279300049972759300092177039300690069039300690069039300690069039300690069039300092177999990049970333330003310000000000000000000000000000000000000" },
    { rank: "2", font: "lib22", aspect: 0.667, fp: "000099990000039999999930399990099993399930039993133300009993000000009993000000069951000000699510000003996200000039960000001399600000015996000000159990000000399990000000399999999993399999999993" },
    { rank: "3", font: "lib22", aspect: 0.667, fp: "000099990000039999999930399990099993399930039993133300009993000000009951000006669510000009999300000006699510000000069951000000009993133300009993399930039993399990099993039999999930000099990000" },
    { rank: "4", font: "lib22", aspect: 0.733, fp: "000000399600000006999600000069999600000069999600000485599600004893399600006951399600048510399600379300399600997200399600995333599733999999999999666666799866000000399600000000399600000000399600" },
    { rank: "5", font: "lib22", aspect: 0.667, fp: "039999999993039999999993039900000000039900000000039900000000279906666200399969999720399993399972266660069993000000006893000000000693133300003793399930039993399990099993039999999930000099990000" },
    { rank: "6", font: "lib22", aspect: 0.667, fp: "000009990000003999999930039990099930039930039930279900003310399906666200399969999720399993399972399960069993399900006893399900000693279900003793039930039993039990099993003999999930000099990000" },
    { rank: "7", font: "lib22", aspect: 0.667, fp: "399999999993399999999993000000009993000000009951000000069930000000099510000000699300000006993100000009990000000039960000000099900000000099900000000099600000000099000000003999000000003999000000" },
    { rank: "8", font: "lib22", aspect: 0.667, fp: "000099990000039999999930399990009993399930009993399900009993159960009951015996669510003999999300015966669531159900009993399900006893399900003793399900009993399900009993039999999930000099990000" },
    { rank: "9", font: "lib22", aspect: 0.667, fp: "000099990000039999999930399990099930399930039972399900009993399900009993399900009993399960069993279993399993027999966893002666603793013300009993039930039972039990099930039999999300000099990000" },
    { rank: "A", font: "lib22", aspect: 0.933, fp: "000000000000000023320000000069960000000489984000000690996000000690096000003970099300015930079300039930039720039976679930099999999930099300003990396000002893996000000699332000000233000000000000" },
    { rank: "J", font: "lib22", aspect: 0.667, fp: "000009999993000009999993000000099993000000039993000000009993000000009993000000009993000000009993000000009993000000009993132000009993397300039972399930399930399990999930039999999300003999990000" },
    { rank: "K", font: "lib22", aspect: 0.867, fp: "000000000000990000006990990000069900990000699300990015972000990159720000993599300000999999300000999759720000997215972000992001797200990000699700990000069900990000006990990000000699000000000000" },
    { rank: "Q", font: "lib22", aspect: 0.789, fp: "000066660000004699996400159740047951399300003993795100001597993000000399993000000399993000000399597200002799399300003995028973379820004699998400000035992000000003994000000000489972000000046620" },
    { rank: "10", font: "lib30", aspect: 1.429, fp: "000000000000000000000000000000000000003200002310159600038972749600284077209600391069009600690059009600690059009600391069009600284077999996038951333332002300000000000000000000000000000000000000" },
    { rank: "2", font: "lib30", aspect: 0.667, fp: "000379995200002999999720048995359982069820006993046400006993000000006993000000039960000000599840000004999200000069993000000599640000004995000000048951000000179953333331399999999993399999999993" },
    { rank: "3", font: "lib30", aspect: 0.667, fp: "000379995200002999999720048995359982289820006993046400006993000000006993000000039960000069997400000069997400000000039960000000006993266400006993399600006993069995359982027999999720002379995200" },
    { rank: "4", font: "lib30", aspect: 0.714, fp: "000001799930000003999930000007999930000039399930000298299930000696099930003990099930039900099930079500099930099300099930697333399952699999999996699999999996000000099930000000099930000000099930" },
    { rank: "5", font: "lib30", aspect: 0.714, fp: "099999999930099999999930099933333310099900000000099900000000099906664000099999999300099996699950033330039990000000003996000000003996466200003992699700007990099993399970059999999510013399993100" },
    { rank: "6", font: "lib30", aspect: 0.667, fp: "000137995200000599999720004995359982069930004640069820000000069600000000399600999000399779999960399995359982399930006993289600000993069820004993069930006993006995359982002999999720000379995200" },
    { rank: "7", font: "lib30", aspect: 0.667, fp: "399999999993399999999993133333337993000000017960000000039840000000279600000000999000000002997000000006993000000069960000000069840000000289600000000399600000000399600000000399200000000399000000" },
    { rank: "8", font: "lib30", aspect: 0.714, fp: "001399993100015999999510079933399970099900009990099900009990099900009990039900099930002899998200026899998620099900009990699300007992699300003996699300007992099933339990059999999950013399993310" },
    { rank: "9", font: "lib30", aspect: 0.667, fp: "000379973200002999999720048995359960179820006993399600006993399600006993399600006993069930017993069976679993006999993993000266402993000000006993004400006971069953599840027999999200002599973000" },
    { rank: "A", font: "lib30", aspect: 0.952, fp: "000000000000000023310000000069950000000289960000000593793000000993397000004960179000006950069600028930049600039999999930069866668940069200006960399000000982993000000795331000000133000000000000" },
    { rank: "J", font: "lib30", aspect: 0.619, fp: "000009999990000009999990000003339990000000003990000000003990000000003990000000003990000000003990000000003990000000003990001300005990067900009990099900009990079997399970015999999510001399993100" },
    { rank: "K", font: "lib30", aspect: 0.905, fp: "000000000000664000004662996000059940996000499500996005997000996069940000996289500000999999500000999779940000998007993000996003997000996000299700996000028920996000006982664000000666000000000000" },
    { rank: "Q", font: "lib30", aspect: 0.778, fp: "000026660000004999999620059960069990399200002993399000000997795000000399993000000399399000000599399000000995199700002991079973379970000699998400000039952000000003994000000000499990000000046660" },
    { rank: "10", font: "noto22", aspect: 1.533, fp: "000000000000000000000000000000000000000000000000019600049930599600397493639600571083009600660067009600660067009600571083009600397493009600049930000000000000000000000000000000000000000000000000" },
    { rank: "2", font: "noto22", aspect: 0.733, fp: "000699960000069999999600999930399960375310159960021000039960000000039960000000279960000000399720000002598400000027984000000279840000002797400000027972000000069930000000999999999999999999999999" },
    { rank: "3", font: "noto22", aspect: 0.667, fp: "003999999300399999999930039900099993013300039993000000009993000000069951002666693310003999996620002666669951000000009993000000009993000000009993132000039993396000099993399999999930003999990000" },
    { rank: "4", font: "noto22", aspect: 0.733, fp: "000000399600000006999600000006999600000048999600000485599600000693399600004851399600048510399600379300399600999300399600999533599733999999999999666666799866000000399600000000399600000000399600" },
    { rank: "5", font: "noto22", aspect: 0.667, fp: "039999999930039999999930039990000000039990000000039930000000039966660000039999996620039933999972026600669993000000009993000000009993000000009993133300339993399900999993399999999930039999990000" },
    { rank: "6", font: "noto22", aspect: 0.733, fp: "000006999960000699999960006999600000048953200000069510000000689304664000999768998640999995599960999762279973999300027999999300003999999300015986689531159960069993399960006999999600000069996000" },
    { rank: "7", font: "noto22", aspect: 0.733, fp: "999999999999999999999999000000039960000000039960000000039720000000279600000000399600000004797200000006996000000027984000000069960000000279840000000699600000000699600000006993000000006993000000" },
    { rank: "8", font: "noto22", aspect: 0.733, fp: "000699960000069999999600069930399960689510159960379300039960069720279720027976797200006999996000027997797200379762279720999300027973999300003999999510135986999930399960069999999600000699996000" },
    { rank: "9", font: "noto22", aspect: 0.733, fp: "000699960000069999999600999930399960999510159960999300015960999300003986999300027999999766679999689999987986046666643960000000015960000000159960000023599840000069999600069999996000069999600000" },
    { rank: "A", font: "noto22", aspect: 1, fp: "000000000000000000000000000059990000000099990000000497794000000696696000002760069600006960049600006986669820028999999930159966667951399700003993399300003993799300001597000000000000000000000000" },
    { rank: "J", font: "noto22", aspect: 0.3, fp: "000000993000000000993000000000993000000000993000000000993000000000993000000000993000000000993000000000993000000000993000000000993000000000993000000000993000000002993000000268971000000399320000" },
    { rank: "K", font: "noto22", aspect: 0.8, fp: "666000000666999000006993999000069930999000699900999006999300999009993000999669930000999999900000999999960000999339996000999003999000999000399600999000099960999000039990999000003996333000000333" },
    { rank: "Q", font: "noto22", aspect: 0.833, fp: "000033330000002399993200028973379820279920025972399300002799599300000399999300000399999300000399399300001599399500003997159940047993017986689951000066687200000000069710000000029972000000003331" },
    { rank: "10", font: "noto30", aspect: 1.409, fp: "000000000000000000000000000000000000002300003300019900079991498900295295626900590078006900660069006900660069006900390078006900295295006900079991002300003300000000000000000000000000000000000000" },
    { rank: "2", font: "noto30", aspect: 0.682, fp: "003379973100049999999700069993799940006200039960000000039960000000039960000000059960000000499920000003999300000007997100000049972000001799700000007997100000179993333331399999999993399999999993" },
    { rank: "3", font: "noto30", aspect: 0.682, fp: "023799973100069999999700069953799940004000039960000000039960000000059940000233399700000699973100000467999520000001359960000000039982000000039993000000039971399533799940399999999700135999973100" },
    { rank: "4", font: "noto30", aspect: 0.682, fp: "000000299900000002899900000003999900000029999900000069599900000698299900001794099900007990099900029720099900289300099900399766699962399999999993133333799931000000099900000000099900000000099900" },
    { rank: "5", font: "noto30", aspect: 0.636, fp: "039999999600039999999600039973333200059600000000099600000000099733310000099999953000099999999400026000799930000000179930000000069970000000069970000000289930099337999820099999999400037999733000" },
    { rank: "6", font: "noto30", aspect: 0.682, fp: "000023799900000489999900002899933300029974000000069930000000069303333100179329999500399789999940399970027993399510003993399300003993289930003993069970027971009997399940007999999700001339973100" },
    { rank: "7", font: "noto30", aspect: 0.682, fp: "399999999993399999999993133333359993000000039960000000079920000000299900000000699700000000699300000003996000000007972000000009960000000069940000000489900000000699300000001799300000003997100000" },
    { rank: "8", font: "noto30", aspect: 0.682, fp: "001379973100007999999700049997399940069930039960069930039960049992299940007997799700001799997100005998899500049952299940289510059982399300003993399720027993069993399960049999999940003379973300" },
    { rank: "9", font: "noto30", aspect: 0.682, fp: "001379973100007999999700049993799900179720039960399300015982399300003993399510015993179970479993049999987993003799523993000233103971000000039960000000479920003339999300009999986200009997320000" },
    { rank: "A", font: "noto30", aspect: 0.909, fp: "000000000000000026640000000069993000000179795000000399399000000993289200002993069600006971069820017960039930039986679950059999999960069820004993289600000995399200000599666000000266000000000000" },
    { rank: "J", font: "noto30", aspect: 0.321, fp: "000000696000000000696000000000696000000000696000000000696000000000696000000000696000000000696000000000696000000000696000000000696000000000696000000000696000000005994000000469990000000699510000" },
    { rank: "K", font: "noto30", aspect: 0.727, fp: "699000002996699000048992699000289950699000599600699004999200699039972000699159820000699799820000699999951000699737993000699206997000699000799600699000399820699000069990699000048992699000002996" },
    { rank: "Q", font: "noto30", aspect: 0.741, fp: "002379973000028997799620289731159960599400004993999000000995995000000999993000000999995000000999999000000999599400004993289720159960029986799920002379999200000000289700000000059940000000017982" },
    { rank: "10", font: "notoxb22", aspect: 1.533, fp: "000000000000000000000000000000000000000000000000019600049930599600397693959600582095309600660099009600660099009600582095009600397693009600049930000000000000000000000000000000000000000000000000" },
    { rank: "2", font: "notoxb22", aspect: 0.733, fp: "000699960000069999999600999999999960379533359960023100039960000000039960000000279960000004799720000027998400000279984000002799840000027997400000379995333333999999999999999999999999999999999999" },
    { rank: "3", font: "notoxb22", aspect: 0.733, fp: "006999996000999999999960069999999960023333359960000000039960000466679720004899973200006999986400004666799720000000279973000000039999000000039986333333359960999999999960999999999600069999960000" },
    { rank: "4", font: "notoxb22", aspect: 0.733, fp: "000000399600000006999600000006999600000048999600000489999600004895599600006951399600048930399600379720399600999533599733999999999999999999999999666666799866000000399600000000399600000000399600" },
    { rank: "5", font: "notoxb22", aspect: 0.667, fp: "039999999930039999999930039999999930039993333310039990000000039996666200039999999720039999999972026666669993000000009993000000009993000000009993133333339993399999999993399999999930003999990000" },
    { rank: "6", font: "notoxb22", aspect: 0.733, fp: "000006999960000699999960006999999960048953333320069930000000689514664000999768998640999999999960999976679973999720027999999300015999999510039999689953359986069999999960006999999600000069996000" },
    { rank: "7", font: "notoxb22", aspect: 0.733, fp: "999999999999999999999999999999999999333333359973000000279960000000399720000004799600000006997200000006996000000027984000000069960000000279960000000699840000000699600000006999600000006993000000" },
    { rank: "8", font: "notoxb22", aspect: 0.733, fp: "000699996000069999999600069999999960689953359960379930039960069972279960027997799720006999997200027999997320379976679960999720027973999300015999999533359986999999999960069999999960000699996000" },
    { rank: "9", font: "notoxb22", aspect: 0.733, fp: "000699960000069999999600999999999960999953359960999510039986999300039999999720039999999976679999689999987999046897655986000462039960000000159960023333599840069999999600069999996000069999600000" },
    { rank: "A", font: "notoxb22", aspect: 1, fp: "000000000000000000000000000099992000000099996000000497796000000696698400002796069600006984069710028960029930039986669930159999999993399966667993399500003997799300003999000000000000000000000000" },
    { rank: "J", font: "notoxb22", aspect: 0.3, fp: "000000993000000000993000000000993000000000993000000000993000000000993000000000993000000000993000000000993000000000993000000000993000000000993000000002993000000137993000000399971000000395320000" },
    { rank: "K", font: "notoxb22", aspect: 0.8, fp: "666000000666999000006993999000069990999000699930999006999300999009993000999669990000999999990000999999996000999939999000999303999600999000399900999000099960999000039996999000009999333000003333" },
    { rank: "Q", font: "notoxb22", aspect: 0.833, fp: "000033330000002399993310028999999972279933339993399700003999599300003999999300003999999300003999399500003999399900005997159966669993017999999951000066689710000000069930000000029972000000003331" },
    { rank: "10", font: "notoxb30", aspect: 1.409, fp: "000000000000000000000000000000000000002310003300019930079991499930297496776930390099106930690099006930690099006930390099006930297496006930079991002310003300000000000000000000000000000000000000" },
    { rank: "2", font: "notoxb30", aspect: 0.682, fp: "003379973100049999999700069999999940049720079971003100039993000000059960000000099960000000499920000005999700000049997100000489972000005999700000009997100000179999999993399999999993399999999993" },
    { rank: "3", font: "notoxb30", aspect: 0.682, fp: "023799973100069999999740069999999960006200079960000000039960000000299940000233799700000699973100000699999520000233399960000000059982000000039993220000079993399999999940399999999700135999973100" },
    { rank: "4", font: "notoxb30", aspect: 0.727, fp: "000000599600000004999600000006999600000159999600000399999600002997399600006993399600028971399600099600399600499200399600699666799864699999999996699999999996000000399600000000399600000000399600" },
    { rank: "5", font: "notoxb30", aspect: 0.636, fp: "039999999600039999999600039999999600099960000000099960000000099973310000099999953000099999999400066666799930000000179970000000069990000000069990040000289950099999999820099999999400037999733000" },
    { rank: "6", font: "notoxb30", aspect: 0.682, fp: "000023799960000489999960002899999960029994000000069950000000069933797300179959999920399999999960399970039993399930015993399930003993289930015993069970039993009999999960007999999740001339973100" },
    { rank: "7", font: "notoxb30", aspect: 0.682, fp: "399999999993399999999993399999999993000000059960000000099960000000299900000000699700000002899300000005998200000009996000000009972000000069960000000489920000001799700000003999300000003999300000" },
    { rank: "8", font: "notoxb30", aspect: 0.682, fp: "001379973300007999999940049999999960069970079960069930039960049993399940007999999700001799997100005999999500049993399940289950059982399930003993399930027993069999999982049999999940003379997300" },
    { rank: "9", font: "notoxb30", aspect: 0.682, fp: "001379973100007999999700049999999940179970079971399930039993399930039993399950059993179996699993049999987993003799523993000233127993000000059960000000499920009999999700009999986200009999520000" },
    { rank: "A", font: "notoxb30", aspect: 0.955, fp: "000000000000000033330000000099990000000499996000000696697000000996499000000992099400006990079600017960069930039999999950079999999990099933335992399300003993599300002999333100000333000000000000" },
    { rank: "J", font: "notoxb30", aspect: 0.357, fp: "000000999000000000999000000000999000000000999000000000999000000000999000000000999000000000999000000000999000000000999000000000999000000000995000000002993000000337993000000999971000000999300000" },
    { rank: "K", font: "notoxb30", aspect: 0.773, fp: "664000026666996000059982996000499960996001799700996007995100996049993000997379940000999999900000999999960000999959982000998407999300996002899500996000699900996000099971996000059993664000026666" },
    { rank: "Q", font: "notoxb30", aspect: 0.741, fp: "002379973200028999999820289953359982599600006993999000000999999000000999999000000999999000000999999000000999599600006993289953359982029999999920002379999200000000289700000000059951000000017997" }
  ];

  // src/modules/blackjack/blackjackVision.js
  var isWhite = (r, g, b) => Math.min(r, g, b) > 225;
  var isBack = (r, g, b) => b > g && g > r + 15 && b - r > 35 && Math.max(r, g, b) < 115;
  var isRed = (r, g, b) => r > 170 && g < 110 && b < 140;
  var isInk4 = (r, g, b) => Math.max(r, g, b) < 120 || isRed(r, g, b);
  function blobs(mask, W2, H, minArea) {
    const seen = new Uint8Array(W2 * H), stack = new Int32Array(W2 * H), out = [];
    for (let p0 = 0; p0 < W2 * H; p0++) {
      if (!mask[p0] || seen[p0]) continue;
      let sp = 0, n = 0, x0 = W2, x1 = -1, y0 = H, y1 = -1;
      stack[sp++] = p0;
      seen[p0] = 1;
      while (sp) {
        const p = stack[--sp], x = p % W2, y = (p - x) / W2;
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (x > 0 && mask[p - 1] && !seen[p - 1]) {
          seen[p - 1] = 1;
          stack[sp++] = p - 1;
        }
        if (x < W2 - 1 && mask[p + 1] && !seen[p + 1]) {
          seen[p + 1] = 1;
          stack[sp++] = p + 1;
        }
        if (y > 0 && mask[p - W2] && !seen[p - W2]) {
          seen[p - W2] = 1;
          stack[sp++] = p - W2;
        }
        if (y < H - 1 && mask[p + W2] && !seen[p + W2]) {
          seen[p + W2] = 1;
          stack[sp++] = p + W2;
        }
      }
      if (n >= minArea) out.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, n });
    }
    return out;
  }
  var inkGlyph2 = (data, W2, x0, y0, x1, y1, ink = isInk4) => inkGlyph(data, W2, x0, y0, x1, y1, ink);
  var refCache3 = null;
  var builtIn2 = () => refCache3 = refCache3 || RANK_REFS.map((r) => ({ rank: r.rank, aspect: r.aspect, v: decodeShape(r.fp) }));
  function classifyRank(glyph, learned = {}) {
    const refs = builtIn2().concat(Object.entries(learned).flatMap(([rank2, list]) => list.map((fp) => ({ rank: rank2, aspect: glyph.aspect, v: decodeShape(fp) }))));
    const best = {};
    for (const r of refs) {
      const s = shapeScore(glyph.v, r.v) - 0.5 * Math.abs(Math.log(glyph.aspect / r.aspect));
      if (!(r.rank in best) || s > best[r.rank]) best[r.rank] = s;
    }
    const ranked = Object.entries(best).sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return { rank: null, score: 0, margin: 0 };
    const [rank, score] = ranked[0];
    const other = ranked.find(([r]) => rankValue(r) !== rankValue(rank));
    return { rank, score, margin: other ? score - other[1] : 1 };
  }
  function readBlackjack(data, W2, H, learned = {}) {
    const white = new Uint8Array(W2 * H), back = new Uint8Array(W2 * H);
    for (let p = 0, i = 0; p < W2 * H; p++, i += 4) {
      if (isWhite(data[i], data[i + 1], data[i + 2])) white[p] = 1;
      else if (isBack(data[i], data[i + 1], data[i + 2])) back[p] = 1;
    }
    const minArea = W2 * H * 0.012;
    const cardLike = (b) => {
      const r = (b.y1 - b.y0) / (b.x1 - b.x0);
      return r > 1.1 && r < 1.9;
    };
    const up = blobs(white, W2, H, minArea * 0.6).filter((b) => cardLike(b) && b.n > (b.x1 - b.x0) * (b.y1 - b.y0) * 0.6);
    const down = blobs(back, W2, H, minArea * 0.3).filter((b) => cardLike(b));
    if (!up.length && !down.length) return { ok: false, reason: "no cards found" };
    const faceUp = up.map((b) => {
      const w = b.x1 - b.x0, h = b.y1 - b.y0;
      const rx0 = b.x0 + 1, rx1 = b.x0 + Math.round(w * 0.6), ry0 = b.y0 + 1, ry1 = b.y0 + Math.round(h * 0.6);
      let top = -1, bottom = -1, red = 0, dark = 0;
      for (let y = ry0; y < ry1; y++) {
        let n = 0;
        for (let x = rx0; x < rx1; x++) {
          const p = (y * W2 + x) * 4;
          if (isInk4(data[p], data[p + 1], data[p + 2])) {
            n++;
            if (isRed(data[p], data[p + 1], data[p + 2])) red++;
            else dark++;
          }
        }
        if (n && top < 0) top = y;
        if (n) bottom = y;
        if (!n && top >= 0 && y - bottom > Math.max(1, h * 0.02)) break;
      }
      const glyph = top >= 0 ? inkGlyph2(data, W2, rx0, top, rx1, bottom + 1) : null;
      const c = glyph ? classifyRank(glyph, learned) : { rank: null, score: 0, margin: 0 };
      return { box: b, glyph, red: red > dark, ...c };
    });
    const all = faceUp.map((c) => ({ ...c, cy: (c.box.y0 + c.box.y1) / 2 }));
    const rowH = all.length ? Math.max(...all.map((c) => c.box.y1 - c.box.y0)) * 0.5 : 0;
    all.sort((a, b) => Math.abs(a.cy - b.cy) < rowH ? a.box.x0 - b.box.x0 : a.cy - b.cy);
    let row = 0;
    all.forEach((c, i) => {
      if (i && Math.abs(c.cy - all[i - 1].cy) >= rowH) row++;
      c.row = row;
    });
    return { ok: true, faceUp: all, faceDown: down.length, defuser: down.length > 0 };
  }

  // src/core/sectionsData.js
  var sectionsData_exports = {};
  __export(sectionsData_exports, {
    KNOWN_MODULE_NAMES: () => KNOWN_MODULE_NAMES,
    SECTIONS_DATA: () => SECTIONS_DATA,
    SECTIONS_RAW: () => SECTIONS_RAW
  });
  var KNOWN_MODULE_NAMES = {
    // Implemented modules in bomb_boomed:
    "Maze": { id: "maze", isImplemented: true, shared: true },
    "Password": { id: "password", isImplemented: true, shared: true },
    "Switches": { id: "switches", isImplemented: true },
    "Search": { id: "search", isImplemented: true },
    "Knobs": { id: "knob", isImplemented: true },
    "Piano": { id: "piano", isImplemented: true, shared: true },
    "Who's On First": { id: "wof", isImplemented: true, shared: true },
    "Wire Sequences": { id: "wireseq", isImplemented: true, shared: true },
    "Complex Wires": { id: "complexwires", isImplemented: true },
    "Logic": { id: "logic", isImplemented: true },
    "Chess": { id: "chess", isImplemented: true, shared: true },
    "Mines": { id: "mines", isImplemented: true },
    "Symbols": { id: "symbols", isImplemented: true, shared: true },
    "Simon Says": { id: "simons", isImplemented: true, shared: true },
    "Rubik's Cube": { id: "cube", isImplemented: true },
    "Diagram": { id: "diagram", isImplemented: true, shared: true },
    "Morse Code": { id: "morse", isImplemented: true, shared: true },
    "Queens": { id: "queens", isImplemented: true },
    "The Button": { id: "button", isImplemented: true, shared: true },
    "Balance": { id: "balance", isImplemented: true },
    "Circuit": { id: "circuit", isImplemented: true, shared: true },
    "Limbo": { id: "limbo", isImplemented: true },
    "Astrology": { id: "astrology", isImplemented: true, shared: true },
    "Pipes": { id: "pipes", isImplemented: true },
    "Hangman": { id: "hangman", isImplemented: true },
    "Blackjack": { id: "blackjack", isImplemented: true },
    "Batteries": { id: "batteries", isImplemented: true, shared: true },
    "Wire Placement": { id: "wireplace", isImplemented: true, shared: true },
    "Laundry": { id: "laundry", isImplemented: true },
    "Battleship": { id: "battleship", isImplemented: true },
    // Modules not yet implemented or KTANE/GTA variants:
    // "Wires" is standard regular wires (or complex wires as fallback if desired, but as a distinct module it's missing)
    "Wires": { id: "wires", isImplemented: false, shared: true },
    "Memory": { id: "memory", isImplemented: false, shared: true },
    "Pressure": { id: "pressure", isImplemented: false },
    "Breaker": { id: "breaker", isImplemented: false },
    // on the boards, no solver yet
    "Bluescreen": { id: "bluescreen", isImplemented: false },
    "Echo": { id: "echo", isImplemented: false },
    "The Eye": { id: "theeye", isImplemented: false }
  };
  var SECTIONS_RAW = [
    {
      title: "Section 1",
      missions: [
        { id: "1.1", label: "1.1", modules: ["The Button", "Wires", "Switches"] },
        { id: "1.2", label: "1.2", modules: ["Wires", "Memory", "The Button"] },
        { id: "1.3", label: "1.3", modules: ["Maze", "Password", "Wires"] },
        { id: "1.4", label: "1.4", modules: ["Symbols", "Search", "The Button"] }
      ]
    },
    {
      title: "Section 2",
      missions: [
        { id: "2.1", label: "2.1", modules: ["The Button", "Memory", "Password"] },
        { id: "2.2", label: "2.2", modules: ["Logic", "Balance", "Diagram"] },
        { id: "2.3", label: "2.3", modules: ["Password", "Memory", "Switches", "Diagram"] },
        { id: "2.4", label: "2.4", modules: ["Wires", "The Button", "Switches"] },
        { id: "2.5", label: "2.5", modules: ["Wires", "The Button", "Memory", "Logic", "Password", "Switches"] }
      ]
    },
    {
      title: "Section 3",
      missions: [
        { id: "3.1", label: "3.1", modules: ["Wire Sequences", "Wires", "The Button"] },
        { id: "3.2", label: "3.2", modules: ["Wire Sequences", "Memory", "Simon Says", "Search"] },
        { id: "3.3", label: "3.3", modules: ["Simon Says", "The Button", "Wires", "Switches"] },
        { id: "3.4", label: "3.4", modules: ["Wire Sequences", "Search", "Memory", "Circuit", "Symbols"] },
        { id: "3.5", label: "3.5", modules: ["Simon Says", "Simon Says", "Wire Sequences", "Memory"] },
        { id: "3.6", label: "3.6", modules: ["Memory", "Simon Says", "Wire Sequences", "The Button", "Maze", "Switches", "Search", "Balance"] }
      ]
    },
    {
      title: "Section 4",
      missions: [
        { id: "4.1", label: "4.1", modules: ["The Button", "The Button", "Wires", "Wires", "Switches", "Switches"] },
        { id: "4.2", label: "4.2", modules: ["Maze", "Maze", "Memory", "Search"] },
        { id: "4.3", label: "4.3", modules: ["Memory", "Memory", "Memory", "The Button", "Switches", "Diagram", "Maze", "Search", "Wires"] },
        { id: "4.4", label: "4.4", modules: ["Password", "Password", "Memory", "Memory", "The Button", "The Button"] },
        { id: "4.5", label: "4.5", modules: ["Diagram", "Diagram", "Logic", "Logic", "Balance", "Balance"] },
        { id: "4.6", label: "4.6", modules: ["Simon Says", "Simon Says", "Simon Says", "Simon Says", "Simon Says", "Simon Says"] }
      ]
    },
    {
      title: "Section 5",
      missions: [
        { id: "5.1", label: "5.1", modules: ["Pressure", "Wires", "The Button", "Switches", "Memory", "Password"] },
        { id: "5.2", label: "5.2", modules: ["Breaker", "Wires", "The Button", "Switches", "Memory", "Maze"] },
        { id: "5.3", label: "5.3", modules: ["Knobs", "Wires", "The Button", "Switches", "Password", "Search"] },
        { id: "5.4", label: "5.4", modules: ["Pressure", "Breaker", "Knobs", "Memory", "Search", "Maze", "Switches", "The Button", "Wire Sequences"] },
        { id: "5.5", label: "5.5", modules: ["Pressure", "Breaker", "Wire Sequences", "Simon Says", "Logic", "Balance", "Symbols"] },
        { id: "5.6", label: "5.6", modules: ["Pressure", "Memory", "Password", "Wire Sequences"] }
      ]
    },
    {
      title: "Section 6",
      missions: [
        { id: "6.1", label: "6.1", modules: ["Piano", "Piano", "Pressure", "Symbols", "Memory", "Wires"] },
        { id: "6.2", label: "6.2", modules: ["Morse Code", "Morse Code", "Breaker", "Search", "Password", "The Button"] },
        { id: "6.3", label: "6.3", modules: ["Who's On First", "Simon Says", "Memory", "Wire Sequences", "Maze", "Search"] },
        { id: "6.4", label: "6.4", modules: ["Chess", "Chess", "Chess", "Chess", "Chess", "Knobs"] },
        { id: "6.5", label: "6.5", modules: ["Rubik's Cube", "Password", "Piano", "Morse Code", "Wire Sequences", "Logic"] },
        { id: "6.6", label: "6.6", modules: ["Rubik's Cube", "Piano", "Morse Code", "Symbols", "Wire Sequences", "Simon Says"] },
        { id: "6.7", label: "6.7", modules: ["Piano", "Piano", "Morse Code", "Morse Code", "Rubik's Cube", "Symbols", "Logic", "Diagram", "Wire Sequences"] },
        { id: "6.8", label: "6.8", modules: ["Memory", "Memory", "Memory", "Logic", "Logic", "Wire Sequences", "Wire Sequences", "Breaker"] }
      ]
    },
    {
      title: "Section 7",
      missions: [
        { id: "7.1", label: "7.1", modules: ["Maze", "Maze", "Maze", "Maze", "Maze", "Maze", "Maze", "Maze"] },
        { id: "7.2", label: "7.2", modules: ["Wire Sequences", "Wire Sequences", "Wire Sequences", "Wire Sequences", "Wire Sequences", "Wire Sequences"] },
        { id: "7.3", label: "7.3", modules: ["Password", "Password", "Password", "Password", "Password", "Password", "Password", "Password", "Password"] },
        { id: "7.4", label: "7.4", modules: ["Pressure", "Memory", "Wire Sequences", "Password", "Morse Code", "Search", "Diagram", "Maze", "Piano", "Logic", "Circuit", "Knobs", "Symbols", "Simon Says", "Rubik's Cube", "Chess"] }
      ]
    }
  ];
  var SECTIONS_DATA = SECTIONS_RAW.map((sec) => ({
    ...sec,
    missions: sec.missions.map((m) => ({
      ...m,
      modules: m.modules.filter((name) => KNOWN_MODULE_NAMES[name] && KNOWN_MODULE_NAMES[name].isImplemented)
    }))
  }));

  // src/modules/batteries/batteriesSolver.js
  var batteriesSolver_exports = {};
  __export(batteriesSolver_exports, {
    BATTERY_KINDS: () => BATTERY_KINDS,
    BOMB_START: () => BOMB_START,
    SAMPLE_BATTERIES: () => SAMPLE_BATTERIES,
    SAMPLE_TABLE: () => SAMPLE_TABLE,
    cellKey: () => cellKey,
    describeCondition: () => describeCondition,
    describeWindows: () => describeWindows,
    digitsLabel: () => digitsLabel,
    evalCondition: () => evalCondition,
    fmtClock: () => fmtClock,
    fmtVolts: () => fmtVolts,
    kindLabel: () => kindLabel,
    matchModuleName: () => matchModuleName,
    oddVolts: () => oddVolts,
    parseCell: () => parseCell,
    parseCondition: () => parseCondition,
    showsDigits: () => showsDigits,
    solveBatteries: () => solveBatteries,
    splitWords: () => splitWords,
    timerWindows: () => timerWindows
  });
  var BATTERY_KINDS = {
    yellow: { label: "Yellow", volts: 1.5, round: true, size: 1 },
    orange: { label: "Orange", volts: 1.5, round: true, size: 2 },
    red: { label: "Red", volts: 1.5, round: true, size: 3 },
    blue: { label: "Blue", volts: 1.5, round: true, size: 4 },
    green: { label: "Green", volts: 1.5, round: true, size: 2.5 },
    purple: { label: "9V", volts: 9, round: false, size: 3.5 }
  };
  var fmtVolts = (v) => `${Math.round(v * 100) / 100}V`;
  var digitsLabel = (d) => d.length === 1 ? `${d[0]}` : d.slice(0, -1).join(", ") + " and " + d[d.length - 1];
  var ALIASES2 = {
    "who's on first": "Who's On First",
    "whos on first": "Who's On First",
    "wof": "Who's On First",
    "morse": "Morse Code",
    "simon": "Simon Says",
    "button": "The Button",
    "wire sequence": "Wire Sequences",
    "wire seq": "Wire Sequences",
    "rubiks cube": "Rubik's Cube",
    "cube": "Rubik's Cube",
    "knob": "Knobs"
  };
  var NAMES = Object.keys(KNOWN_MODULE_NAMES);
  var squash = (s) => String(s || "").toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ").trim();
  function lev2(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function matchModuleName(text) {
    const t = squash(text);
    if (!t) return { name: "", sure: false };
    const cands = [...NAMES.map((n) => [squash(n), n]), ...Object.entries(ALIASES2)];
    let best = null;
    for (const [k, name] of cands) {
      const kk = k.replace(/'/g, ""), tt = t.replace(/'/g, "");
      const d = lev2(tt, kk) / Math.max(kk.length, tt.length);
      if (!best || d < best.d) best = { d, name };
    }
    return best && best.d <= 0.45 ? { name: best.name, sure: best.d <= 0.25 } : { name: text.trim(), sure: false };
  }
  var NUM2 = "(\\d+(?:[.,]\\d+)?)";
  var WORDS = [
    "batteries",
    "battery",
    "biggest",
    "largest",
    "smallest",
    "tallest",
    "shortest",
    "exactly",
    "without",
    "greater",
    "minimum",
    "maximum",
    "higher",
    "contains",
    "fewer",
    "total",
    "under",
    "below",
    "above",
    "round",
    "least",
    "lower",
    "volts",
    "less",
    "more",
    "most",
    "over",
    "than",
    "only",
    "none",
    "with",
    "volt",
    "has",
    "and",
    "any",
    "or",
    "at",
    "no"
  ].sort((a, b) => b.length - a.length);
  function splitWords(text) {
    const s = String(text || "").toLowerCase().replace(/[’`]/g, "'").replace(/(\d)\s*,\s*(\d)/g, "$1.$2").replace(/\s+/g, "");
    const out = [];
    let i = 0;
    while (i < s.length) {
      const num2 = s.slice(i).match(/^\d+(?:\.\d+)?(?:volts?|v)?/);
      if (num2) {
        out.push(num2[0].replace(/volts?$/, "v"));
        i += num2[0].length;
        continue;
      }
      const w = WORDS.find((x) => s.startsWith(x, i));
      if (w) {
        out.push(w);
        i += w.length;
        continue;
      }
      if (out.length && out[out.length - 1].startsWith("~")) out[out.length - 1] += s[i];
      else out.push("~" + s[i]);
      i++;
    }
    return out.map((w) => w.startsWith("~") ? w.slice(1) : w).join(" ").replace(/\s*:\s*/g, " ").trim();
  }
  function parseCondition(text, icon = null) {
    let t = splitWords(text);
    t = t.replace(/\b[o]v\b/g, "0v").replace(/\bsv\b/g, "5v");
    const op = /\b(under|below|less than|fewer than|lower than)\b/.test(t) ? "<" : /\b(over|above|more than|greater than|higher than)\b/.test(t) ? ">" : /\b(at least|or more|minimum)\b|\+/.test(t) ? ">=" : /\b(at most|or less|or fewer|maximum)\b/.test(t) ? "<=" : "=";
    const round = /\bround\b/.test(t);
    if (/\b(biggest|largest|tallest)\b/.test(t)) return { type: "biggest", color: icon, round };
    if (/\b(smallest|shortest)\b/.test(t)) return { type: "smallest", color: icon, round };
    const volts = t.match(new RegExp(NUM2 + "v\\b"));
    if (volts) return { type: "volts", op, v: Number(volts[1]) };
    const num2 = t.match(new RegExp("\\b" + NUM2 + "\\b"));
    if (/^(no|without|none)\b/.test(t) && icon) return { type: "count", op: "=", n: 0, color: icon };
    if (num2 && (/batter/.test(t) || icon)) return { type: "count", op, n: Number(num2[1]), color: /batter/.test(t) && !icon ? null : icon };
    if (/^(has|with|contains|any)\b/.test(t) && icon) return { type: "count", op: ">=", n: 1, color: icon };
    if (/^no\b/.test(t) && /batter/.test(t)) return { type: "count", op: "=", n: 0, color: null };
    if (icon && /^[a-z0-9]{2,4}$/.test(t)) {
      const near2 = [["has", ">=", 1], ["no", "=", 0]].filter(([w]) => lev2(t, w) <= 1 && t[0] === w[0]);
      if (near2.length === 1) return { type: "count", op: near2[0][1], n: near2[0][2], color: icon };
    }
    return { type: "unknown" };
  }
  var oddVolts = (cond) => Boolean(cond && cond.type === "volts" && Math.abs(cond.v / 1.5 - Math.round(cond.v / 1.5)) > 1e-6);
  var cmp = (a, op, b) => op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b : op === ">=" ? a >= b : Math.abs(a - b) < 1e-9;
  var opWord = { "<": "under", ">": "over", "<=": "at most", ">=": "at least", "=": "exactly" };
  var kindLabel = (c) => c ? BATTERY_KINDS[c] ? BATTERY_KINDS[c].label : c : "?";
  function describeCondition(c) {
    if (!c || c.type === "unknown") return "not understood";
    if (c.type === "volts") return `total ${opWord[c.op]} ${fmtVolts(c.v)}`;
    if (c.type === "count") {
      const what = c.color ? `${kindLabel(c.color)} batter${c.n === 1 ? "y" : "ies"}` : `batter${c.n === 1 ? "y" : "ies"}`;
      if (c.op === ">=" && c.n === 1 && c.color) return `has a ${kindLabel(c.color)} battery`;
      if (c.op === "=" && c.n === 0) return `no ${c.color ? kindLabel(c.color) + " " : ""}batteries`;
      return `${opWord[c.op]} ${c.n} ${what}`;
    }
    return `${c.type} ${c.round ? "round " : ""}battery is ${kindLabel(c.color)}`;
  }
  function evalCondition(c, batteries) {
    if (!c || c.type === "unknown") return null;
    const list = batteries || [];
    if (c.type === "volts") return cmp(list.reduce((a, b) => a + (Number(b.volts) || 0), 0), c.op, c.v);
    if (c.type === "count") return cmp(c.color ? list.filter((b) => b.color === c.color).length : list.length, c.op, c.n);
    if (!c.color) return null;
    const pool2 = c.round ? list.filter((b) => b.round) : list;
    if (!pool2.length) return false;
    const measured = pool2.every((b) => b.size != null);
    const size = (b) => measured ? b.size : (BATTERY_KINDS[b.color] || {}).size || 0;
    const sizes = pool2.map(size);
    const target = c.type === "biggest" ? Math.max(...sizes) : Math.min(...sizes);
    const top = pool2.filter((b, i) => Math.abs(sizes[i] - target) <= Math.abs(target) * 0.04);
    if (top.every((b) => b.color === c.color)) return true;
    if (top.every((b) => b.color !== c.color)) return false;
    return null;
  }
  var colName = (table, i) => table.modules[i] && table.modules[i].trim() || `Column ${i + 1}`;
  function solveBatteries(table, batteries, overrides = {}) {
    const rows = table && table.rows || [];
    const n = table && table.modules.length || 0;
    const info = rows.map((r, i) => {
      const cond = r.cond || parseCondition(r.text, r.icon);
      const auto = evalCondition(cond, batteries);
      const truth = overrides[i] === true || overrides[i] === false ? overrides[i] : auto;
      return { cond, auto, truth };
    });
    const mods = Array.from({ length: n }, (_, i) => ({ i, name: colName(table, i), digits: /* @__PURE__ */ new Set(), any: false, after: /* @__PURE__ */ new Set(), before: /* @__PURE__ */ new Set(), rows: [] }));
    info.forEach((ri, r) => {
      if (ri.truth !== true) return;
      const cells = rows[r].cells || [];
      const ends = {};
      cells.forEach((c, j) => {
        if (!c || j >= n) return;
        mods[j].rows.push(r);
        if (c.kind === "digit" && c.digit != null) mods[j].digits.add(Number(c.digit));
        else if (c.kind === "any") mods[j].any = true;
        else if (c.kind === "first" || c.kind === "then") {
          const k = c.pair || "pair";
          (ends[k] = ends[k] || { first: [], then: [] })[c.kind].push(j);
        }
      });
      for (const { first, then } of Object.values(ends)) {
        for (const a of first) for (const b of then) if (a !== b) {
          mods[a].before.add(b);
          mods[b].after.add(a);
        }
      }
    });
    const inOrder = mods.filter((m) => m.before.size || m.after.size);
    const indeg = new Map(inOrder.map((m) => [m.i, m.after.size]));
    const level = /* @__PURE__ */ new Map();
    const queue = inOrder.filter((m) => !m.after.size).map((m) => m.i);
    queue.forEach((i) => level.set(i, 0));
    const done = [];
    while (queue.length) {
      const i = queue.shift();
      done.push(i);
      for (const j of mods[i].before) {
        level.set(j, Math.max(level.get(j) || 0, level.get(i) + 1));
        indeg.set(j, indeg.get(j) - 1);
        if (indeg.get(j) === 0) queue.push(j);
      }
    }
    const cycle = done.length < inOrder.length ? inOrder.filter((m) => !done.includes(m.i)).map((m) => m.name) : null;
    const comp = /* @__PURE__ */ new Map();
    let nc = 0;
    for (const m of inOrder) {
      if (comp.has(m.i)) continue;
      const st = [m.i];
      comp.set(m.i, nc);
      while (st.length) {
        const k = st.pop();
        for (const j of [...mods[k].before, ...mods[k].after]) if (!comp.has(j)) {
          comp.set(j, nc);
          st.push(j);
        }
      }
      nc++;
    }
    const chains = [];
    for (let c = 0; c < nc; c++) {
      const members = inOrder.filter((m) => comp.get(m.i) === c && level.has(m.i));
      const lv = [];
      for (const m of members) (lv[level.get(m.i)] = lv[level.get(m.i)] || []).push(m.name);
      if (lv.length) chains.push(lv.filter(Boolean));
    }
    const timer = mods.filter((m) => m.digits.size).map((m) => ({ name: m.name, digits: [...m.digits].sort((a, b) => a - b) }));
    const free = mods.filter((m) => !m.digits.size && !m.before.size && !m.after.size).map((m) => m.name);
    const unknownRows = info.map((r, i) => r.truth === null ? i : -1).filter((i) => i >= 0);
    const named = (name) => {
      const t = timer.find((x) => x.name === name);
      return t ? `${name} (${digitsLabel(t.digits)} on timer)` : name;
    };
    const parts = chains.map((lv) => lv.map((l) => l.map(named).join(" + ")).join(" \u2192 "));
    const loose = timer.filter((t) => !inOrder.some((m) => m.name === t.name)).map((t) => named(t.name));
    const copy = [...parts, ...loose, free.length ? `any time: ${free.join(", ")}` : ""].filter(Boolean).join(" \xB7 ");
    return {
      rows: info,
      plan: mods.map((m) => ({ name: m.name, digits: [...m.digits].sort((a, b) => a - b), any: m.any, before: [...m.before].map((j) => mods[j].name), after: [...m.after].map((j) => mods[j].name), rows: m.rows })),
      chains,
      timer,
      free,
      cycle,
      unknownRows,
      copy: rows.length && batteries && batteries.length ? copy : "",
      ready: Boolean(rows.length && batteries && batteries.length)
    };
  }
  function parseCell(t) {
    const s = String(t || "").trim().toLowerCase();
    if (!s || s === "." || s === "-") return null;
    if (s === "any") return { kind: "any", digit: null, pair: null };
    if (/^\d$/.test(s)) return { kind: "digit", digit: Number(s), pair: null };
    const m = s.match(/^(first|then):(\w+)$/);
    return m ? { kind: m[1], digit: null, pair: m[2] } : null;
  }
  var cellKey = (c) => !c ? "" : c.kind === "any" ? "any" : c.kind === "digit" ? String(c.digit ?? "") : `${c.kind}:${c.pair || "blue"}`;
  var SAMPLE_TABLE = {
    modules: ["Who's On First", "Search", "Logic", "Chess", "Rubik's Cube", "Diagram", "Symbols"],
    unsure: [],
    rows: [
      ["Under 9V total", null, "first:blue 4 first:orange then:blue 1 then:orange ."],
      ["Biggest round:", "orange", "4 ANY ANY . . . ."],
      ["Has", "yellow", ". 1 5 . 0 . ANY"],
      ["Under 12V total", null, "then:orange 0 first:blue . first:orange 4 then:blue"],
      ["Exactly 2 batteries", null, ". 2 . . ANY . ."],
      ["Has", "blue", ". first:orange . . then:orange . 3"],
      ["Biggest round:", "blue", ". then:orange . . . ANY first:orange"],
      ["Biggest round:", "red", "0 then:orange then:blue first:blue . first:orange ."],
      ["Under 4.5V total", null, "ANY . 2 . . . ."],
      ["No", "blue", "5 . ANY . . ANY ."]
    ].map(([text, icon, cells]) => ({ text, icon, cells: cells.split(" ").map(parseCell) }))
  };
  var SAMPLE_BATTERIES = [
    { color: "orange", volts: 1.5, round: true, size: 16456 },
    { color: "blue", volts: 1.5, round: true, size: 34584 },
    { color: "purple", volts: 9, round: false, size: 26400 }
  ];
  var BOMB_START = 8 * 60;
  var fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  var showsDigits = (sec, digits) => {
    const face = `${Math.floor(sec / 60)}${String(sec % 60).padStart(2, "0")}`;
    return digits.every((d) => face.includes(String(d)));
  };
  function timerWindows(digits, from = BOMB_START) {
    const out = [];
    let cur = null;
    for (let s = from; s >= 0; s--) {
      if (showsDigits(s, digits)) {
        if (cur && cur.end === s + 1) {
          cur.end = s;
          cur.len++;
        } else {
          cur = { start: s, end: s, len: 1 };
          out.push(cur);
        }
      }
    }
    return out;
  }
  function describeWindows(digits) {
    if (digits.length === 1) {
      const d = digits[0], parts = [];
      if (d <= 7) parts.push(`${d}:59\u2192${d}:00 (a whole minute${d === 7 ? ", right after the start" : ""})`);
      if (d === 8) parts.push("8:00 (only the first second)");
      if (d <= 5) parts.push(`x:${d}9\u2192x:${d}0 every minute (10 s)`);
      parts.push(`x:x${d} every 10 s (1 s \u2014 risky with lag)`);
      return parts.join(" \xB7 ");
    }
    const ws = timerWindows(digits);
    if (!ws.length) return "never on a timer counting down from 8:00 \u2014 check the table";
    const long = ws.filter((w) => w.len >= 5).sort((a, b) => b.len - a.len).slice(0, 4).sort((a, b) => b.start - a.start);
    const short = ws.filter((w) => w.len < 5);
    const txt = long.map((w) => `${fmtClock(w.start)}\u2192${fmtClock(w.end)} (${w.len} s)`);
    if (short.length) txt.push(`${short.length} short moment${short.length === 1 ? "" : "s"} like ${fmtClock(short[0].start)}${short[0].len > 1 ? `\u2192${fmtClock(short[0].end)}` : ""}`);
    return txt.join(" \xB7 ");
  }

  // src/modules/batteries/batteriesVision.js
  var batteriesVision_exports = {};
  __export(batteriesVision_exports, {
    DIGIT_TEMPLATES: () => DIGIT_TEMPLATES,
    classifyPicture: () => classifyPicture,
    hueName: () => hueName,
    matchDigit: () => matchDigit,
    readBatteryLayout: () => readBatteryLayout,
    readTableLayout: () => readTableLayout
  });
  var lum2 = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  function hsv(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = (g - b) / d % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s: mx ? d / mx : 0, v: mx / 255 };
  }
  function hueName(r, g, b) {
    const { h, s } = hsv(r, g, b);
    if (s < 0.2) return "grey";
    if (h < 15 || h >= 340) return "red";
    if (h < 38) return "orange";
    if (h < 70) return "yellow";
    if (h < 170) return "green";
    if (h < 250) return "blue";
    return "purple";
  }
  function view(img) {
    const { data, width: W2, height: H } = img;
    const at2 = (x, y) => (y * W2 + x) * 4;
    const L = new Float32Array(W2 * H);
    for (let i = 0, p = 0; i < W2 * H; i++, p += 4) L[i] = lum2(data[p], data[p + 1], data[p + 2]);
    return { data, W: W2, H, at: at2, L };
  }
  var isBrown = (r, g, b) => r - b > 12 && r >= 30 && r <= 95 && g >= b && g <= r;
  function findHeader(v) {
    const { data, W: W2, H, at: at2 } = v;
    let y0 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      let n = 0;
      for (let x = 0; x < W2; x += 2) {
        const p = at2(x, y);
        if (isBrown(data[p], data[p + 1], data[p + 2])) n++;
      }
      if (n > W2 * 0.25) {
        if (y0 < 0) y0 = y;
        y1 = y;
      } else if (y0 >= 0 && y - y1 > 2) break;
    }
    if (y0 < 0 || y1 - y0 < 12) return null;
    const ym = y0 + y1 >> 1;
    let x0 = -1, x1 = -1;
    for (let x = 0; x < W2; x++) {
      const p = at2(x, ym);
      if (isBrown(data[p], data[p + 1], data[p + 2])) {
        if (x0 < 0) x0 = x;
        x1 = x;
      }
    }
    return { y0, y1, x0, x1 };
  }
  function findLines(v, along, from, to, a0, a1) {
    const { W: W2, L, data } = v;
    const out = [];
    for (let t = from + 3; t < to - 3; t++) {
      let n = 0, tot = 0;
      for (let s = a0; s < a1; s += 2) {
        tot++;
        const q = (along === "y" ? t * W2 + s : s * W2 + t) * 4;
        if (Math.max(data[q], data[q + 1], data[q + 2]) - Math.min(data[q], data[q + 1], data[q + 2]) > 30) continue;
        const c = along === "y" ? L[t * W2 + s] : L[s * W2 + t];
        const m = along === "y" ? L[(t - 3) * W2 + s] : L[s * W2 + t - 3];
        const p = along === "y" ? L[(t + 3) * W2 + s] : L[s * W2 + t + 3];
        if (c > m + 1.2 && c > p + 1.2) n++;
      }
      if (tot && n / tot > 0.6) out.push(t);
    }
    const merged = [];
    for (const t of out) {
      const last = merged[merged.length - 1];
      if (last && t - last.b <= 2) last.b = t;
      else merged.push({ a: t, b: t });
    }
    return merged.map((m) => ({ a: m.a, b: m.b }));
  }
  function components3(mask, W2, H, minN = 1) {
    const seen = new Uint8Array(W2 * H);
    const out = [];
    const stack = [];
    for (let i = 0; i < W2 * H; i++) {
      if (!mask[i] || seen[i]) continue;
      let n = 0, x0 = W2, y0 = H, x1 = -1, y1 = -1;
      stack.push(i);
      seen[i] = 1;
      while (stack.length) {
        const j = stack.pop();
        const x = j % W2, y = j / W2 | 0;
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W2 || yy >= H) continue;
          const k = yy * W2 + xx;
          if (mask[k] && !seen[k]) {
            seen[k] = 1;
            stack.push(k);
          }
        }
      }
      if (n >= minN) out.push({ n, x0, y0, x1, y1 });
    }
    return out;
  }
  var dist4 = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
  function colourCounts(v, x0, y0, x1, y1) {
    const { data, at: at2 } = v;
    const m = /* @__PURE__ */ new Map();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = at2(x, y);
      const k = data[p] << 16 | data[p + 1] << 8 | data[p + 2];
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ c: [k >> 16, k >> 8 & 255, k & 255], n }));
  }
  var GW2 = 8;
  var GH2 = 12;
  var DIGIT_TEMPLATES = {};
  function glyphBits(mask, W2, box) {
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    let s = "";
    for (let gy = 0; gy < GH2; gy++) for (let gx = 0; gx < GW2; gx++) {
      const xa = box.x0 + Math.floor(gx * bw / GW2), xb = box.x0 + Math.max(Math.floor(gx * bw / GW2), Math.ceil((gx + 1) * bw / GW2) - 1);
      const ya = box.y0 + Math.floor(gy * bh / GH2), yb = box.y0 + Math.max(Math.floor(gy * bh / GH2), Math.ceil((gy + 1) * bh / GH2) - 1);
      let n = 0, t = 0;
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
        t++;
        if (mask[y * W2 + x]) n++;
      }
      s += n * 2 >= t ? "#" : ".";
    }
    return { bits: s, aspect: bw / bh };
  }
  function matchDigit(g) {
    let best = null, second = -Infinity;
    for (const [d, list] of Object.entries(DIGIT_TEMPLATES)) {
      let ds = -Infinity;
      for (const t of list) {
        let same = 0;
        for (let i = 0; i < t.bits.length; i++) if (t.bits[i] === g.bits[i]) same++;
        ds = Math.max(ds, same / t.bits.length - Math.min(0.3, Math.abs(Math.log(t.aspect / g.aspect)) * 0.5));
      }
      if (!best || ds > best.score) {
        if (best) second = best.score;
        best = { d: Number(d), score: ds };
      } else if (ds > second) second = ds;
    }
    if (best) best.margin = best.score - second;
    return best;
  }
  function readBadge(v, x0, y0, x1, y1) {
    const { W: W2, data, at: at2, L } = v;
    const area = (x1 - x0 + 1) * (y1 - y0 + 1);
    const cc = colourCounts(v, x0, y0, x1, y1);
    if (!cc.length) return null;
    const bg = cc[0].c;
    const fill = cc.find((e) => e.n > area * 0.08 && dist4(e.c, bg) > 6);
    if (!fill) return null;
    let bx0 = x1, by0 = y1, bx1 = x0, by1 = y0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = at2(x, y);
      if (dist4([data[p], data[p + 1], data[p + 2]], fill.c) <= 6) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
    }
    if (bx1 - bx0 < 12 || by1 - by0 < 8) return null;
    const fl = lum2(...fill.c);
    let top = fl;
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) top = Math.max(top, L[y * W2 + x]);
    if (top - fl < 40) return null;
    const thr = (fl + top) / 2;
    const w = bx1 - bx0 + 1, h = by1 - by0 + 1;
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (L[(by0 + y) * W2 + bx0 + x] > thr) mask[y * w + x] = 1;
    const all = components3(mask, w, h, 2);
    const inner = all.filter((c) => c.x0 > 0 && c.x1 < w - 1);
    const comps = inner.length ? inner : all;
    if (!comps.length) return null;
    let tx0 = w, ty0 = h, tx1 = -1, ty1 = -1;
    for (const c of comps) {
      tx0 = Math.min(tx0, c.x0);
      ty0 = Math.min(ty0, c.y0);
      tx1 = Math.max(tx1, c.x1);
      ty1 = Math.max(ty1, c.y1);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < tx0 || x > tx1 || y < ty0 || y > ty1) mask[y * w + x] = 0;
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) if (mask[y * w + x]) {
      const p = at2(bx0 + x, by0 + y);
      r += data[p];
      g += data[p + 1];
      b += data[p + 2];
      n++;
    }
    if (n < 6) return null;
    const text = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    const box = { x0: bx0, y0: by0, x1: bx1, y1: by1 };
    const tbox = { x0: bx0 + tx0, y0: by0 + ty0, x1: bx0 + tx1, y1: by0 + ty1 };
    const textW = tx1 - tx0 + 1;
    if (comps.length <= 2 && textW < w * 0.5) {
      const glyph = glyphBits(mask, w, { x0: tx0, y0: ty0, x1: tx1, y1: ty1 });
      const m = matchDigit(glyph);
      const sure = m && (m.score > 0.86 || m.score > 0.8 && m.margin > 0.08);
      return { kind: "digit", digit: sure ? m.d : null, score: m ? m.score : 0, glyph, box, tbox, text };
    }
    const th = ty1 - ty0 + 1;
    let topInk = 0, botInk = 0;
    for (let y = ty0; y <= ty1; y++) {
      let ink = false;
      for (let x = tx0; x <= Math.min(tx1, tx0 + 1); x++) if (mask[y * w + x]) ink = true;
      if (!ink) continue;
      if (y - ty0 < th / 2) topInk++;
      else botInk++;
    }
    const half = th / 2;
    const word = topInk > half * 0.6 && botInk > half * 0.6 ? "FIRST" : topInk > botInk ? "THEN" : "ANY";
    if (word === "ANY") return { kind: "any", box, tbox, text };
    return { kind: word === "FIRST" ? "first" : "then", pair: hueName(...text), box, tbox, text };
  }
  function readIcon(v, x0, y0, x1, y1) {
    const { W: W2, data, at: at2 } = v;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = at2(x0 + x, y0 + y);
      const { s, v: val } = hsv(data[p], data[p + 1], data[p + 2]);
      if (s > 0.45 && val > 0.35) mask[y * w + x] = 1;
    }
    const comps = components3(mask, w, h, 6).sort((a, b2) => b2.n - a.n);
    if (!comps.length) return null;
    const c = comps[0];
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (mask[y * w + x]) {
      const p = at2(x0 + x, y0 + y);
      r += data[p];
      g += data[p + 1];
      b += data[p + 2];
      n++;
    }
    const rgb = [r / n, g / n, b / n].map(Math.round);
    const bw = c.x1 - c.x0 + 1;
    return {
      color: hueName(...rgb),
      rgb,
      box: { x0: x0 + c.x0 - 2, y0: Math.max(y0, y0 + c.y0 - Math.round(bw * 0.8)), x1: x0 + c.x1 + 2, y1: Math.min(y1, y0 + c.y1 + Math.round(bw * 2.6)) }
    };
  }
  function readTableLayout(img) {
    const v = view(img);
    const { W: W2, H } = v;
    const hdr = findHeader(v);
    if (!hdr || hdr.x1 - hdr.x0 < W2 * 0.5) return { ok: false, reason: "No table header (brown band) found." };
    const bodyY0 = hdr.y1 + 1;
    const hl = findLines(v, "y", bodyY0, H, hdr.x0 + 4, hdr.x1 - 4);
    if (hl.length < 1) return { ok: false, reason: "No table rows found." };
    const vl = findLines(v, "x", hdr.x0, Math.min(W2, hdr.x1 + 6), bodyY0 + 2, Math.min(H, hl[hl.length - 1].b + 20));
    if (vl.length < 2) return { ok: false, reason: "No table columns found." };
    const gaps = [];
    for (let i = 1; i < hl.length; i++) gaps.push(hl[i].a - hl[i - 1].b - 1);
    const rowH = gaps.length ? gaps.slice().sort((a, b) => a - b)[gaps.length >> 1] : hl[0].a - bodyY0;
    const ys = [{ a: bodyY0, b: bodyY0 - 1 }, ...hl];
    const rowsB = [];
    for (let i = 0; i < ys.length; i++) {
      const y0 = ys[i].b + 1;
      const y1 = i + 1 < ys.length ? ys[i + 1].a - 1 : Math.min(H - 1, y0 + rowH - 1);
      if (y1 - y0 >= rowH * 0.6) rowsB.push({ y0, y1 });
    }
    const xs = [{ a: hdr.x0, b: hdr.x0 - 1 }, ...vl];
    const colsB = [];
    for (let i = 0; i < xs.length; i++) {
      const x0 = xs[i].b + 1;
      const x1 = i + 1 < xs.length ? xs[i + 1].a - 1 : hdr.x1;
      if (x1 - x0 >= 20) colsB.push({ x0, x1 });
    }
    if (colsB.length < 2) return { ok: false, reason: "No module columns found." };
    const cond = colsB[0];
    const columns = colsB.slice(1).map((c) => ({ ...c, header: { x0: c.x0, y0: hdr.y0, x1: c.x1, y1: hdr.y1 } }));
    const rows = rowsB.map((r) => {
      const icon = readIcon(v, cond.x0 + 2, r.y0 + 2, cond.x1 - 2, r.y1 - 2);
      return {
        ...r,
        condBox: { x0: cond.x0, y0: r.y0, x1: cond.x1, y1: r.y1 },
        icon,
        cells: columns.map((c) => readBadge(v, c.x0 + 2, r.y0 + 2, c.x1 - 2, r.y1 - 2))
      };
    });
    return { ok: true, header: hdr, condCol: cond, columns, rows };
  }
  function readBatteryLayout(img) {
    const v = view(img);
    const { W: W2, H, data, at: at2, L } = v;
    const mask = new Uint8Array(W2 * H);
    for (let i = 0, p = 0; i < W2 * H; i++, p += 4) {
      const { s, v: val } = hsv(data[p], data[p + 1], data[p + 2]);
      if (s > 0.4 && val > 0.3) mask[i] = 1;
    }
    const bands = components3(mask, W2, H, Math.max(40, W2 * H / 2500)).filter((c) => c.x1 - c.x0 >= 12 && c.y1 - c.y0 >= 8);
    if (!bands.length) return { ok: false, reason: "No battery labels found." };
    const cc = colourCounts(v, 0, 0, W2 - 1, H - 1);
    const bg = cc[0].c;
    const isBg = (x, y) => {
      const p = at2(x, y);
      return dist4([data[p], data[p + 1], data[p + 2]], bg) <= 12;
    };
    const rowHasInk = (y, xa, xb) => {
      for (let x = xa; x <= xb; x++) if (!isBg(x, y)) return true;
      return false;
    };
    const rowInk = (y, xa, xb) => {
      let n = 0;
      for (let x = xa; x <= xb; x++) if (!isBg(x, y)) n++;
      return n;
    };
    const out = [];
    for (const b of bands.sort((p, q) => p.x0 - q.x0)) {
      let r = 0, g = 0, bl = 0, n = 0;
      for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (mask[y * W2 + x]) {
        const p = at2(x, y);
        r += data[p];
        g += data[p + 1];
        bl += data[p + 2];
        n++;
      }
      const rgb = [r / n, g / n, bl / n].map(Math.round);
      const bw = b.x1 - b.x0 + 1;
      const xa = Math.max(0, b.x0 - Math.round(bw * 0.15)), xb = Math.min(W2 - 1, b.x1 + Math.round(bw * 0.15));
      let top = b.y0, bottom = b.y1;
      while (top > 0 && rowHasInk(top - 1, xa, xb)) top--;
      while (bottom < H - 1 && rowHasInk(bottom + 1, xa, xb)) bottom++;
      let bodyTop = b.y0;
      while (bodyTop > top && rowInk(bodyTop - 1, xa, xb) >= bw * 0.7) bodyTop--;
      let terminals = 0;
      if (bodyTop > top) {
        const tw = xb - xa + 1, th = bodyTop - top;
        const tm = new Uint8Array(tw * th);
        for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) if (L[(top + y) * W2 + xa + x] > 130) tm[y * tw + x] = 1;
        terminals = components3(tm, tw, th, 4).length;
      }
      out.push({
        color: hueName(...rgb),
        rgb,
        round: terminals <= 1,
        terminals,
        x0: b.x0,
        x1: b.x1,
        y0: top,
        y1: bottom,
        size: bw * (bottom - top + 1),
        label: { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }
      });
    }
    return { ok: true, batteries: out };
  }
  function classifyPicture(img) {
    const t = readTableLayout(img);
    if (t.ok && t.rows.length >= 1 && t.columns.length >= 1) return { type: "table", layout: t };
    const b = readBatteryLayout(img);
    if (b.ok && b.batteries.length >= 1 && b.batteries.length <= 12) return { type: "batteries", layout: b };
    return { type: null, reason: t.reason || b.reason };
  }
  var DIGIT_GLYPHS = {
    0: [0.857, "..####../.######./###.####/###..###/###..###/###..###/###..###/###..###/###..###/###.####/.######./..####.."],
    1: [0.467, "....####/..######/########/########/...#####/...#####/...#####/...#####/...#####/...#####/...#####/...#####"],
    2: [0.786, ".#####../#######./###.####/###.####/##..####/##..####/..####../.####.../####..../########/########/########"],
    3: [0.786, ".######./########/###..###/###..###/.#...###/...#####/...#####/##...###/###..###/########/########/.######."],
    4: [0.929, "...###../...###../..####../..####../.#####../.#####../########/########/########/#######./....##../....##.."],
    5: [0.857, ".#######/.######./.#####../.###..../.####.../######../.##.####/.#...###/##...###/###..###/########/.######."]
  };
  for (const [d, [aspect, rows]] of Object.entries(DIGIT_GLYPHS)) DIGIT_TEMPLATES[d] = [{ aspect, bits: rows.replace(/\//g, "") }];
  var MORE_DIGIT_GLYPHS = [
    [0, 0.8, "..####../.#####../###.###./###..###/###..###/###..###/###..###/###..###/###.####/#######./.#####../..####.."],
    [3, 0.714, ".######./########/###.####/###.####/##..####/...#####/...#####/##...###/###..###/########/########/.######."],
    [4, 0.857, "....###./...####./..#####./..#####./..#####./.##.###./########/########/########/.#######/....##../....##.."],
    [5, 0.733, "..######/.######./.#####../.##...../######../#######./.#######/.....###/##...###/########/#######./.#####.."]
  ];
  for (const [d, aspect, rows] of MORE_DIGIT_GLYPHS) DIGIT_TEMPLATES[d].push({ aspect, bits: rows.replace(/\//g, "") });

  // src/modules/batteries/batteriesOCR.js
  var batteriesOCR_exports = {};
  __export(batteriesOCR_exports, {
    inkMask: () => inkMask,
    pictureData: () => pictureData,
    readBatteriesFile: () => readBatteriesFile,
    readBatteriesPicture: () => readBatteriesPicture,
    readTablePicture: () => readTablePicture,
    squareFilter: () => squareFilter
  });
  var LETTERS3 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'";
  function pictureData(img) {
    const W2 = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const c = document.createElement("canvas");
    c.width = W2;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return { canvas: c, data: ctx.getImageData(0, 0, W2, H) };
  }
  function squareFilter(v, w, h, r, pick = Math.max) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let m = v[y * w + x];
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) m = pick(m, v[y * w + k]);
      tmp[y * w + x] = m;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let m = tmp[y * w + x];
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) m = pick(m, tmp[k * w + x]);
      out[y * w + x] = m;
    }
    return out;
  }
  function inkMask(p, w, h, ink, { local = false, blankAt = () => false } = {}) {
    const n = w * h, L = new Float32Array(n), cand = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2];
      L[i] = lum3(r, g, b);
      cand[i] = !blankAt(i % w, Math.floor(i / w)) && ink(r, g, b) ? 1 : 0;
    }
    if (!local) return cand;
    const R = Math.max(2, Math.round(h / 15));
    const textL = L.map((v, i) => cand[i] ? v : 0);
    const hi = squareFilter(textL, w, h, R, Math.max), lo = squareFilter(L, w, h, R, Math.min);
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = cand[i] && L[i] >= (hi[i] + lo[i]) / 2 ? 1 : 0;
    return out;
  }
  function inkCrop(src, box, ink, { scale = 3, blank = [], local = false } = {}) {
    const w = box.x1 - box.x0 + 1, h = box.y1 - box.y0 + 1;
    const sctx = src.canvas.getContext("2d", { willReadFrequently: true });
    const d = sctx.getImageData(box.x0, box.y0, w, h);
    const p = d.data;
    const blankAt = (x, y) => blank.some((b) => b && box.x0 + x >= b.x0 && box.x0 + x <= b.x1 && box.y0 + y >= b.y0 && box.y0 + y <= b.y1);
    const mask = inkMask(p, w, h, ink, { local, blankAt });
    for (let i = 0; i < w * h; i++) {
      const v = mask[i] ? 0 : 255;
      p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = v;
      p[i * 4 + 3] = 255;
    }
    const small = document.createElement("canvas");
    small.width = w;
    small.height = h;
    small.getContext("2d").putImageData(d, 0, 0);
    const PAD = 16;
    const out = document.createElement("canvas");
    out.width = w * scale + PAD * 2;
    out.height = h * scale + PAD * 2;
    const octx = out.getContext("2d");
    octx.fillStyle = "#fff";
    octx.fillRect(0, 0, out.width, out.height);
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(small, PAD, PAD, w * scale, h * scale);
    return out;
  }
  var lum3 = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  var sat = (r, g, b) => {
    const mx = Math.max(r, g, b);
    return mx ? (mx - Math.min(r, g, b)) / mx : 0;
  };
  async function ocr(canvas, params) {
    const w = await ensureOCRWorker();
    await w.setParameters({ user_defined_dpi: "300", ...params });
    const { data } = await w.recognizeWithin(15e3, canvas);
    return (data && data.text ? data.text : "").replace(/\s+/g, " ").trim();
  }
  async function readTablePicture(img, onStatus = () => {
  }) {
    const src = pictureData(img);
    const layout = readTableLayout(src.data);
    if (!layout.ok) return layout;
    onStatus(`Table: ${layout.rows.length} rows \xD7 ${layout.columns.length} modules \u2014 reading the words\u2026`);
    const headInk = (r, g, b) => lum3(r, g, b) > 95;
    const condInk = (r, g, b) => lum3(r, g, b) > 92 && sat(r, g, b) < 0.35;
    const heads = layout.columns.map((c) => ocr(inkCrop(src, c.header, headInk, { scale: 3 }), { tessedit_char_whitelist: LETTERS3, tessedit_pageseg_mode: "6" }).catch(() => ""));
    const conds = layout.rows.map((r) => {
      const blank = r.icon ? [{ ...r.icon.box, x0: r.icon.box.x0 - 3, x1: r.icon.box.x1 + 3 }] : [];
      return ocr(inkCrop(src, r.condBox, condInk, { scale: 3, blank, local: true }), { tessedit_char_whitelist: LETTERS3 + "0123456789.:", tessedit_pageseg_mode: "7" }).catch(() => "");
    });
    const digitJobs = [];
    layout.rows.forEach((r) => r.cells.forEach((c) => {
      if (!c || c.kind !== "digit" || c.digit != null) return;
      const box = { x0: c.tbox.x0 - 2, y0: c.tbox.y0 - 2, x1: c.tbox.x1 + 2, y1: c.tbox.y1 + 2 };
      digitJobs.push(ocr(inkCrop(src, box, (rr, gg, bb) => lum3(rr, gg, bb) > 110, { scale: 5 }), { tessedit_char_whitelist: "0123456789", tessedit_pageseg_mode: "10" }).then((t) => {
        const m = t.match(/\d/);
        c.digit = m ? Number(m[0]) : null;
        c.ocr = true;
      }).catch(() => {
      }));
    }));
    const [headTexts, condTexts] = await Promise.all([Promise.all(heads), Promise.all(conds), Promise.all(digitJobs)]);
    const names = headTexts.map((t) => matchModuleName(t));
    const table = {
      modules: names.map((n) => n.name),
      unsure: names.map((n, i) => n.sure ? -1 : i).filter((i) => i >= 0),
      rows: layout.rows.map((r, i) => ({
        text: condTexts[i],
        icon: r.icon ? r.icon.color : null,
        cells: r.cells.map((c) => c ? { kind: c.kind, digit: c.digit ?? null, pair: c.pair || null } : null)
      }))
    };
    return { ok: true, table, layout };
  }
  async function readBatteriesPicture(img) {
    const src = pictureData(img);
    const layout = readBatteryLayout(src.data);
    if (!layout.ok) return layout;
    const white = (r, g, b) => lum3(r, g, b) > 190 && sat(r, g, b) < 0.25;
    const batteries = await Promise.all(layout.batteries.map(async (b) => {
      const def = b.round ? 1.5 : 9;
      let volts = def, read = "";
      try {
        read = await ocr(inkCrop(src, b.label, white, { scale: 2 }), { tessedit_char_whitelist: "0123456789.V", tessedit_pageseg_mode: "7" });
        const m = read.replace(/,/g, ".").match(/(\d+(?:\.\d+)?)/);
        const v = m ? Number(m[1]) : NaN;
        if (v > 0.5 && v <= 24) volts = v;
        else if (m && /^\d\d$/.test(m[1]) && Number(m[1][0]) + Number(m[1][1]) / 10 <= 24) volts = Number(m[1][0]) + Number(m[1][1]) / 10;
      } catch (e) {
      }
      const kind = BATTERY_KINDS[b.color];
      return { color: b.color, volts, round: b.round, size: b.size, read, kindKnown: Boolean(kind) };
    }));
    return { ok: true, batteries, layout };
  }
  async function readBatteriesFile(img, onStatus) {
    const src = pictureData(img);
    const t = readTableLayout(src.data);
    if (t.ok) {
      const r = await readTablePicture(img, onStatus);
      return r.ok ? { type: "table", ...r } : { type: null, reason: r.reason };
    }
    const b = await readBatteriesPicture(img);
    return b.ok ? { type: "batteries", ...b } : { type: null, reason: "Not the Batteries table or a batteries picture." };
  }

  // src/modules/wireplace/wireplaceSolver.js
  var wireplaceSolver_exports = {};
  __export(wireplaceSolver_exports, {
    CELLS: () => CELLS,
    PICK_COLORS: () => PICK_COLORS,
    SAMPLE_TABLE: () => SAMPLE_TABLE2,
    SAMPLE_WIRES: () => SAMPLE_WIRES,
    cap: () => cap,
    solveWirePlacement: () => solveWirePlacement,
    wireLabel: () => wireLabel
  });
  var CELLS = ["A1", "B1", "C1", "D1", "A2", "B2", "C2", "D2", "A3", "B3", "C3", "D3", "A4", "B4", "C4", "D4"];
  var PICK_COLORS = ["black", "blue", "red", "white", "yellow", "green", "orange", "purple"];
  var cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : "";
  var wireLabel = (w) => `${w.a}-${w.b} ${cap(w.color)}`;
  function solveWirePlacement(table, wires) {
    const out = { ready: false, reason: "", c3: null, column: -1, verdicts: [], cut: [], copy: "" };
    if (!table) {
      out.reason = "Paste this game's Wire Placement table.";
      return out;
    }
    if (!wires || !wires.length) {
      out.reason = "Paste the module picture (or add its wires).";
      return out;
    }
    const c3 = wires.find((w) => w.a === "C3" || w.b === "C3");
    if (!c3) {
      out.reason = "No wire on C3 \u2014 check the board.";
      return out;
    }
    out.c3 = c3;
    const column = table.columns.indexOf(c3.color);
    if (column < 0) {
      out.reason = `The table has no ${cap(c3.color)} column \u2014 check the header colours.`;
      return out;
    }
    out.column = column;
    out.verdicts = wires.map((w) => {
      const rows = [];
      table.rows.forEach((row, r) => {
        const code = row.cells[column];
        if (row.color === w.color && code && (code === w.a || code === w.b)) rows.push(r);
      });
      return { wire: w, cut: rows.length > 0, rows };
    });
    out.cut = out.verdicts.filter((v) => v.cut).map((v) => v.wire);
    out.copy = out.cut.length ? out.cut.map(wireLabel).join(", ") : "NONE";
    out.ready = true;
    return out;
  }
  var SAMPLE_TABLE2 = {
    columns: ["black", "blue", "red", "white", "yellow"],
    rows: [
      ["blue", "B1 B2 D1 C4 B3"],
      ["blue", "C1 B4 C2 A1 D3"],
      ["white", "D2 A2 B1 A2 C2"],
      ["black", "D4 A3 D2 B3 C4"],
      ["red", "A2 C4 C3 A4 D4"],
      ["black", "B2 A4 B4 D1 A2"],
      ["yellow", "C3 A1 A3 D3 A1"],
      ["blue", "C4 C1 B3 C1 C1"],
      ["red", "A4 D1 D3 D2 D1"],
      ["yellow", "A1 C2 A4 D4 B1"]
    ].map(([color, cells]) => ({ color, cells: cells.split(" ") })),
    unsure: []
  };
  var SAMPLE_WIRES = [
    ["yellow", "A1", "A2"],
    ["black", "B1", "B2"],
    ["yellow", "C1", "D1"],
    ["blue", "C2", "D2"],
    ["white", "A3", "B3"],
    ["blue", "C3", "D3"],
    ["yellow", "A4", "B4"],
    ["blue", "C4", "D4"]
  ].map(([color, a, b]) => ({ color, a, b }));

  // src/modules/wireplace/wireplaceVision.js
  var wireplaceVision_exports = {};
  __export(wireplaceVision_exports, {
    GLYPHS: () => GLYPHS,
    GLYPH_H: () => GLYPH_H2,
    GLYPH_W: () => GLYPH_W2,
    WIRE_COLORS: () => WIRE_COLORS,
    buildGlyph: () => buildGlyph,
    cellName: () => cellName,
    classifyWirePicture: () => classifyWirePicture,
    colorName: () => colorName,
    encodeGlyph: () => encodeGlyph2,
    readCellCode: () => readCellCode,
    readWireBoard: () => readWireBoard,
    readWireTable: () => readWireTable
  });

  // src/core/level/levelTitleRefs.js
  var TITLE_REFS = [
    { name: "Logic", aspect: 4.4, fp: "999900000000999900000005999999009999950009999995099900000059999999000009999999900999900099999995099900000099950999500099995999900099900599900995099900000999500299900599500009900099905999000095099900000999000099900999000000000099909990000000099900000999000099900999000000000099909990000000099900009999000099990999000999950099909990000000099900000999000099900799000599920099909990000000099900000999000099900599000099900099900999000000099900000999900599900599900099900099900999000009099900000099950999500099990099900099900599500599099999995029999995000007999999505999920259999952" },
    { name: "Complex Wires", aspect: 11, fp: "000000000000000000000000000000000000000000000002079607905922929975902999672925955097979955995397597638763923927693900976293700927272929682953787652675392955927372900920097300957392929092900925950672092955927355900920079300659372929092900922920072092977927382900973058000659672929682951681920092095999927992900997029000399972929952992395920072092697927970900950059000397972929652900097920072092696927300900920069300295952929372900029650675392675927300900920077600092952929092900609672657672675927300920999075900090952929092995929289219932552926000997999533910080733938067995596" },
    { name: "Chess", aspect: 4.25, fp: "000000000000000000000000000000000000005000000000000999999599995009990099999999000999995000999995059995599507995009990009995559909997997029979995099900059505995009990009990000059900099059950595999900009505995009990009990000059990005059950005999000000005997559990009995555005997500029999500999000000005999999990009999999000999995000999990999000000005995009990009990000000099999000099995999000000005995009990009990000000005999000005999099900009505995009990009990000059500099059000599099950059505995009990009999999959990999059950999005999995005950009970009999999505799995005999992" },
    { name: "Diagram", aspect: 6.6, fp: "999995009990009600009999509999900005950099900099599999009950009600059999505999930005990099900099595099505950059900099959505950960009990059900599595029905950079900797005905950960009992059950599595009905950095950995000005955960059595059990999595009905950095950990000005999960059595059990999595009905950590950990059905999900055099059999999595009905950595790992029925957930097599059599959595059905950999990595009905955960099999559599559595099905950950695595009905950960590059559099559599999505950950395599009905950990590059559099559599997009975900097059999505920297770007957059059" },
    { name: "Pressure", aspect: 6.75, fp: "000000000000000000000050000000000000000000000000999950599990599995069990099955990099599990099996299697097795099555297990797950960076099697069557099099095096099000590090950650960056099099069000099099095096099000590050990350960056099099069000099299097795099550099500799200960056099697069553099995099990099990069950099900960056099990069996099990095990099000039990059950960056099690069000099000095593099000002793002970960056099395069000099000095096099000530596900690990093099099069000095000095096099995590593990950599993099099069999092000092029599995079970599920079970097029779997" },
    { name: "Memory", aspect: 6.4, fp: "999000995099999559950009900059990059999559950599599000995059999909990059900599995009999909950590599500995059500905990059900995599009905955950590599705995059500005995079902970059509905950990950599909995059500005995099905950059909909950599900599909995059999505999099905950009909999950599500595959995059999505599599905950009909999500099500595999595059500005579979905950029909929900099000590995595059500005559959905950059509909950099000590995595059500005509959900990059509905950099000590995595059999905509909900995599009905990099000570590295059999705507905900279992009700797097000" },
    { name: "Wire Sequences", aspect: 9.4, fp: "000000000000000000200000000000000000000000000000772383959928992089299718925819599393581895997397575570907367501185572166572707270196355735721737375790907577300290272072092707270099357505720725287770909857750085076272092707285078657200762680097970909827750059376272092707285076957200762196097970907727300009572072092707270072957200720057075750907557300123572063292707270071956302720319063651907287992197579738760996299270653863797777052552925099992059079707920592299250350790797295000000000000000000000000930000000000000000000000000000000000000000000000380000000000000000000000" },
    { name: "Password", aspect: 7.188, fp: "000000000000000300000000000000000000000000000000999950069000999306996995060695059950599960699990297795099005979529796595075390596992097792397695096096099509605659056095095390690096095095395099096096599509900359003095099690950096095095395059096296559702972029950077599650950079097792395059099993939900999306993069599950950059099960395059099990939900399603996069969950950059095960395059096002999930059600299059939920950097095590395079096003905969305653059039909900690096095095395399093003500969909659099039909900693993095095399996092006500762799307995009505900279970092059699992" },
    { name: "Morse Code", aspect: 8.625, fp: "000000000000000000003000000000000000000000000000993069009960699600699099990006995039903999606999793079079595395922979077560029695296770976923956596099095066390953906066000066035390390950963900596099395069390953903066000096035690393950663900599399390039396950972067530093000660093950663953599999390039399600696069960093000660093950663996569969390039396900399066000093000660093950663900569959392059393920039366000075000670293950763900566939095066390953309366000066009390390953963900566939069093390993909369990039069093660999933999553639039972370595797069990027972069930999703999" },
    { name: "Search", aspect: 5.062, fp: "000005000000000000000000000000000000000000000000059999059999995000995005999995000099999599950099597999009995555005995002997799005999599529950099995009009950000005999000995099509950059509950099995005009950000009999000995099559950009509950099099950009995550009299200997799259900000009975599059995009999990099099500999995059900000009999999009999009990000099099500995995059900000009950099000579909950000299999900995599059900000009950099950059909950000595009990995599509950009509950099995059909999995590005990995099509990059509950099079997009999995990002990990059920599995009700097" },
    { name: "Maze", aspect: 3.867, fp: "999990000099995000059990000099999999995999999999099990000099995000099990000099999999900999999999099999000099995000099990000090000999900999950005099999500599995000599995000000009999000999900000099999900999995000990995000000099990000999950000099999900999995000950999000000099990000999999995099959990999995009950999000000999900000999999995099959999909995009975999500005999700000999920000099909999509995099999999900009999500000999900000099909999509995099900099990059999000000999900000099909999509995099000009990059999000090999999999099500999005995999000007990099999999990999999999" },
    { name: "Piano", aspect: 4.4, fp: "999999950099999000099900099995009999900099999500999999990059990000599900009999000999000999999990099905999009990000599900005999900099009999009995099900999009990000799990005999920099029990000997099900999009990000990990005999990099059900000599099905999009990000900995005995999099059900000599099999990009990009900995005995999999059900000599099955520009990009955997005990599999059900000599099900000009990099999999005990059999059990000999099900000009990099500599905990059999009990000995099900000009990099000099905900009999000999009990097000000079995599000059905900000999000599999750" },
    { name: "Circuit", aspect: 5.867, fp: "005999955999099999000059999559990599959959999999009999950995099999900599999559950099009959999999059909950995059559900999059509950095009905059905599000950995059509952990007509950095009900009900995000000995059559955950000009950095009900009900995000000995059999905950000009950095009900009900995000000995059999005950000009950095009900009900995000000995059579505950000009950095009900009900099000000995059559905950000009950095009900009900099000090995059559950990005509950095009900009900059505990995059509950995009505999995009900009900027999522997059007992279997002599970029970009700" },
    { name: "Knobs", aspect: 4.562, fp: "000000000000000000000000000000000000000000000005999505999599990009999000999950009999995000599995099502970009999005970059957995005995799500997997059509950009999505950099500099505990099909990059059509900009999905950599000099505990099909995005059999000009929995950599000079905995799500799520059999900009909999950599000059905999999000599995059999900009900999950599000059905990599900009999059709950009900599950599000099705990009950002599059505990009900099950099500099505990009959900059059505999009900009950099905999005990099959995099059200599709500007950005999970005999999500599995" },
    { name: "Symbols", aspect: 6.25, fp: "000000000000000000000000000000000000000000000003099995995099599500099059999000059950099500009996797990792075099900599009779700797795079500059797990590595093099900999009509905990099059500099009990050099590099950999009509905950059059500099503799500079950099972999009779705950059059500029950099950059900095995999009999509950059559500009996059990009900095999599009559905950059059500000999002995009900095599599009505955950059059500000279900595009900095599099009505955990099059500095009990995009900095099099009509950995596059500099559299970009500095097079009999700299992059999727996" },
    { name: "Simon Says", aspect: 7.875, fp: "000300000000000000000000000000000000000000000000099909939950396009960596069600399600696990993996597925927950596297595099039200779600990970957796960635905990696393066099539000935600993693909036990305905990696693069099939000930303993696909506297205905993996690039095969000795003595399507950099905905999996690039093999000399306396099003993039935905699696690039090999000099606396059000996005935905699596692059090599000029907999059000077930635905659396393066090099000605909059359036039990935905659396096093090069000939906009356009566279727955509096059972070059000599556007355006995" },
    { name: "Rubik's Cube", aspect: 9, fp: "000000000000000000000093003000000000000000000000999339639699933996939693996000399399369999906999777629309277770965929093977002969669036295935956663909309066390963936096609006903669036093663900663909309066390963963036903006600669036093633900677709309067750963992002960006600069036096923953699309309069960963993000996006600069036099933996669309309066690963996000399006600069036093963900666609309066292963957000069006600059036093663900666909309066093963939006309006900639036093663900663906999066390963909306939003933639996093663999632953995069972973507702796000699206972099933999" },
    { name: "The Button", aspect: 9.2, fp: "999969605909996006996099069699995999906990096069999966605906996006999096039399995999909996099036539336605906603003939366036309635096339399069336009306605906600003909366036009300066066029269636009306905906600003939066036009300066096009369936009306999906993003996066036009300066093009366966009306999906993003999066036009300066093009363996009306705906600003929366036009300066095009363796009306605906600003906666036009300066066009363396009306605906600003906666036009300066066059063396009306605906996003909339996009300066039399063096009206505606996003999227992009200065007993062056" },
    { name: "Wires", aspect: 4.533, fp: "999990059009999099990999999900099999999000999995099950059505995059990599999990059999999009999995009950059505990059950099005990059990005059959995009950099905990059950099002999059900000059920295005990099909990059950099909990059990000059999000005990999909900059950099999990059999995009999500005990999999900059950099999950059999995000999990002999955999900059950099509950059950000000059995000999950999900059950099005990059900000000000999000999900999000059950099005990059900000099000599000099900599000059950099000999059999999059950995000099500599000079995097000599979999999025999992" },
    { name: "Switches", aspect: 6.75, fp: "000000000000000000000000000000000000000000000003099959960553990995999996059995995059059999509996797955960790950790769955799695295059009755939797990650960990950690009900990095095059009600069009990050960996950690009903990055095059009600069503799300775996900690009903950000097579009755229950099900595999900690009903950000099999009999509996059950599599900690009903950000095059009600000999002990299279700690009903950000095059009600000279900690099059500690009900990055095059009600065009990990099059500690009900995095095059009999969559299920065009500992009700279970070057009999727996" },
    // from a 922×922 board screenshot (2026-11-22), same scale as the ones above
    { name: "Laundry", aspect: 6.733, fp: "995000000950599905995990059969999500999955995099595000005950099500935995009539999900999990990056595000005950099500930999009539509950593990595093095000007990099500930999509539502990593595297292095000009690099500930999909539500990593995099950095000009395099500930959959539500990599990059950095000059395099500930955999539500990599950059900095000059697099500930952999539500990595970009900095000099999059500930950599539505990593990009900095000095099559500930950599539509990593995009900099000090059559999930950099539999950593595009900099999590029505999500920029539999700590299209500" },
    { name: "Queens", aspect: 4.3, fp: "000000000000000000000000000000000000000000000005027999700599200992799999529999992999205992299995099207970099000590599002509950020099900590995575999000990099000590599000009900000099950590995005995000992099000590599555009995520097995590599720995000995099000590599555009995520095799990059992995000990099000590599000009900000095099990000999599002990099200770599000009900000095059990500099079759920029999920599999909999990090005990797597005999500005999500599999009999990090000990099990000059700000000000000000000000000000000000000000000002990000000000000000000000000000000000000000" },
    // from a 924×924 board screenshot with MINES next to WIRES (2026-11-22) — without it MINES read as "Wires"
    { name: "Mines", aspect: 4.313, fp: "000000000000000000000000000000000000000000000005999950000599000999995999000599959999999900999995059990000999000599902999920099009999555905995997009999000999000599900999990099009990000009950099009999009999000599900999990099009990000009990005009999209999000599900995999299009999555002999500009099599999000599900990099999009999999000999995009099999999000599900990099999009999000000059999009059999599000599900990029999009990000000005799009009999599000599900990009999009990000009900099009009990599000599900990000999009999999909990599009005990099000799950970000299009999999902599995" },
    // approx: from the 440×440 module pictures (title scaled to the board size), not a board
    // screenshot — they match a real board title less exactly (≈0.75 instead of ≈1.0). Replace each
    // with a board crop when one turns up.
    { name: "Hangman", aspect: 6.467, approx: true, fp: "950055005900595009900009000595000950009005950099990099005900599009900599990599005990059005990099990099009950099505500999990599005990099500995056990099009950099905505920290599507990099700999056990099059990099955509900000599509990599900999556999999055590090995509900000599909990555900909956999999055590090999509900000595959990555950909996990099097795090599509900792595995990977950902996990099099995090099509900590590990990999990900996990095590099090059505900590590990995900990900596990095550059090059505950590590990955500590900096520052520027070007500799970200220555200270700075" },
    { name: "Astrology", aspect: 7.667, approx: true, fp: "006000065069995699000005000950000500000060399359009500999099999699950099930950006993000999399356009503999599999396950599960650009999009999359053059703907505900393790950570650077029239507229372056903930005900393993930090650096009539000009990093900990005900393993930090650093006569000005950093950599005900399953930090650093006569000005950296950069505900397923930090650095007569029300900599990009905900393953930590650096009539009300900550990509505900393990960560650059009039509300900950593969505900393990595960690009599039509300900700073595005700370295069720699703973007999300600" },
    { name: "Pipes", aspect: 3.6, approx: true, fp: "099999000000999900999990000009999999900000099005999999999000999900999999990009999999990099999995099999999900099900999999999000999999990599999995099990059900099500099900999900990000000599000595099990059990099500099900999900990000000599990000099990059900099500099900999000999999900099999900099999999900099500099999999000999999000009999990099995555000099500099955550000995000000000559997099990000000099500099900000000990000000000000999099990000000099500099900000000990000000090000099099990000000099500099900000000999999990599900995099500000000999900099500000000999999990055999552" },
    { name: "Limbo", aspect: 4.286, approx: true, fp: "999500000999909999000009990099999990000099999900099500000999900999900099990099999995000599999990099500000099000999900099990099950999000999009995099500000099000999900099990099950999000990000995099500000099000999950999990099950999009990000999099500000099000999970999990099979992009990000999099500000099000999999999990099999999009990000999099500000099000990999999990099950999009990000999099500000099000990999909990099950099909990000999099500000099000990999909990099950099900990000995099500000099000990099909990099950999000999009995099999990999900900099007990099999997000259999550" },
    { name: "Balance", aspect: 5.8, approx: true, fp: "999900000590059500000055000990059900005500999995999990000995059500000099000995059900599990999995999999000995009500000099500599009900999990099999095099005997009500000599500599509507950075097000095599005599009500000999900599909509900000099000099990009099009500000955900555959509500000099990099990009099509500005955900555999509500000099995095299229599509500005957950550999509500000097000095059559999909500009999950550599509900000095000095099555009909500009900990550099505900005099000095599595005909900009000990550099505990095099999599955070000759999705000270520029500799970099995" },
    { name: "Blackjack", aspect: 5.737, approx: true, fp: "999300960000090000090039039559000600000900593593799970760000595002999939539227000950059995293592590690560000596009605909565009005950395035093950590690560000797029300509570009005990392000095900599950560000909059300009960009009690390000099900597770560002909259300009990009009295690000099920590392560005999529300009577009059997390000095970590395560006506909300509569009055099395005093590597770595506005907755909229709092029279567093295599600599903000500699000005909050005309990050009000000000000000000000000000009000000000000000000000000000000000000000000000075000000000000000000" },
    // from a full 36-module board screenshot (23 Nov): titles with no reference before, and board-made
    // ones for the titles whose first reference came from a single-module picture
    { name: "Breaker", aspect: 6.467, fp: "999990099999009999990009900995099959999909999900599999059999905999990059900595059009999955999990595099009509905990050059900595095009900550950990595099009507955950000079950095592009900000950793595099009959905990000095950099950009900000995990599995009999905999950090990099950009999900999990599999009999505999950590990099990009999900999950595079509759505970000595992099792009900000975950595059509509905950000999995095595009900000950990595059509509905950000950599095099009900000950990595099509505955999990900099095099509999950950593599997009202997999995900079092029929999920920297" },
    { name: "Echo", aspect: 3.867, fp: "999999999500005999999009999000099900000999999000999999999500099999999905999000099900005999999990099950000500999900999905999000099900009999059995099950000009997000029905999000099900099900005997099950000009995000000005999900099900999900000999099999999009995000000005999999999900999000000999099999999009995000000005999999999900999000000999099950000009995000000005999500099900999500000999099950000009995000000005999000099900099900000999099950000009999000009905999000099900099900009995099999999500999900059905999000099900009999059995099999999500057999995005995000099500002999999550" },
    { name: "Battleship", aspect: 8.533, fp: "999900093599993999969900599990599569009039969990599960096599996999996900099990999569039039539996590960096509903039006900096033969539039009509569590960599009900039003900093003925539039009509539590960569009900039003900096003990039039009509539599930939509900039003900099960993039999009509569599960939509900039003900099960599039999009509996590792969709900039003900095000069539039009509752590593999909900039003900093000009939039009509500590593906909900039003900093006506939039009509500590996506939900039003930099993939539039009509000599956202939500037003999599992799236027039707000" },
    { name: "The Eye", aspect: 5.867, fp: "999999959950059509999990000999999599900995999999999999955950059509999990000999999099900950999999905990055950059505990050000595005059900950099005005990005950059505990000000595000009955900099000005990005950059505990000000595000005999500099000005990005999999505999950000599995005999000099995005990005999999505999950000599995000999000099995005990005950059505990000000595000000995000099000005990005950059505990000000595000000995000099000005990005950059505990000000595000000995000099000005990005950059005999990000599999000995000099999005950005920057005999990000599999000992000099999" },
    { name: "Wire Placement", aspect: 12.8, fp: "975297979729970797290009005959977705559959077999755295759929970599590009209977995907559959255999555272725729220559290029229577255907527029555292557572725659000555590029356067205919527009752090277772727929200555590057555007205929527009952090279752729929950559290057555007975979529907972090279952729909950599290052755007975779529907792090196952726909100573090076755007205697527007692090095952725729000550090079955007205597527007292090092922725729000550090070957057205595527007292090072722725559970550090070929077995295529927092090071725823389970530099760627937985283529926062080" },
    { name: "Bluescreen", aspect: 9.2, fp: "999609600993696999609960099939990399939999396099599936600690363999639960599909995099936999399066590936600690360950366960993909399093036603369336590933600690360950065263950539369093006600069536590933600690360950069306930009399093006600069936599903600690360999339606930009995099906999066966599933600690360999309936900009990099906999066996590763600690360950003965930009592093006600063796590663600390360950000693930009395093006600063396590663600390360950090393960339369093006600063396590963900399960999666660990939369099936999360096599923999369720999639950279609229699936999260066" },
    { name: "Who's On First", aspect: 10.75, fp: "000000000000000900200000000000000000000000030000970567760902950709900079059269039979679902995999672735662908692758900587729536029557567835895696373735562929076765500652929735009007356567262090373965562927056565200952959935009007356567530090286962576927056039200920956865009527357853820090096992599957059009700920956795009957359902990090099792562927056007900920956595009007356900792090087691562927056001830931956295009007356730292090076590562929076060730652926095009007356767062090076590562909393065730375626065009007356567592090053290531706980029800289325055006008753393971080" },
    { name: "Astrology", aspect: 7.938, fp: "000000000300000000000000000000000000000000000000009600699399999699900099603950003990003999099069039602979367967396970795970950029777007979557055039905905305900393690950690650099039539506539063069905900305900393693950693650096009539006509590062920972005900396973900393650096009569000007960090930699005900399903900393650396009969039906930090930399305900396903900393650096009569039903930299960039605900393953920593650096009539009503930560695309605900393690950690650099039539509503930530395909605900393690690950690059569009909503930930290799205700392296399720699907995005999203900" },
    { name: "Blackjack", aspect: 6, fp: "999950990000095000999659569659500950009996595696295790790000297005969609539229502990059696095392095392590000799009700709572009505992097007095720095690590000969359500009590009509693595000095900099970590002959359200009990009509395592000099900095593590003959629500009995009539596295000099950095393590006999609500009569009539999095000095690095393590006507907922709559309565059079227095593099972599979000922799309207709572007527993092077000000000000000000000000000009500000000000000000000000000000000000000000000029200000000000000000000000000000000000000000000096000000000000000000" },
    { name: "Hangman", aspect: 7.2, fp: "995059505950599309960099990699005990099009960599595059505990099605930599990399005990099305990096595059505990099605900996990399505990099300995056595059509993099925907970095399709990599600997056599059509593095995909950000399939990559600999556599999539096095695909900000399939990955900969956599999539096095699909900995395969990955900969996597059559597095299909920797395995992977920937996595059569999095099905950595390990993999950930996595059565059095059905950595390990993900950930996595059590059595009905990595390990996500990900596592059070007592007900599990370560796200590900096" },
    { name: "Limbo", aspect: 4.667, fp: "999900000999959999000009990099999950000009999000099900000999900999900099990059999999000599999900099900000099900999900099990059900999000999059990099900000099900999920599990059900999009992005995099900000099900999950599990059900999009990000995099900000099900999990999990059999990009990000995099900000099900995990999990059999999059990000999099900000099900992999909990059900599909990000995099900000099900990999909990059900099909990000995099900000099900990999509990059900099909995009995099900000099900990099509990059900999900999059990099999992999920990099207990059999995000299999700" },
    { name: "Pipes", aspect: 3.688, fp: "000000000000000000000000000000000000000000000005999999995000999995999999995009999999999009999995059995599950099990599955999500999955559099979997009990009990099990099900099900999000000599900099009990009990099990099900099900999000000599950005009990059990099990099900599900999955550059995500009999999900099990099999999000999999990009999995009999999000099990099999995000999900000000099999009990000000099990099900000000999000000000025999009990000000099990099900000000999000000599000099009950000000099990099900000000999999999599950999009920000000599992099200000000999999999055999995" },
    { name: "Balance", aspect: 6.4, fp: "999990000990059900000099005995059950099995999999599995000995059900000099500999009900999995599999595599005995009900000599500999009505995595599005595099005997009900000599700999709507950075595000595599009599009900000959900959959509900000599000599995009599009900000959900955959509900000599995599995009059509900000905950955999509900000599995595279259579509900005957950950799509900000597000595059559999909900005999990950599509900000595000595059595009909900009500990950099505950055595000595099595009909900009500990950059505990095599999599997292002959999959200295920029500599970599999" }
  ];

  // src/core/level/levelVision.js
  var FP_W = 48;
  var FP_H = 12;
  function isTitleInk(r, g, b) {
    return r > 190 && g > 140 && g < 225 && b > 80 && b < 170 && r - b > 70 && r - g > 25;
  }
  function letterBoxes(mask, W2, H) {
    const seen = new Uint8Array(W2 * H), stack = new Int32Array(W2 * H), boxes = [];
    for (let p0 = 0; p0 < W2 * H; p0++) {
      if (!mask[p0] || seen[p0]) continue;
      let sp = 0, n = 0;
      stack[sp++] = p0;
      seen[p0] = 1;
      let x0 = W2, x1 = -1, y0 = H, y1 = -1;
      while (sp) {
        const p = stack[--sp], x = p % W2, y = (p - x) / W2;
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W2 || ny >= H) continue;
          const q = ny * W2 + nx;
          if (mask[q] && !seen[q]) {
            seen[q] = 1;
            stack[sp++] = q;
          }
        }
      }
      if (n >= 6) boxes.push({ x0, x1, y0, y1, n });
    }
    return boxes;
  }
  function mergeLines(boxes) {
    const items = boxes.map((b) => ({ ...b }));
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i], b = items[j];
          const h = Math.max(a.y1 - a.y0, b.y1 - b.y0) + 1;
          const vOverlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
          const gap = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1);
          if (vOverlap > h * 0.35 && gap < h * 0.9) {
            a.x0 = Math.min(a.x0, b.x0);
            a.x1 = Math.max(a.x1, b.x1);
            a.y0 = Math.min(a.y0, b.y0);
            a.y1 = Math.max(a.y1, b.y1);
            a.n += b.n;
            items.splice(j, 1);
            changed = true;
            j--;
          }
        }
      }
    }
    return items;
  }
  var decodeFp = (s) => Float32Array.from(s, (d) => Number(d) / 9);
  function soften(v) {
    const o = new Float32Array(v.length);
    for (let y = 0; y < FP_H; y++) for (let x = 0; x < FP_W; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy < 0 || xx < 0 || yy >= FP_H || xx >= FP_W) continue;
        const w = dx === 0 && dy === 0 ? 4 : 1;
        s += v[yy * FP_W + xx] * w;
        n += w;
      }
      o[y * FP_W + x] = s / n;
    }
    return o;
  }
  var prepareRefs = (list) => list.map((r) => ({ name: r.name, aspect: r.aspect, v: soften(decodeFp(r.fp)) }));
  var REFS = prepareRefs(TITLE_REFS);

  // src/utils/moduleCard.js
  function findModuleTitle(img) {
    const { data, width: W2, height: H } = img;
    const mask = new Uint8Array(W2 * H);
    for (let i = 0, p = 0; p < W2 * H; p++, i += 4) if (isTitleInk(data[i], data[i + 1], data[i + 2])) mask[p] = 1;
    const lines = mergeLines(letterBoxes(mask, W2, H)).filter((l) => l.x1 - l.x0 > (l.y1 - l.y0) * 2.2 && l.y1 - l.y0 >= 6);
    if (!lines.length) return null;
    return lines.sort((a, b) => b.y1 - b.y0 - (a.y1 - a.y0) || b.x1 - b.x0 - (a.x1 - a.x0))[0];
  }
  function cropImage(img, x0, y0, x1, y1) {
    const { data, width: W2, height: H } = img;
    x0 = Math.max(0, Math.round(x0));
    y0 = Math.max(0, Math.round(y0));
    x1 = Math.min(W2, Math.round(x1));
    y1 = Math.min(H, Math.round(y1));
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
    const out = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) out.set(data.subarray(((y0 + y) * W2 + x0) * 4, ((y0 + y) * W2 + x0 + w) * 4), y * w * 4);
    return { data: out, width: w, height: h, offset: { x: x0, y: y0 } };
  }
  function cropAroundTitle(img, title, { widthPerTitle, heightPerWidth = 1, topPerTitle = 1.4, margin = 0.03 }) {
    const tw = title.x1 - title.x0 + 1, th = title.y1 - title.y0 + 1;
    const cw = tw * widthPerTitle, cx = (title.x0 + title.x1) / 2;
    const top = title.y0 - th * topPerTitle;
    return cropImage(img, cx - cw / 2 - cw * margin, top - cw * margin, cx + cw / 2 + cw * margin, top + cw * heightPerWidth + cw * margin);
  }

  // src/modules/wireplace/wireplaceVision.js
  var lum4 = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  function hsv2(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = (g - b) / d % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s: mx ? d / mx : 0, v: mx };
  }
  var WIRE_COLORS = ["black", "blue", "red", "white", "yellow", "green", "orange", "purple"];
  function colorName(r, g, b, darkMax = 40) {
    const { h, s, v } = hsv2(r, g, b);
    if (v < 120 && s < 0.35) return v <= darkMax - 8 ? "black" : null;
    if (s < 0.18) return Math.min(r, g, b) > 200 ? "white" : null;
    if (s < 0.35 || v < 90) return null;
    if (h < 15 || h >= 340) return "red";
    if (h < 38) return "orange";
    if (h < 70) return "yellow";
    if (h < 170) return "green";
    if (h < 260) return "blue";
    return "purple";
  }
  var COLS2 = "ABCD";
  var cellName = (c, r) => `${COLS2[c]}${r + 1}`;
  function px(img, x, y) {
    const p = (y * img.width + x) * 4;
    return [img.data[p], img.data[p + 1], img.data[p + 2]];
  }
  function runs3(n, f, gap = 0) {
    const out = [];
    let s = -1, last = -1;
    for (let i = 0; i < n; i++) {
      if (f(i)) {
        if (s < 0) s = i;
        else if (i - last - 1 > gap) {
          out.push([s, last]);
          s = i;
        }
        last = i;
      }
    }
    if (s >= 0) out.push([s, last]);
    return out;
  }
  function topColors(img, x0, y0, x1, y1, step = 1, k = 3) {
    const counts = /* @__PURE__ */ new Map();
    for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) {
      const [r, g, b] = px(img, x, y);
      const key = r >> 2 << 16 | g >> 2 << 8 | b >> 2;
      const e = counts.get(key);
      if (e) e[3]++;
      else counts.set(key, [r, g, b, 1]);
    }
    return Array.from(counts.values()).sort((a, b) => b[3] - a[3]).slice(0, k);
  }
  var modeColor = (img, x0, y0, x1, y1, step = 1) => {
    const t = topColors(img, x0, y0, x1, y1, step, 1)[0];
    return t ? t.slice(0, 3) : null;
  };
  var near = (a, b, tol) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= tol;
  function readWireBoard(img) {
    const direct = readBoardIn(img);
    if (direct.ok) return direct;
    const title = findModuleTitle(img);
    if (!title) return direct;
    const card = cropAroundTitle(img, title, { widthPerTitle: 1.45, heightPerWidth: 1.01, topPerTitle: 1.35 });
    if (card.width >= img.width * 0.9 && card.height >= img.height * 0.9) return direct;
    const inCard = readBoardIn(card);
    return inCard.ok ? { ...inCard, card: { x: card.offset.x, y: card.offset.y, w: card.width, h: card.height } } : direct;
  }
  function readBoardIn(img) {
    const { width: W2, height: H } = img;
    const greys = topColors(img, Math.floor(W2 * 0.2), Math.floor(H * 0.3), Math.floor(W2 * 0.8), Math.floor(H * 0.9), 2, 6).filter(([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b) < 25 && Math.max(r, g, b) < 110).slice(0, 2);
    if (greys.length < 2) return { ok: false, reason: "No dark panel with tiles." };
    const panel = Math.max(...greys[0].slice(0, 3)) < Math.max(...greys[1].slice(0, 3)) ? greys[0].slice(0, 3) : greys[1].slice(0, 3);
    const pMax = Math.max(...panel);
    const isTile2 = (x, y) => {
      const [r, g, b] = px(img, x, y);
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      return mx - mn < 25 && mx >= pMax + 10 && mx <= pMax + 70;
    };
    const panelRows = runs3(H, (y) => {
      let n = 0;
      for (let x = 0; x < W2; x += 2) if (near(px(img, x, y), panel, 12)) n++;
      return n > W2 * 0.25;
    }, 3);
    const panelCols = runs3(W2, (x) => {
      let n = 0;
      for (let y = 0; y < H; y += 2) if (near(px(img, x, y), panel, 12)) n++;
      return n > H * 0.25;
    }, 3);
    if (!panelRows.length || !panelCols.length) return { ok: false, reason: "No dark panel." };
    const py0 = panelRows[0][0], py1 = panelRows[panelRows.length - 1][1];
    const px0 = panelCols[0][0], px1 = panelCols[panelCols.length - 1][1];
    const pw = px1 - px0 + 1, ph = py1 - py0 + 1;
    const rowP = new Float64Array(ph), colP = new Float64Array(pw);
    for (let y = py0; y <= py1; y++) for (let x = px0; x <= px1; x++) if (isTile2(x, y)) {
      rowP[y - py0]++;
      colP[x - px0]++;
    }
    const fitFour = (prof) => {
      const n = prof.length;
      const sum = new Float64Array(n + 1);
      for (let i = 0; i < n; i++) sum[i + 1] = sum[i] + prof[i];
      const band = (a, b) => b <= a ? 0 : (sum[Math.min(n, b)] - sum[Math.max(0, a)]) / (Math.min(n, b) - Math.max(0, a));
      let best = null;
      for (let s = Math.max(8, Math.floor(n * 0.08)); s <= Math.floor(n * 0.24); s++) {
        for (let g = Math.max(2, Math.floor(s * 0.08)); g <= Math.ceil(s * 0.5); g++) {
          const span = 4 * s + 3 * g;
          for (let o = g; o + span + g <= n; o++) {
            let tile = 0, gap = 0;
            for (let k = 0; k < 4; k++) tile += band(o + k * (s + g), o + k * (s + g) + s);
            for (let k = 0; k <= 4; k++) gap += band(o + k * (s + g) - g, o + k * (s + g));
            const score = tile / 4 - gap / 5;
            if (!best || score > best.score) best = { score, s, g, o, tile: tile / 4, gap: gap / 5 };
          }
        }
      }
      return best;
    };
    const fr = fitFour(rowP), fc = fitFour(colP);
    if (!fr || !fc || fr.tile < fr.gap * 3 + 4 || fc.tile < fc.gap * 3 + 4 || Math.abs(fr.s - fc.s) > Math.max(fr.s, fc.s) * 0.25) {
      return { ok: false, reason: "No 4\xD74 tile grid." };
    }
    const xs = [0, 1, 2, 3].map((k) => px0 + fc.o + k * (fc.s + fc.g) + (fc.s - 1) / 2);
    const ys = [0, 1, 2, 3].map((k) => py0 + fr.o + k * (fr.s + fr.g) + (fr.s - 1) / 2);
    const size = (fc.s + fc.g + (fr.s + fr.g)) / 2;
    const darkMax = pMax;
    const probe = (c0, r0, c1, r1) => {
      const x0 = xs[c0], y0 = ys[r0], x1 = xs[c1], y1 = ys[r1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
      const reach = Math.round(size * 0.22);
      const votes = {};
      const STEPS = 15;
      for (let s = 0; s < STEPS; s++) {
        const t = 0.25 + 0.5 * s / (STEPS - 1);
        const cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t;
        const here = {};
        for (let k = -reach; k <= reach; k++) {
          const x = Math.round(cx + nx * k), y = Math.round(cy + ny * k);
          if (x < 0 || y < 0 || x >= W2 || y >= H) continue;
          const name = colorName(...px(img, x, y), darkMax);
          if (name) here[name] = (here[name] || 0) + 1;
        }
        const top = Object.entries(here).sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] >= 2) votes[top[0]] = (votes[top[0]] || 0) + 1;
      }
      const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
      return best ? { color: best[0], score: best[1] / STEPS } : null;
    };
    const found = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      for (const [dc, dr, diag] of [[1, 0, false], [0, 1, false], [1, 1, true], [-1, 1, true]]) {
        const c1 = c + dc, r1 = r + dr;
        if (c1 < 0 || c1 > 3 || r1 > 3) continue;
        const hit = probe(c, r, c1, r1);
        if (hit && hit.score >= 0.8) found.push({ color: hit.color, a: cellName(c, r), b: cellName(c1, r1), score: hit.score, diag });
      }
    }
    found.sort((p, q) => p.diag - q.diag || q.score - p.score);
    const used = /* @__PURE__ */ new Set(), wires = [];
    for (const w of found) {
      if (used.has(w.a) || used.has(w.b)) continue;
      used.add(w.a);
      used.add(w.b);
      wires.push({ color: w.color, a: w.a, b: w.b, score: w.score });
    }
    const order = (n) => (Number(n[1]) - 1) * 4 + COLS2.indexOf(n[0]);
    wires.sort((p, q) => order(p.a) - order(q.a));
    if (!wires.length) return { ok: false, reason: "No wires found on the board." };
    return { ok: true, wires, tiles: { xs, ys, size } };
  }
  var GLYPH_W2 = 8;
  var GLYPH_H2 = 12;
  var GLYPHS = {
    "1": { aspect: 0.318, g: "0147adc979ceffeeffffffff68dfffff06dfffff06dfffff06dfffff06dfffff06dfffff06dfffec06dffea604ad8730" },
    "2": { aspect: 0.671, g: "04cfe9306dffffa2cfe9cfe7ffa16ffcee608ffb6613efe7018efe5019efa5107efc1013fffffffdfffffffbfffffff9" },
    "3": { aspect: 0.685, g: "16dffb307effffb3dfd8dff9ef706ef956aacfd503dfffb20168cffb9a506efdff905dfedffcfff98dffffa325cfc820" },
    "4": { aspect: 0.743, g: "0006fd20002cff30007fff3002efff3017edff304dc8ff30bfcbffa6effffffeffffffff777afe850007fc100007d600" },
    A: { aspect: 0.771, g: "003ef500007ff91100bffb2201dfff3004edef6108f8cf910cf9efe42efffff66ffffffcbf501cfdee3008fefa1002ae" },
    B: { aspect: 0.765, g: "fffffc50afffffd58ffaaffd8ff66ffa8ffccfd58fffffc38ffa9efd8ff61cfe8ff60bff8ffa9efd8fffffd74dfffc50" },
    C: { aspect: 0.815, g: "006cfca918effffb4fff9effcff500afdfd10035ff900000ff900000dfd10000aff300383efc8afe07ffffe8018cfc70" },
    D: { aspect: 0.85, g: "effffa40bfffffc38fe9bff98fd31afe8fd306ff8fd305ff8fd306ff8fd308ff8fd32cfe8ffffff88fffffb26fffe920" }
  };
  function buildGlyph(mask, w, box) {
    const out = new Float32Array(GLYPH_W2 * GLYPH_H2);
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    for (let gy = 0; gy < GLYPH_H2; gy++) for (let gx = 0; gx < GLYPH_W2; gx++) {
      const sx0 = box.x0 + gx * bw / GLYPH_W2, sx1 = box.x0 + (gx + 1) * bw / GLYPH_W2;
      const sy0 = box.y0 + gy * bh / GLYPH_H2, sy1 = box.y0 + (gy + 1) * bh / GLYPH_H2;
      let ink = 0, n = 0;
      for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
        n++;
        if (mask[y * w + x]) ink++;
      }
      out[gy * GLYPH_W2 + gx] = n ? ink / n : 0;
    }
    return out;
  }
  var decodeGlyph2 = (s) => Float32Array.from(s, (ch) => parseInt(ch, 16) / 15);
  var encodeGlyph2 = (g) => Array.from(g, (v) => Math.round(v * 15).toString(16)).join("");
  function matchGlyph2(g, aspect, chars) {
    const all = [];
    for (const ch of chars) {
      const t = GLYPHS[ch];
      if (!t) continue;
      const tg = decodeGlyph2(t.g);
      let d = 0;
      for (let i = 0; i < tg.length; i++) d += (tg[i] - g[i]) ** 2;
      all.push({ ch, score: 1 - Math.sqrt(d / tg.length) - Math.abs(Math.log(aspect / t.aspect)) * 0.3 });
    }
    all.sort((a, b) => b.score - a.score);
    return all.length ? { ...all[0], margin: all.length > 1 ? all[0].score - all[1].score : 1 } : null;
  }
  function blobs2(mask, w, h) {
    const seen = new Uint8Array(w * h), out = [];
    for (let i = 0; i < w * h; i++) {
      if (!mask[i] || seen[i]) continue;
      const st = [i];
      seen[i] = 1;
      const b = { x0: w, y0: h, x1: -1, y1: -1, n: 0 };
      while (st.length) {
        const j = st.pop(), x = j % w, y = (j - x) / w;
        b.n++;
        if (x < b.x0) b.x0 = x;
        if (x > b.x1) b.x1 = x;
        if (y < b.y0) b.y0 = y;
        if (y > b.y1) b.y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const k = yy * w + xx;
          if (mask[k] && !seen[k]) {
            seen[k] = 1;
            st.push(k);
          }
        }
      }
      out.push(b);
    }
    return out;
  }
  function readCellCode(img, box) {
    const w = box.x1 - box.x0 + 1, h = box.y1 - box.y0 + 1;
    const fill = modeColor(img, box.x0, box.y0, box.x1, box.y1);
    const fl = lum4(...fill);
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = px(img, box.x0 + x, box.y0 + y);
      if (!near(c, fill, 90)) mask[y * w + x] = lum4(...c) > fl + 50 ? 1 : 0;
    }
    let bs = blobs2(mask, w, h);
    if (!bs.length) return { code: null, empty: true };
    const big = Math.max(...bs.map((b) => b.n));
    bs = bs.filter((b) => b.n >= big * 0.12 && b.x0 > 0 && b.x1 < w - 1 && b.y0 > 0 && b.y1 < h - 1);
    if (!bs.length) return { code: null, empty: true };
    const keep = new Uint8Array(w * h);
    bs.forEach((b) => {
      for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (mask[y * w + x]) keep[y * w + x] = 1;
    });
    const X0 = Math.min(...bs.map((b) => b.x0)), X1 = Math.max(...bs.map((b) => b.x1));
    const colInk = (x) => {
      let n = 0;
      for (let y = 0; y < h; y++) n += keep[y * w + x];
      return n;
    };
    let split = -1, least = Infinity;
    for (let x = Math.round(X0 + (X1 - X0) * 0.35); x <= Math.round(X0 + (X1 - X0) * 0.75); x++) {
      const n = colInk(x);
      if (n < least) {
        least = n;
        split = x;
      }
    }
    const part = (xa, xb) => {
      const b = { x0: w, y0: h, x1: -1, y1: -1 };
      for (let y = 0; y < h; y++) for (let x = xa; x <= xb; x++) if (keep[y * w + x]) {
        if (x < b.x0) b.x0 = x;
        if (x > b.x1) b.x1 = x;
        if (y < b.y0) b.y0 = y;
        if (y > b.y1) b.y1 = y;
      }
      return b.x1 < 0 ? null : b;
    };
    const letter = part(X0, split - 1), digit = part(split + 1, X1);
    if (!letter || !digit) return { code: null, empty: false };
    const only = (b) => {
      const m = new Uint8Array(w * h);
      for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) m[y * w + x] = keep[y * w + x];
      return m;
    };
    const glyphs = [letter, digit].map((b) => ({ g: buildGlyph(only(b), w, b), aspect: (b.x1 - b.x0 + 1) / (b.y1 - b.y0 + 1) }));
    const L = matchGlyph2(glyphs[0].g, glyphs[0].aspect, "ABCD");
    const D = matchGlyph2(glyphs[1].g, glyphs[1].aspect, "1234");
    if (!L || !D) return { code: null, empty: false, glyphs };
    return { code: L.ch + D.ch, sure: Math.min(L.margin, D.margin) > 0.1 && Math.min(L.score, D.score) > 0.55, score: Math.min(L.score, D.score), margin: Math.min(L.margin, D.margin), glyphs };
  }
  function readWireTable(img) {
    const { width: W2, height: H } = img;
    const edge = /* @__PURE__ */ new Map();
    let bg = null, bgN = 0;
    const add2 = (x, y) => {
      const c = px(img, x, y);
      const k = c.join(",");
      const n = (edge.get(k) || 0) + 1;
      edge.set(k, n);
      if (n > bgN) {
        bgN = n;
        bg = c;
      }
    };
    for (let x = 0; x < W2; x += 2) {
      add2(x, 0);
      add2(x, H - 1);
    }
    for (let y = 0; y < H; y += 2) {
      add2(0, y);
      add2(W2 - 1, y);
    }
    if (!bg || lum4(...bg) > 90) return { ok: false, reason: "No dark background." };
    const notBg = (x, y) => !near(px(img, x, y), bg, 18);
    const rowRuns = runs3(H, (y) => {
      let n = 0;
      for (let x = 0; x < W2; x += 2) if (notBg(x, y)) n++;
      return n > W2 * 0.5 * 0.3;
    }).filter(([a, b]) => b - a >= 8);
    const colRuns = runs3(W2, (x) => {
      let n = 0;
      for (let y = 0; y < H; y += 2) if (notBg(x, y)) n++;
      return n > H * 0.5 * 0.3;
    }).filter(([a, b]) => b - a >= 8);
    if (rowRuns.length < 3 || colRuns.length < 3) return { ok: false, reason: "Not a table." };
    const darkMax = Math.max(...bg);
    const badge = (x0, y0, x1, y1) => {
      const n = {};
      for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) {
        const name = colorName(...px(img, x, y), darkMax);
        if (name) n[name] = (n[name] || 0) + 1;
      }
      const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
      const area = ((y1 - y0) / 2 + 1) * ((x1 - x0) / 2 + 1);
      return best && best[1] > area * 0.3 ? best[0] : null;
    };
    const head = rowRuns[0];
    const columns = colRuns.slice(1).map(([x0, x1]) => badge(x0, head[0], x1, head[1]));
    if (columns.filter(Boolean).length < 2) return { ok: false, reason: "No colour badges across the top." };
    const left = colRuns[0];
    const rows = [], unsure = [];
    rowRuns.slice(1).forEach(([y0, y1], r) => {
      const color = badge(left[0], y0, left[1], y1);
      const cells = colRuns.slice(1).map(([x0, x1], c) => {
        const got = readCellCode(img, { x0, y0, x1, y1 });
        if (!got.code || !got.sure) unsure.push([r, c]);
        return got.code;
      });
      rows.push({ color, cells });
    });
    if (rows.filter((r) => r.color).length < 2) return { ok: false, reason: "No colour badges down the left." };
    return { ok: true, columns, rows, unsure };
  }
  function classifyWirePicture(img) {
    const t = readWireTable(img);
    if (t.ok && t.rows.length >= 3 && t.rows.some((r) => r.cells.some(Boolean))) return { type: "table", table: t };
    const b = readWireBoard(img);
    if (b.ok) return { type: "board", board: b };
    return { type: null, reason: t.reason || b.reason };
  }

  // src/modules/laundry/laundrySolver.js
  var laundrySolver_exports = {};
  __export(laundrySolver_exports, {
    CARE: () => CARE,
    CONTROLS: () => CONTROLS,
    DRY: () => DRY,
    IRON: () => IRON,
    SAMPLE_MANUAL_TEXT: () => SAMPLE_MANUAL_TEXT,
    TABLES: () => TABLES,
    WASH: () => WASH,
    describeFormula: () => describeFormula,
    isLoadMessage: () => isLoadMessage,
    lastSerialDigit: () => lastSerialDigit,
    manualHasAny: () => manualHasAny,
    parseLaundryManual: () => parseLaundryManual,
    parseLaundryText: () => parseLaundryText,
    pickSymbol: () => pickSymbol,
    pressesFor: () => pressesFor,
    sharedLetters: () => sharedLetters,
    solveLaundry: () => solveLaundry
  });
  var WASH = ["30\xB0C", "40\xB0C", "50\xB0C", "95\xB0C", "Hand wash", "Do not wash"];
  var DRY = ["High heat", "Dry flat", "Tumble dry", "No tumble dry", "Low heat", "Medium heat"];
  var IRON = ["150\xB0C", "No steam", "Iron", "200\xB0C", "110\xB0C"];
  var CARE = [
    "Bleach",
    "No tetra solvent",
    "Reduced moisture",
    "Short cycle",
    "Do not bleach",
    "No dry cleaning",
    "Petroleum only",
    "Low heat",
    "Wet cleaning",
    "Any solvent",
    "No steam finish",
    "Non-chlorine bleach"
  ];
  var CONTROLS = [["wash", "Wash", WASH], ["dry", "Dry", DRY], ["iron", "Iron", IRON], ["care", "Special care", CARE]];
  var LISTS = { wash: WASH, dry: DRY, iron: IRON, care: CARE };
  var TABLES = ["item", "material", "color"];
  var TABLE_LABEL = { item: "Item", material: "Material", color: "Color" };
  var cleanSerial = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  var num = (v) => v === "" || v == null || !Number.isFinite(Number(v)) ? null : Number(v);
  var norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  function lastSerialDigit(serial) {
    const d = cleanSerial(serial).match(/\d/g);
    return d ? Number(d[d.length - 1]) : 0;
  }
  function firstSerialDigit(serial) {
    const d = cleanSerial(serial).match(/\d/);
    return d ? Number(d[0]) : 0;
  }
  function sharedLetters(name, serial) {
    const s = new Set(cleanSerial(serial).replace(/\d/g, ""));
    return Array.from(new Set(String(name).toUpperCase().replace(/[^A-Z]/g, ""))).filter((ch) => s.has(ch));
  }
  function lev3(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function closestD(raw, options) {
    const r = norm(raw);
    if (!r) return null;
    let best = null, bestD = Infinity;
    for (const o of options) {
      const d = lev3(r, norm(o));
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best && bestD <= Math.max(1, Math.floor(norm(best).length * 0.3)) ? { value: best, d: bestD } : null;
  }
  var closest = (raw, options) => {
    const c = closestD(raw, options);
    return c ? c.value : null;
  };
  var USUAL_NAMES = [
    "Corset",
    "Shirt",
    "Skirt",
    "Skort",
    "Shorts",
    "Scarf",
    "Polyester",
    "Cotton",
    "Wool",
    "Nylon",
    "Corduroy",
    "Leather",
    "Ruby Fountain",
    "Star Lemon Quartz",
    "Sapphire Springs",
    "Jade Cluster",
    "Clouded Pearl",
    "Malinite"
  ];
  function pickSymbol(control, raw) {
    const list = LISTS[control];
    const s = String(raw || "").trim().replace(/\.$/, "");
    const temps = list.filter((x) => /^\d+°C$/.test(x));
    const digits = s.replace(/\D/g, "");
    if (digits.length >= 2 && /^[\d\s°º*o0]+c?$/i.test(s.replace(/\s/g, ""))) {
      const hit = temps.map((t) => t.replace(/\D/g, "")).filter((t) => digits.startsWith(t)).sort((a, b) => b.length - a.length)[0];
      if (hit) return `${hit}\xB0C`;
    }
    return closest(s, list.filter((x) => !temps.includes(x)));
  }
  var ARROW = /\s*(?:→|->|=>|—>|–>|⇒|➔|►)\s*|\s+(?:—|–|-|>|\+|=)\s+/;
  var TW = "(?:[il1|]{1,2}tem|material|colou?r)";
  var tableKey = (w) => /^colou?r$/i.test(w) ? "color" : /^[il1|]{1,2}tem$/i.test(w) ? "item" : /^material$/i.test(w) ? "material" : null;
  var controlKey = (w) => /^wash$/i.test(w) ? "wash" : /^dry$/i.test(w) ? "dry" : /^iron$/i.test(w) ? "iron" : /^special\s*care$/i.test(w) ? "care" : null;
  function parseFormula(rhs) {
    const text = rhs.replace(/\(.*?\)/g, "").trim();
    const terms = [];
    for (const part of text.split(/(?=[+-])/)) {
      const sign = part.trim().startsWith("-") ? -1 : 1;
      const t = part.replace(/^[\s+-]+/, "").trim().toLowerCase();
      if (!t) continue;
      if (/^\d+$/.test(t)) terms.push({ sign, kind: "num", n: Number(t) });
      else if (/remaining/.test(t)) terms.push({ sign, kind: "count", key: "remaining" });
      else if (/solved/.test(t)) terms.push({ sign, kind: "count", key: "solved" });
      else if (/needy/.test(t)) terms.push({ sign, kind: "count", key: "needy" });
      else if (/total/.test(t)) terms.push({ sign, kind: "count", key: "total" });
      else if (/first.*digit/.test(t)) terms.push({ sign, kind: "digit", which: "first" });
      else if (/digit/.test(t)) terms.push({ sign, kind: "digit", which: "last" });
      else return { text: rhs.trim(), terms, unknown: t };
    }
    return { text: text.replace(/\s+/g, " "), terms };
  }
  function parseLaundryManual(text) {
    const out = { load: null, modulus: null, formulas: {}, tables: {}, columns: {}, controlFrom: {}, overrides: [], care: [], unread: [] };
    const lines = String(text || "").replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
    let table = null, inCare = false;
    const names = () => TABLES.flatMap((k) => (out.tables[k] || []).map((r) => r.name));
    const pendingRules = [];
    for (const raw of lines) {
      const l = raw.replace(/^[•·*e+»]\s+/, "").replace(/^[-–]\s+/, "");
      let m;
      if (m = l.match(/^load\s*#?\s*(\d+)/i)) {
        out.load = Number(m[1]);
        continue;
      }
      if (m = l.match(/subtract\s+(\d+)/i)) {
        out.modulus = Number(m[1]);
        continue;
      }
      if ((m = l.match(new RegExp(`^(${TW})\\s*(?:=|:|\u2014|\u2013|-)\\s*(.+)$`, "i"))) && !/\//.test(m[2]) && /\d|remaining|solved|needy|total|digit/i.test(m[2])) {
        out.formulas[tableKey(m[1])] = parseFormula(m[2]);
        table = null;
        continue;
      }
      if (m = l.match(new RegExp(`^(${TW})\\b\\W*\\s*(wash|dry|iron)\\s*[/|l1I]\\s*special\\s*care\\.?$`, "i"))) {
        table = tableKey(m[1]);
        out.tables[table] = [];
        out.columns[table] = [controlKey(m[2]), "care"];
        inCare = false;
        continue;
      }
      if (/first\s+match/i.test(l)) {
        inCare = true;
        table = null;
        continue;
      }
      const looksOverride = /^.+?:\s*(?:wash|dry|iron|special care)\s+\S/i.test(l) && !/[/|]/.test(l);
      if (table && !looksOverride && (m = l.match(/^([A-Za-z][A-Za-z' ]*?)\s*[:;]\s*(.+?)\.?$/))) {
        const [c1, c2] = out.columns[table];
        const name = m[1].trim(), rest = m[2];
        let pair = null;
        const slash = rest.match(/^(.+?)\s*[/|]\s*(.+)$/);
        if (slash) pair = [pickSymbol(c1, slash[1]), pickSymbol(c2, slash[2])];
        if (!pair || !pair[0] || !pair[1]) {
          const words = rest.split(" ");
          for (let i = 1; i < words.length && (!pair || !pair[0] || !pair[1]); i++) {
            const a = pickSymbol(c1, words.slice(0, i).join(" ").replace(/\s*[/|l1I]$/, "")), b = pickSymbol(c2, words.slice(i).join(" ").replace(/^[/|l1I]\s*/, ""));
            if (a && b) pair = [a, b];
          }
        }
        out.tables[table].push({ name, values: { [c1]: pair ? pair[0] : null, [c2]: pair ? pair[1] : null }, text: raw });
        continue;
      }
      const maps = Array.from(l.matchAll(new RegExp(`\\b(wash|dry|iron)\\b\\W{0,4}\\s*(${TW})\\b`, "gi")));
      if (maps.length && !/\//.test(l)) {
        maps.forEach((x) => {
          out.controlFrom[controlKey(x[1])] = tableKey(x[2]);
        });
        table = null;
        continue;
      }
      if (m = l.match(/^(.+?)\s*:\s*(wash|dry|iron|special care)\s+(.+?)\.?$/i)) {
        const control = controlKey(m[2]);
        const value = pickSymbol(control, m[3]);
        const who = m[1].split(/\s+or\s+|\s*,\s*/i).map((s) => s.trim()).filter(Boolean);
        if (value && who.length) {
          out.overrides.push({ who, control, value, text: raw });
          table = null;
          continue;
        }
      }
      if (inCare) {
        pendingRules.push(raw);
        continue;
      }
      if (table) continue;
      if (!/subject of|^top\b|find the load|use the module|set the controls|check every/i.test(l)) out.unread.push(raw);
    }
    const known = Array.from(/* @__PURE__ */ new Set([...names(), ...USUAL_NAMES]));
    for (const raw of pendingRules) out.care.push(parseCareRule(raw, known));
    return out;
  }
  function parseCareThen(s) {
    const t = s.trim().replace(/\.$/, "");
    const m = t.match(new RegExp(`^(${TW})\\s+care$`, "i"));
    if (m) return { kind: "care", table: tableKey(m[1]), d: 0 };
    const v = closestD(t, CARE);
    return v ? { kind: "value", value: v.value, d: v.d } : null;
  }
  function parseCareWhen(s, known) {
    const t = s.trim();
    if (/^otherwise$/i.test(t)) return { kind: "always", d: 0 };
    const m = t.match(new RegExp(`^(${TW})\\s+shares\\s+(?:a\\s+)?letter\\s+with\\s+(?:the\\s+)?serial`, "i"));
    if (m) return { kind: "shares", table: tableKey(m[1]), d: 0 };
    const parts = t.split(/\s+or\s+|\s*,\s*/i).map((x) => x.trim()).filter(Boolean);
    const hits = parts.map((p) => closestD(p, known));
    if (parts.length && hits.every(Boolean)) return { kind: "names", who: hits.map((h) => h.value), d: hits.reduce((a, h) => a + h.d, 0) };
    return null;
  }
  var strip = ({ d, ...rest }) => rest;
  function parseCareRule(raw, known) {
    const l = raw.replace(/^[•·*e+»]\s+/, "");
    const parts = l.split(ARROW);
    if (parts.length >= 2) {
      const when = parseCareWhen(parts[0], known), then = parseCareThen(parts.slice(1).join(" "));
      if (when && then) return { when: strip(when), then: strip(then), text: raw };
    }
    const words = l.split(" ");
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const when = parseCareWhen(words.slice(0, i).join(" "), known), then = parseCareThen(words.slice(i).join(" "));
      if (when && then && (!best || when.d + then.d < best.d)) best = { when: strip(when), then: strip(then), d: when.d + then.d };
    }
    if (best) return { when: best.when, then: best.then, text: raw };
    return { when: { kind: "unknown" }, then: null, text: raw };
  }
  var manualHasAny = (m) => Boolean(m && (Object.keys(m.formulas).length || Object.keys(m.tables).length || m.overrides.length || m.care.length));
  var SAMPLE_MANUAL_TEXT = `On the subject of Laundry
Load 1 \u2022 Check every 60s. Wrong settings explode. Reopen for each new load.
Top: Wash | Dry. Bottom: Iron | Special care.

Find the load

Use the module's captured counts. Subtract 6 until each result is 0 to 5.
Item = remaining + 5
Material = solved + needy + 2
Color = last serial digit + total + 1 (no digit: use 0)

Item \u2192 Iron / Special care
Corset: 150\xB0C / Bleach
Shirt: No steam / No tetra solvent
Skirt: Iron / Reduced moisture
Skort: 200\xB0C / Short cycle
Shorts: 150\xB0C / Do not bleach
Scarf: 110\xB0C / No dry cleaning

Material \u2192 Wash / Special care
Polyester: 50\xB0C / Petroleum only
Cotton: 95\xB0C / No dry cleaning
Wool: Hand wash / Reduced moisture
Nylon: 30\xB0C / Low heat
Corduroy: 40\xB0C / Wet cleaning
Leather: Do not wash / No tetra solvent

Color \u2192 Dry / Special care
Ruby Fountain: High heat / Any solvent
Star Lemon Quartz: Dry flat / Low heat
Sapphire Springs: Tumble dry / Short cycle
Jade Cluster: No tumble dry / No steam finish
Clouded Pearl: Low heat / Low heat
Malinite: Medium heat / Non-chlorine bleach

Set the controls

Wash \u2192 material. Dry \u2192 color. Iron \u2192 item.
\u2022 Leather or Jade Cluster: Wash 30\xB0C.
\u2022 Wool or Star Lemon Quartz: Dry High heat.

Special care: first match wins
Clouded Pearl \u2192 Non-chlorine bleach
Corset or Corduroy \u2192 material care
Material shares a letter with serial \u2192 color care
Otherwise \u2192 item care`;
  var USUAL = parseLaundryManual(SAMPLE_MANUAL_TEXT);
  var fmtFormula = (f) => f.terms.map((t, i) => `${i ? t.sign < 0 ? " \u2212 " : " + " : t.sign < 0 ? "\u2212" : ""}${t.kind === "num" ? t.n : t.kind === "count" ? t.key : `${t.which} serial digit`}`).join("");
  var describeFormula = (key, f) => f ? `${TABLE_LABEL[key]} = ${f.unknown ? f.text : fmtFormula(f)}` : `${TABLE_LABEL[key]} = ?`;
  function solveLaundry(manual, counts, serial) {
    if (!manual || !Object.keys(manual.formulas).length) return { ready: false, missing: ["manual"], reason: "Paste this game's Laundry manual (its formulas change every game)." };
    const c = {
      remaining: num(counts && counts.remaining),
      solved: num(counts && counts.solved),
      needy: num(counts && counts.needy),
      total: num(counts && counts.total)
    };
    const ser = cleanSerial(serial);
    const missingF = TABLES.filter((k) => !manual.formulas[k]);
    if (missingF.length) return { ready: false, missing: missingF.map((k) => `${k} formula`), reason: `The manual's ${missingF.join(" / ")} formula wasn't read \u2014 fix it in the manual text.` };
    const odd = TABLES.find((k) => manual.formulas[k].unknown);
    if (odd) return { ready: false, missing: [], reason: `Not understood in the ${odd} formula: "${manual.formulas[odd].unknown}" \u2014 fix it in the manual text.` };
    const used = new Set(TABLES.flatMap((k) => manual.formulas[k].terms.map((t) => t.kind === "count" ? t.key : t.kind === "digit" ? "serial" : null)).filter(Boolean));
    const missing = ["remaining", "solved", "needy", "total"].filter((k) => used.has(k) && c[k] === null);
    const careNeedsSerial = (manual.care.length ? manual.care : USUAL.care).some((r) => r.when.kind === "shares");
    if (!ser && (used.has("serial") || careNeedsSerial)) missing.push("serial");
    if (missing.length) return { ready: false, missing };
    const modulus = manual.modulus || 6;
    const borrowed = [];
    const tables = {}, columns = {};
    for (const k of TABLES) {
      const t = manual.tables[k];
      if (!t || !t.length) {
        tables[k] = USUAL.tables[k];
        columns[k] = USUAL.columns[k];
        borrowed.push(`${k} table`);
        continue;
      }
      if (t.length !== modulus) return { ready: false, missing: [], reason: `The manual's ${k} table has ${t.length} rows, not ${modulus} \u2014 fix it in the manual text.` };
      const bad = t.find((r) => Object.values(r.values).some((v) => !v));
      if (bad) return { ready: false, missing: [], reason: `Manual row not understood: "${bad.text}" \u2014 fix it in the manual text.` };
      tables[k] = t;
      columns[k] = manual.columns[k];
    }
    const controlFrom = { ...USUAL.controlFrom };
    if (Object.keys(manual.controlFrom).length) Object.assign(controlFrom, manual.controlFrom);
    else {
      let fromHeads = 0;
      for (const k of TABLES) if (manual.columns[k]) {
        controlFrom[manual.columns[k][0]] = k;
        fromHeads++;
      }
      if (!fromHeads) borrowed.push("which table sets wash / dry / iron");
    }
    const overrides = manual.overrides.length || manual.care.length ? manual.overrides : (borrowed.push("the wash / dry exceptions"), USUAL.overrides);
    const care = manual.care.length ? manual.care : (borrowed.push("the special-care rules"), USUAL.care);
    const value = (t) => t.kind === "num" ? t.n : t.kind === "count" ? c[t.key] : t.which === "first" ? firstSerialDigit(ser) : lastSerialDigit(ser);
    const pick = {}, why = {};
    for (const k of TABLES) {
      const f = manual.formulas[k];
      const sum = f.terms.reduce((a, t) => a + t.sign * value(t), 0);
      const idx = (sum % modulus + modulus) % modulus;
      pick[k] = tables[k][idx];
      const parts = f.terms.map((t, i) => `${i ? t.sign < 0 ? " \u2212 " : " + " : t.sign < 0 ? "\u2212" : ""}${t.kind === "num" ? t.n : t.kind === "count" ? `${c[t.key]} ${t.key}` : `${t.which} digit ${value(t)}`}`);
      const noDigit = f.terms.some((t) => t.kind === "digit") && !/\d/.test(ser) ? " (no serial digit: 0)" : "";
      why[k] = `${parts.join("")}${noDigit} = ${sum} \u2192 ${idx}`;
    }
    const isPicked = (name) => TABLES.some((k) => norm(pick[k].name) === norm(name));
    const set = {};
    for (const control of ["wash", "dry", "iron"]) {
      const from = controlFrom[control];
      set[control] = pick[from].values[control] || null;
      why[control] = pick[from].name;
    }
    for (const o of overrides) {
      if (o.control === "care") continue;
      const hit = o.who.find(isPicked);
      if (hit) {
        set[o.control] = o.value;
        why[o.control] = `${hit} \u2192 ${o.value}`;
      }
    }
    set.care = null;
    for (const r of care) {
      const w = r.when;
      if (w.kind === "unknown") {
        return { ready: false, missing: [], reason: `Special-care rule not understood: "${r.text}" \u2014 fix it in the manual text.`, item: pick.item, material: pick.material, color: pick.color, why };
      }
      let hit = false, label2 = "";
      if (w.kind === "always") {
        hit = true;
        label2 = "no rule above";
      } else if (w.kind === "names") {
        const h = w.who.find(isPicked);
        if (h) {
          hit = true;
          label2 = h;
        }
      } else if (w.kind === "shares") {
        const shared = sharedLetters(pick[w.table].name, ser);
        if (shared.length) {
          hit = true;
          label2 = `${pick[w.table].name} shares ${shared.join(", ")} with the serial`;
        }
      }
      if (!hit) continue;
      if (r.then.kind === "value") {
        set.care = r.then.value;
        why.care = `${label2} \u2192 ${r.then.value}`;
      } else {
        set.care = pick[r.then.table].values.care || null;
        why.care = `${label2} \u2192 ${r.then.table} care (${pick[r.then.table].name})`;
      }
      break;
    }
    const unset = CONTROLS.filter(([k]) => !set[k]).map(([, label2]) => label2);
    if (unset.length) return { ready: false, missing: [], reason: `No ${unset.join(" / ")} setting came out of the manual \u2014 check its text.`, item: pick.item, material: pick.material, color: pick.color, why };
    return {
      ready: true,
      missing: [],
      item: pick.item,
      material: pick.material,
      color: pick.color,
      set,
      why,
      borrowed,
      modulus,
      copy: `Wash ${set.wash} \xB7 Dry ${set.dry} \xB7 Iron ${set.iron} \xB7 Care ${set.care}`
    };
  }
  function pressesFor(set, current2) {
    const out = {};
    for (const [key, , list] of CONTROLS) {
      const to = list.indexOf(set[key]);
      const from = current2 && current2[key] != null ? list.indexOf(current2[key]) : -1;
      out[key] = to < 0 || from < 0 ? null : (to - from + list.length) % list.length;
    }
    return out;
  }
  function parseLaundryText(text) {
    const t = String(text || "").replace(/[*_`]/g, "").replace(/\s+/g, " ");
    const grab = (re) => {
      const m = t.match(re);
      return m ? Number(m[1]) : null;
    };
    const serialM = t.match(/serial\s*(?:number)?\s*[:：]?\s*([A-Z0-9]{4,12})\b/i);
    return {
      load: grab(/\bload\s*#?\s*(\d+)/i),
      remaining: grab(/(\d+)\s*remaining/i),
      solved: grab(/(\d+)\s*solved/i),
      needy: grab(/(\d+)\s*needy/i),
      total: grab(/(\d+)\s*total/i),
      serial: serialM ? serialM[1].toUpperCase() : null,
      checkIn: grab(/check\s+in\s+(\d+)\s*s/i)
    };
  }
  var isLoadMessage = (t) => /captured\s+counts\s*:\s*\**\s*\d|\d+\**\s*remaining/i.test(String(t || ""));

  // src/modules/laundry/laundryVision.js
  var laundryVision_exports = {};
  __export(laundryVision_exports, {
    ICON: () => ICON,
    MARK_H: () => MARK_H,
    MARK_W: () => MARK_W,
    buildIconTemplates: () => buildIconTemplates,
    encodeIcon: () => encodeIcon,
    iconGlyph: () => iconGlyph,
    matchIcon: () => matchIcon,
    readLaundryModule: () => readLaundryModule,
    readSymbol: () => readSymbol
  });

  // src/modules/laundry/laundryIcons.js
  var ICON_TEMPLATES = {
    wash: {
      "30\xB0C": { c: 3, f: "f5000000000000000000003bf5000004885000000038888ff500038bffc8400005afffcffa888afb88afb8888cc888cfbfffffa40038fffffc50008f8c888830000088888500008b8a00000000000000000000a88a00000000000000000000a84a40000000000000000004c80a80003884008840485008c40a80008bab34bab38a8008a00a8000545f5883b5855008a00a8000005f588088855008a008b30004ab38808a485008a005f50004ab38808a05303b8005f500003b58808a00005f5005f500543b8883b500005f5003b800abaf54baf500005f50008a00588830888300008b30008a0000000000000000a800008a0000000000000000a800008a0000000000000000a800004a4000000000000004c800000ab88888888888888bc400", m: "08ffff00008ffff80008ffff8bb8bf8404bf88bb4008b8bf88408ff808ff004b8008808f00008ff808ff0008b808808f0048bf8408ff0008ff048888008fff0008ff0008ff008f8000008ff808ff0008ff000000000048f808ff0008ff000000000000fb48ff0008b8000000884048fb48ff004b80000000ffb8bff804bf88bf80000000fffffff8008fffff80000000" },
      "40\xB0C": { c: 3, f: "f5000000000000000000003bf5000004885000000038888ff500038bffc8400005afffcffa888afb88afb8888cc888cfbfffffa40038fffffc50008f8c888830000088888500008b8a00000000000000000000a88a00000000000000000000a84a40000000000000000004c80a80000058308840485008c40a800000af54bab38a8008a00a800004cf5885f5855008a00a80003bcf5883b8855008a008b3005b8f58808a485008a005f500885f58808a05303b8005f503a45f58808a00005f5005f50388af8883b500005f5003b800005f54baf500008f50008a0000383088830000ab30008a0000000000000000a800008a0000000000000000a800008a0000000000000000a800004a4000000000000004c800000ab88888888888888bc400", m: "00008fff0008ffff0008ffff00008fff004bb8bf8408b8bf0004bfff008f808ff808808f004bbbff008f8048fb48808f008b48ff008f8000ff848888008808ff008f8000ff808f8008f808ff008f8000ff8000008bb408ff008f8000ff800000ffb88bff848f8000fb40000088888bff848f8048f8000000000008ff004bb8bff8000000000008ff0008fffff8000000" },
      "50\xB0C": { c: 3, f: "f5000000000000000000003bf5000004885000000038888ff500038bffc8400005afffcffa888afb88afb8888cc888cfbfffffa40038fffffc50008b8c88883000008888850000888a00000000000000000000a88a00000000000000000000a84a40000000000000000004c80a80003888308840485008c40a80005fff54bab38a8008a00a80005b883885f5855008a00a80008b840883b8855008a008b300affb38808a485008a005f500588b88808a05303b8005f5000008a8808a00005f5005f500543b8883b500005f5003b8008baf54baf500008f50008a0038883088830000ab30008a0000000000000000a800008a0000000000000000a800008a0000000000000000a800004a4000000000000004c800000ab88888888888888bc400", m: "08fffff8008ffff80008ffff08fffff804bf88bb4008b8bf08b8888408ff008f8008808f8bb8880008ff004bb808808fffffff8408ff0008ff048888fffffff808ff0008ff008f80000000ff88ff0008ff000000000000ff88ff0008ff000000000000ff88ff0008b8000000884048fb48ff004b800000008bb8bff804bf88bf8000000008fffff8008fffff80000000" },
      "95\xB0C": { c: 3, f: "f5000000000000000000003bf5000004885000000038888ff500005bffc8400005afffcffa8348cb88afb8438cc888cfbffabfa40038ffbafc50008f8c8a8830000088ba8500008b8a00000000000000000000a88c40000000000000000000a84c80000000000000000000a80a80003884008885485004a40a80008bab30fff88a8008a00a8000a85f50b883858408a008b300845f84ffb3488008a005f500abafa4b8b805503b8005f5008fcb80408a00005f5005f500388b50008a00005f5005f800545f54408a00005f5003ba00abab34b8b800005f50008a0004500045000000a800008a0000000000000000a800008a0000000000000000a800004a4000000000000004c800000ab88888888888888bc4000008ffffffffffffffffa000", m: "08fff800008ffffff88fff808bb8bb40008fffff848b8b80ff808f80008b8888008808b8fb408f80008b8840008808b8fb408fb804bfffb800488b80ffb8bfff04bb88bf840488408bffbbb80044008ff800000004888b800000008ff800000088408f800484008ff8000000ffb8bb4004bb88bf8400000088bfb400004bfb8800000000008f80000008f80000000000" },
      "Hand wash": { c: 0, f: "0000000000000005b8000000000000000000004cfc5000000000000003558acfffd82000000005888bffffffffffa40083000affffffffffffffc404f500037aaadffffffffc755cf500005884affffffff88fcffa8888cb84affffffff858cf8c88883000afffffffa0008b8a00000004cfffffff8000a88c3000005cfffffffd3000a84c800004cffffffffa0000a80a80003bfbaffffff80004a40a80007fa5accfcdf50008a00a8003cb38f88c48f50008a008b303a43bc4ba05f50008a005f500008b30f50a80005f5005f50004c804b30a80005f5003c800058308500330005f50008a00000004000000008b30008a0000000000000000a800008a0000000000000000a800004a4000000000000004c800000ab88888888888888bc400", m: "" },
      "Do not wash": { c: 0, f: "f5008c300000000000ab303bf5004c548850000003a8888ff5000888ffc840000888ffcfccaaa8ca757acaa78c3355af8c88858f80008888f800008b8a00003ba0000008b30000a88c300003a820028a300000a84c8000008f8008f8000000a80a8000003bc40ab3000004a40a80000004c84a40000008a00a800000007cc800000008a008b30000003bf500000008a005f50000003bf80000003b8005f5000003aa8a3000005f5005f500003bc40ab300005f5003b800008f8008f800008f50008a0000ab3003ba0000ab30008a0028a30000388200a800008a008f80000005f800a800004a40ab30000003bc34c80000078785555555555a88830000004c500000000003a4000000008c300000000000ab30000000880000000000008b3000", m: "" }
    },
    dry: {
      "High heat": { c: 3, f: "fffffffffffffffffffffffffb88888bfffffffb888888bff800005bfffffffb8300008ff80258ca8555558acc83008ff805fb50000000004afb308ff808b4000000000003bf508ff85c500000000000003a808ffbb80000000000000004a48ffff50000000000000000abbffff50000000000000000afffffc305a8305aa338a7007fffff8008ff80aff58ffc405fffff8008ff80aff58ffc405fffffc30388305a8238a5007ffffff50000000000000000abbffff80000000000000000a88ffbba0000000000000004a48ff85c830000000000028c808ff808fb300000000008fb308ff803bf80000000004cb4008ff80038aa8555558aa830008ff8000038bfffffb84000008ffb888888bfffffb8888888bffffffffffffffffffffffffb", m: "ffff800008ffff80008fff80ffff800008ffff80008fff80ffffb4004bffff8048bfff80fffff8008fffff808fffff80fffff8008fffff808fffffb8fffff8008fffff808ffffffffffff8008fffff808ffffffffffff8008fffff808fffffb8fffff8008fffff808fffff808bffb4004bffb84048bffb4008ff800008ff8000008ff80008ff800008ff8000008ff800" },
      "Dry flat": { c: 0, f: "fb8888888888888888888bfff800000000000000000004bff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ff8025555555555555553008ff805fffffffffffffff8008ff8038888888888888884008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ff800000000000000000004bffb8888888888888888888bfffffffffffffffffffffffffb", m: "" },
      "Tumble dry": { c: 0, f: "fffffffffffffffffffffffffb88888bfffffffb888888bff800005bfffffffb8300008ff80038ca8555558acc83008ff803bf80000000004afb308ff808b8300000000003bf508ff85c500000000000003a808ffbb80000000000000004a48ffff50000000000000000abbffff50000000000000000afffffc300000000000000007fffff8000000000000000005fffff8000000000000000005fffffc300000000000000007ffffff50000000000000000abbffff80000000000000000a88ffbba0000000000000004a48ff85c830000000000028c808ff808fb300000000008fb308ff803bf80000000004cb4008ff80038aa8555558aca30008ff8000038bfffffb88300008ffb888888bfffffb8888888bffffffffffffffffffffffffb", m: "" },
      "No tumble dry": { c: 0, f: "0008b8888affffc8888bf500830880004affffc40004f538fa388000bfc88cfb0000f8af8cca505aa730037aa500acc803af85cb00000000bc58fa300038fa840000000048afb3000005aa850000000058a8c3000008b8cf83000004fc84f5000008fa5bf800005bb5abf5000008fa04bc5005cb40aff5000008f80037c88c83007ff5000008f50000affa00005ff5000008f50003cfbc30005ff5000008f8038a8538a8308ff5000008fa3bf800005bb5abf5000008b8af83000004fc84f50000088ac8000000008ca4f5000028cc830000000038cca30003af83ab00000000bc58fa3008fb408f83000038f800bfa4aa788025cc7557cc8200cacc830880004affffa40004f5380008b8888affffa8888bf5000008ffffffffffffffffb300", m: "" },
      "Low heat": { c: 1, f: "fffffffffffffffffffffffffb88888bfffffffb888888bff800005bfffffffb8300008ff80258ca8555558acc83008ff805fb50000000004afb308ff808b4000000000003bf508ff85c500000000000003a808ffbb80000000000000004a48ffff50000000000000000abbffff50000000000000000afffffc30000005a820000007fffff80000000aff50000005fffff80000000aff50000005fffffc30000005a820000007ffffff50000000000000000abbffff80000000000000000a88ffbba0000000000000004a48ff85c830000000000028c808ff808fb300000000008fb308ff803bf80000000004cb4008ff80038aa8555558aa830008ff8000038bfffffb84000008ffb888888bfffffb8888888bffffffffffffffffffffffffb", m: "000000ffffffffffff000000000000ffffffffffff000000888888ffffffffffff888888ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff888888ffffffffffff888888000000ffffffffffff000000000000ffffffffffff000000" },
      "Medium heat": { c: 2, f: "fffffffffffffffffffffffffb88888bfffffffb888888bff800005bfffffffb8300008ff80258ca8555558acc83008ff805fb50000000004afb308ff808b4000000000003bf508ff85c500000000000003a808ffbb80000000000000004a48ffff50000000000000000abbffff50000000000000000afffffc300038a5038a500007fffff800008ffa08ff800005fffff800008ffa08ff800005fffffc300038a50388300007ffffff50000000000000000abbffff80000000000000000a88ffbba0000000000000004a48ff85c830000000000028c808ff808fb300000000008fb308ff803bf80000000004cb4008ff80038aa8555558aa830008ff8000038bfffffb84000008ffb888888bfffffb8888888bffffffffffffffffffffffffb", m: "008ffff8000000008fffffff008ffff8000000008fffffff88bffffb84000048bffffffffffffffff800008ffffffffffffffffff800008ffffffffffffffffff800008ffffffffffffffffff800008ffffffffffffffffff800008ffffffffffffffffff800008fffffffff88bffffb84000048bffffb88008ffff8000000008ffff800008ffff8000000008ffff800" }
    },
    iron: {
      "150\xB0C": { c: 2, f: "0000bfffffffffffffffffff0000488888888888888888bf00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f00000004888bfffffffb88bf0000048bffff888888bfffff00008bff88880000004888bf0004ff88000000000000008f004bb800000000000000008f00bf4000000000000000008f04fb0000048404840000008f4bb4000008fb08fb0000008f8f0000004bff08ff0000008fbb00000004b804fb0000008ff8000000004000840000008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ffb88888888888888888888bfbffffffffffffffffffffffb", m: "008fffff80000008fffff800008fffff80000008fffff800008fffffb8400008fffffb88008fffffff800008ffffffff88bfffffff800008ffffffffffffffffff800008ffffffffffffffffff800008ffffffff88bfffffff800008ffffffff008fffffff800008ffffffff0048bfb8884000048bfffb8800008f800000000008fff80000008f800000000008fff800" },
      "No steam": { c: 0, f: "0000488888888888888888ff0000000000000000000000af00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000008888888888848f0000038aaaaaaaaaaaaaaacf00008bfb88000000000004bf004bb400000000000000008f03a83000000000000000008f4b800000000000000000008f8f300000000000000000008faa000000000000000000008ff8000000000000000000008fca000000000000000000008f8f88888888888888888888bf48888bb888888888bf88888400aa5883000000008f558a000088fffb88000088bfff88000000888affaaaaffc85500000055aca8aaa858aaaaaa550000ffb88400000000488bff000055c5000000000000a855000000f8000000000000b80000", m: "" },
      "Iron": { c: 0, f: "0000488888888888888888bf00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f000000488bfffffffffffbbf000004bfff88888888888bff00008bfb88000000000004bf0004fb84000000000000008f004bb400000000000000008f00bb4000000000000000008f04b40000000000000000008f4b800000000000000000008f8f000000000000000000008fbf000000000000000000008ffb000000000000000000008ff8000000000000000000008ff8000000000000000000008ffb000000000000000000008fbf88888888888888888888bf4bfffffffffffffffffffffb", m: "" },
      "200\xB0C": { c: 3, f: "0000afffffffffffffffffff0000588888888888888888bf00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f0000000488affffffffa88bf0000048bfffb888888bfffff00005bfb88840000004888bf0004cfa4000000000000008f005bc830000000000000008f04cb5000000000000000008f08c40004840485038840008f4b80003bfb38fc45ff80008fbb30003bff58ff85ff80008ff8000004a834bc43bc40008ff8000000300045004500008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008ffb88888888888888888888bfffffffffffffffffffffffff", m: "08fff80008ffff80008fffff08fff80008ffff80008fffff8bfffb8408ffffb4008ffffffffffff808fffff8008ffffffffffff808fffff8008ffffffffffff808fffff8008ffffffffffff808fffff8008fffff8bfffff808fffff8008fffff08fffff808fffff8008fffff04bfb884048bffb4004bffb8008f80000008ff800008ff80008f80000008ff800008ff80" },
      "110\xB0C": { c: 1, f: "00008fffffffffffffffffff0000488888888888888888bf00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000000000000000008f00000000888bfffffffb88bf00000088ffff888888bfffff000048ff88880000004888bf0004bf88000000000000008f004bb800000000000000008f00bf4000000000000000008f04fb0000000088000000008f08b400000004ff400000008f8f0000000008ff400000008f8f0000000004bb000000008fbb000000000044000000008ff8000000000000000000008ff8000000000000000000008ff8000000000000000000008fbb88888888888888888888bf8fffffffffffffffffffffff", m: "00008ffffffffffffff8000000008ffffffffffffff800008888bffffffffffffffb8888fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffb8888fffffffffffffffffff80000888888888bffffb8888400000000000008ffff80000000000000000008ffff8000000000" }
    },
    care: {
      "Bleach": { c: 0, f: "000000000008b4000000000000000000004bf8000000000000000000008ffb40000000000000000004bbbf8000000000000000000cc55cc000000000000000004f8004b400000000000000008b40008b4000000000000004b800004f8000000000000008f400000fb40000000000008ca0000008ca000000000000fb400000008f000000000004f8000000004b400000000008b40000000008b4000000004b400000000004f800000003ac000000000000cc5000000bf80000000000004bb000000fb400000000000008f000004f8000000000000004b400008b40000000000000008b4038c300000000000000003fa38fb000000000000000000bf8bf80000000000000000008fbffb888888888888888888bffbfffffffffffffffffffffff", m: "" },
      "No tetra solvent": { c: 1, f: "0000008bffffffffb8000000000048fb88888888bf8400000004bfb40000000048fb4000004bfb400000000000bfb40004bfb40000000000004bfb4008fb4000000000000004bf808fb400008fffffb8400008f88f8000008fb8bfff800008fbbb4000008f8048bfb40004bff80000008f80008ff800008ff80000008f80008ff800008ff80000008f8048bfb400008ff80000008ffffb840000008ff80000008fb884000000008ffb4000008f8000000000008fbf8000008f800000000004bf8f8000008f800000000008fb4bb400008f80000000004bf804bfb400000000000004bb40004bfb0000000000008bb4000004bf400000000004ff800000004bb8840000048bb84000000004bffb88888bff40000000000048bffffffb88000000", m: "ffffffffffffffffb8888400ffffb8888888fffffffff800ffff800000008888bffffb88ffff8000000000008fffffffffff8000000000008fffffffffff800000008888bffffb88ffffffffffffffb888840000ffffb8888888884000000000ffff80000000000000000000ffff80000000000000000000ffff80000000000000000000ffff80000000000000000000" },
      "Reduced moisture": { c: 0, f: "00000000bf5000000000000000000004fb300000000000000000028c8300000000000000000008fb003888884000000000004cb404afffffb83000000028ca33aaa85555aaa83000008fb34bb4000000008fb50004cb43bf400000000038ba00bf800ab40000000000000ab4fb304a4000000000000008f85303a80000000000000003ca0008f500000000000000008f0008f500000000000000008f0008f500000000000000008f0008f500000000000000008f0008f500000000000000008f0004b800000000000000008f00008a0000000000000003bb00005c5000000000000007c5000008b40000000000004c80000005fb000000000004bc400000028c85300000037cc50000000004bfc888888bc840000000000048cffffffb500000", m: "" },
      "Short cycle": { c: 0, f: "0000000004afffffb8300000000000008bfb8888ffa4000000000038c853000055ac8300000003bf400000000038ba00000008c80000000000003a8300004a4000000000000008f800008a0000000000000005f80005c70000000000000002ac0008f500000000000000008f0008f500000000000000008f0008f500000000000000008f0008f500000000000000008f0004b800000000000000008f84008a0000000000000003bbcc505c5000000000000007c54bc408b40000000000004c8003ac85cc300000000028ca30003bf84bb850000004afb3000004bc44bfc888888bc8400000003ac8358aaaaaa8300000000003bf400000000000000000000038c82000000000000000000000bf50000000000000000000004b50000000000000", m: "" },
      "Do not bleach": { c: 0, f: "000000000008b4000000000000000000004bf800000000000000000003accc5000000000000000000bf88fb000000000000000000fb44bf000000000000a83005c5003a830038000000bf804b800004f804bb0000004bb08f400000fb4bb4000000004b8400000048b400000000000bb40000004bb00000000000588a300003a8883000000004b404b4004b404f8000000008f000bb44bb000fb40000008ca00038acc50008ca000000fb400004bf8000008f000004f800004bfbb400004b40004b400004fb404b400004f804bf00004bb40008b40000fb4afa0008cc300003ac8000afaffb844fb88888888bf448bfffffb8bb8bffffffb8bb8bfff5555ac335555555533cca555000bb40000000000004bf000000b4000000000000004b000", m: "" },
      "No dry cleaning": { c: 0, f: "fb0000048bffffb8000000bfbf84004bfb8888ff840004ff4bfb04bf8400008bfb004bb804ff44b800000004bf44bf40008bb44000000000488bb8000004fb400000000000bf4000000888fb00000000bfb84000004b40bf84000004fb488000008f004bfb00008bb4088000008f0004bf4004ff4008b400008f00004bb84bb80004f800008b000004ffbf400000f80000b8000000bffb400000f800008b000048fbbfb40000f800008f0000bfb448fb0004f800008f0004fb4000bf8408b400008f408bb400004bfb088000004b44ff40000004bf4440000004bf400000000004ff4000004bfb4000000000488bb40000bf88b400000000bf04fb4048fb04fb40000048fb00bfb4bfb4008bb88888bfb40048fbff400004fffffffb400000bf", m: "" },
      "Petroleum only": { c: 1, f: "0000008bffffffffb8000000000048fb88888888bf8400000004bfb40000000048fb4000004bfb400000000000bfb40004bfb40000000000004bfb4008fb4000000000000004bf808fb400008fffffff800008f8bf8000008ffb8888400008fbfb4000008ff80000000004bff80000008ff800000000008ff80000008ff800000000008ff80000008ffb88840000008ff80000008ffb88840000008ff80000008ff800000000008ff80000008ff800000000008fbb4000008ff80000000004bf8f8000008ff80000000008fb4bb400008ff8000000004bf804bfb400000000000004bb40004bfb0000000000008bb4000004bf400000000004ff800000004bb8840000048bb84000000004bffb88888bff40000000000048bffffffb88000000", m: "ffffffffffffffffffffffffffffffff8888888888888888ffffffff0000000000000000ffffffff0000000000000000ffffffff0000000000000000ffffffff8888888888888400ffffffff8888888888888400ffffffff0000000000000000ffffffff0000000000000000ffffffff0000000000000000ffffffff0000000000000000ffffffff0000000000000000" },
      "Low heat": { c: 0, f: "0000038bfffffa400000000000004aff8888bfb8000000000028ca550000358c85200000008fb30000000004bf50000005c83000000000003aa300004b8000000000000004c800008f5000000000000000a80000ca20000000000000007c5000f800000000000000005f8000f800000000000000005f8000f800000000000000005f8000f800000000000000005f8000bb30000000000000005f80008f50000000000000008b40045c8000000000000003a5028a04a40000000000004ba008b4008c820000000003cc538830003bfa840000038bb43bf50000048cfb88888afb408b83000000038aaaaaa85338a500000000000000000000bf50000000000000000000388520000000000000000003bb0000000000000000000005b400000000", m: "" },
      "Wet cleaning": { c: 0, f: "0000008bffffffffb8000000000048fb88888888bf8400000004bfb40000000048fb4000004bfb400000000000bfb40004bfb40000000000004bfb4008fb4000000000000004bf808fb44b80004bf80008f808f8bf800880008ff80008b408fbfb4008b4008ff800088004bff80008f804bffb404b80008ff80004f808fbbf808f80008ff80000f808f88f808f40008ff80000fb8bf88fb48f00008ff80000bfffb44bfbbf00008ff800008fff8008fffb00008fbb40008fff8008fff80004bf8f80008fff8004bff80008fb4bb4008ffb40008ff8004bf804bfb400000000000008fb40004bfb0000000000008bb4000004bf400000000004fb400000004bb8400000048bb40000000004bfb888888bff40000000000048bffffffb88000000", m: "" },
      "Any solvent": { c: 0, f: "0000008bffffffffb8000000000004fb88888888bf84000000048bb40000000048fb4000004bfb400000000000bfb400008fb40000000000004bfb4004bb4000000000000004bf808fb40000004bf800000008f8bf800000008ff800000008fbfb40000004bffb40000004bff800000008ffbf800000008ff800000008fb8fb40000008ff80000004bf88ff80000008ff80000008f8008fb4000008ff8000004bfb88bff8000008ffb400008ffffffffb400008fbf80004bfb8888bff80004bf8f80008ff800004bf80008fb4bb4008fb4000008fb004bf804bfb400000000000004bb40004bfb0000000000008bb4000004bf400000000004ff800000004bb8840000048bb84000000004bffb88888bff40000000000048bffffffb88000000", m: "" },
      "No steam finish": { c: 0, f: "00000000000005fb0000000000000000000003bf400000000000000000000038c82000000000000488888300bf8000000000038bfffffa404bc4000000038aaa55558aaa33ac8200003bf8000000004bb85bf800008fb30000000004bf54bc4008c400000000000008c408fb4b8000000000000004c803bfac30000000000000008a3035f800000000000000005f8000f800000000000000005f8000f800000000000000005f8000f800000000000000005f8000f800000000000000005f8000bb30000000000000005f80008f50000000000000008b40005c8000000000000003a5000004a40000000000004ba0000000ab400000000000bf800000005cc75300000258c820000000048cfb88888afb40000000000005bffffffc8400000000", m: "" },
      "Non-chlorine bleach": { c: 0, f: "000000000008b4000000000000000000004bf8000000000000000000008ffb40000000000000000004bbbf8000000000000000000cc55cc000000000000000004f8004b400000000000000008b40008b4000000000000004b40004bf8000000000000008f00008ffb40000000000008ca0005ccafa000000000000fb4000bb44bf000000000004f80000f8004b400000000008b40004b40008b4000000004b40004b800008f800000003ac0003af30003acc5000000bf80008fb0004bf4bb000000fb4000bb40008fb08f000004f80004f80000bf804b400008b40008b40000fb4008b4038c30005c500005a30003fa38fb0004bb00004b400000bf8bf8000bfb0004bf0000008fbffb888fff888bff888888bffffffffffffffffffffffffff", m: "" }
    }
  };

  // src/modules/laundry/laundryVision.js
  var ICON = 24;
  var MARK_W = 24;
  var MARK_H = 12;
  var lum5 = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  function boxOf(mask, w, h, keep = null, labels = null) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i] || keep && !keep.has(labels[i])) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }
  function sample(mask, w, box, gw, gh, keep = null, labels = null) {
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    const g = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      const sx0 = box.x0 + gx * bw / gw, sx1 = box.x0 + (gx + 1) * bw / gw;
      const sy0 = box.y0 + gy * bh / gh, sy1 = box.y0 + (gy + 1) * bh / gh;
      let ink = 0, n = 0;
      for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
        n++;
        const i = y * w + x;
        if (mask[i] && (!keep || keep.has(labels[i]))) ink++;
      }
      g[gy * gw + gx] = n ? ink / n : 0;
    }
    return g;
  }
  function iconGlyph(img, box, level = 0.25) {
    const { data, width: W2 } = img;
    const w = box.x1 - box.x0 + 1, h = box.y1 - box.y0 + 1;
    const L = new Float32Array(w * h);
    let lo = 255, hi = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = ((box.y0 + y) * W2 + box.x0 + x) * 4;
      const v = lum5(data[p], data[p + 1], data[p + 2]);
      L[y * w + x] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (hi - lo < 60) return null;
    const cut = lo + (hi - lo) * level;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) mask[i] = L[i] < cut ? 1 : 0;
    const all = boxOf(mask, w, h);
    if (!all) return null;
    const labels = new Int32Array(w * h).fill(-1);
    const blobs3 = [];
    for (let i = 0; i < w * h; i++) {
      if (!mask[i] || labels[i] >= 0) continue;
      const id = blobs3.length, st = [i];
      labels[i] = id;
      const b = { id, n: 0, x0: w, y0: h, x1: -1, y1: -1 };
      while (st.length) {
        const j = st.pop(), x = j % w, y = (j - x) / w;
        b.n++;
        if (x < b.x0) b.x0 = x;
        if (x > b.x1) b.x1 = x;
        if (y < b.y0) b.y0 = y;
        if (y > b.y1) b.y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const k = yy * w + xx;
          if (mask[k] && labels[k] < 0) {
            labels[k] = id;
            st.push(k);
          }
        }
      }
      blobs3.push(b);
    }
    const outline = blobs3.reduce((a, b) => b.n > a.n ? b : a);
    const ow = outline.x1 - outline.x0 + 1, oh = outline.y1 - outline.y0 + 1;
    const marks = blobs3.filter((b) => b !== outline && b.n >= Math.max(3, outline.n * 4e-3) && b.x1 - b.x0 + 1 < ow * 0.45 && b.y1 - b.y0 + 1 < oh * 0.6 && b.x0 >= outline.x0 && b.x1 <= outline.x1 && b.y0 >= outline.y0 && b.y1 <= outline.y1);
    const keep = new Set(marks.map((b) => b.id));
    const mbox = marks.length ? boxOf(mask, w, h, keep, labels) : null;
    return {
      full: sample(mask, w, all, ICON, ICON),
      marks: mbox ? sample(mask, w, mbox, MARK_W, MARK_H, keep, labels) : null,
      count: marks.length
    };
  }
  function soften2(g, gw, gh) {
    const out = new Float32Array(g.length);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
        s += g[yy * gw + xx];
        n++;
      }
      out[y * gw + x] = s / n;
    }
    return out;
  }
  function correlate(a, b, w) {
    let sw = 0, ma = 0, mb = 0;
    for (let i = 0; i < a.length; i++) {
      sw += w[i];
      ma += w[i] * a[i];
      mb += w[i] * b[i];
    }
    ma /= sw;
    mb /= sw;
    let num2 = 0, da = 0, db = 0;
    for (let i = 0; i < a.length; i++) {
      const x = a[i] - ma, y = b[i] - mb;
      num2 += w[i] * x * y;
      da += w[i] * x * x;
      db += w[i] * y * y;
    }
    return da && db ? num2 / Math.sqrt(da * db) : 0;
  }
  var encodeIcon = (g) => g ? Array.from(g, (v) => Math.round(v * 15).toString(16)).join("") : "";
  var decodeIcon = (s) => s ? Float32Array.from(s, (ch) => parseInt(ch, 16) / 15) : null;
  function spread(list, n) {
    const w = new Float32Array(n);
    if (!list.length) return w.fill(1);
    for (let i = 0; i < n; i++) {
      let m = 0;
      list.forEach((t) => {
        m += t[i];
      });
      m /= list.length;
      let v = 0;
      list.forEach((t) => {
        v += (t[i] - m) ** 2;
      });
      w[i] = Math.sqrt(v / list.length) + 0.03;
    }
    return w;
  }
  var groups = {};
  function groupOf(name) {
    if (groups[name]) return groups[name];
    const names = Object.keys(ICON_TEMPLATES[name]);
    const temps = names.map((n) => {
      const t = ICON_TEMPLATES[name][n];
      const m = decodeIcon(t.m);
      return { full: soften2(decodeIcon(t.f), ICON, ICON), marks: m ? soften2(m, MARK_W, MARK_H) : null, count: t.c };
    });
    const wFull = spread(temps.map((t) => t.full), ICON * ICON);
    const wMarks = spread(temps.filter((t) => t.marks).map((t) => t.marks), MARK_W * MARK_H);
    return groups[name] = { names, temps, wFull, wMarks };
  }
  function matchIcon(group, glyph) {
    const { names, temps, wFull, wMarks } = groupOf(group);
    const full = soften2(glyph.full, ICON, ICON);
    const marks = glyph.marks ? soften2(glyph.marks, MARK_W, MARK_H) : null;
    const all = names.map((name, i) => {
      const t = temps[i];
      const a = correlate(full, t.full, wFull);
      const b = marks && t.marks ? correlate(marks, t.marks, wMarks) : !marks && !t.marks ? a : 0;
      const c = glyph.count === t.count ? 0 : -0.15;
      return { name, score: (a + b) / 2 + c };
    });
    all.sort((a, b) => b.score - a.score);
    return { ...all[0], margin: all.length > 1 ? all[0].score - all[1].score : 1 };
  }
  function whiteTiles(img) {
    const { data, width: W2, height: H } = img;
    const white = new Uint8Array(W2 * H);
    for (let i = 0, p = 0; i < W2 * H; i++, p += 4) white[i] = Math.min(data[p], data[p + 1], data[p + 2]) > 225 ? 1 : 0;
    const seen = new Uint8Array(W2 * H), out = [];
    const minSide = Math.max(12, Math.min(W2, H) * 0.05);
    for (let i = 0; i < W2 * H; i++) {
      if (!white[i] || seen[i]) continue;
      const st = [i];
      seen[i] = 1;
      let x0 = W2, y0 = H, x1 = -1, y1 = -1, n = 0;
      while (st.length) {
        const j = st.pop(), x = j % W2, y = (j - x) / W2;
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (x > 0 && white[j - 1] && !seen[j - 1]) {
          seen[j - 1] = 1;
          st.push(j - 1);
        }
        if (x < W2 - 1 && white[j + 1] && !seen[j + 1]) {
          seen[j + 1] = 1;
          st.push(j + 1);
        }
        if (y > 0 && white[j - W2] && !seen[j - W2]) {
          seen[j - W2] = 1;
          st.push(j - W2);
        }
        if (y < H - 1 && white[j + W2] && !seen[j + W2]) {
          seen[j + W2] = 1;
          st.push(j + W2);
        }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (bw >= minSide && bh >= minSide && bw / bh > 0.8 && bw / bh < 1.25 && n > bw * bh * 0.6) out.push({ x0, y0, x1, y1, n });
    }
    return out;
  }
  function twoByTwo(tiles) {
    for (let i = 0; i < tiles.length; i++) {
      const a = tiles[i], s = a.x1 - a.x0 + 1;
      const same = (t) => Math.abs(t.x1 - t.x0 + 1 - s) <= s * 0.12 && Math.abs(t.y1 - t.y0 + 1 - s) <= s * 0.15;
      const right = tiles.find((t) => t !== a && same(t) && Math.abs(t.y0 - a.y0) <= s * 0.1 && t.x0 > a.x1 && t.x0 - a.x1 < s * 0.5);
      const below = tiles.find((t) => t !== a && same(t) && Math.abs(t.x0 - a.x0) <= s * 0.1 && t.y0 > a.y1 && t.y0 - a.y1 < s * 0.5);
      if (!right || !below) continue;
      const diag = tiles.find((t) => t !== a && same(t) && Math.abs(t.x0 - right.x0) <= s * 0.1 && Math.abs(t.y0 - below.y0) <= s * 0.1);
      if (diag) return [a, right, below, diag];
    }
    return null;
  }
  var GROUPS = [["wash", WASH], ["dry", DRY], ["iron", IRON], ["care", CARE]];
  function readSymbol(img, box, group) {
    let best = null;
    for (const level of [0.25, 0.15, 0.4]) {
      const g = iconGlyph(img, box, level);
      if (!g) continue;
      const hit = matchIcon(group, g);
      if (!best || hit.score > best.score) best = hit;
    }
    return best;
  }
  function readLaundryModule(img) {
    const quad = twoByTwo(whiteTiles(img));
    if (!quad) return { ok: false, reason: "No 2\xD72 block of white symbol tiles." };
    const current2 = {}, scores = {};
    let sure = true;
    quad.forEach((t, i) => {
      const s = t.x1 - t.x0 + 1, m = Math.round(s * 0.1);
      const box = { x0: t.x0 + m, y0: t.y0 + m, x1: t.x1 - m, y1: t.y1 - m };
      const [group] = GROUPS[i];
      const best = readSymbol(img, box, group);
      if (!best) {
        current2[group] = null;
        sure = false;
        return;
      }
      current2[group] = best.name;
      scores[group] = best;
      if (best.score < 0.6 || best.margin < 0.04) sure = false;
    });
    return { ok: true, current: current2, sure, scores, tiles: quad };
  }
  function buildIconTemplates(img) {
    const at2 = (row, col) => {
      const ys = [38, 176, 314, 452, 562];
      const x0 = 42 + col * 140, y0 = ys[row];
      return { x0: x0 + 3, y0: y0 + 3, x1: x0 + 52, y1: y0 + 52 };
    };
    const enc = (box) => {
      const g = iconGlyph(img, box);
      return { f: encodeIcon(g.full), m: encodeIcon(g.marks), c: g.count };
    };
    const out = { wash: {}, dry: {}, iron: {}, care: {} };
    WASH.forEach((n, i) => {
      out.wash[n] = enc(at2(0, i));
    });
    DRY.forEach((n, i) => {
      out.dry[n] = enc(at2(1, i));
    });
    IRON.forEach((n, i) => {
      out.iron[n] = enc(at2(2, i));
    });
    CARE.forEach((n, i) => {
      out.care[n] = enc(at2(i < 6 ? 3 : 4, i % 6));
    });
    return out;
  }

  // src/modules/laundry/laundryOCR.js
  var laundryOCR_exports = {};
  __export(laundryOCR_exports, {
    pictureData: () => pictureData2,
    readLaundryPicture: () => readLaundryPicture
  });
  var TEXT_CHARS = "";
  function pictureData2(img) {
    const W2 = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const c = document.createElement("canvas");
    c.width = W2;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return { canvas: c, data: ctx.getImageData(0, 0, W2, H) };
  }
  function textBand(src, y0, y1) {
    const W2 = src.data.width, h = y1 - y0;
    const scale = Math.min(3, Math.max(1, 1600 / W2));
    const d = src.canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, y0, W2, h);
    const p = d.data;
    let sum = 0;
    for (let i = 0; i < p.length; i += 16) sum += 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    const dark = sum / (p.length / 16) < 128;
    for (let i = 0; i < p.length; i += 4) {
      let v = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      if (dark) v = 255 - v;
      v = Math.max(0, Math.min(255, (v - 40) * 1.4));
      p[i] = p[i + 1] = p[i + 2] = v;
      p[i + 3] = 255;
    }
    const small = document.createElement("canvas");
    small.width = W2;
    small.height = h;
    small.getContext("2d").putImageData(d, 0, 0);
    const out = document.createElement("canvas");
    out.width = Math.round(W2 * scale);
    out.height = Math.round(h * scale);
    const ctx = out.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(small, 0, 0, out.width, out.height);
    return out;
  }
  async function readText(canvas, psm) {
    const w = await ensureOCRWorker();
    await w.setParameters({ tessedit_pageseg_mode: psm, user_defined_dpi: "300", tessedit_char_whitelist: TEXT_CHARS });
    const { data } = await w.recognizeWithin(25e3, canvas);
    return data && data.text || "";
  }
  async function readLaundryPicture(img, onStatus = () => {
  }) {
    const src = pictureData2(img);
    const symbols = readLaundryModule(src.data);
    if (symbols.ok) {
      const top = Math.min(...symbols.tiles.map((t) => t.y0));
      const tile = symbols.tiles[0].x1 - symbols.tiles[0].x0 + 1;
      let facts = null, text2 = "";
      if (top > tile * 2.5) {
        onStatus("Reading the bot message text\u2026");
        try {
          text2 = await readText(textBand(src, 0, Math.max(1, Math.round(top - tile * 0.6))), "6");
          const f = parseLaundryText(text2);
          if (["remaining", "solved", "needy", "total", "serial"].some((k) => f[k] != null)) facts = f;
        } catch (e) {
        }
      }
      return { ok: true, type: "module", symbols, facts, text: text2 };
    }
    onStatus("Reading the text in the picture\u2026");
    let text = "";
    try {
      text = await readText(textBand(src, 0, src.data.height), "4");
    } catch (e) {
      return { ok: false, reason: "Could not read the text in that picture." };
    }
    if (isLoadMessage(text)) return { ok: true, type: "message", facts: parseLaundryText(text), text };
    const manual = parseLaundryManual(text);
    if (manualHasAny(manual)) return { ok: true, type: "manual", text: text.replace(/\n{3,}/g, "\n\n").trim(), manual };
    return { ok: false, reason: "Not a Laundry module picture, message or manual.", text };
  }

  // src/modules/laundry/laundrySprite.js
  var laundrySprite_exports = {};
  __export(laundrySprite_exports, {
    SPRITE: () => SPRITE,
    SPRITE_CELL: () => SPRITE_CELL
  });
  var SPRITE_CELL = 48;
  var SPRITE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAkAAAADABAMAAAAem8H0AAAAGFBMVEX////+/v77+/vX19d8fHw2NjYLCwsAAAAehC3CAAAdoUlEQVR42u193XMb15Xn715QY9kW0LcblDyJxUZ3g5KyY5vEB2XXTDmJRSBxtuZh1rFSedyaj9r3qZrs/hf7B+zD7NNu1dbEM5OtrdpyTFKynE2tVgQIwt44sonuBqAkdix03wblWE6EvvuAj76ND4ryxh7QwakSRf7ww7mnz/069/S93cBCFrKQhSxkIX0h5sIHR4pB2MIJRwhN5OgJM3npC+1f4dlvcrgnykGJL8o56uNP/LFz+OdPnL4pTp6D2P34xQz//n3i9+9/0i0XviLUjz94KH+uppXPUbXUVFgWqkpUBqCz5cY+4RPkuRuDNGNPgBoQDgCNgfT6wwTNPSpeBYg5woPkiM+Wc8MS01aix/kATz/3pgXhACpdc8kAn695BSDdTRVUt23HBDTPtpcLBAAIfRhuDHEMcA0kE+HZEa4Sb3Tp4c5yIRjirNjXT1gxZQ/w+WtBArDCdhlezYK9wcRSVI/HxPsdRICxsL3BvJoFL2uKJQxxkFuC0TwAoFEa6hGAaGdX4dUsBLpTWuLz2cUIiOclNgsIU9exmjXAbyq8Pyw8Gg7YSGwW4KWuY+llQzRvD3DieQkGDwDADzdGfOJ56eeWEaau46zIsgE+dw4ShHzP18wGT19eDjS9Qgr9kVOQ7lQcoLP4V7lqNXj28hLSeoXmbw/woM/vD8p+dcQPvsehVZC+vOwvcx7pn7tAsWkBu42mxbIIt6sJEwM7g6m4IDP5WeCg2vQ3igi3vYQ6LCSwgINquwQAvbt7sv5e68yPLJa19de8Q3NeZ7Eer8CrEqUBU3h7FMOGHvIKvCrYON6bjTO/wlHhlujsUfLd21zmX+6POy0S09P+t2oDJvVsSpQ5nMSwBAgDd2sgpq02GqBmk4mmAoxwxsg0nCqYwt8CsRw2wiHpyWicAcRhJK6nu9ZsuFcrrDvUM3fTPABLZYZtcoOaoSsCkGFNaioTwuEGtSbwlO9P8i1VVe2Mb1mW3hQcQYQz9U6OARAdJcZnqf100yys7HNZz7w5yFc5d4qO0l5zVtdFNBT4JuekWxTtNXt1XYnjXcvq82Vc5b5XaMK27TtrcZyHJXAAouXHcdqwMsTaNZgyn6miJQD8FINxNs/2XlXohTM1zR98xk8xgC3nBvglGWdnc6L6beWwOI5fyLHrryJMJGsXZZzcyx0sMUC4qbh+36zn//ur/8fnTPXnMkMDoOsAsOz8od6iZ9o5+IOhoOsAEJaamIIzjbGE3lIncMstEEsjyXaO+GKEi0wp3Gcc8BVAwgHh2VbRbnJgxJ/DMYgI3rkGctc3egTwhmMlI4IcrvdxSDiIAKtukbs8jjNC2qkdYvZu/XOPAF5mhIOy99Op2t1aR4nhAujah9/s6ICEz6GDGN8qOAZE5tTKfpQU5QRq1hYMInNKl3AQgJWL4GEc50QBEDBaWj+1Esi41tLrRoN1AHAZZ0C44oY33Bg+dw4SASOWCXDAcaSssQiMlOmC93FFxuFXLAYIGRciUDLdK4yE9YzruEzGRZVmbCMAENPPAEIZWTdi+Lw5SCgBFLuhMRXY2sYoXhNK0D3UQXJ93JBw8MZWS6ggMh9KgNApNMOtbfONbRItrJRA9La1sJ3ymcsjXCgBANLS6yYByBwuxIYOSoEdlve6EMS3zL7Z6OOZQC0lhCCOZUJIOOuqBkcfZ10Jb1a2U6CAZUIZhkEiBaZZZrUrauA8jjPoBc/WXAYoXT6vXYyAZdJ53U+rjudSNPloqFFEdafH06rvuUTGWSabXhvibnRhLPPdmtLK5+HIfMAInZRd8IwOJ3E9oO18xabrjMT0zNsYxI3QL3v2vXWfgUaTreDGytaemIIz4Zf8Pq5JkzM30P07x1+6sq3EkrmcMbHVDKt8N5bkFdxgSiFZX2mWmpjT+0FLABA4Xw22w7vJSmpfUCk7HDhf5Wq31pvE/yziBzF+sN07OFNR9gWlcT1wcIsIYBxnVlVp3VkzmnOale476OOvq8qWpt2tmsCSnxo29eDjr2tQdqyD7gSuKlua1se9CXwXFnDPU3xJjzYqMY63vve+qqKVIZKeuXOQUFQb8DzABp4PWTTNMBuAPY4jxhcSX8IvhiNHCKHaoxKfl3CF2S97VQCJv7gu6583B8En5RGSDiI7fToVFzG+lMWR8YSUgRcx/ZD1G40yAByWlgM+t10MghYj6KZ0YZ8LziVcTaYNAOJN3bg5v2OQEBUJimbbR8erUjjM3WPoSdTQAYCkUZnLWf73IdK8zR6RT5Z+kBuEG99/aY6neUCVIDkt84g4f0Q+S3v1/keKvUIEFjLemBI5Y9CCErmFO6YIG8XPjCy8Ma0JGaM1D1t4YyELWchCFrKQhSxkIQtZyEIWspDjLaf7P+WltODRp7FdX9Fu+Vl8asi4g4fxZ+FzJ/J1HecW5yw+e0T+o5b7L9WCCM1JUK8W2bwp13BjeINnJj9xRW5w1WESdRZ/pp45kiUAyFyINfV6OLqArPSB6A3vO8zimxfy/a5CGIBOLRx4aBZ/Fj53DgK1AF9F/4dspmJP7QLUJFP4ln3R4wA1IGwARmjZR/Jn43PnILy3b2+UADQqWvcvpY/D1yKzX5bw9/e91XE+vbqLj27w4qYIWGqbtP82fTl0R/zp+mfhc+cgEa6WPD9QN3DtWGOlCJeLE/xmYZ+mrE3b52qh+E+Ws6HfjPirxWn6Z+Fz5yC0r/Zu1ZAoFTp3jvW99tXk1hg/9dqr67uHLzR2XQD5tbfN/K3miH9YnuAfic+bg0gh8+O6hXBbzb5zrMlvCp8bDWM5u7LVtYAdWjxV2L0+2nZIrOn6Z+Hz18W0Rl23QXX7JeNYXWwav+WSTVTrKRswtq8UGg3DOZL/Gcr94mXQ8xNGI+MCYavaZcf52lR+aLI9CyEDiGtYSbSco/mfodx/uS6WrKcAQOjusWqSJPtBS2jE+DS5v8FrLMgkiqm9PPMexp+Jz18LcqAxyyImsY9laGLYOAKZL5B40CytdTPtVf1aHnyMb1ljfCDhgFgGtVhgG3Pdgtht3SYczKbyJksAsIa/2DLKbuv9ECc4jPGND197dQP18vpurRSO8YkNxsf47Lbu2oANekjFXDuI3Cl3Esr18oN3glSMYE/9WrTVgMX59HyjtHoqv3vd5KkxfmZZuTbOZ4TQzfDGSwddOlbuvM1iolC8+ZTeLD54K3ZhEN8aDJ7hP8anseH/fowvPLpLNtMHDcOJ4wKk+4Ju+4E/jtPig4+L4V4cn79AkT/F06zLxPguJqENxoZebHtKlLtJjgcAbG+T3W4aY5MSBwmUQBHj7YQLJgg4m9OzPpGDmJd7f0nnxB/bpkPfYMNFQWz2GW3ZPYzPbipPvOo1n+/WVDbGF0qgt0J043wW+MEDwd4j3fl2ECHVTHX57kH1I9WIr6o974hMJEDijoBol/U33lZL4Tss7lEIUfnIF3SMT9CzP3pbd9i87g9aGrb0lR+ygwPyBqXHyjrwUU+MDx2cltZ363oF5aVwnM/5wSRfCPIGET8EpfM5BA3jID/bsqCZwsrkjzXb+tnWoGvG+b1EvrKjNx80EtEyY8hXNRNQ4nw/2xKWQqxxfO4cFKrwuOfAFpp7nK+F6iD/nJL5RDS1g4bpiu7ujiXkcTdUofqeAyhx/aEK1ebCHsfnzkGCrqkAoLWNYxk6lU98T1tptBzAM6u1rOcZMp9N0z8LnzsH9faLjsmI5hWTteN8rbdfmuRnEtnUjQ3dMjXLKa7UrELraP4R+Nw5CI3lTYcaXjbvHO97jaVNhxpeWua3N/T3q+ms7Xj2xpXGTmtzbYI/oX8WPnfT/INakWx7G+nkzfh0O2MJOY2vXl63tfN7ReIFarFzw/JQDhwcrX9muXO31ODbrKAGWubWfmLWUuyCPHYEA/5uxA/yB/ced9ukaMPqbYXuv7luiCjynq5/Zrnz5iCaFQ1kEVZa8QetSee8wD6UeqY14DcjvtjqXFoqo+daCGtLZUIq0cw9S/8sfO4ctLoMqADNZuNPVpTPeUFykMSPWkNFQxYQBKBZBoRqZRo/pn8WPm8O8nj/B2GxPQf9G4BRdxiuv7jMx4hv+o1ROOwBITeHH83SPwufc2FYyNiiU5N9IlVl7AgO80c5jll8YnAprI4Ohs3iz8IXspCFLGQhC1nIQhaykIUsZCELWchCPrM8LI8XO4/jL/w1IWzRgo7+mOSlvwZvfviDkoe8X4yt5iSn9Fz+B+sg+RlasbN/RJVaW/SkQ4lPQj5jzJL0zNR/QrpYfOdd9Fesiy1/GD3Y7njKxZemBWXO5aQKvjXqSkKRHvAnnYdSYyftdkaOoPSvJOXvXR/5uWxEcPj34cnrYnJda1JXCszhr9ITyUFoVrrg3rXpLYVowyYklBM7Mw4c5Lq3RhD9njxcONFQI6HJRif6S2p8YfifpBb35OhX/uMITvztiRyk1ZkzvzalxpvSYBR7wN+MN83Kez3JSRyD4PtR99mIXZrhDPe5Sts7hDbjgqWb1YYMR5tl6cl0kDRFx3YsM+5sDGo/ttCILpjQI5cnkvQbKQlOqIM0xem7IC1fK0+XRr2Df4h4Z/IBqBi7YGLa/mToA6KGfZiaJ9NBlu1pJgD4cqyTSWxk/F3uAypRrdjIlLIH7Sq+80kLbWoyAH441lORZQCE555IB2l2VlULAIQt+YG2r+qV7SlxELTQLQIq/LExiIaHxX6QZMtb9EnGKRLLBBDuLZ9EB1FvI2vA44CWBW4PP01d1Cs7JhccIEyN+6GcHozC8h4iot/ZLEDYALEsvB8NP61ylvX1F9E7gQ7Sl4tKBb7gqq1itGuMJPL29cEuKMHlaFBfej4f9oNs1ZIuWLnzqtHgPnzCPGkwI365EFYEFwFzmBw3nRgH3XkhuT1cVNDowrqp1zNTd+20r2Z2eccFQCznpcgRh1czu53aRKCoXCgcONVpcdMJcRB7YWWnqvo0xU0ijSmZS53W9GVTSd9ucGIB8BqJyEHKBWN3G1R3VV+OGMlh4aDiWrCpQthJDBTJvdzNquUWO4lsRQoUCWXVqe+6oNncboWa3AagatLYpBUOtkmh0y42isKJ1l/KxeTrTdNGscN97yQGiuxC74bKs+Xbn6x1pEmYNMv7U99bqVudayTs9z1fCvxIK3XTTJTff+qbYiP5H6OvauZBU3FIonywc+LSHRQAFHNX91Ma0owyOQomytTUFj00GplpC3hWCOt+2jeNgCpEj/hd5UcKB6gwgxPnoCUAtP3tfwgBAQGAyz1AyInDqEUEyRtThybFbOjcUx9wJiCkk3k8xQT6O6hPZsKMpHQXzXauemqlFv9YXn95F4d+WBVT5zYCtFxy6NxtPdfZf9IdNaHUBQEOIHQ/yjgn0kEQLiCSlX3yu/j7deSTCNFZBIXOSL22XqhC9CoNuu22V6IjlkxzOADR222wk9mCBs9XqFiibmjSNCy6xRh5GGEzx4w3nOFvwgLQsMS+FXY1icL7/IYF7YTmg+zhTxsYTfMi1QDSPQ4AiSQHRmcRQnl5IS9W7UiNJ+WPBgvb/seJE+igeFcaNaBgq9gjH9UA4NJX2izK36eLU1uQEtczmuj8lRjOT56DEtO7ErJlj4eAZUM5e84cZSr4enqqQ1OI67nVd1FwNh3jn7jFqgi34uBwDBZOJWsZmudsmMQUu8OzGt2leBsYzUzBwQGmeIJXx4KCk3S77OgRk3UtI20ITlhYdUbP/CMkF/eQPUv54Blm7ER1qmlxEAMA1R/exhplNjjcnGcQMDhk5B8IpTpDm9Z/nR/rDzOje9KByfv4wF/OSXPQ4OCSP3GrWDOXs7CFo7EsjL3ROi2Ip5uj9YjX/12MjcPC532cT0SfJ7uLEfp3ocPv1oDEFWKx1x/x1vyXQo4MSgh57MN7O7828dXwZ+nf/OqTD+7/4TnoYWHty79zPQ6o6oVPr+MPUY4Oa4ml3f3kAwD3lcRT98l9LGR8nh/dYl68IG0hC1nIQhaykIUsZCELWcgXssz9Mqw9ondNfw7LtC9FNT/0dSef9SYVob/N3z/5q/v0xdP8/9ODM0To5fwjO3Xu/KMul1qP0MTII+xgpnfWG8ocdfjPJryR+MakUeTRdnITFVDZxLW+/Ddk+khN2PFHcHXwDwwAiQ9rU8s9Qv9M/lF68PJfHz/RRU+9wqZWO2ETBmlL/+ElWAVriqVsBj5FPwWDCi1rGTBAYE42tylqZujvA5P8o/QULSz9+5fUI+2Uzmro57I/mqxjpVXUFKcT76okdbl34/ImsNsY3zOmBtPxKfqNiw+uU7+4aqBTrcFolbZ4NGJmBuWO33ScpT8zzc4j8KGe/eKNI+2MZjGiPaPemxjTf8s3Sl/RrNO/iRmqffTKreVN71f8mdNVI/YV8snGAGdjc9yEfoLzuY8fW37xKcd/2vj4iea3jHejeVH7YFDumEWz9NOgOMVOgE61X9LzP19cit/FI9oz7OOo1MhBtPudlvDHHZRZLTWcX33wzOmbMvrU5VNv/3njnZ2fn37msVq84Z4f4j+P4/dp9zv1x3x5h9/j959hN8rnqv/j56ef/OOd4p81/vcnUQmjcsUU/bfH9bOnstP5mYfpSdw13ox9RLvfaYV8ioOMrP7m+ptj91Zp98XeOz+1m6f/5N7jPIqBDl/52WrvJ++Zqf0n8r+EVJXkiRd779QncTx+38jq7116U7DTI/hT73d/cvprt65ZqSp59v5q778o96eUG2tC5IkXez95z0yO6//tDH6kJ95OyJNDPYX/Wrp3WlZlZPX6pcgPIwcRceHjDwq/GQv+MhfWflI31dT+k1+7HvlO+fq5//av33ov49BztWdC+XaimrjyVj3j0HO1p/9Iwgl9inxy4c4HhV+S7lORoZrz9Neq1y07sP7v409e+skTv5pWbqzO1MSVqeXO4kd4vJ2o2p++9Z7u0HO1Z568+6+uyVUsLtz5oBB5fxQHkUPDsVtjDYi0zWo9tO3WSiW9PgoY6L3cbqlTTznwmit7eblmlOIQd2RcaKXg0OB2S1GKhaiTeSsVyoQH4RhNs1r3Jsp1k3K5A/26A68VL5e087t1xbaDle0Yn7TNal237ebKuJ5sp55y4TVX9orb6XVp1iKHhm+3lMlAUajJfd0vxqNdYeq2USwW9dbdfXP0wsJMqfOWUdE5ANGtJjKyQUzCpWOwIr3W19+2fKkSuupedrMLZNqbPV/a1C9M3dazxWJRu7uvurJ+o6K7AMJ4ucJMHa4jW0R7fV9txu3X3WxBidk/0DO083ytJE2JipmsGzzyw8hBatZngaPGd16wtNdqbpTLGxnTG0UpJBAHairoX45/vinvPSe6hEeeEMnr2b5+c+WaRPesXrOwZtBWKVW7EsTLxWq5XNYNL09i8cXUclnaW15nq5uBtunnx+x3zdXNbijZDwAx+7cDqc5I2mfNnMonHBRmGqnAPiyMRVONDODzrBHs0WGzE2HnTTVs9lUIwk25xmRc8kSraimNVGCjWFWlrkEzndcS2ZZezFf341FfQwd830crKheAMkM/YQ2REAxGIKqx8/2soRMwkmPNuJ6Y/efl7U5hppGywsP8uIPIvUyLhytcj4WcQYYAaFRclSvRSwh5JRO9JsR3FKkmNZdFuFzs+Xqq5YbJ2ooj1xYR9fPV7DfaVm8nI18AzxAAYaXCocRefiiV68f5rtoGSeV8ccjiekiL0RQ7Sg+VHETuZVqBZrsjPwwdxAqey9F1srEzz0RpukBnl5siyaMmrXF4Q/O6bkIOaoWIcKnTo9sxUwYJEnvN2GwrWHenebmkb5mOfAH9csNKpZaSywUQDssNarQp8x1CWKCq4YrMJ0rTBUm5IOGYHi8T6fGlPsAKnuvnOv7ID3TU6Do64Fdjp1kIgQuAWozHchWe/LAJxmQHeRIufyVl1rMtlljTjHgChPsrFWo26r7CJ8olxaLBx3Iko3ZDmEpkPgNSrmCx138RAhdKPnSzzfFcy6giCVMDR+58ncxSqlWlYy2Itg2XAyLZWmMTecPshtEQYmyt/Wg5H9rWOpaulBpUH0svCOq4isfG30/HACyVNxkTx8spMQ+5kGvgYlyPoglfZTie/bRtuKIQume6a0bMQcxK7nMAwk23Jgy1TI8zEl+xRHbwmE0zcGYld+uFO2vVuH4BRt2S3txIGe3J/eWh7UxcyaxymSAquAZ3/MpJF80U0Y3j2c+s5D41K6k0hnYOHJRS+1t5iWdKL98TAi6ASuXW/njNaMMBQBi9Ua+yYriQqiyl2aSSLdnNmH6AQLfy9muJYlNVYuVyAL1/+GHtiHJFdJBfwEVg+qGqxPZgCwFOiEFNipl6FMn+vp1NpdltKUM76SB8NPsvu+J2N/aORrJuAHe36gqhsRrwRw9DMdRgeGXMDmQ8VOTwlLNUfc02YvqFANrFXuX8XvYbPHb4k6wZALEsRiikHEisXG94AgRCkPWUq7oOVYI4n6xlAsWyYI3hYqSHmQGLhdGGlXL0zc7QzkELCgbTr8g0LbmRNhUA1NI5aSmSh4JwFM0IY5gBIPxb6zIuz1eB7ogQ2Pdj+okI1kqZrVZ3u7lhCmmsF00GAI7NSSsjq5H1B+2rkp2Mc08IEcT4Yp8JK9zaqpmkJc8CgRfpYXIGI1hphqatdlljaCcdTG7+4HJCz5T4ipsOgDB0oZhJ6QKIQweDGG2z0eOqGC3KuMPlybNJ76zVvxHE9AultpRv7Kf8lUpivcbGy2UAFFN+PWesXL9oSHwOBgRCxPgKTwcqKhWfKGZyup47zJXt9N226qpdfX9oZ99BvmkPzge29hLyYs8zOfMAEMWSHR2u7Fv9QUy3ku6oP9rp56bgff2ZVMmzN9S4flTTnQrjomlfszqxaMEMELoAUSxnVrlv520S8bthgycdNxPjwzODlG1ZdnOm/aZspzDtDFnxw0IYDO1MAADJ/um7n6qqqqoqS55Z4vejfOKzZ+7/rw84tF9v7sqZEJXmfqFywGpufDxKO3zqP200c7/Q/DG8r7/9yk8/OXMGqTOjzAyhn5QvvVN/7D6o/jjN/yJK+n3Knz3TrbwLaL++8s6Mcg+Tl7aHSYlP+bNnfvlTfr9xuxvjf8qfPbPzru//5meHx7Af5Mkr7366mnLJ07/A0A/9nHQrjKLtc89Fg0fI3I3rlg/Vfj4ZSwI3W/niaxZgX157I3pHllJ9pXc4iff1v9yoIvEX13HuudFElFnON5bXWhbC9rerRvGfRktlkXQ3rluCq/a3U+PlZrf7+v+xbHd5xF+9bvlQvedj/L4eH2p4NjlLz5acXQiruNywE6Vb9tAPSwCQucijE29UzhfQRq60DfireTs2i4XG3jdL28BGwa5HZ52Cw2ZuhO9HBWcu8jJf2ysD7RKJ9NP2C729q+A2EmXlQW1tLfAnyjUny0Vffzr1esp7GH+EF2bqqUl2XuJlZDplwpbLQz8sASBdVT7xJtaiMxk+rxVVO1CzydfjcVyrrRY1X9WSN3VXqrDqK736AM+4UaymptW6nzYg9vJv50b6M2czP27sbJJVohq7dcI2fjjqZA8vd3fDlh6bMYvvY4RjXE9h0k6WTgNZBhQBiHXfHRyoU+SVMUQgzzNbLKtBDd9oxiOt0DhgFhBu1+XDct1uc/1HE7hQfMXP7OV9QDnseRjoJ/7FRt2qkCsAdncYq7wSDUIzyxV6v9w3/ij1ulw1M/gifAT7h34YtOP+68IGk70UPJCUK2eWRKJgwmvsjd+foqFmMdFw47hx6pUfd7UJnGbOPvefmQDD8jf/fqSfZTvER9c04VVVn4ZF25fW4UeW6zT/5qN/DmN5h+l8VRxuHt9+muGE+YPnRsX88NAdB2zqbeMJnNDv//U0PPHvcv07n4nvb8aVD+6ITnzlIeVe/kHuePxHs39Slh5GENAYJu+XAT5UYBwXiv1SLuATuNrrN2WxYq9IT4oVgOCEwRcAeCzfe3S53UKjHk7a2X/l3bHw6fbH1un889gvQej3X53cHEESuWH24PfyeCX17A/yxpRLmrlD4phqwaJGpzJ8LsIufHeaRfToi3hkB32X4oQKocYUH0Rbg6jx+3AQNYyT6qD4exE/J1FBTqx/vpjdr1+KLbYLWchCFvJQ+X9vs9YizYnW1QAAAABJRU5ErkJggg==";

  // src/modules/battleship/battleshipSolver.js
  var battleshipSolver_exports = {};
  __export(battleshipSolver_exports, {
    SAMPLE_MANUAL: () => SAMPLE_MANUAL,
    analyzeBattleship: () => analyzeBattleship,
    cellName: () => cellName2,
    colLetter: () => colLetter,
    parseBattleshipText: () => parseBattleshipText,
    parseCell: () => parseCell2,
    playGame: () => playGame
  });
  var colLetter = (c) => String.fromCharCode(65 + c);
  var cellName2 = (i, cols) => `${colLetter(i % cols)}${Math.floor(i / cols) + 1}`;
  function parseCell2(s, cols, rows) {
    const m = String(s || "").trim().match(/^([A-Za-z])\s*(\d{1,2})$/);
    if (!m) return -1;
    const c = m[1].toUpperCase().charCodeAt(0) - 65, r = Number(m[2]) - 1;
    return c >= 0 && c < cols && r >= 0 && r < rows ? r * cols + c : -1;
  }
  function parseBattleshipText(text) {
    const t = discordPlain(String(text || ""));
    const ships = [];
    for (const raw of t.split(/\n|;|(?<=afloat|sunk|sank)\s*,/i)) {
      const line = raw.trim();
      const m = line.match(/(\d{1,2})\s*[-‑–]?\s*(?:cells?|squares?|long)\b/i) || line.match(/\bship\b[^0-9\n]{0,12}\(?\s*(\d{1,2})\s*\)?/i);
      if (!m || !/ship|cell|boat|carrier|destroyer|cruiser|submarine|battleship/i.test(line)) continue;
      if (/ships?\s+lie|never\s+overlap|wait\s+\d+\s*s/i.test(line)) continue;
      const len = Number(m[1]);
      if (len < 1 || len > 10) continue;
      const status = /\b(sunk|sank|destroyed|down)\b/i.test(line) ? "sunk" : /\b(afloat|alive|intact|floating|damaged|hit)\b/i.test(line) ? "afloat" : null;
      ships.push({ len, status });
    }
    let size = null;
    const sm = t.match(/(\d{1,2})\s*[x×]\s*(\d{1,2})/);
    if (sm && Number(sm[1]) >= 3 && Number(sm[1]) <= 10 && Number(sm[2]) >= 3 && Number(sm[2]) <= 10) size = { cols: Number(sm[1]), rows: Number(sm[2]) };
    const shots = [];
    for (const m of t.matchAll(/\b([A-J])\s?(10|[1-9])\b[^A-Za-z0-9\n]{0,4}\s*(hit|miss(?:ed)?|splash|sunk|sank)\b/gi)) shots.push({ cell: `${m[1].toUpperCase()}${m[2]}`, result: /miss|splash/i.test(m[3]) ? "miss" : "hit" });
    for (const m of t.matchAll(/\b(hit|miss(?:ed)?)\s+(?:at|on)\s+([A-J])\s?(10|[1-9])\b/gi)) shots.push({ cell: `${m[2].toUpperCase()}${m[3]}`, result: /miss/i.test(m[1]) ? "miss" : "hit" });
    return { ships, size, shots };
  }
  function placementsOf(len, cols, rows) {
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c + len <= cols; c++) out.push(Array.from({ length: len }, (_, k) => r * cols + c + k));
    if (len > 1) for (let c = 0; c < cols; c++) for (let r = 0; r + len <= rows; r++) out.push(Array.from({ length: len }, (_, k) => (r + k) * cols + c));
    return out;
  }
  var popcount = (x) => {
    x -= x >>> 1 & 1431655765;
    x = (x & 858993459) + (x >>> 2 & 858993459);
    return (x + (x >>> 4) & 252645135) * 16843009 >>> 24;
  };
  function analyzeBattleship({ cols = 6, rows = 6, ships = [], shots = {}, trustAfloat = false, budget = 4e6 }) {
    const N2 = cols * rows;
    const hitSet = /* @__PURE__ */ new Set(), missSet = /* @__PURE__ */ new Set();
    for (const [k, v] of Object.entries(shots)) {
      const i = Number(k);
      if (i >= 0 && i < N2) (v === "hit" ? hitSet : v === "miss" ? missSet : null)?.add(i);
    }
    const base = { cols, rows, hits: hitSet.size, misses: missSet.size, prob: Array(N2).fill(0), best: [], ties: [], certain: [], bestP: 0, total: 0, exact: true, done: false };
    if (!ships.length) return { ...base, ok: false, reason: 'No fleet yet \u2014 paste the manual text (the "Enemy fleet" list).' };
    const cells = ships.reduce((a, s) => a + s.len, 0);
    if (cells > N2) return { ...base, ok: false, reason: `The fleet (${cells} cells) does not fit a ${cols}\xD7${rows} board.` };
    if (ships.every((s) => s.status === "sunk")) return { ...base, ok: true, done: true, mode: "done" };
    if (hitSet.size >= cells) return { ...base, ok: true, done: true, mode: "done" };
    const WN = Math.ceil(N2 / 32);
    const maskOf = (cs) => {
      const m = new Uint32Array(WN);
      for (const i of cs) m[i >> 5] |= 1 << (i & 31);
      return m;
    };
    const hitMask = maskOf(hitSet);
    const order = ships.map((s, i) => ({ ...s, i })).sort((a, b) => (b.status === "sunk") - (a.status === "sunk") || b.len - a.len);
    const cand = order.map((s) => placementsOf(s.len, cols, rows).filter((p) => {
      if (p.some((i) => missSet.has(i))) return false;
      const allHit = p.every((i) => hitSet.has(i));
      if (s.status === "sunk") return allHit;
      if (s.status === "afloat" && trustAfloat && allHit) return false;
      return true;
    }).map((p) => ({ cells: p, mask: maskOf(p) })));
    if (cand.some((c) => !c.length)) return { ...base, ok: false, reason: "No way to fit the fleet around these shots \u2014 check the marks and the fleet list." };
    const sameAsPrev = order.map((s, k) => k > 0 && order[k - 1].len === s.len && order[k - 1].status === s.status);
    const restLen = order.map((_, k) => order.slice(k).reduce((a, s) => a + s.len, 0));
    const counts = cand.map((c) => new Float64Array(c.length));
    const pick = new Int32Array(order.length);
    const occ = Array.from({ length: order.length + 1 }, () => new Uint32Array(WN));
    let total = 0, nodes = 0, aborted = false;
    const dfs = (k) => {
      if (aborted) return;
      if (++nodes > budget) {
        aborted = true;
        return;
      }
      const o = occ[k];
      let open2 = 0;
      for (let w = 0; w < WN; w++) open2 += popcount(hitMask[w] & ~o[w]);
      if (open2 > (k < order.length ? restLen[k] : 0)) return;
      if (k === order.length) {
        total++;
        for (let j = 0; j < order.length; j++) counts[j][pick[j]]++;
        return;
      }
      const start = sameAsPrev[k] ? pick[k - 1] + 1 : 0;
      const list = cand[k], next = occ[k + 1];
      for (let p = start; p < list.length; p++) {
        const m = list[p].mask;
        let clash = false;
        for (let w = 0; w < WN; w++) if (o[w] & m[w]) {
          clash = true;
          break;
        }
        if (clash) continue;
        for (let w = 0; w < WN; w++) next[w] = o[w] | m[w];
        pick[k] = p;
        dfs(k + 1);
      }
    };
    dfs(0);
    let cellCount = new Float64Array(N2);
    let exact = true;
    if (aborted) {
      exact = false;
      total = 1;
      cellCount = new Float64Array(N2);
      order.forEach((s, k) => {
        const ok = cand[k];
        for (const p of ok) for (const i of p.cells) cellCount[i] += 1 / ok.length;
      });
    } else {
      if (!total) return { ...base, ok: false, reason: "No way to fit the fleet around these shots \u2014 check the marks and the fleet list." };
      counts.forEach((cs, k) => cs.forEach((n, p) => {
        if (n) for (const i of cand[k][p].cells) cellCount[i] += n;
      }));
    }
    const prob = Array.from(cellCount, (n) => Math.min(1, n / total));
    const open = [];
    for (let i = 0; i < N2; i++) if (!hitSet.has(i) && !missSet.has(i)) open.push(i);
    if (exact && open.every((i) => prob[i] === 0)) return { ...base, ok: true, done: true, mode: "done", total, prob };
    open.sort((a, b) => prob[b] - prob[a] || a - b);
    const bestP = prob[open[0]];
    const ties = open.filter((i) => prob[i] >= bestP - 1e-9);
    const certain = exact ? open.filter((i) => prob[i] >= 1 - 1e-9) : [];
    const sunkLen = ships.filter((s) => s.status === "sunk").reduce((a, s) => a + s.len, 0);
    return {
      ...base,
      ok: true,
      total,
      prob,
      exact,
      best: open.slice(0, 3),
      bestP,
      ties,
      certain,
      mode: hitSet.size > sunkLen ? "target" : "hunt"
    };
  }
  function playGame(layout, ships, cols, rows, { reportSunk = true } = {}) {
    const shots = {};
    const owner = /* @__PURE__ */ new Map();
    layout.forEach((cs, k) => cs.forEach((i) => owner.set(i, k)));
    const state = ships.map((s) => ({ len: s.len, status: reportSunk ? "afloat" : null }));
    for (let n = 1; n <= cols * rows; n++) {
      const a = analyzeBattleship({ cols, rows, ships: state, shots, trustAfloat: reportSunk });
      if (!a.ok) throw new Error(a.reason);
      if (a.done) return n - 1;
      const i = a.best[0];
      shots[i] = owner.has(i) ? "hit" : "miss";
      if (reportSunk && owner.has(i)) {
        const k = owner.get(i);
        if (layout[k].every((c) => shots[c] === "hit")) state[k].status = "sunk";
      }
    }
    return cols * rows;
  }
  var SAMPLE_MANUAL = `On the subject of Battleship
Ships lie straight, across or down, and never overlap. Tell the Defuser where to fire. After each shot they must wait 20 seconds or the bomb detonates. A shot knocks the module in that slot offline for 20 seconds. Sink every ship to disarm this module.

Enemy fleet:
\u2022 3-cell ship, afloat
\u2022 2-cell ship, afloat`;

  // conso-logic-entry.js
  var conso_logic_entry_default = {
    mines: Object.freeze({ ...minesSolver_exports, ...minesVision_exports }),
    queens: Object.freeze({ ...queensConstants_exports, ...queensSolver_exports, ...queensVision_exports }),
    search: Object.freeze({ ...searchGlyphs_exports, ...searchOCR_exports, ...searchSolver_exports, ...searchWords_exports }),
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
    wireseq: Object.freeze({ ...wireseqManual_exports, ...wireseqRules_exports }),
    limbo: Object.freeze({ ...gif_exports, ...limboSolver_exports }),
    pipes: Object.freeze({ ...pipesSolver_exports, ...pipesVision_exports }),
    hangman: Object.freeze({ ...hangmanSolver_exports, ...hangmanVision_exports, ...hangmanShot_exports }),
    astrology: Object.freeze({ ...astroRefs_exports, ...astrologyVision_exports, ...astrologySolver_exports }),
    cube: Object.freeze({ ...cubeSolver_exports, ...cubeVision_exports }),
    circuit: Object.freeze({ ...glyph_exports, ...circuitDigits_exports, ...circuitVision_exports, ...circuitLegend_exports, ...circuitSolver_exports }),
    chess: Object.freeze({ ...chessVision_exports, ...chessEngine_exports }),
    page: Object.freeze({ ...leftPage_exports }),
    text: Object.freeze({ ...discordText_exports }),
    blackjack: Object.freeze({ ...blackjackSolver_exports, ...blackjackVision_exports }),
    batteries: Object.freeze({ ...sectionsData_exports, ...batteriesSolver_exports, ...batteriesVision_exports, ...batteriesOCR_exports }),
    wireplace: Object.freeze({ ...wireplaceSolver_exports, ...wireplaceVision_exports }),
    laundry: Object.freeze({ ...laundrySolver_exports, ...laundryVision_exports, ...laundryOCR_exports, ...laundrySprite_exports }),
    battleship: Object.freeze({ ...battleshipSolver_exports })
  };
  return __toCommonJS(conso_logic_entry_exports);
})();
window.BombLogic = __BombLogic.default;
