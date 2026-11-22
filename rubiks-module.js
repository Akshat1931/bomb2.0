/**
 * Rubik's Cube Module Solver for Keep Talking and Nobody Explains
 * (port of bomb_boomed's Cube Vision)
 *
 * 1. Paste a screenshot of the cube: the 27 visible stickers (top, front-left, front-right faces)
 *    are found and their colours read.
 * 2. A depth-first search (IDA*-style, up to 10 moves) finds the shortest move sequence that brings
 *    the visible faces back to solved. Click any sticker to fix a misread colour.
 */

(function () {
  'use strict';

  // ── bomb_boomed/src/modules/cube/cubeSolver.js ──────────────────────────────
  const { FACES, SOLVED, searchCube } = (function () {
    // Pure Rubik's Cube state solver & IDA* move search engine

    const FACES = 'URFDLB';
    const SOLVED = 'WRGYOB';

    const rot = (n, v) => {
      const c = [n[1] * v[2] - n[2] * v[1], n[2] * v[0] - n[0] * v[2], n[0] * v[1] - n[1] * v[0]];
      const d = n[0] * v[0] + n[1] * v[1] + n[2] * v[2];
      return v.map((_, i) => -c[i] + n[i] * d);
    };

    const DEF = {
      U: (r, c) => [[c - 1, 1, r - 1], [0, 1, 0]],
      R: (r, c) => [[1, 1 - r, 1 - c], [1, 0, 0]],
      F: (r, c) => [[c - 1, 1 - r, 1], [0, 0, 1]],
      D: (r, c) => [[c - 1, -1, 1 - r], [0, -1, 0]],
      L: (r, c) => [[-1, 1 - r, c - 1], [-1, 0, 0]],
      B: (r, c) => [[1 - c, 1 - r, -1], [0, 0, -1]]
    };

    const FL = [], IDX = {};
    for (const f of FACES) {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          FL.push(DEF[f](r, c));
        }
      }
    }
    FL.forEach(([p, n], i) => (IDX[p + '|' + n] = i));

    const PERMS = [], PINV = [];
    FACES.split('').forEach(f => {
      const n = DEF[f](1, 1)[1];
      const p = FL.map(([pos, nm], i) =>
        pos[0] * n[0] + pos[1] * n[1] + pos[2] * n[2] > 0
          ? IDX[rot(n, pos) + '|' + rot(n, nm)]
          : i
      );
      const p3 = p.map((_, i) => p[p[p[i]]]);
      PERMS.push(p, p3);
    });

    PERMS.forEach(P => {
      const q = [];
      P.forEach((v, i) => (q[v] = i));
      PINV.push(q);
    });

    const MN = [];
    FACES.split('').forEach(f => MN.push(f, f + "'"));
    const OPP = [3, 4, 5, 0, 1, 2];

    async function searchCube(obs, maxD, tick) {
      const vis = [], want = [];
      obs.forEach((c, i) => {
        if (c) {
          vis.push(i);
          want.push(SOLVED.indexOf(c));
        }
      });

      const start = new Uint8Array(54);
      for (let i = 0; i < 54; i++) start[i] = (i / 9) | 0;

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
              const key = t.join('');
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
        seen = new Set();
        if (L === 0) {
          if (vis.every((i, k) => start[i] === want[k])) return { len: 0, sols: [''] };
          continue;
        }
        // Yield each depth level to let the browser breathe
        await new Promise(r => setTimeout(r, 0));
        if (Date.now() - startTime > 4000) {
          return { timeout: true, len: L, sols: [] };
        }
        for (let f = 0; f < 12; f++) {
          dfs(0, f);
          if (tick && (await tick(L, f)) === false) return { cancelled: true, len: L };
          if (hits.length >= 40) break;
        }
        if (hits.length) {
          return {
            len: L,
            sols: hits.map(h => h.slice().reverse().map(m => MN[m ^ 1]).join(' '))
          };
        }
      }
      return null;
    }
    return { FACES, SOLVED, searchCube };
  })();

  // ── bomb_boomed/src/modules/cube/cubeVision.js ──────────────────────────────
  const { COLS, COLOR_NAMES, cls, at, POS, detectCubeStickers, sampleMedianRGB } = (function () {
    // Computer vision for Rubik's cube sticker detection and perspective geometry

    const COLS = { W: '#f4f3ee', R: '#c8221b', G: '#0a9b4a', Y: '#f0c800', O: '#ff7a14', B: '#1f5fd1' };
    const COLOR_NAMES = { W: 'White', R: 'Red', G: 'Green', Y: 'Yellow', O: 'Orange', B: 'Blue' };

    function cls(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      if (d / (mx || 1) < 0.25) return 'W';
      let h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
      return h < 13 || h > 340 ? 'R' : h < 38 ? 'O' : h < 85 ? 'Y' : h < 190 ? 'G' : 'B';
    }

    const at = (g, a, b, c) => [
      g.V[0] + (a * g.p[0] + b * g.q[0] + c * g.d[0]) / 3,
      g.V[1] + (a * g.p[1] + b * g.q[1] + c * g.d[1]) / 3
    ];

    const POS = {
      U: (g, r, c) => at(g, 2.5 - c, 2.5 - r, 0),
      F: (g, r, c) => at(g, 2.5 - c, 0, 0.5 + r),
      R: (g, r, c) => at(g, 0, 0.5 + c, 0.5 + r)
    };

    function detectCubeStickers(img, data) {
      if (!img || !data) return null;
      const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height, d = data.data;
      const m = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) {
        const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx ? (mx - mn) / mx : 0;
        m[i] = mx > 89 && (s > 0.45 || (s < 0.2 && mx > 153)) ? 1 : 0;
      }
      const lab = new Uint8Array(W * H), comps = [], st = [];
      for (let i = 0; i < W * H; i++) {
        if (!m[i] || lab[i]) continue;
        let a = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
        st.length = 0;
        st.push(i);
        lab[i] = 1;
        while (st.length) {
          const k = st.pop(), x = k % W, y = (k / W) | 0;
          a++;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
          if (x > 0 && m[k - 1] && !lab[k - 1]) { lab[k - 1] = 1; st.push(k - 1); }
          if (x < W - 1 && m[k + 1] && !lab[k + 1]) { lab[k + 1] = 1; st.push(k + 1); }
          if (y > 0 && m[k - W] && !lab[k - W]) { lab[k - W] = 1; st.push(k - W); }
          if (y < H - 1 && m[k + W] && !lab[k + W]) { lab[k + W] = 1; st.push(k + W); }
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
        x0: Math.min(...c.map(o => o.x0)),
        x1: Math.max(...c.map(o => o.x1)),
        y0: Math.min(...c.map(o => o.y0)),
        y1: Math.max(...c.map(o => o.y1))
      };
    }

    function sampleMedianRGB(img, data, x, y, sc) {
      if (!data) return [0, 0, 0];
      const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
      const h = Math.max(2, Math.round(sc * 3)), a = [];
      for (let j = -h; j <= h; j++) {
        for (let i = -h; i <= h; i++) {
          const X = Math.round(x + i), Y = Math.round(y + j);
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const k = (Y * W + X) * 4;
          a.push([data.data[k], data.data[k + 1], data.data[k + 2]]);
        }
      }
      a.sort((p, q) => p[0] + p[1] + p[2] - q[0] - q[1] - q[2]);
      return a[a.length >> 1] || [0, 0, 0];
    }
    return { COLS, COLOR_NAMES, cls, at, POS, detectCubeStickers, sampleMedianRGB };
  })();

  // ── UI ──────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const COLOR_ORDER = ['W', 'Y', 'G', 'B', 'R', 'O'];
  const FACE_TITLE = { U: 'TOP (U)', F: 'FRONT-LEFT (F)', R: 'FRONT-RIGHT (R)' };
  const solvedCells = () => ({ U: Array(9).fill('W'), F: Array(9).fill('G'), R: Array(9).fill('R') });

  const S = { cells: solvedCells(), solution: '', status: '', preview: null, token: 0 };

  function copyText(t) { try { navigator.clipboard.writeText(t).catch(() => {}); } catch (e) {} }

  async function solve() {
    const token = ++S.token;
    S.solution = '';
    S.status = 'Searching solution…';
    render();
    const obs = Array(54).fill(null);
    for (let i = 0; i < 9; i++) {
      obs[i] = S.cells.U[i];
      obs[9 + i] = S.cells.R[i];
      obs[18 + i] = S.cells.F[i];
    }
    try {
      const res = await searchCube(obs, 10, () => token === S.token);
      if (token !== S.token || (res && res.cancelled)) return;
      if (res && res.timeout) {
        S.status = 'Search timed out — check the sticker colours';
      } else if (res && res.sols && res.sols.length) {
        S.solution = res.sols[0];
        S.status = res.len === 0 ? 'Already solved ✓' : `Solved ✓ (${res.len} moves)`;
        if (S.solution) copyText(S.solution);
      } else {
        S.status = 'No solution found — check the face colours';
      }
    } catch (err) {
      if (token !== S.token) return;
      S.status = 'Error: ' + err.message;
    }
    render();
  }

  function handleImage(img, dataUri) {
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, W, H);

    const b = detectCubeStickers(img, data);
    let geo;
    if (b) {
      const w = b.x1 - b.x0, h = b.y1 - b.y0, V = [(b.x0 + b.x1) / 2, b.y0 + 0.465 * h];
      geo = [V, [V[0] - w / 2, V[1] - 0.233 * h], [V[0] + w / 2, V[1] - 0.233 * h], [V[0], V[1] + 0.52 * h]];
    } else {
      const s = W / 394;
      geo = [[183, 355], [90, 308], [278, 308], [183, 459]].map((p) => [p[0] * s, p[1] * s]);
    }
    const [V, L, R, B] = geo;
    const g = { V, p: [L[0] - V[0], L[1] - V[1]], q: [R[0] - V[0], R[1] - V[1]], d: [B[0] - V[0], B[1] - V[1]] };

    const cells = { U: [], F: [], R: [] };
    const sc = Math.max(W, H) / 300;
    for (const f of ['U', 'F', 'R']) {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const [x, y] = POS[f](g, r, c);
        cells[f].push(cls(...sampleMedianRGB(img, data, x, y, sc)));
      }
    }
    S.cells = cells;
    S.preview = { uri: dataUri, meta: `${W}×${H} px${b ? '' : ' · cube not found, used the default layout — check the colours'}` };
    solve();
  }

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => handleImage(img, reader.result);
      img.onerror = () => { S.status = '⚠ Could not open that file as an image.'; render(); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function render() {
    if (!$('rbRoot')) return;
    // faces
    $('rbFaces').innerHTML = ['U', 'F', 'R'].map((f) => `
      <div class="rb-face">
        <div class="rb-face-title">${FACE_TITLE[f]}</div>
        <div class="rb-grid">${S.cells[f].map((k, i) => `<button type="button" class="rb-sticker" data-f="${f}" data-i="${i}"
          style="background:${COLS[k] || '#fff'}" title="${f}[${i}]: ${COLOR_NAMES[k] || k} (click to cycle)"></button>`).join('')}</div>
      </div>`).join('');
    $('rbFaces').querySelectorAll('.rb-sticker').forEach((el) => {
      el.onclick = () => {
        const f = el.dataset.f, i = +el.dataset.i;
        S.cells[f][i] = COLOR_ORDER[(COLOR_ORDER.indexOf(S.cells[f][i]) + 1) % COLOR_ORDER.length];
        solve();
      };
    });

    // answer
    const moves = S.solution ? S.solution.split(' ').filter(Boolean) : [];
    $('rbAnswer').classList.toggle('ready', moves.length > 0);
    $('rbAnswer').innerHTML = moves.length
      ? `<div class="rb-ans-label">SOLUTION · ${moves.length} MOVES · click to copy</div>
         <div class="rb-ans-big">${S.solution}</div>
         <div class="rb-moves">${moves.map((m, i) => `<span class="rb-move"><small>${i + 1}</small>${m}</span>`).join('')}</div>`
      : `<div class="rb-ans-wait">${S.status || 'Paste the cube screenshot, or set the stickers and press Solve'}</div>`;
    $('rbStatus').textContent = moves.length ? S.status : '';

    // preview
    const pv = $('rbPreview');
    if (S.preview) {
      pv.style.display = 'flex';
      pv.innerHTML = `<img src="${S.preview.uri}" alt="cube screenshot"><span>${S.preview.meta}</span>`;
    } else { pv.style.display = 'none'; pv.innerHTML = ''; }
  }

  function css() {
    if ($('rbCss')) return;
    document.head.insertAdjacentHTML('beforeend', `<style id="rbCss">
      #rbRoot{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:12px;font-family:'Inter',sans-serif;color:#cbd5e1;}
      .rb-panel{background:#0d0d20;border:1px solid #1a1a30;border-radius:12px;padding:14px;}
      .rb-title{font-size:11px;font-weight:700;color:#ffd875;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;}
      .rb-drop{border:2px dashed #2a2a45;border-radius:12px;padding:22px 12px;text-align:center;color:#90a4ae;font-size:14px;cursor:pointer;transition:all .15s;}
      .rb-drop:hover,.rb-drop.dragover{border-color:#ffd875;color:#ffd875;background:rgba(255,216,117,.05);}
      .rb-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}
      .rb-btn{padding:6px 14px;background:transparent;border:1px solid #333;color:#90a4ae;border-radius:8px;font-size:12px;cursor:pointer;}
      .rb-btn:hover{border-color:#ffd875;color:#ffd875;}
      .rb-btn.primary{border-color:#ffd875;color:#ffd875;font-weight:700;}
      #rbPreview{display:none;align-items:center;gap:10px;margin-top:10px;font-size:12px;color:#78909c;}
      #rbPreview img{height:64px;width:auto;border-radius:8px;border:1px solid #2a2a45;}
      #rbAnswer{text-align:center;padding:14px;background:#06060e;border:2px solid #263238;border-radius:14px;}
      #rbAnswer.ready{border-color:#00e676;cursor:pointer;}
      .rb-ans-label{font-size:10px;color:#546e7a;letter-spacing:1px;text-transform:uppercase;}
      .rb-ans-big{font-size:40px;font-weight:900;font-family:'Outfit',monospace,sans-serif;color:#00e676;line-height:1.2;overflow-wrap:anywhere;margin:4px 0;}
      .rb-ans-wait{color:#78909c;font-size:14px;}
      .rb-moves{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:6px;}
      .rb-move{display:inline-flex;align-items:baseline;gap:4px;padding:3px 9px;border:1px solid #1f3b2c;border-radius:8px;font:800 15px ui-monospace,Consolas,monospace;color:#cbd5e1;}
      .rb-move small{font-size:9px;color:#546e7a;}
      #rbStatus{font-size:12px;color:#81c784;text-align:center;min-height:1em;}
      #rbFaces{display:flex;gap:22px;flex-wrap:wrap;justify-content:center;}
      .rb-face{display:flex;flex-direction:column;align-items:center;gap:8px;}
      .rb-face-title{font-size:11px;font-weight:700;color:#ffd875;letter-spacing:.08em;}
      .rb-grid{display:grid;grid-template-columns:repeat(3,36px);gap:4px;background:#12141a;padding:6px;border-radius:8px;border:1px solid #2a2a45;}
      .rb-sticker{width:36px;height:36px;border-radius:5px;border:1.5px solid rgba(0,0,0,.45);cursor:pointer;padding:0;transition:transform .12s;}
      .rb-sticker:hover{transform:scale(1.08);}
      .rb-hint{font-size:11px;color:#546e7a;text-align:center;margin-top:10px;}
      @media (max-width:420px){.rb-ans-big{font-size:30px;} .rb-grid{grid-template-columns:repeat(3,30px);} .rb-sticker{width:30px;height:30px;}}
    </style>`);
  }

  function buildUI() {
    css();
    const sec = $('rubiksSection');
    if (!sec) return;
    sec.innerHTML = `<div id="rbRoot">
      <div class="rb-panel">
        <div class="rb-title"><span>🧊 Rubik's Cube</span></div>
        <div id="rbDrop" class="rb-drop">
          <input type="file" id="rubiksFileInput" accept="image/*" style="display:none;">
          📋 Paste / drop a screenshot of the <b>Rubik's cube</b> <span style="color:#546e7a;">(Ctrl+V or click)</span>
        </div>
        <div id="rbPreview"></div>
        <div class="rb-btns">
          <button type="button" class="rb-btn primary" id="rbSolve">▶ Solve cube</button>
          <button type="button" class="rb-btn" id="rbSample">⚡ Sample</button>
          <button type="button" class="rb-btn" id="rbReset">🗑 Reset cube</button>
        </div>
      </div>
      <div id="rbAnswer"></div>
      <div id="rbStatus"></div>
      <div class="rb-panel">
        <div class="rb-title"><span>Sticker net (top, front-left, front-right)</span></div>
        <div id="rbFaces"></div>
        <div class="rb-hint">Click any sticker to cycle its colour (White → Yellow → Green → Blue → Red → Orange)</div>
      </div>
    </div>`;

    const dz = $('rbDrop'), fi = $('rubiksFileInput');
    dz.addEventListener('click', (e) => { if (e.target !== fi) fi.click(); });
    fi.addEventListener('change', () => { const f = fi.files && fi.files[0]; if (f) loadFile(f); fi.value = ''; });
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover');
      if (window.BombDragDrop) window.BombDragDrop.handleDataTransfer(e.dataTransfer, (f) => { if (f) loadFile(f); });
      else { const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith('image/')); if (f) loadFile(f); }
    });
    $('rbSolve').onclick = () => solve();
    $('rbSample').onclick = () => {
      // scrambled with R U F' — solves as F U' R'
      S.cells = {
        U: ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'R', 'R'],
        F: ['R', 'Y', 'Y', 'R', 'G', 'G', 'R', 'G', 'G'],
        R: ['B', 'B', 'B', 'Y', 'R', 'R', 'Y', 'R', 'R']
      };
      S.preview = null;
      solve();
    };
    $('rbReset').onclick = () => {
      S.token++;
      S.cells = solvedCells(); S.solution = ''; S.status = ''; S.preview = null;
      render();
    };
    $('rbAnswer').addEventListener('click', () => {
      if (!S.solution) return;
      copyText(S.solution);
      const l = $('rbAnswer').querySelector('.rb-ans-label');
      if (l) { l.textContent = '✓ Copied!'; setTimeout(render, 1000); }
    });

    if (!S.pasteBound) {
      S.pasteBound = true;
      // Ctrl+V of a screenshot on this tab (Discord links go via dragdrop-helper.js)
      document.addEventListener('paste', (e) => {
        if (!$('rubiksSection')?.classList.contains('active')) return;
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
    render();
  }

  window.initRubiksModule = function () { buildUI(); };
})();
