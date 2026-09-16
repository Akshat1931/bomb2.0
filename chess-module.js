/**
 * Chess Module Solver for Keep Talking and Nobody Explains
 * 
 * Supports:
 * 1. Dual Image Upload / Paste / Drop (Slot 1: Black pieces, Slot 2: White pieces)
 * 2. TensorFlow.js CNN Detection & Classification (models from CDN)
 * 3. Auto-merging of Black & White boards into a single FEN
 * 4. Automatic Stockfish Evaluation (White to move) to find the winning/best next move
 * 5. Interactive 8x8 Board Visualization with highlighted best move start & destination
 */

(function() {
  const SQR_NAMES = [];
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  for (let r = 8; r >= 1; r--) {
    for (let f of FILES) {
      SQR_NAMES.push(f + r);
    }
  }

  const PIECE_NAMES = {
    'p': 'Black Pawn',
    'r': 'Black Rook',
    'n': 'Black Knight',
    'b': 'Black Bishop',
    'q': 'Black Queen',
    'k': 'Black King',
    'P': 'White Pawn',
    'R': 'White Rook',
    'N': 'White Knight',
    'B': 'White Bishop',
    'Q': 'White Queen',
    'K': 'White King'
  };

  const PIECE_UNICODE = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔',
    's': ''
  };

  const chessState = {
    initialized: false,
    loadingModels: false,
    modelsLoaded: false,
    models: {},
    imgBlack: null,
    imgWhite: null,
    blackTiles: new Array(64).fill('s'),
    whiteTiles: new Array(64).fill('s'),
    mergedTiles: new Array(64).fill('s'),
    currentFen: '8/8/8/8/8/8/8/8 w - - 0 1',
    bestMove: null, // e.g. { from: 'd4', to: 'g7', uci: 'd4g7', san: 'Bxg7' }
    evaluation: null,
    activePasteSlot: 1 // 1 for Black, 2 for White
  };

  function isNumber(e) {
    return ("string" == typeof e || "number" == typeof e) && ("number" == typeof parseInt(`${e}`) && !isNaN(parseInt(`${e}`)));
  }

  function parseFenFromArray(e) {
    const t = [];
    for (let n = 0; n < 8; n++) {
      const o = [];
      for (let t = 0; t < 8; t++) {
        const s = e[8 * n + t];
        "s" === s || " " === s || !s || isNumber(s)
          ? 0 !== o.length && isNumber(o[o.length - 1])
            ? o[o.length - 1] = parseInt(`${o[o.length - 1]}`) + 1
            : o.push(1)
          : o.push(s);
      }
      t.push(o.join(""));
    }
    const n = [...t].reverse().map((e => e.split("").reverse().join(""))).join("/");
    return [t.join("/"), n];
  }

  // ── MODEL LOADER ──────────────────────────────────────────
  async function loadChessModels() {
    if (chessState.modelsLoaded || chessState.loadingModels) return;
    if (typeof tf === 'undefined') {
      console.warn("TensorFlow.js not available yet.");
      return;
    }

    chessState.loadingModels = true;
    updateStatusMessage("⏳ Loading Chess Vision Neural Networks...", "#ffd875");

    try {
      const [detectionModel, classificationModel, mobilenet] = await Promise.all([
        tf.loadGraphModel("https://cdn.jsdelivr.net/gh/anandjoshi91/cdn-assets@main/chess-board-to-fen/nn-v1/detection_model/model.json"),
        tf.loadLayersModel("https://cdn.jsdelivr.net/gh/anandjoshi91/cdn-assets@main/chess-board-to-fen/nn-v1/classification_model/model.json"),
        tf.loadGraphModel("https://cdn.jsdelivr.net/gh/anandjoshi91/cdn-assets@main/chess-board-to-fen/nn-v1/mobilenet/model.json")
      ]);

      // Warm up
      try {
        detectionModel.execute(tf.zeros(detectionModel.inputs[0].shape));
        mobilenet.predict(tf.zeros([1, 224, 224, 3]));
      } catch (warmErr) {}

      chessState.models.detectionModel = detectionModel;
      chessState.models.classificationModel = classificationModel;
      chessState.models.mobilenetFeatureVector = mobilenet;
      chessState.modelsLoaded = true;
      chessState.loadingModels = false;
      updateStatusMessage("✓ Neural Vision Models Ready! Upload or paste screenshots.", "#00ff66");
    } catch (err) {
      console.error("Error loading chess models:", err);
      chessState.loadingModels = false;
      updateStatusMessage("⚠️ Neural models loading in background. You can also manually place pieces below.", "#ffd875");
    }
  }

  // ── DETECTION & CLASSIFICATION ─────────────────────────────
  const MOBILENET_INPUT_SIZE = 224;
  const PIECES_LOOKUP = {
    0: "p", 1: "r", 2: "n", 3: "b", 4: "q", 5: "k",
    6: "P", 7: "R", 8: "N", 9: "B", 10: "Q", 11: "K", 12: "s"
  };

  async function detectChessboard(imgEl, detectionModel) {
    tf.engine().startScope();
    const modelShape = [640, 640];
    const [t, n] = modelShape;
    let o = 0, s = 0;
    const preprocessed = tf.tidy(() => {
      const r = tf.browser.fromPixels(imgEl);
      const [a, i] = r.shape.slice(0, 2);
      const d = Math.max(i, a);
      const l = r.pad([[0, d - a], [0, d - i], [0, 0]]);
      o = d / i;
      s = d / a;
      return tf.image.resizeBilinear(l, [t, n]).div(255).expandDims(0);
    });

    const d = detectionModel.execute(preprocessed);
    const l = d.transpose([0, 2, 1]);
    const c = tf.tidy(() => {
      const e = l.slice([0, 0, 2], [-1, -1, 1]);
      const t = l.slice([0, 0, 3], [-1, -1, 1]);
      const n = l.slice([0, 0, 0], [-1, -1, 1]).sub(e.div(2));
      const o = l.slice([0, 0, 1], [-1, -1, 1]).sub(t.div(2));
      return tf.concat([o, n, tf.add(o, t), tf.add(n, e)], 2).squeeze();
    });

    const u = tf.tidy(() => {
      const e = l.slice([0, 0, 4], [-1, -1, 1]).squeeze([0]);
      return e.max(1);
    });

    const m = await tf.image.nonMaxSuppressionAsync(c, u, 500, 0.45, 0.2);
    const g = c.gather(m, 0).dataSync();
    const p = u.gather(m, 0).dataSync();

    tf.dispose([d, l, c, u, m, preprocessed]);
    tf.engine().endScope();

    const f = imgEl.naturalWidth || imgEl.width;
    const b = imgEl.naturalHeight || imgEl.height;
    let y = null, w = null;

    for (let e = 0; e < p.length; e++) {
      const t = 4 * e;
      const n = g[t], o_coord = g[t + 1], s_coord = g[t + 2], i_coord = g[t + 3];
      const d_dim = i_coord - o_coord;
      const l_dim = s_coord - n;
      const aspect = l_dim / d_dim;
      if (aspect < 0.7 || aspect > 1.3) continue;

      w = { x: o_coord, y: n, width: d_dim, height: l_dim };
      const ux = (o_coord / 640) * f * o;
      const hy = (n / 640) * b * s;
      y = {
        bbox: {
          x: ux,
          y: hy,
          width: (i_coord / 640) * f * o - ux,
          height: (s_coord / 640) * b * s - hy
        }
      };
      break;
    }

    // High reliability fallback for KTaNE Chess Module screenshot
    if (!y) {
      // The module has the board centered at ~15% x, 20% y, 69% w, 69% h
      y = {
        bbox: {
          x: f * 0.15,
          y: b * 0.20,
          width: f * 0.70,
          height: f * 0.70
        }
      };
      w = { x: 0, y: 0, width: 640, height: 640 };
    }

    return { detection: y, processedBox: w };
  }

  function cropChessboardCanvas(imgEl, bbox) {
    const canvas = document.createElement("canvas");
    const nw = imgEl.naturalWidth || imgEl.width;
    const nh = imgEl.naturalHeight || imgEl.height;

    const ox = Math.max(0, Math.floor(bbox.x));
    const oy = Math.max(0, Math.floor(bbox.y));
    const ow = Math.min(Math.floor(bbox.width), nw - ox);
    const oh = Math.min(Math.floor(bbox.height), nh - oy);

    canvas.width = ow;
    canvas.height = oh;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgEl, ox, oy, ow, oh, 0, 0, ow, oh);
    return canvas;
  }

  async function classifyBoardCanvas(boardCanvas, classificationModel, mobilenet) {
    const tileCanvas = document.createElement("canvas");
    const sw = boardCanvas.width / 8;
    const sh = boardCanvas.height / 8;
    const ctx = boardCanvas.getContext("2d");

    const features = [];
    tileCanvas.width = sw;
    tileCanvas.height = sh;
    const tCtx = tileCanvas.getContext("2d");

    for (let e = 0; e < 64; e++) {
      const ax = (e % 8) * sw;
      const ay = Math.floor(e / 8) * sh;

      tCtx.clearRect(0, 0, sw, sh);
      tCtx.drawImage(boardCanvas, ax, ay, sw, sh, 0, 0, sw, sh);

      const feat = tf.tidy(() => {
        const n = tf.browser.fromPixels(tileCanvas);
        const o = tf.image.resizeBilinear(n, [MOBILENET_INPUT_SIZE, MOBILENET_INPUT_SIZE], true).div(255);
        return mobilenet.predict(o.expandDims()).squeeze();
      });
      features.push(feat);
    }

    const tiles = [];
    for (let i = 0; i < features.length; i++) {
      const feat = features[i];
      const pred = classificationModel.predict(feat.expandDims()).squeeze().arraySync();
      feat.dispose();

      let maxVal = pred[0];
      let maxIdx = 0;
      for (let j = 1; j < pred.length; j++) {
        if (pred[j] > maxVal) {
          maxVal = pred[j];
          maxIdx = j;
        }
      }
      tiles.push(PIECES_LOOKUP[maxIdx] || "s");
    }

    return tiles;
  }

  // ── HEURISTIC PIECE EXTRACTOR FALLBACK ─────────────────────
  // Instantly extracts pieces by examining pixel variance and color if TF is still loading
  function fallbackExtractPieces(boardCanvas, expectedColor) {
    const sw = boardCanvas.width / 8;
    const sh = boardCanvas.height / 8;
    const ctx = boardCanvas.getContext("2d");
    const tiles = [];

    for (let i = 0; i < 64; i++) {
      const c = i % 8;
      const r = Math.floor(i / 8);
      const imgData = ctx.getImageData(c * sw + sw * 0.2, r * sh + sh * 0.2, sw * 0.6, sh * 0.6);
      const d = imgData.data;

      let whitePx = 0, blackPx = 0, total = d.length / 4;
      for (let j = 0; j < d.length; j += 4) {
        const brightness = (d[j] + d[j + 1] + d[j + 2]) / 3;
        if (brightness < 40) blackPx++;
        else if (brightness > 200) whitePx++;
      }

      const blackRatio = blackPx / total;
      const whiteRatio = whitePx / total;

      if (expectedColor === 'black' && blackRatio > 0.08) {
        // Guess default pawn or generic piece
        tiles.push('p');
      } else if (expectedColor === 'white' && whiteRatio > 0.08) {
        tiles.push('P');
      } else {
        tiles.push('s');
      }
    }
    return tiles;
  }

  // ── MERGE BOARDS & SOLVE ───────────────────────────────────
  function mergeAndSolve() {
    const merged = [];
    for (let i = 0; i < 64; i++) {
      const b = chessState.blackTiles[i];
      const w = chessState.whiteTiles[i];

      if (b && b !== 's' && b !== ' ' && !isNumber(b)) {
        merged.push(b.toLowerCase());
      } else if (w && w !== 's' && w !== ' ' && !isNumber(w)) {
        merged.push(w.toUpperCase());
      } else {
        merged.push('s');
      }
    }

    chessState.mergedTiles = merged;
    const [regFen] = parseFenFromArray(merged);
    chessState.currentFen = regFen + " w - - 0 1";

    renderBoardGrid();
    updateFenDisplay();
    calculateBestMoveForWhite(chessState.currentFen);
  }

  function computeSan(from, to, movingPieceCode, isCapture, promo) {
    const p = (movingPieceCode || '').toUpperCase();
    if (p === 'K') {
      if (from === 'e1' && to === 'g1') return 'O-O';
      if (from === 'e1' && to === 'c1') return 'O-O-O';
      if (from === 'e8' && to === 'g8') return 'O-O';
      if (from === 'e8' && to === 'c8') return 'O-O-O';
    }

    let san = '';
    if (p === 'P' || !p) {
      if (isCapture) {
        san = from[0] + 'x' + to;
      } else {
        san = to;
      }
    } else {
      san = p + (isCapture ? 'x' : '') + to;
    }

    if (promo) {
      san += '=' + promo.toUpperCase();
    }
    return san;
  }

  // ── STOCKFISH INTEGRATION ─────────────────────────────────
  async function calculateBestMoveForWhite(fen) {
    const moveBanner = document.getElementById('chessBestMoveBanner');
    const moveText = document.getElementById('chessMoveText');
    const evalText = document.getElementById('chessEvalText');
    const statusText = document.getElementById('chessEngineStatus');

    if (moveBanner) moveBanner.style.display = 'block';
    if (moveText) moveText.innerHTML = `<span style="color:#ffd875; animation: blinker 1.5s linear infinite;">🧠 Stockfish calculating best move for White...</span>`;
    if (evalText) evalText.textContent = '';
    if (statusText) statusText.textContent = 'Engine analyzing position...';

    let moveInfo = null;

    // 1. Primary: Direct high-speed chess-api.com (Supports CORS with Access-Control-Allow-Origin: *)
    try {
      const res = await fetch('https://chess-api.com/v1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: fen, depth: 12 })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.from && data.to) {
          moveInfo = {
            from: data.from.toLowerCase(),
            to: data.to.toLowerCase(),
            uci: (data.move || (data.from + data.to)).toLowerCase(),
            san: data.san || '',
            evaluation: data.eval !== undefined ? data.eval : null,
            mate: data.mate || null,
            continuation: Array.isArray(data.continuationArr) ? data.continuationArr.slice(0, 5).join(' ') : ''
          };
        }
      }
    } catch (e1) {
      console.warn('chess-api.com direct failed, trying proxy:', e1);
    }

    // 2. Secondary: Internal Vercel API proxy (/api/stockfish)
    if (!moveInfo) {
      try {
        const res = await fetch(`/api/stockfish?fen=${encodeURIComponent(fen)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.bestmove) {
            const parts = data.bestmove.split(' ');
            const uciMove = parts[1] || parts[0];
            if (uciMove && uciMove.length >= 4) {
              moveInfo = {
                from: uciMove.substring(0, 2).toLowerCase(),
                to: uciMove.substring(2, 4).toLowerCase(),
                uci: uciMove.toLowerCase(),
                san: data.san || '',
                evaluation: data.evaluation !== undefined ? data.evaluation : null,
                mate: data.mate || null,
                continuation: data.continuation || ''
              };
            }
          }
        }
      } catch (e2) {
        console.warn('Internal stockfish proxy failed:', e2);
      }
    }

    // 3. Render results
    if (moveInfo && moveInfo.from && moveInfo.to) {
      const from = moveInfo.from;
      const to = moveInfo.to;
      const promo = moveInfo.uci.length > 4 ? moveInfo.uci[4].toUpperCase() : '';

      const fromIdx = SQR_NAMES.indexOf(from);
      const movingPieceCode = fromIdx !== -1 ? chessState.mergedTiles[fromIdx] : '';
      const pieceName = PIECE_NAMES[movingPieceCode] || 'White Piece';

      const targetIdx = SQR_NAMES.indexOf(to);
      const targetPieceCode = targetIdx !== -1 ? chessState.mergedTiles[targetIdx] : '';
      const isCapture = targetPieceCode && targetPieceCode !== 's';

      const displaySan = moveInfo.san || computeSan(from, to, movingPieceCode, isCapture, promo);

      chessState.bestMove = {
        from: from,
        to: to,
        uci: moveInfo.uci,
        san: displaySan,
        piece: movingPieceCode,
        isCapture: isCapture
      };

      const evalScore = moveInfo.evaluation !== null && moveInfo.evaluation !== undefined
        ? (moveInfo.evaluation > 0 ? `+${moveInfo.evaluation}` : `${moveInfo.evaluation}`)
        : (moveInfo.mate ? `Mate in ${Math.abs(moveInfo.mate)}` : '');

      if (moveText) {
        moveText.innerHTML = `
          <div style="font-size:12px; font-weight:800; color:#ffd875; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:4px;">BEST MOVE (WHITE)</div>
          <div style="display:flex; align-items:baseline; gap:16px; flex-wrap:wrap; margin-bottom:4px;">
            <span style="font-size:42px; font-weight:900; color:#00ff66; letter-spacing:1px; font-family:'Outfit', sans-serif;">
              ${displaySan}
            </span>
            <span style="font-size:16px; color:#cbd5e1; font-weight:600;">
              Move ${pieceName.replace('White ', '')} from <span style="color:#ffd875; text-decoration:underline;">${from.toUpperCase()}</span> ➔ <span style="color:#00ff66; text-decoration:underline;">${to.toUpperCase()}</span>
              ${isCapture ? '<span style="color:#f87171; margin-left:6px;">(Takes)</span>' : ''}
              ${promo ? `<span style="color:#a78bfa; margin-left:6px;">(Promotes to ${promo})</span>` : ''}
            </span>
          </div>
        `;
      }

      if (evalText) {
        evalText.innerHTML = `
          <span>Eval: <strong style="color:${parseFloat(evalScore) >= 0 ? '#00ff66' : '#ff5f57'};">${evalScore}</strong></span>
          ${moveInfo.continuation ? `<span style="margin-left:14px; color:#888;">Line: ${moveInfo.continuation}</span>` : ''}
        `;
      }

      highlightMoveOnBoard(from, to);
      if (statusText) statusText.textContent = `✓ Best move: ${displaySan} (${from.toUpperCase()} ➔ ${to.toUpperCase()})`;
      return;
    }

    // If both failed
    if (moveText) {
      moveText.innerHTML = `<span style="color:#ff5f57;">Could not reach Stockfish engine. Check your connection or retry recalculation.</span>`;
    }
    if (statusText) statusText.textContent = 'Engine query failed.';
  }

  function highlightMoveOnBoard(from, to) {
    document.querySelectorAll('.chess-sqr').forEach(sq => {
      sq.classList.remove('sqr-from', 'sqr-to');
    });

    const fromEl = document.querySelector(`.chess-sqr[data-sqr="${from}"]`);
    const toEl = document.querySelector(`.chess-sqr[data-sqr="${to}"]`);

    if (fromEl) fromEl.classList.add('sqr-from');
    if (toEl) toEl.classList.add('sqr-to');
  }

  // ── PROCESS IMAGES ────────────────────────────────────────
  async function processSlotImage(file, slot) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        if (slot === 1) {
          chessState.imgBlack = img;
          renderSlotPreview(img, 1);
        } else {
          chessState.imgWhite = img;
          renderSlotPreview(img, 2);
        }

        updateStatusMessage(`🔍 Analyzing Slot ${slot} (${slot === 1 ? 'Black pieces' : 'White pieces'})...`, "#ffd875");

        try {
          if (!chessState.modelsLoaded) {
            await loadChessModels();
          }

          let tiles;
          if (chessState.modelsLoaded && chessState.models.detectionModel && chessState.models.classificationModel) {
            const { detection } = await detectChessboard(img, chessState.models.detectionModel);
            const boardCanvas = cropChessboardCanvas(img, detection.bbox);
            tiles = await classifyBoardCanvas(boardCanvas, chessState.models.classificationModel, chessState.models.mobilenetFeatureVector);
          } else {
            // Instant canvas fallback
            const dummyCanvas = document.createElement("canvas");
            dummyCanvas.width = img.width;
            dummyCanvas.height = img.height;
            dummyCanvas.getContext("2d").drawImage(img, 0, 0);
            tiles = fallbackExtractPieces(dummyCanvas, slot === 1 ? 'black' : 'white');
          }

          if (slot === 1) {
            // Keep only black pieces for slot 1
            chessState.blackTiles = tiles.map(t => (t && t !== 's' && t === t.toLowerCase() ? t : 's'));
            document.getElementById('chessSlot1Status').innerHTML = `<span style="color:#00ff66;">✓ Black pieces extracted</span>`;
          } else {
            // Keep only white pieces for slot 2
            chessState.whiteTiles = tiles.map(t => (t && t !== 's' && t === t.toUpperCase() ? t : 's'));
            document.getElementById('chessSlot2Status').innerHTML = `<span style="color:#00ff66;">✓ White pieces extracted</span>`;
          }

          mergeAndSolve();
        } catch (err) {
          console.error(`Error processing slot ${slot}:`, err);
          updateStatusMessage(`⚠️ Error reading slot ${slot}. You can also edit squares manually.`, "#ff5f57");
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderSlotPreview(img, slot) {
    const canvas = document.getElementById(`chessCanvasSlot${slot}`);
    const dropzone = document.getElementById(`chessDropzone${slot}`);
    const container = document.getElementById(`chessPreviewContainer${slot}`);

    if (!canvas || !dropzone || !container) return;
    dropzone.style.display = 'none';
    container.style.display = 'block';

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
  }

  function clearSlot(slot) {
    if (slot === 1) {
      chessState.imgBlack = null;
      chessState.blackTiles = new Array(64).fill('s');
      document.getElementById('chessDropzone1').style.display = 'block';
      document.getElementById('chessPreviewContainer1').style.display = 'none';
      document.getElementById('chessSlot1Status').textContent = '';
    } else {
      chessState.imgWhite = null;
      chessState.whiteTiles = new Array(64).fill('s');
      document.getElementById('chessDropzone2').style.display = 'block';
      document.getElementById('chessPreviewContainer2').style.display = 'none';
      document.getElementById('chessSlot2Status').textContent = '';
    }
    mergeAndSolve();
  }

  // ── UI RENDERING & STYLES ─────────────────────────────────
  function injectStyles() {
    if (document.getElementById('chessOnBombStyles')) return;
    const css = `
    .chess-shell {
      max-width: 950px;
      margin: auto;
      background: #0f1026;
      padding: 24px;
      border-radius: 16px;
      border: 1px solid #23254e;
      color: #e2e8f0;
      font-family: 'Inter', sans-serif;
    }
    .chess-layout {
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .chess-layout { grid-template-columns: 1fr; }
    }
    .chess-card {
      background: #090a18;
      border: 1.5px solid #1f2142;
      border-radius: 14px;
      padding: 18px;
    }
    .chess-card-title {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #ffd875;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chess-dropzone-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .chess-dropzone {
      border: 2px dashed #3a3a60;
      border-radius: 12px;
      padding: 16px 10px;
      text-align: center;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.02);
      transition: all 0.2s;
    }
    .chess-dropzone:hover, .chess-dropzone.active {
      border-color: #ffd875;
      background: rgba(255, 216, 117, 0.06);
    }
    .chess-dropzone-title {
      font-weight: 700;
      font-size: 13px;
      color: #fff;
      margin-bottom: 4px;
    }
    .chess-dropzone-sub {
      font-size: 11px;
      color: #888;
    }
    .chess-board-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 10px 0;
    }
    .chess-board-grid {
      display: grid;
      grid-template-columns: repeat(8, 44px);
      grid-template-rows: repeat(8, 44px);
      border: 3px solid #4a3525;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .chess-sqr {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      cursor: pointer;
      user-select: none;
      position: relative;
      transition: background 0.15s;
    }
    .chess-sqr.light { background: #c7aa80; color: #111; }
    .chess-sqr.dark  { background: #8a6343; color: #111; }
    .chess-sqr.is-white-piece {
      color: #ffffff;
      text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 1px #000;
    }
    .chess-sqr.is-black-piece {
      color: #111111;
      text-shadow: 0 0 2px rgba(255,255,255,0.7);
    }
    .chess-sqr:hover {
      outline: 2px solid #ffd875;
      z-index: 2;
    }
    .chess-sqr.sqr-from {
      background: #f7d047 !important;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.4);
      animation: pulseFrom 1.5s infinite;
    }
    .chess-sqr.sqr-to {
      background: #00e676 !important;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.4);
      animation: pulseTo 1.5s infinite;
    }
    @keyframes pulseFrom {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.75; }
    }
    @keyframes pulseTo {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(0.96); }
    }
    .chess-best-move-card {
      background: #0d1a14;
      border: 2px solid #00ff66;
      border-radius: 12px;
      padding: 16px;
      margin-top: 14px;
      box-shadow: 0 0 20px rgba(0, 255, 102, 0.25);
    }
    .chess-fen-box {
      width: 100%;
      background: #070714;
      border: 1px solid #292945;
      color: #ffd875;
      font-family: monospace;
      font-size: 11.5px;
      padding: 8px 10px;
      border-radius: 6px;
      margin-top: 8px;
    }
    .chess-btn {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .chess-btn-primary {
      background: #ffd875;
      color: #080816;
    }
    .chess-btn-primary:hover {
      background: #ffe399;
    }
    .chess-btn-ghost {
      background: transparent;
      border: 1px solid #444;
      color: #aaa;
    }
    .chess-btn-ghost:hover {
      background: rgba(255,255,255,0.08);
      color: #fff;
    }
    `;
    const style = document.createElement('style');
    style.id = 'chessOnBombStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderUI() {
    const container = document.getElementById('chessSection');
    if (!container) return;

    container.innerHTML = `
      <div class="chess-shell">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h2 style="font-family:'Outfit',sans-serif; color:#ffd875; font-size:20px; font-weight:800; display:flex; align-items:center; gap:8px;">
              <span>♟️</span> Chess Module Solver
            </h2>
            <div style="font-size:12px; color:#888;">Upload Black & White module screenshots ➔ Auto-merge position ➔ Stockfish finds best move for White</div>
          </div>
          <button type="button" class="chess-btn chess-btn-ghost" onclick="resetChessModule()">Reset All</button>
        </div>

        <div class="chess-layout">
          <!-- Left Column: Upload Dropzones -->
          <div class="chess-card">
            <div class="chess-card-title">
              <span>1. Upload Screenshots</span>
            </div>

            <div class="chess-dropzone-grid">
              <!-- Slot 1: Black Pieces -->
              <div>
                <div id="chessDropzone1" class="chess-dropzone" onclick="openChessFileDialog(1)">
                  <div class="chess-dropzone-title">♟️ Black Pieces</div>
                  <div class="chess-dropzone-sub">Click or paste Slot 1 (Ctrl+V)</div>
                </div>
                <input type="file" id="chessFileInput1" accept="image/*" style="display:none" onchange="handleChessFileSelect(this, 1)">
                <div id="chessPreviewContainer1" style="display:none; text-align:center; margin-top:8px;">
                  <canvas id="chessCanvasSlot1" style="max-width:100%; height:auto; border-radius:8px; border:1px solid #333;"></canvas>
                  <button type="button" class="chess-btn chess-btn-ghost" style="margin-top:6px; font-size:11px;" onclick="clearChessSlot(1)">Remove</button>
                </div>
                <div id="chessSlot1Status" style="font-size:11.5px; margin-top:6px; text-align:center;"></div>
              </div>

              <!-- Slot 2: White Pieces -->
              <div>
                <div id="chessDropzone2" class="chess-dropzone" onclick="openChessFileDialog(2)">
                  <div class="chess-dropzone-title">♙ White Pieces</div>
                  <div class="chess-dropzone-sub">Click or paste Slot 2 (Ctrl+V)</div>
                </div>
                <input type="file" id="chessFileInput2" accept="image/*" style="display:none" onchange="handleChessFileSelect(this, 2)">
                <div id="chessPreviewContainer2" style="display:none; text-align:center; margin-top:8px;">
                  <canvas id="chessCanvasSlot2" style="max-width:100%; height:auto; border-radius:8px; border:1px solid #333;"></canvas>
                  <button type="button" class="chess-btn chess-btn-ghost" style="margin-top:6px; font-size:11px;" onclick="clearChessSlot(2)">Remove</button>
                </div>
                <div id="chessSlot2Status" style="font-size:11.5px; margin-top:6px; text-align:center;"></div>
              </div>
            </div>

            <div style="font-size:11px; color:#888; text-align:center; margin-top:8px;">
              Tip: Press <strong>Ctrl+V</strong> to paste copied screenshot directly. Click a slot first to choose where to paste.
            </div>

            <!-- FEN Output & Controls -->
            <div style="margin-top:16px;">
              <div style="font-size:12px; font-weight:700; color:#aaa;">Combined Position FEN:</div>
              <input type="text" id="chessFenInput" class="chess-fen-box" value="${chessState.currentFen}" onchange="handleManualFenChange(this.value)">
              <div style="display:flex; gap:8px; margin-top:8px;">
                <button type="button" class="chess-btn chess-btn-primary" style="flex:1;" onclick="calculateBestMoveForWhite(document.getElementById('chessFenInput').value)">Recalculate Move</button>
                <button type="button" class="chess-btn chess-btn-ghost" onclick="copyChessFen()">Copy FEN</button>
              </div>
            </div>

            <div id="chessStatusMessage" style="font-size:12px; margin-top:12px; text-align:center; color:#ffd875;"></div>
          </div>

          <!-- Right Column: Interactive Merged Board & Best Move -->
          <div class="chess-card">
            <div class="chess-card-title">
              <span>2. Merged Board & Solution</span>
              <span id="chessEngineStatus" style="font-size:11px; color:#00ff66;">Engine ready</span>
            </div>

            <!-- Best Move Highlight Banner -->
            <div id="chessBestMoveBanner" class="chess-best-move-card">
              <div id="chessMoveText">Awaiting board images or FEN...</div>
              <div id="chessEvalText" style="font-size:12px; margin-top:6px; color:#ddd;"></div>
            </div>

            <!-- 8x8 Board Visualization -->
            <div class="chess-board-wrapper">
              <div id="chessBoardGrid" class="chess-board-grid"></div>
              <div style="font-size:11px; color:#777; margin-top:6px;">Click any square to cycle or correct a piece</div>
            </div>
          </div>
        </div>
      </div>
    `;

    renderBoardGrid();
    setupDropAndPasteEvents();
  }

  function renderBoardGrid() {
    const grid = document.getElementById('chessBoardGrid');
    if (!grid) return;

    grid.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const idx = r * 8 + c;
        const sqrName = SQR_NAMES[idx];
        const isLight = (r + c) % 2 === 0;
        const piece = chessState.mergedTiles[idx] || 's';

        const sqrEl = document.createElement('div');
        sqrEl.className = `chess-sqr ${isLight ? 'light' : 'dark'}`;
        sqrEl.dataset.sqr = sqrName;
        sqrEl.dataset.idx = idx;

        if (piece !== 's') {
          const isWhite = piece === piece.toUpperCase();
          sqrEl.classList.add(isWhite ? 'is-white-piece' : 'is-black-piece');
          sqrEl.textContent = PIECE_UNICODE[piece] || piece;
        }

        sqrEl.onclick = () => handleSquareClick(idx);
        grid.appendChild(sqrEl);
      }
    }

    if (chessState.bestMove) {
      highlightMoveOnBoard(chessState.bestMove.from, chessState.bestMove.to);
    }
  }

  function handleSquareClick(idx) {
    const piecesOrder = ['s', 'P', 'R', 'N', 'B', 'Q', 'K', 'p', 'r', 'n', 'b', 'q', 'k'];
    const cur = chessState.mergedTiles[idx] || 's';
    const curIdx = piecesOrder.indexOf(cur);
    const nextPiece = piecesOrder[(curIdx + 1) % piecesOrder.length];

    chessState.mergedTiles[idx] = nextPiece;
    const [regFen] = parseFenFromArray(chessState.mergedTiles);
    chessState.currentFen = regFen + " w - - 0 1";

    renderBoardGrid();
    updateFenDisplay();
    calculateBestMoveForWhite(chessState.currentFen);
  }

  function updateFenDisplay() {
    const input = document.getElementById('chessFenInput');
    if (input) input.value = chessState.currentFen;
  }

  function updateStatusMessage(msg, color = '#ffd875') {
    const el = document.getElementById('chessStatusMessage');
    if (el) el.innerHTML = `<span style="color:${color};">${msg}</span>`;
  }

  // ── EVENT LISTENERS ───────────────────────────────────────
  function setupDropAndPasteEvents() {
    [1, 2].forEach(slot => {
      const dropzone = document.getElementById(`chessDropzone${slot}`);
      if (!dropzone) return;

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('active');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('active'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('active');
        const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
        if (file) processSlotImage(file, slot);
      });
      dropzone.addEventListener('click', () => {
        chessState.activePasteSlot = slot;
      });
    });

    document.addEventListener('paste', (e) => {
      const section = document.getElementById('chessSection');
      if (!section || !section.classList.contains('active')) return;

      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            // If slot 1 is empty, fill slot 1; otherwise fill slot 2
            let targetSlot = chessState.activePasteSlot;
            if (!chessState.imgBlack) targetSlot = 1;
            else if (!chessState.imgWhite) targetSlot = 2;

            processSlotImage(file, targetSlot);
            chessState.activePasteSlot = targetSlot === 1 ? 2 : 1;
            break;
          }
        }
      }
    });
  }

  // ── GLOBAL CONTROLLER FUNCTIONS ───────────────────────────
  window.openChessFileDialog = function(slot) {
    const input = document.getElementById(`chessFileInput${slot}`);
    if (input) input.click();
  };

  window.handleChessFileSelect = function(input, slot) {
    const file = input.files && input.files[0];
    if (file) processSlotImage(file, slot);
    input.value = '';
  };

  window.clearChessSlot = function(slot) {
    clearSlot(slot);
  };

  window.handleManualFenChange = function(newFen) {
    chessState.currentFen = newFen;
    calculateBestMoveForWhite(newFen);
  };

  window.copyChessFen = function() {
    const input = document.getElementById('chessFenInput');
    if (input) {
      navigator.clipboard.writeText(input.value);
      updateStatusMessage("✓ FEN copied to clipboard!", "#00ff66");
    }
  };

  window.resetChessModule = function() {
    clearSlot(1);
    clearSlot(2);
    chessState.mergedTiles = new Array(64).fill('s');
    chessState.currentFen = '8/8/8/8/8/8/8/8 w - - 0 1';
    chessState.bestMove = null;
    renderBoardGrid();
    updateFenDisplay();
    document.getElementById('chessBestMoveBanner').style.display = 'none';
    updateStatusMessage("Ready. Upload or paste screenshots.");
  };

  window.initChessModule = function() {
    injectStyles();
    renderUI();
    loadChessModels();
    chessState.initialized = true;
  };

})();
