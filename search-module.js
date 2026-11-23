/**
 * Search Solver Module for Keep Talking and Nobody Explains
 * 
 * Features:
 * 1. 5x5 grid reader and word finder: bomb_boomed's (bomb-logic.js) — letter shapes, then OCR
 *    for unclear cells; every word from the list found in the grid is given (Copy All).
 * 2. Automatic Stage Detection from indicator lights on the right (Stage 1, 2, 3).
 * 3. Pre-populated & Editable Word Lists (Search #1, Search #2, custom stage words).
 * 4. Multi-word detection across all 8 directions, listing all matching words.
 * 5. Interactive 5x5 grid with cell editing and neon green word path highlighting.
 */

(function() {
  // bomb_boomed's word list (this game's manual): every word found in the grid is given
  const DEFAULT_WORDS_TEXT = `PALM SINK WITH SEND OKAY USER LOSS RAID DIRT LEAF WIFE YELL TELL FLAT PARK SOUP VAST BEST TORN CLAY STEM SLIP RIDE ICON CORN DOVE BIRD PLOT FOOT DESK CAPE POET LAVA JOKE MOVE JOIN FINE VEIL GAME PINE TOLD COLD BOLD GOLD HOLD SOLD FOLD MOLD`;

  const DIRS = [
    { dr: -1, dc: 0, name: 'Up', arrow: '↑' },
    { dr: 1, dc: 0, name: 'Down', arrow: '↓' },
    { dr: 0, dc: -1, name: 'Left', arrow: '←' },
    { dr: 0, dc: 1, name: 'Right', arrow: '→' },
    { dr: -1, dc: -1, name: 'Up-Left', arrow: '↖' },
    { dr: -1, dc: 1, name: 'Up-Right', arrow: '↗' },
    { dr: 1, dc: -1, name: 'Down-Left', arrow: '↙' },
    { dr: 1, dc: 1, name: 'Down-Right', arrow: '↘' }
  ];

  const COLS = ['A', 'B', 'C', 'D', 'E'];
  const ROWS = ['1', '2', '3', '4', '5'];

  const searchState = {
    initialized: false,
    stage: 1, // 1, 2, or 3
    autoDetectedStage: null,
    grid: Array.from({ length: 5 }, () => Array(5).fill('')),
    rawWordsText: DEFAULT_WORDS_TEXT,
    wordEntries: [], // { word, label, stage }
    foundWords: [],  // list of all matched words
    selectedWordIndex: 0,
    image: null
  };

  function coord(r, c) {
    return `${COLS[c]}${ROWS[r]}`;
  }

  // ── DYNAMIC WORD LIST PARSER ──────────────────────────────
  function parseWordListText(raw) {
    searchState.rawWordsText = raw;
    const lines = raw.split('\n');
    const entries = [];
    let currentLabel = 'Custom List';
    let currentStage = 1;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Check if line is a header like "Search #1, Stage 2:"
      const headerMatch = line.match(/(?:Search\s*#?([12])\s*,\s*)?Stage\s*([123])/i);
      if (headerMatch) {
        const searchNum = headerMatch[1] ? `Search #${headerMatch[1]}` : 'Search';
        currentStage = parseInt(headerMatch[2], 10);
        currentLabel = `${searchNum}, Stage ${currentStage}`;
        continue;
      }

      // Extract uppercase words (3 to 6 letters)
      const words = line.match(/[A-Za-z]{3,6}/g);
      if (words) {
        for (let w of words) {
          const upper = w.toUpperCase();
          if (!entries.some(e => e.word === upper && e.stage === currentStage && e.label === currentLabel)) {
            entries.push({
              word: upper,
              label: currentLabel,
              stage: currentStage
            });
          }
        }
      }
    }

    searchState.wordEntries = entries;
  }

  // ── COMPUTER VISION & STAGE DETECTION ─────────────────────
  function detectStageFromImage(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const W = img.width;
    const H = img.height;

    // Relative light positions on right indicator pill:
    // x ~ 0.741 * W (326 in 440)
    // Stage 1 y ~ 0.427 * H (188 in 440)
    // Stage 2 y ~ 0.545 * H (240 in 440)
    // Stage 3 y ~ 0.666 * H (293 in 440)
    const lightX = Math.round(W * 0.741);
    const lightYs = [
      Math.round(H * 0.427),
      Math.round(H * 0.545),
      Math.round(H * 0.666)
    ];

    let activeStage = 1;

    for (let i = 0; i < 3; i++) {
      const y = lightYs[i];
      const p = ctx.getImageData(lightX - 3, y - 3, 7, 7).data;
      let sumR = 0, sumG = 0, sumB = 0, cnt = 0;
      for (let j = 0; j < p.length; j += 4) {
        sumR += p[j];
        sumG += p[j+1];
        sumB += p[j+2];
        cnt++;
      }
      const r = sumR / cnt;
      const g = sumG / cnt;
      const b = sumB / cnt;

      // Orange active light: R > 200, G in 140..210, B < 150
      if (r > 190 && g > 130 && b < 160 && r > g) {
        activeStage = i + 1;
        break;
      }
    }

    return activeStage;
  }

  function drawPreviewCell(previewCanvas, r, c, char) {
    if (!previewCanvas) return;
    const pCtx = previewCanvas.getContext('2d');
    const px = c * 45 + 10;
    const py = r * 45 + 10;
    pCtx.fillStyle = '#1e2442';
    pCtx.strokeStyle = '#3b82f6';
    pCtx.lineWidth = 1.5;
    pCtx.fillRect(px, py, 38, 38);
    pCtx.strokeRect(px, py, 38, 38);

    pCtx.fillStyle = '#ffffff';
    pCtx.font = 'bold 22px Outfit, sans-serif';
    pCtx.textAlign = 'center';
    pCtx.textBaseline = 'middle';
    pCtx.fillText(char || '?', px + 19, py + 20);
  }

  // ── Reading the grid: bomb_boomed's (window.BombLogic.search, bomb-logic.js) ──
  // 1. every cell's shape is matched against letters cut from real game screenshots (on a copy
  //    scaled to the game's 440 px width); 2. Tesseract reads only the cells the shape isn't sure
  //    about, and the shape vetoes OCR letters it clearly disagrees with.
  async function runOcrOnSearchImage() {
    const statusEl = document.getElementById('searchOcrStatus');
    if (!searchState.image) return;
    const S = window.BombLogic.search;
    const say = (html) => { if (statusEl) statusEl.innerHTML = html; };
    const runId = (searchState.runId = (searchState.runId || 0) + 1);
    const stale = () => runId !== searchState.runId;

    // Detect stage from the 3 indicator lights on the right
    const detectedStage = detectStageFromImage(searchState.image);
    searchState.autoDetectedStage = detectedStage;
    searchState.stage = detectedStage;
    updateStageButtons();

    const img = searchState.image;
    const previewCanvas = document.getElementById('searchOcrPreviewCanvas');
    const previewLabel = document.getElementById('searchOcrPreviewLabel');
    if (previewCanvas) {
      previewCanvas.width = 240;
      previewCanvas.height = 240;
      const pCtx = previewCanvas.getContext('2d');
      pCtx.fillStyle = '#101426';
      pCtx.fillRect(0, 0, 240, 240);
      if (previewLabel) previewLabel.style.display = 'block';
      previewCanvas.style.display = 'inline-block';
    }
    const show = () => {
      updateGridInputs();
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) drawPreviewCell(previewCanvas, r, c, searchState.grid[r][c] || '?');
      solveSearch();
    };

    // 1. shape match
    const iw0 = img.naturalWidth || img.width, ih0 = img.naturalHeight || img.height;
    const nW = 440, nH = Math.max(1, Math.round(440 * ih0 / iw0));
    const nCanvas = document.createElement('canvas');
    nCanvas.width = nW; nCanvas.height = nH;
    const nCtx = nCanvas.getContext('2d', { willReadFrequently: true });
    nCtx.imageSmoothingQuality = 'high';
    nCtx.drawImage(img, 0, 0, nW, nH);
    const nData = nCtx.getImageData(0, 0, nW, nH).data;
    const shape = Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => {
      const f = S.cellFeature(nData, nW, nH, r, c);
      return { f, m: S.matchGlyph(f, S.SEARCH_GLYPHS) };
    }));
    const unsure = shape.flat().filter(x => !x.m.sure).length;
    searchState.grid = shape.map(row => row.map(x => (x.m.sure ? x.m.letter : '')));
    show();
    if (!unsure) {
      say(`<span style="color:#22c55e;">✓ Stage ${detectedStage}: read all 25 letters by shape.</span>`);
      return;
    }

    // 2. OCR for the unclear cells
    say(`<span style="color:#ffd875;">Reading ${unsure} unclear cell${unsure > 1 ? 's' : ''} with OCR…</span>`);
    let worker;
    try {
      worker = await S.ensureOCRWorker(m => {
        if (m && m.status === 'loading language traineddata') say(`<span style="color:#ffd875;">📡 Downloading OCR model… ${Math.round((m.progress || 0) * 100)}%</span>`);
      });
    } catch (err) {
      if (stale()) return;
      // no OCR: the closest shape for the unclear cells, so only those need checking
      searchState.grid = shape.map(row => row.map(x => x.m.letter || ''));
      show();
      say(`<span style="color:#ffd875;">⚠️ OCR unavailable (${err.message}). Unclear cells use the closest shape — check them.</span>`);
      return;
    }
    if (stale()) return;

    const MAXDIM = 1200;
    const scl = Math.min(1, MAXDIM / Math.max(iw0, ih0));
    const iw = Math.round(iw0 * scl), ih = Math.round(ih0 * scl);
    const workCanvas = document.createElement('canvas');
    workCanvas.width = iw; workCanvas.height = ih;
    workCanvas.getContext('2d').drawImage(img, 0, 0, iw, ih);
    const { rowCenters, colCenters, cellW, cellH } = S.getSearchGrid(iw, ih);
    const UPSCALE = 8, CROP = 0.90, PAD_PX = 24;

    const readOne = async (r, c) => {
      const cW = Math.round(cellW * CROP), cH = Math.round(cellH * CROP);
      const sx = Math.max(0, Math.round(colCenters[c] - cW / 2)), sy = Math.max(0, Math.round(rowCenters[r] - cH / 2));
      const sw = Math.min(iw - sx, cW), sh = Math.min(ih - sy, cH);
      if (sw < 4 || sh < 4) return;
      const cellCanvas = document.createElement('canvas');
      const cellCtx = cellCanvas.getContext('2d');
      const padCanvas = document.createElement('canvas');
      const padCtx = padCanvas.getContext('2d');
      cellCanvas.width = sw * UPSCALE; cellCanvas.height = sh * UPSCALE;
      cellCtx.imageSmoothingEnabled = true;
      cellCtx.imageSmoothingQuality = 'high';
      const readCell = async (mode) => {
        cellCtx.drawImage(workCanvas, sx, sy, sw, sh, 0, 0, cellCanvas.width, cellCanvas.height);
        S.preprocessCellCanvas(cellCtx, cellCanvas.width, cellCanvas.height, mode, 1);
        padCanvas.width = cellCanvas.width + PAD_PX * 2;
        padCanvas.height = cellCanvas.height + PAD_PX * 2;
        padCtx.fillStyle = '#FFFFFF';
        padCtx.fillRect(0, 0, padCanvas.width, padCanvas.height);
        padCtx.drawImage(cellCanvas, PAD_PX, PAD_PX);
        return S.recognizeCellConsensus(worker, padCanvas);
      };
      let rec = await readCell('otsu');
      if (stale()) return;
      if (rec.letter === '?' || rec.confidence < 30) {
        const retry = await readCell('adaptive');
        if (stale()) return;
        if (retry.confidence > rec.confidence) rec = retry;
      }
      searchState.grid[r][c] = S.combineGlyphOcr(shape[r][c].f, shape[r][c].m, rec.letter, S.SEARCH_GLYPHS);
      show();
    };
    const jobs = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (!shape[r][c].m.sure) jobs.push(readOne(r, c));
    await Promise.all(jobs);
    if (stale()) return;
    show();
    const filled = searchState.grid.flat().filter(ch => ch && ch !== '?').length;
    say(filled === 25
      ? `<span style="color:#22c55e;">✓ Stage ${detectedStage}: ${25 - unsure} letters by shape, ${unsure} by OCR.</span>`
      : `<span style="color:#ffd875;">⚠️ Read ${filled}/25 letters — fill in the empty cells.</span>`);
  }

  // ── Finding the words: bomb_boomed's solver (3–5 letters, all 8 directions) ──
  function solveSearch() {
    const S = window.BombLogic.search;
    const words = searchState.wordEntries.map(e => e.word).join(' ');
    const { foundMatches } = S.solveWordSearch(searchState.grid, words);
    const matches = foundMatches.map(m => {
      const [r0, c0] = m.path[0], [r1, c1] = m.path[m.path.length - 1];
      const dir = DIRS.find(d => d.dr === Math.sign(r1 - r0) && d.dc === Math.sign(c1 - c0)) || DIRS[3];
      const entry = searchState.wordEntries.find(e => e.word === m.word) || { label: '', stage: 1 };
      return {
        word: m.word, label: entry.label, stage: entry.stage, isCurrentStage: entry.stage === searchState.stage,
        dirName: dir.name, arrow: dir.arrow, startCoord: coord(r0, c0), endCoord: coord(r1, c1),
        cells: m.path.map(([r, c]) => ({ r, c }))
      };
    });
    matches.sort((a, b) => {
      if (a.isCurrentStage && !b.isCurrentStage) return -1;
      if (!a.isCurrentStage && b.isCurrentStage) return 1;
      return b.word.length - a.word.length;
    });
    searchState.foundWords = matches;
    searchState.selectedWordIndex = 0;
    renderAnswerCard();
    highlightSelectedWordOnGrid();
  }

  // ── UI RENDERING & STYLES ─────────────────────────────────
  function injectStyles() {
    if (document.getElementById('searchSolverStyles')) return;
    const css = `
    .sr-shell {
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
    .sr-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #1c2042;
    }
    .sr-title {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #ffd875;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sr-stage-pills {
      display: flex;
      gap: 6px;
      background: #070814;
      padding: 4px;
      border-radius: 10px;
      border: 1px solid #1c2042;
    }
    .sr-stage-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-weight: 800;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .sr-stage-btn.active {
      background: #ffd875;
      color: #080914;
      box-shadow: 0 0 10px rgba(255, 216, 117, 0.3);
    }
    .sr-layout {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .sr-layout { grid-template-columns: 1fr; }
    }
    .sr-card {
      background: #070814;
      border: 1px solid #1c2042;
      border-radius: 14px;
      padding: 18px;
    }
    .sr-card-title {
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 800;
      color: #ffd875;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sr-dropzone {
      border: 2px dashed #343864;
      border-radius: 12px;
      padding: 22px 14px;
      text-align: center;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.015);
      transition: all 0.2s;
      margin-bottom: 14px;
    }
    .sr-dropzone:hover, .sr-dropzone.dragover {
      border-color: #ffd875;
      background: rgba(255, 216, 117, 0.06);
    }
    .sr-grid-container {
      display: grid;
      grid-template-columns: repeat(5, 52px);
      grid-template-rows: repeat(5, 52px);
      gap: 8px;
      justify-content: center;
      margin: 12px 0;
    }
    .sr-grid-cell {
      width: 52px;
      height: 52px;
      background: #151833;
      border: 2px solid #282d5c;
      border-radius: 10px;
      color: #fff;
      font-family: 'Outfit', monospace, sans-serif;
      font-size: 24px;
      font-weight: 900;
      text-align: center;
      text-transform: uppercase;
      outline: none;
      transition: all 0.15s;
    }
    .sr-grid-cell:focus {
      border-color: #ffd875;
      box-shadow: 0 0 12px rgba(255, 216, 117, 0.3);
      background: #1b2046;
    }
    .sr-grid-cell.highlight-start {
      background: #2a220a !important;
      border: 2.5px solid #ffd875 !important;
      color: #ffd875 !important;
      box-shadow: 0 0 16px rgba(255, 216, 117, 0.6) !important;
      transform: scale(1.05);
      z-index: 2;
    }
    .sr-grid-cell.highlight-word {
      background: #064e3b !important;
      border: 2.5px solid #22c55e !important;
      color: #4ade80 !important;
      box-shadow: 0 0 16px rgba(34, 197, 94, 0.5) !important;
      transform: scale(1.05);
      z-index: 2;
    }
    .sr-match-card {
      background: #11142e;
      border: 1.5px solid #222956;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 10px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.15s;
    }
    .sr-match-card:hover {
      border-color: #ffd875;
      background: #171b3e;
      transform: translateY(-1px);
    }
    .sr-match-card.selected {
      background: rgba(34, 197, 94, 0.12);
      border-color: #22c55e;
      box-shadow: 0 0 18px rgba(34, 197, 94, 0.25);
    }
    .sr-word-badge {
      font-size: 32px;
      font-weight: 900;
      color: #22c55e;
      font-family: 'Outfit', monospace, sans-serif;
      letter-spacing: 2px;
    }
    .sr-word-dir {
      font-size: 15px;
      font-weight: 800;
      color: #ffd875;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sr-textarea {
      width: 100%;
      background: #090a16;
      border: 1px solid #222956;
      color: #ffd875;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.5;
      padding: 10px;
      border-radius: 8px;
      outline: none;
      resize: vertical;
      box-sizing: border-box;
    }
    .sr-textarea:focus {
      border-color: #ffd875;
    }
    .sr-btn {
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
    .sr-btn:hover {
      background: #282e5c;
      border-color: #ffd875;
      color: #fff;
    }
    .sr-btn.primary {
      background: #ffd875;
      border-color: #ffd875;
      color: #080914;
      font-weight: 800;
    }
    `;
    const style = document.createElement('style');
    style.id = 'searchSolverStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderUI() {
    const section = document.getElementById('searchSection');
    if (!section) return;

    parseWordListText(searchState.rawWordsText);

    section.innerHTML = `
      <div class="sr-shell">
        <div class="sr-head">
          <div class="sr-title">
            <span>🔍</span> Search Solver
            <span style="font-size:13px; font-weight:600; color:#94a3b8; background:#181b36; padding:3px 10px; border-radius:99px; border:1px solid #282d58;">
              5×5 Grid · 8 Directions
            </span>
          </div>

          <!-- Stage Selection Pills -->
          <div class="sr-stage-pills">
            <span style="font-size:11px; font-weight:800; color:#64748b; padding:6px 6px; text-transform:uppercase;">Stage:</span>
            <button class="sr-stage-btn active" id="srStageBtn1" onclick="window.setSearchStage(1)">Stage 1</button>
            <button class="sr-stage-btn" id="srStageBtn2" onclick="window.setSearchStage(2)">Stage 2</button>
            <button class="sr-stage-btn" id="srStageBtn3" onclick="window.setSearchStage(3)">Stage 3</button>
          </div>
        </div>

        <div class="sr-layout">
          <!-- Left Column: Upload & Word Lists -->
          <div>
            <!-- Image Dropzone -->
            <div class="sr-card" style="margin-bottom:18px;">
              <div class="sr-card-title">
                <span>Upload / Paste Screenshot</span>
                <button class="sr-btn" style="padding:4px 8px; font-size:11px;" onclick="window.resetSearchGrid()">Clear</button>
              </div>

              <div id="srDropzone" class="sr-dropzone" onclick="window.openSearchFileDialog()">
                <input type="file" id="srFileInput" accept="image/*" style="display:none;" onchange="window.handleSearchFile(this)">
                <div style="font-size:32px; margin-bottom:6px;">📷</div>
                <div style="font-weight:700; font-size:14px; color:#fff; margin-bottom:2px;">Click to Upload Screenshot</div>
                <div style="font-size:12px; color:#94a3b8;">or press <kbd style="background:#1e2246; padding:2px 6px; border-radius:4px; color:#ffd875;">Ctrl+V</kbd> anywhere to paste</div>
              </div>

              <div id="srPreviewWrapper" style="display:none; text-align:center; margin-bottom:10px;">
                <canvas id="searchImageCanvas" style="max-width:100%; border-radius:8px; border:1px solid #282d58; max-height:180px;"></canvas>
                <div id="searchOcrPreviewLabel" style="font-size:11px; color:#94a3b8; margin-top:6px; display:none;">Enhanced OCR View:</div>
                <canvas id="searchOcrPreviewCanvas" style="max-width:100%; border-radius:6px; border:1px solid #333; display:none; margin-top:4px;"></canvas>
              </div>

              <div id="searchOcrStatus" style="font-size:13px; font-weight:700; text-align:center;"></div>
            </div>

            <!-- Possible Words / Manual Stage Wordlists Input (Like Password Module) -->
            <div class="sr-card">
              <div class="sr-card-title">
                <span>Possible Words List</span>
                <button class="sr-btn" style="padding:4px 8px; font-size:11px;" onclick="window.resetSearchWords()">Reset Words</button>
              </div>
              <div style="font-size:11px; color:#94a3b8; margin-bottom:8px;">
                Paste or edit current stage words below (Search #1 & #2 preloaded):
              </div>
              <textarea id="searchWordsTextarea" class="sr-textarea" rows="8" oninput="window.handleWordsTextareaChange(this)">${searchState.rawWordsText}</textarea>
            </div>
          </div>

          <!-- Right Column: Answer Display & 5x5 Grid -->
          <div>
            <!-- Answer Card -->
            <div id="searchAnswerContainer" style="margin-bottom:18px;"></div>

            <!-- 5x5 Grid Board -->
            <div class="sr-card" style="text-align:center;">
              <div class="sr-card-title" style="justify-content:center; gap:10px;">
                <span>5×5 Letter Grid</span>
              </div>
              <div style="font-size:12px; color:#94a3b8; margin-bottom:10px;">
                Automatically filled by OCR or type letters directly:
              </div>

              <div class="sr-grid-container" id="srGridWrapper"></div>

              <div style="margin-top:14px; display:flex; justify-content:center; gap:10px;">
                <button class="sr-btn primary" onclick="window.solveSearchManual()">⚡ Find Words</button>
                <button class="sr-btn" onclick="window.clearSearchLetters()">Clear Letters</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    setupDropzone();
    setupGlobalPaste();
    renderGridInputs();
    solveSearch();
  }

  function setupDropzone() {
    const dropzone = document.getElementById('srDropzone');
    if (!dropzone) return;

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
      if (file) processSearchImageFile(file);
    });
  }

  function setupGlobalPaste() {
    document.addEventListener('paste', (e) => {
      const section = document.getElementById('searchSection');
      if (!section || !section.classList.contains('active')) return;

      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processSearchImageFile(file);
          break;
        }
      }
    });
  }

  function processSearchImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        searchState.image = img;

        const previewWrapper = document.getElementById('srPreviewWrapper');
        const canvas = document.getElementById('searchImageCanvas');
        if (previewWrapper && canvas) {
          previewWrapper.style.display = 'block';
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
        }

        runOcrOnSearchImage();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderGridInputs() {
    const wrapper = document.getElementById('srGridWrapper');
    if (!wrapper) return;

    let html = '';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const val = searchState.grid[r][c] || '';
        html += `
          <input type="text" class="sr-grid-cell" id="srCell-${r}-${c}" data-r="${r}" data-c="${c}" maxlength="1" value="${val}" autocomplete="off" spellcheck="false" oninput="window.handleCellInput(this, ${r}, ${c})" onkeydown="window.handleCellKey(event, ${r}, ${c})">
        `;
      }
    }
    wrapper.innerHTML = html;
  }

  function updateGridInputs() {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const el = document.getElementById(`srCell-${r}-${c}`);
        if (el) el.value = searchState.grid[r][c] || '';
      }
    }
  }

  function renderAnswerCard() {
    const container = document.getElementById('searchAnswerContainer');
    if (!container) return;

    const matches = searchState.foundWords;

    if (!matches || matches.length === 0) {
      container.innerHTML = `
        <div style="background:rgba(255,216,117,0.06); border:1.5px solid #282d58; border-radius:14px; padding:18px; text-align:center; color:#94a3b8;">
          <div style="font-size:16px; font-weight:700; color:#ffd875; margin-bottom:4px;">No words found yet</div>
          <div style="font-size:12px;">Upload a screenshot or verify letters and word list.</div>
        </div>
      `;
      return;
    }

    const selectedIdx = Math.min(searchState.selectedWordIndex, matches.length - 1);
    const primary = matches[selectedIdx];
    // every word found, once each (bomb_boomed copies them all, space-separated)
    const uniq = [...new Set(matches.map(m => m.word))];
    const allWords = uniq.join(' ');

    let html = `
      <div style="background:linear-gradient(135deg, rgba(34,197,94,0.14) 0%, rgba(16,185,129,0.06) 100%); border:2px solid #22c55e; border-radius:16px; padding:20px; box-shadow:0 0 30px rgba(34,197,94,0.2); margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
          <div style="font-size:11px; font-weight:800; color:#ffd875; letter-spacing:1.5px; text-transform:uppercase;">
            ${primary.isCurrentStage ? '★ CURRENT STAGE WORD TO SUBMIT' : 'MATCHED WORD'}
          </div>
          <span style="font-size:12px; font-weight:700; color:#cbd5e1; background:#112d22; padding:3px 10px; border-radius:6px; border:1px solid #22c55e;">
            ${primary.label}
          </span>
        </div>

        <div style="display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:14px;">
          <div>
            <div class="sr-word-badge">${primary.word}</div>
            <div style="font-size:15px; font-weight:700; color:#cbd5e1; margin-top:4px;">
              Starts at <strong style="color:#ffd875; text-decoration:underline; font-size:17px;">${primary.startCoord}</strong>
              ➔ Goes <span style="color:#22c55e; font-weight:800; font-size:17px;">${primary.dirName} ${primary.arrow}</span>
              ➔ Ends at <strong style="color:#ffd875; text-decoration:underline;">${primary.endCoord}</strong>
            </div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="sr-btn" style="background:#133824; border-color:#22c55e; color:#4ade80; font-weight:800; padding:10px 16px;" onclick="navigator.clipboard.writeText('${allWords}'); this.textContent='✓ Copied!'; setTimeout(()=>this.textContent='📋 Copy All (${uniq.length})', 1500);" title="${allWords}">
              📋 Copy All (${uniq.length})
            </button>
            <button class="sr-btn" style="padding:10px 16px;" onclick="navigator.clipboard.writeText('${primary.word}'); this.textContent='✓ Copied!'; setTimeout(()=>this.textContent='📋 Copy Word', 1500);">
              📋 Copy Word
            </button>
          </div>
        </div>
      </div>
    `;

    // If multiple words found, list all of them
    if (matches.length > 1) {
      html += `
        <div style="margin-top:12px;">
          <div style="font-size:12px; font-weight:800; color:#ffd875; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px;">
            All Matched Words (${matches.length} found):
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px;">
      `;

      matches.forEach((m, idx) => {
        const isSel = idx === selectedIdx;
        html += `
          <div class="sr-match-card ${isSel ? 'selected' : ''}" onclick="window.selectMatchedWord(${idx})">
            <div>
              <div style="font-size:20px; font-weight:900; color:${isSel ? '#22c55e' : '#fff'}; font-family:'Outfit', monospace;">
                ${m.word}
              </div>
              <div style="font-size:11px; color:#94a3b8;">${m.label}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:13px; font-weight:800; color:#ffd875;">${m.startCoord} ${m.arrow}</div>
              <div style="font-size:10px; color:#64748b;">${m.dirName}</div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  function highlightSelectedWordOnGrid() {
    // Clear all previous highlights
    document.querySelectorAll('.sr-grid-cell').forEach(cell => {
      cell.classList.remove('highlight-start', 'highlight-word');
    });

    const matches = searchState.foundWords;
    if (!matches || matches.length === 0) return;

    const selectedIdx = Math.min(searchState.selectedWordIndex, matches.length - 1);
    const selected = matches[selectedIdx];

    selected.cells.forEach((pos, i) => {
      const cellEl = document.getElementById(`srCell-${pos.r}-${pos.c}`);
      if (cellEl) {
        if (i === 0) {
          cellEl.classList.add('highlight-start');
        } else {
          cellEl.classList.add('highlight-word');
        }
      }
    });
  }

  function updateStageButtons() {
    for (let s = 1; s <= 3; s++) {
      const btn = document.getElementById(`srStageBtn${s}`);
      if (btn) {
        btn.classList.toggle('active', s === searchState.stage);
      }
    }
  }

  // ── GLOBAL CONTROLLER FUNCTIONS ───────────────────────────
  window.openSearchFileDialog = function() {
    const input = document.getElementById('srFileInput');
    if (input) input.click();
  };

  window.handleSearchFile = function(input) {
    const file = input.files && input.files[0];
    if (file) processSearchImageFile(file);
    input.value = '';
  };

  window.setSearchStage = function(s) {
    searchState.stage = s;
    updateStageButtons();
    solveSearch();
  };

  window.handleWordsTextareaChange = function(textarea) {
    parseWordListText(textarea.value);
    solveSearch();
  };

  window.resetSearchWords = function() {
    const textarea = document.getElementById('searchWordsTextarea');
    if (textarea) textarea.value = DEFAULT_WORDS_TEXT;
    parseWordListText(DEFAULT_WORDS_TEXT);
    solveSearch();
  };

  window.selectMatchedWord = function(idx) {
    searchState.selectedWordIndex = idx;
    renderAnswerCard();
    highlightSelectedWordOnGrid();
  };

  window.handleCellInput = function(input, r, c) {
    const val = input.value.toUpperCase().replace(/[^A-Z]/g, '');
    input.value = val;
    searchState.grid[r][c] = val;

    // Move to next cell
    if (val) {
      if (c < 4) {
        const next = document.getElementById(`srCell-${r}-${c+1}`);
        if (next) next.focus();
      } else if (r < 4) {
        const next = document.getElementById(`srCell-${r+1}-0`);
        if (next) next.focus();
      }
    }
    solveSearch();
  };

  window.handleCellKey = function(e, r, c) {
    if (e.key === 'Backspace' && !e.target.value) {
      if (c > 0) {
        const prev = document.getElementById(`srCell-${r}-${c-1}`);
        if (prev) prev.focus();
      } else if (r > 0) {
        const prev = document.getElementById(`srCell-${r-1}-4`);
        if (prev) prev.focus();
      }
    } else if (e.key === 'ArrowRight' && c < 4) {
      document.getElementById(`srCell-${r}-${c+1}`)?.focus();
    } else if (e.key === 'ArrowLeft' && c > 0) {
      document.getElementById(`srCell-${r}-${c-1}`)?.focus();
    } else if (e.key === 'ArrowDown' && r < 4) {
      document.getElementById(`srCell-${r+1}-${c}`)?.focus();
    } else if (e.key === 'ArrowUp' && r > 0) {
      document.getElementById(`srCell-${r-1}-${c}`)?.focus();
    }
  };

  window.clearSearchLetters = function() {
    searchState.grid = Array.from({ length: 5 }, () => Array(5).fill(''));
    updateGridInputs();
    solveSearch();
  };

  window.resetSearchGrid = function() {
    searchState.grid = Array.from({ length: 5 }, () => Array(5).fill(''));
    searchState.foundWords = [];
    searchState.image = null;

    const preview = document.getElementById('srPreviewWrapper');
    if (preview) preview.style.display = 'none';
    const status = document.getElementById('searchOcrStatus');
    if (status) status.textContent = '';

    updateGridInputs();
    renderAnswerCard();
  };

  window.solveSearchManual = function() {
    solveSearch();
  };

  window.initSearchModule = function() {
    injectStyles();
    renderUI();
    searchState.initialized = true;
  };

})();
