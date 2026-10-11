/**
 * Multi Maze Auto-Solver Module for KTaNE Solver Deck
 * 
 * Features:
 * - Automatically crops multi-maze screenshots (e.g. 8 vertical modules, 3x3 grid / 9 mazes, 2x2 grid / 4 mazes, etc.)
 * - Generates individual slot cards for each detected maze
 * - Auto-detects layout (8x1, 1x8, 3x3, 2x2, 3x1, etc.) with manual override options
 * - Instant per-slot Dots image upload or paste (Ctrl+V)
 * - Solves each slot immediately upon receiving dots and outputs the directional move sequence
 * - Automatically advances active paste target to the next slot (Slot 1 -> Slot 2 -> Slot 3...)
 * - One-click "📋 Copy Moves" button per slot and "📋 Copy All Answers"
 * - Master Multi-Dots uploader: auto-slices and solves all slots in one click if a multi-dots screenshot is provided
 */

(function () {
  'use strict';

  let initialized = false;
  let masterMazeImg = null;
  let masterDotsImg = null;
  let currentLayoutKey = 'auto';
  let activeSlotIndex = 0;
  let slotsData = [];

  const LAYOUT_PRESETS = [
    { key: 'auto', label: '⚡ Auto Detect' },
    { key: '8x1',  label: '8 Mazes (Vertical 8×1)', rows: 8, cols: 1 },
    { key: '1x8',  label: '8 Mazes (Horizontal 1×8)', rows: 1, cols: 8 },
    { key: '3x3',  label: '9 Mazes (Grid 3×3)', rows: 3, cols: 3 },
    { key: '3x2',  label: '6 Mazes (Grid 3×2)', rows: 3, cols: 2 },
    { key: '2x3',  label: '6 Mazes (Grid 2×3)', rows: 2, cols: 3 },
    { key: '2x2',  label: '4 Mazes (Grid 2×2)', rows: 2, cols: 2 },
    { key: '4x1',  label: '4 Mazes (Vertical 4×1)', rows: 4, cols: 1 },
    { key: '1x4',  label: '4 Mazes (Horizontal 1×4)', rows: 1, cols: 4 },
    { key: '3x1',  label: '3 Mazes (Vertical 3×1)', rows: 3, cols: 1 },
    { key: '1x3',  label: '3 Mazes (Horizontal 1×3)', rows: 1, cols: 3 },
    { key: '2x1',  label: '2 Mazes (Vertical 2×1)', rows: 2, cols: 1 },
    { key: '1x2',  label: '2 Mazes (Horizontal 1×2)', rows: 1, cols: 2 }
  ];

  // Helper: format move characters to human readable e.g. "UP 2, RIGHT 3"
  function formatMovesReadable(movesStr) {
    if (!movesStr) return '';
    const dirNames = { U: 'UP', D: 'DOWN', L: 'LEFT', R: 'RIGHT' };
    const chunks = [];
    let curDir = movesStr[0];
    let curCount = 0;
    for (let i = 0; i < movesStr.length; i++) {
      if (movesStr[i] === curDir) {
        curCount++;
      } else {
        chunks.push(`${dirNames[curDir] || curDir} ${curCount}`);
        curDir = movesStr[i];
        curCount = 1;
      }
    }
    if (curCount > 0) {
      chunks.push(`${dirNames[curDir] || curDir} ${curCount}`);
    }
    return chunks.join(', ');
  }

  // Detect rows and cols based on aspect ratio
  function detectGridDimensions(w, h, layoutKey) {
    if (layoutKey && layoutKey !== 'auto') {
      const preset = LAYOUT_PRESETS.find(p => p.key === layoutKey);
      if (preset && preset.rows && preset.cols) {
        return { rows: preset.rows, cols: preset.cols, isAuto: false };
      }
    }

    const ratio = h / w;
    // Tall vertical strips
    if (ratio >= 6.5) return { rows: 8, cols: 1, isAuto: true };
    if (ratio >= 5.5) return { rows: 6, cols: 1, isAuto: true };
    if (ratio >= 4.5) return { rows: 5, cols: 1, isAuto: true };
    if (ratio >= 3.5) return { rows: 4, cols: 1, isAuto: true };
    if (ratio >= 2.5) return { rows: 3, cols: 1, isAuto: true };
    if (ratio >= 1.6) return { rows: 2, cols: 1, isAuto: true };

    // Wide horizontal strips
    const invRatio = w / h;
    if (invRatio >= 6.5) return { rows: 1, cols: 8, isAuto: true };
    if (invRatio >= 5.5) return { rows: 1, cols: 6, isAuto: true };
    if (invRatio >= 4.5) return { rows: 1, cols: 5, isAuto: true };
    if (invRatio >= 3.5) return { rows: 1, cols: 4, isAuto: true };
    if (invRatio >= 2.5) return { rows: 1, cols: 3, isAuto: true };
    if (invRatio >= 1.6) return { rows: 1, cols: 2, isAuto: true };

    // Near square: default to 3x3 (9 mazes), common in KTaNE multi-mazes
    return { rows: 3, cols: 3, isAuto: true };
  }

  // Slice an image into a grid of canvases
  function sliceImage(imgEl, rows, cols) {
    const slices = [];
    const cellW = imgEl.width / cols;
    const cellH = imgEl.height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = Math.round(c * cellW);
        const sy = Math.round(r * cellH);
        const sw = Math.round((c + 1) * cellW) - sx;
        const sh = Math.round((r + 1) * cellH) - sy;

        const cv = document.createElement('canvas');
        cv.width = sw;
        cv.height = sh;
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, sw, sh);

        slices.push(cv);
      }
    }
    return slices;
  }

  // Initialize UI layout
  function initMultiMazeModule() {
    const container = document.getElementById('multiMazeView');
    if (!container) return;
    if (initialized) return;
    initialized = true;

    container.innerHTML = `
      <div class="multi-maze-shell" style="max-width: 1100px; margin: 0 auto; padding: 0 10px 40px;">
        
        <!-- Top Control & Upload Card -->
        <div class="multi-header-card" style="background: #121226; border: 1px solid #282848; border-radius: 14px; padding: 20px; margin-bottom: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
            <div>
              <div style="display:flex; align-items:center; gap:10px;">
                <h2 style="color: #f5c542; margin:0; font-size: 20px; font-weight: 700; letter-spacing: 0.3px;">🔲 Multi Maze Auto-Solver</h2>
                <span id="multiCountBadge" style="background: rgba(245, 197, 66, 0.15); color: #f5c542; border: 1px solid rgba(245, 197, 66, 0.3); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;">2 to 9 Mazes</span>
              </div>
              <p style="color: #9da0c0; font-size: 13px; margin: 6px 0 0; line-height: 1.4;">
                Upload or paste a screenshot containing multiple mazes. Slices automatically into individual slots. Paste or upload red & yellow dots for each slot to solve instantly!
              </p>
            </div>

            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <button type="button" id="multiClearBtn" onclick="window.multiMazeClearAll()" style="background: #1e1e38; color: #ff8585; border: 1px solid #4a2838; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                <span>🗑️ Clear All</span>
              </button>
            </div>
          </div>

          <!-- Master Upload Dropzones -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
            
            <!-- 1. Master Multi-Maze Uploader -->
            <div id="multiMazeDropzone" class="multi-dropzone" onclick="document.getElementById('multiMazeFileInput').click()" style="background: #181832; border: 2px dashed #3a3a60; border-radius: 12px; padding: 22px 16px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative;">
              <input type="file" id="multiMazeFileInput" accept="image/*" style="display:none;" onchange="window.multiMazeOnFileLoaded(event, 'maze')">
              <div style="font-size: 32px; margin-bottom: 6px;">🔲🔲</div>
              <div style="color: #e2e8f0; font-weight: 700; font-size: 14px; margin-bottom: 4px;">1. Upload Multi-Maze Image</div>
              <div style="color: #8c8fae; font-size: 12px;">The screenshot with 2, 3, 4, 8, or 9 maze walls</div>
              <div style="margin-top: 8px; font-size: 11px; color: #f5c542; font-weight: 600; background: rgba(245, 197, 66, 0.1); display: inline-block; padding: 3px 10px; border-radius: 6px;">
                Click, Drag & Drop or Ctrl+V
              </div>
              <div id="multiMazeLoadedTick" style="display:none; margin-top:8px; color:#4ade80; font-weight:700; font-size:12px;">✓ Multi-Maze Loaded</div>
            </div>

            <!-- 2. Master Multi-Dots Uploader (Optional Bulk Dots) -->
            <div id="multiDotsDropzone" class="multi-dropzone" onclick="document.getElementById('multiDotsFileInput').click()" style="background: #181832; border: 2px dashed #3a3a60; border-radius: 12px; padding: 22px 16px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative;">
              <input type="file" id="multiDotsFileInput" accept="image/*" style="display:none;" onchange="window.multiMazeOnFileLoaded(event, 'dots')">
              <div style="font-size: 32px; margin-bottom: 6px;">⚡🔴🟡</div>
              <div style="color: #e2e8f0; font-weight: 700; font-size: 14px; margin-bottom: 4px;">2. Multi-Dots Image (Optional Bulk)</div>
              <div style="color: #8c8fae; font-size: 12px;">If you have all dots in one image, auto-solves all slots!</div>
              <div style="margin-top: 8px; font-size: 11px; color: #60a5fa; font-weight: 600; background: rgba(96, 165, 250, 0.1); display: inline-block; padding: 3px 10px; border-radius: 6px;">
                Or paste dots slot-by-slot below 👇
              </div>
            </div>

          </div>

          <!-- Layout & Config Toolbar -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:16px; padding-top:14px; border-top:1px solid #1f1f3a;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color:#aaa; font-size:12px; font-weight:600;">Grid Layout:</span>
              <select id="multiLayoutSelect" onchange="window.multiMazeChangeLayout(this.value)" style="background:#1a1a36; color:#e2e8f0; border:1px solid #3d3d66; border-radius:6px; padding:5px 10px; font-size:12px; outline:none; cursor:pointer;">
                ${LAYOUT_PRESETS.map(p => `<option value="${p.key}">${p.label}</option>`).join('')}
              </select>
              <span id="multiLayoutStatus" style="color:#f5c542; font-size:12px; font-weight:600;"></span>
            </div>

            <div style="display:flex; align-items:center; gap:10px;">
              <span id="multiProgressText" style="color:#aaa; font-size:12px;">Upload multi-maze image to start</span>
              <button type="button" id="multiCopyAllBtn" onclick="window.multiMazeCopyAll(this)" style="display:none; background:#2563eb; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.2s;">
                📋 Copy All Codes
              </button>
            </div>
          </div>

        </div>

        <!-- Slot Cards Container -->
        <div id="multiMazeSlotsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 16px;">
          <!-- Dynamically populated -->
        </div>

        <!-- Empty State Prompt -->
        <div id="multiEmptyState" style="text-align: center; padding: 50px 20px; background: #121226; border: 1px dashed #282845; border-radius: 14px;">
          <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.7;">🧩</div>
          <h3 style="color: #e2e8f0; margin: 0 0 8px; font-size: 16px;">No Mazes Loaded Yet</h3>
          <p style="color: #8c8fae; font-size: 13px; max-width: 460px; margin: 0 auto 16px; line-height: 1.5;">
            Upload or paste an image containing multiple maze modules (such as an 8-module column or 3×3 bomb face) into the box above to get started.
          </p>
        </div>

      </div>
    `;

    // Global drag & drop and paste support when multiMazeView is visible
    setupGlobalListeners();
  }

  // ── URL & Drag-Drop Helpers ─────────────────────────────────────
  function extractImageUrl(textOrHtml) {
    if (!textOrHtml || typeof textOrHtml !== 'string') return null;
    const str = textOrHtml.trim();

    // 1. Markdown link e.g. [module.png (440x440)](https://cdn.discordapp.com/...)
    const mdMatch = str.match(/\[.*?\]\((https?:\/\/[^\s)]+)\)/i);
    if (mdMatch) return mdMatch[1];

    // 2. HTML img tag e.g. <img src="https://...">
    const htmlImgMatch = str.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
    if (htmlImgMatch) return htmlImgMatch[1];

    // 3. HTML anchor tag e.g. <a href="https://...">
    const htmlAnchorMatch = str.match(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/i);
    if (htmlAnchorMatch) {
      const u = htmlAnchorMatch[1];
      if (/\.(png|jpe?g|webp|gif|bmp)(\?.*)?$/i.test(u) || u.includes('discordapp.') || u.includes('discord.com')) {
        return u;
      }
    }

    // 4. Any direct URL starting with http/https
    const urlMatch = str.match(/https?:\/\/[^\s<>"')]+/i);
    if (urlMatch) {
      const u = urlMatch[0];
      if (/\.(png|jpe?g|webp|gif|bmp)(\?.*)?$/i.test(u) || u.includes('discordapp.') || u.includes('discord.com')) {
        return u;
      }
    }
    return null;
  }

  function loadImageFromUrl(url, onSuccess, onError) {
    // For Discord CDN URLs, route via our server-side proxy to bypass browser CORS.
    // For other URLs, try fetch() directly then fall back to img.src.
    const isDiscord = url.includes('discordapp.com') || url.includes('discordapp.net') || url.includes('discord.com/attachments');
    const proxyUrl = '/api/imgproxy?url=' + encodeURIComponent(url);
    const primaryUrl = isDiscord ? proxyUrl : url;

    // 1. Try fetching (via proxy for Discord, direct for others)
    fetch(primaryUrl)
      .then(res => {
        if (!res.ok) throw new Error('Fetch failed: ' + res.status);
        return res.blob();
      })
      .then(blob => {
        const img = new Image();
        img.onload = () => onSuccess(img);
        img.onerror = () => fallbackDirect(url);
        img.src = URL.createObjectURL(blob);
      })
      .catch(() => {
        // If proxy failed, try original URL directly
        if (isDiscord) {
          fetch(url)
            .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
            .then(b => { const img = new Image(); img.onload = () => onSuccess(img); img.src = URL.createObjectURL(b); })
            .catch(() => fallbackDirect(url));
        } else {
          fallbackDirect(url);
        }
      });

    function fallbackDirect(src) {
      // Try with crossOrigin first (works if server allows CORS)
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => onSuccess(img);
      img.onerror = () => {
        // Last resort: no crossOrigin (canvas will be tainted but at least image loads)
        const img2 = new Image();
        img2.onload = () => onSuccess(img2);
        img2.onerror = (e) => { if (onError) onError(e); };
        img2.src = src;
      };
      img.src = src;
    }
  }

  function handleDataTransferImage(dataTransfer, callback) {
    if (!dataTransfer) return;

    // 1. Try dataTransfer.files — Discord desktop may provide file with no MIME type
    //    so we attempt ALL files and let img.onerror discard non-images.
    const files = dataTransfer.files;
    if (files && files.length > 0) {
      // Check image/* first (fastest path)
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = () => callback(img);
          img.src = URL.createObjectURL(file);
          return;
        }
      }
      // Try any file (Discord desktop drops often have empty/wrong MIME)
      const f = files[0];
      const blobUrl = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => { callback(img); };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        tryUrlFallback();
      };
      img.src = blobUrl;
      return;
    }

    // 2. Items blob (DataTransferItemList)
    const items = dataTransfer.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) {
            const img = new Image();
            img.onload = () => callback(img);
            img.src = URL.createObjectURL(f);
            return;
          }
        }
      }
    }

    tryUrlFallback();

    // 3. URLs in uri-list, text/plain, or text/html (e.g. dragged from Discord)
    function tryUrlFallback() {
      const uriList = dataTransfer.getData('text/uri-list');
      const textPlain = dataTransfer.getData('text/plain');
      const textHtml = dataTransfer.getData('text/html');

      const url = extractImageUrl(uriList) || extractImageUrl(textPlain) || extractImageUrl(textHtml);
      if (url) {
        loadImageFromUrl(url, callback, (err) => {
          console.warn('Could not load dropped image URL:', err);
        });
      }
    }
  }

  // Setup paste & drag/drop listeners
  function setupGlobalListeners() {
    // Paste listener (supports both image blobs and Discord image links)
    document.addEventListener('paste', function (e) {
      const multiView = document.getElementById('multiMazeView');
      const solverSec = document.getElementById('solverSection');
      if (!multiView || multiView.style.display === 'none' || !solverSec || !solverSec.classList.contains('active')) {
        return;
      }

      // 1. Check image blob
      const items = e.clipboardData && e.clipboardData.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            e.preventDefault();
            const blob = item.getAsFile();
            const img = new Image();
            img.onload = () => {
              if (!masterMazeImg) {
                loadMasterMaze(img, currentLayoutKey);
              } else {
                feedDotsToSlot(activeSlotIndex, img);
              }
            };
            img.src = URL.createObjectURL(blob);
            return;
          }
        }
      }

      // 2. Check text or HTML for Discord / web image link
      const textPlain = e.clipboardData && e.clipboardData.getData('text/plain');
      const textHtml = e.clipboardData && e.clipboardData.getData('text/html');
      const url = extractImageUrl(textPlain) || extractImageUrl(textHtml);
      if (url) {
        e.preventDefault();
        loadImageFromUrl(url, (img) => {
          if (!masterMazeImg) {
            loadMasterMaze(img, currentLayoutKey);
          } else {
            feedDotsToSlot(activeSlotIndex, img);
          }
        });
      }
    });

    // Drag and drop for master dropzones (supports both local files and Discord drag-and-drop)
    ['multiMazeDropzone', 'multiDotsDropzone'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.style.borderColor = '#f5c542';
        el.style.background = '#202042';
      });
      el.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.style.borderColor = '#3a3a60';
        el.style.background = '#181832';
      });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.style.borderColor = '#3a3a60';
        el.style.background = '#181832';
        handleDataTransferImage(e.dataTransfer, (img) => {
          if (id === 'multiMazeDropzone') {
            loadMasterMaze(img, currentLayoutKey);
          } else {
            loadMasterDots(img);
          }
        });
      });
    });

    // ── Document-level safety net ─────────────────────────────────────
    // Prevents the browser from opening dropped images in a new tab.
    // dragover: preventDefault only (no stopPropagation) so element-level
    //   dragover handlers still fire and can highlight the hovered zone.
    // drop: bubble phase so slot card / dropzone element handlers fire FIRST.
    //   Those handlers call stopPropagation, so the document only handles
    //   drops that landed on the page background (outside any dropzone).
    function isMultiMazeActive() {
      const multiView = document.getElementById('multiMazeView');
      const solverSec = document.getElementById('solverSection');
      return multiView && multiView.style.display !== 'none' &&
             solverSec && solverSec.classList.contains('active');
    }

    document.addEventListener('dragover', (e) => {
      if (!isMultiMazeActive()) return;
      e.preventDefault();
      // !! No stopPropagation — let element dragover handlers fire too
    });

    document.addEventListener('drop', (e) => {
      // Bubble phase: element handlers (slot cards / master dropzones) call
      // stopPropagation, so this only runs for drops on the page background.
      if (!isMultiMazeActive()) return;
      e.preventDefault();

      handleDataTransferImage(e.dataTransfer, (img) => {
        if (!masterMazeImg) {
          loadMasterMaze(img, currentLayoutKey);
        } else if (!masterDotsImg) {
          loadMasterDots(img);
        } else {
          feedDotsToSlot(activeSlotIndex, img);
        }
      });
    });  // bubble phase (no true) — fires AFTER element handlers
  }

  // File Loaded Handler
  window.multiMazeOnFileLoaded = function (e, type) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      if (type === 'maze') {
        loadMasterMaze(img, currentLayoutKey);
      } else {
        loadMasterDots(img);
      }
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  // Change Layout Dropdown
  window.multiMazeChangeLayout = function (layoutKey) {
    currentLayoutKey = layoutKey;
    if (masterMazeImg) {
      loadMasterMaze(masterMazeImg, layoutKey);
    }
  };

  // Clear All
  window.multiMazeClearAll = function () {
    masterMazeImg = null;
    masterDotsImg = null;
    slotsData = [];
    activeSlotIndex = 0;

    const tick = document.getElementById('multiMazeLoadedTick');
    if (tick) tick.style.display = 'none';

    const layoutStatus = document.getElementById('multiLayoutStatus');
    if (layoutStatus) layoutStatus.textContent = '';

    const progressText = document.getElementById('multiProgressText');
    if (progressText) progressText.textContent = 'Upload multi-maze image to start';

    const copyAllBtn = document.getElementById('multiCopyAllBtn');
    if (copyAllBtn) copyAllBtn.style.display = 'none';

    const countBadge = document.getElementById('multiCountBadge');
    if (countBadge) countBadge.textContent = '2 to 9 Mazes';

    const slotsGrid = document.getElementById('multiMazeSlotsGrid');
    if (slotsGrid) slotsGrid.innerHTML = '';

    const emptyState = document.getElementById('multiEmptyState');
    if (emptyState) emptyState.style.display = 'block';
  };

  // Load Master Maze
  function loadMasterMaze(img, layoutKey) {
    masterMazeImg = img;
    const dims = detectGridDimensions(img.width, img.height, layoutKey);
    const { rows, cols } = dims;
    const count = rows * cols;

    // Slicing
    const slices = sliceImage(img, rows, cols);

    slotsData = slices.map((sliceCv, idx) => ({
      index: idx,
      mazeCanvas: sliceCv,
      dotsImg: null,
      status: 'waiting', // 'waiting' | 'solving' | 'solved' | 'failed'
      solveResult: null,
      error: null
    }));

    activeSlotIndex = 0;

    // Update Top Badges & Status
    const tick = document.getElementById('multiMazeLoadedTick');
    if (tick) tick.style.display = 'block';

    const layoutStatus = document.getElementById('multiLayoutStatus');
    if (layoutStatus) {
      layoutStatus.textContent = `Grid: ${rows}×${cols} (${count} mazes)`;
    }

    const countBadge = document.getElementById('multiCountBadge');
    if (countBadge) countBadge.textContent = `${count} Mazes (${rows}×${cols})`;

    const emptyState = document.getElementById('multiEmptyState');
    if (emptyState) emptyState.style.display = 'none';

    renderSlotCards();
    updateProgressSummary();
  }

  // Load Master Dots (Bulk Dots Slicing)
  function loadMasterDots(img) {
    if (!masterMazeImg || !slotsData.length) {
      alert('Please upload the Multi-Maze image first so the solver knows how many slots to divide!');
      return;
    }
    masterDotsImg = img;
    const dims = detectGridDimensions(masterMazeImg.width, masterMazeImg.height, currentLayoutKey);
    const dotsSlices = sliceImage(img, dims.rows, dims.cols);

    dotsSlices.forEach((dotsCv, idx) => {
      if (slotsData[idx]) {
        feedDotsToSlot(idx, dotsCv);
      }
    });
  }

  // Feed Dots Image/Canvas to a specific slot
  function feedDotsToSlot(slotIndex, dotsImgOrCanvas) {
    if (slotIndex < 0 || slotIndex >= slotsData.length) return;
    const slot = slotsData[slotIndex];
    slot.dotsImg = dotsImgOrCanvas;
    slot.status = 'solving';
    renderSlotCard(slotIndex);

    // Run solve async to allow UI render
    setTimeout(() => {
      if (typeof window.solveMazeInstance !== 'function') {
        slot.status = 'failed';
        slot.error = 'Core solveMazeInstance function not found';
        renderSlotCard(slotIndex);
        return;
      }

      const res = window.solveMazeInstance(slot.mazeCanvas, slot.dotsImg);
      if (res.success) {
        slot.status = 'solved';
        slot.solveResult = res;
        slot.error = null;

        // Auto advance active slot to next unsolved slot
        findNextActiveSlot();
      } else {
        slot.status = 'failed';
        slot.error = res.error || 'No path found';
      }

      renderSlotCard(slotIndex);
      updateProgressSummary();
    }, 40);
  }

  function findNextActiveSlot() {
    for (let i = 0; i < slotsData.length; i++) {
      if (slotsData[i].status !== 'solved') {
        setActiveSlot(i);
        return;
      }
    }
  }

  // Set active slot for pasting
  window.multiMazeSelectSlot = function (idx) {
    setActiveSlot(idx);
  };

  function setActiveSlot(idx) {
    if (idx < 0 || idx >= slotsData.length) return;
    activeSlotIndex = idx;
    document.querySelectorAll('.multi-slot-card').forEach((card, i) => {
      const isActive = (i === idx);
      card.classList.toggle('active-slot', isActive);
      const activeIndicator = card.querySelector('.slot-paste-badge');
      if (activeIndicator) {
        activeIndicator.style.display = isActive ? 'inline-block' : 'none';
      }
    });
  }

  // Render all slot cards
  function renderSlotCards() {
    const grid = document.getElementById('multiMazeSlotsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    slotsData.forEach((slot, idx) => {
      const card = document.createElement('div');
      card.id = `multiSlotCard_${idx}`;
      card.className = `multi-slot-card ${idx === activeSlotIndex ? 'active-slot' : ''}`;
      card.onclick = () => window.multiMazeSelectSlot(idx);
      grid.appendChild(card);
      renderSlotCard(idx);
    });
  }

  // Render an individual slot card
  function renderSlotCard(idx) {
    const slot = slotsData[idx];
    const card = document.getElementById(`multiSlotCard_${idx}`);
    if (!slot || !card) return;

    const isActive = (idx === activeSlotIndex);
    const isSolved = (slot.status === 'solved');
    const isSolving = (slot.status === 'solving');
    const isFailed = (slot.status === 'failed');

    // Status Badge
    let badgeHTML = '';
    if (isSolved) {
      badgeHTML = `<span style="background:rgba(34, 197, 94, 0.18); color:#4ade80; border:1px solid rgba(34, 197, 94, 0.35); font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px;">✓ Solved (${slot.solveResult.moves.length} steps)</span>`;
    } else if (isSolving) {
      badgeHTML = `<span style="background:rgba(56, 189, 248, 0.18); color:#38bdf8; border:1px solid rgba(56, 189, 248, 0.35); font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px;">⏳ Solving...</span>`;
    } else if (isFailed) {
      badgeHTML = `<span style="background:rgba(239, 68, 68, 0.18); color:#f87171; border:1px solid rgba(239, 68, 68, 0.35); font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px;">❌ Failed</span>`;
    } else {
      badgeHTML = `<span style="background:rgba(148, 163, 184, 0.15); color:#94a3b8; border:1px solid rgba(148, 163, 184, 0.25); font-size:11px; font-weight:600; padding:2px 8px; border-radius:999px;">Waiting for Dots</span>`;
    }

    const movesReadable = isSolved ? formatMovesReadable(slot.solveResult.moves) : '';
    const movesCode = isSolved ? slot.solveResult.moves : '';

    card.style.cssText = `
      background: #14142b;
      border: 1px solid ${isActive ? '#f5c542' : '#262648'};
      box-shadow: ${isActive ? '0 0 16px rgba(245, 197, 66, 0.25)' : 'none'};
      border-radius: 12px;
      padding: 14px;
      transition: all 0.2s ease;
      cursor: pointer;
      position: relative;
    `;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:700; color:#fff; font-size:14px;">Maze #${idx + 1}</span>
          <span class="slot-paste-badge" style="display:${isActive ? 'inline-block' : 'none'}; background:#f5c542; color:#0e0e1e; font-size:10px; font-weight:800; padding:1px 6px; border-radius:4px; text-transform:uppercase;">
            Active Target
          </span>
        </div>
        ${badgeHTML}
      </div>

      <!-- Maze Preview and Solution Canvas -->
      <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:12px;">
        <!-- Cropped Maze Preview Canvas -->
        <div style="text-align:center;">
          <div style="font-size:10px; color:#8c8fae; margin-bottom:3px; text-transform:uppercase; font-weight:600;">Cropped Maze</div>
          <canvas id="multiSlicePreview_${idx}" width="100" height="100" style="background:#000; border:1px solid #333355; border-radius:8px; width:100px; height:100px; image-rendering:pixelated;"></canvas>
        </div>

        <!-- Dots Upload Dropzone -->
        <div style="flex:1;">
          <div style="font-size:10px; color:#8c8fae; margin-bottom:3px; text-transform:uppercase; font-weight:600;">Dots Image (🔴🟡)</div>
          <div class="slot-dots-box" onclick="event.stopPropagation(); document.getElementById('slotFile_${idx}').click()" style="background:#1b1b36; border:1px dashed ${slot.dotsImg ? '#22c55e' : (isActive ? '#f5c542' : '#3d3d66')}; border-radius:8px; padding:12px 8px; text-align:center; cursor:pointer; transition:all 0.2s;">
            <input type="file" id="slotFile_${idx}" accept="image/*" style="display:none;" onchange="window.multiMazeOnSlotFileLoaded(event, ${idx})">
            <div style="font-size:18px; margin-bottom:2px;">${slot.dotsImg ? '✓' : '🔴🟡'}</div>
            <div style="font-size:11px; font-weight:600; color:${slot.dotsImg ? '#4ade80' : '#ddd'};">
              ${slot.dotsImg ? 'Dots Loaded' : 'Click or Ctrl+V'}
            </div>
            <div style="font-size:10px; color:#8c8fae;">${slot.dotsImg ? 'Click to replace' : 'Red start · Yellow goal'}</div>
          </div>
        </div>
      </div>

      <!-- Solution Section (LRUD Code Only) -->
      ${isSolved ? `
        <div style="background:#0e0e22; border:1px solid #1e3a2b; border-radius:8px; padding:10px; margin-top:8px;">
          <!-- Code output -->
          <div style="margin-bottom:8px;">
            <div style="font-size:10px; color:#8c8fae; text-transform:uppercase; font-weight:700; margin-bottom:4px;">
              Code (${movesCode.length} steps)
            </div>
            <div style="color:#4ade80; font-family:monospace; font-size:15px; font-weight:800; letter-spacing:1px; word-break:break-all; line-height:1.4; background:#14142b; padding:8px 10px; border-radius:6px; border:1px solid #28382c;">
              ${movesCode}
            </div>
          </div>

          <!-- Direct Copy Code Button -->
          <div>
            <button type="button" class="slot-copy-code-btn" onclick="event.stopPropagation(); window.multiMazeCopySlotCode(${idx}, this)" style="width:100%; background:#22c55e; color:#0e0e1e; border:none; border-radius:6px; padding:8px 10px; font-weight:700; font-size:13px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px;">
              <span>📋 Copy Code</span>
            </button>
          </div>
        </div>
      ` : ''}

      ${isFailed ? `
        <div style="background:#261016; border:1px solid #5a1e28; border-radius:8px; padding:8px 10px; margin-top:8px; color:#f87171; font-size:12px;">
          ⚠️ ${slot.error || 'Failed to solve'}. Try uploading clearer dots or re-pasting.
        </div>
      ` : ''}
    `;

    // Draw preview canvas
    setTimeout(() => {
      const cv = document.getElementById(`multiSlicePreview_${idx}`);
      if (cv && slot.mazeCanvas) {
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(slot.mazeCanvas, 0, 0, cv.width, cv.height);

        // If solved, draw the green path overlay!
        if (isSolved && slot.solveResult && slot.solveResult.path && slot.solveResult.wallData) {
          const res = slot.solveResult;
          const scale = cv.width / 620;
          ctx.save();
          ctx.scale(scale, scale);
          const cs = res.wallData.cs;
          ctx.strokeStyle = '#00e676';
          ctx.lineWidth = Math.max(3, cs * 0.45);
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.beginPath();
          res.path.forEach((n, i) => {
            const cx = res.wallData.centers.colCenters[n.col];
            const cy = res.wallData.centers.rowCenters[n.row];
            i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
          });
          ctx.stroke();

          // Dots
          if (res.scaledDots && res.scaledDots.red) {
            ctx.fillStyle = '#ff2233';
            ctx.beginPath();
            ctx.arc(res.scaledDots.red.x, res.scaledDots.red.y, Math.max(4, cs * 0.35), 0, Math.PI * 2);
            ctx.fill();
          }
          if (res.scaledDots && res.scaledDots.yellow) {
            ctx.fillStyle = '#ffea00';
            ctx.beginPath();
            ctx.arc(res.scaledDots.yellow.x, res.scaledDots.yellow.y, Math.max(4, cs * 0.35), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // Enable drag & drop (files or Discord image links) on slot card and dots box.
      // IMPORTANT: dragover must NOT call stopPropagation — the document-level
      // dragover needs to fire too so it can call preventDefault() and block the
      // browser from opening the image in a new tab.
      const dotsBox = card.querySelector('.slot-dots-box');
      [card, dotsBox].forEach(el => {
        if (!el) return;
        el.addEventListener('dragover', (e) => {
          e.preventDefault();
          // No stopPropagation here — let document dragover run for preventDefault
          dotsBox && (dotsBox.style.borderColor = '#f5c542');
        });
        el.addEventListener('dragleave', (e) => {
          e.preventDefault();
          dotsBox && (dotsBox.style.borderColor = slot.dotsImg ? '#22c55e' : (isActive ? '#f5c542' : '#3d3d66'));
        });
        el.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation(); // Stop document bubble handler from double-processing
          dotsBox && (dotsBox.style.borderColor = slot.dotsImg ? '#22c55e' : (isActive ? '#f5c542' : '#3d3d66'));
          handleDataTransferImage(e.dataTransfer, (img) => {
            feedDotsToSlot(idx, img);
          });
        });
      });
    }, 10);
  }

  // Update progress text & Copy All button
  function updateProgressSummary() {
    const total = slotsData.length;
    if (total === 0) return;
    const solvedCount = slotsData.filter(s => s.status === 'solved').length;

    const progressText = document.getElementById('multiProgressText');
    if (progressText) {
      progressText.textContent = `Solved: ${solvedCount} / ${total} mazes`;
      if (solvedCount === total) {
        progressText.innerHTML = `<span style="color:#4ade80; font-weight:700;">🎉 All ${total} Mazes Solved!</span>`;
      }
    }

    const copyAllBtn = document.getElementById('multiCopyAllBtn');
    if (copyAllBtn) {
      copyAllBtn.style.display = solvedCount > 0 ? 'inline-block' : 'none';
    }
  }

  // Slot file input loaded
  window.multiMazeOnSlotFileLoaded = function (e, idx) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => feedDotsToSlot(idx, img);
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  // Copy single slot code (LRUD combination)
  window.multiMazeCopySlotCode = function (idx, btnEl) {
    const slot = slotsData[idx];
    if (!slot || !slot.solveResult) return;
    navigator.clipboard.writeText(slot.solveResult.moves).then(() => {
      const origText = btnEl.innerHTML;
      btnEl.innerHTML = '<span>✓ Copied!</span>';
      btnEl.style.background = '#16a34a';
      setTimeout(() => {
        btnEl.innerHTML = origText;
        btnEl.style.background = '#22c55e';
      }, 1500);
    });
  };

  // Copy All Codes
  window.multiMazeCopyAll = function (btnEl) {
    const answers = [];
    slotsData.forEach((slot, idx) => {
      if (slot.status === 'solved' && slot.solveResult) {
        answers.push(`Maze ${idx + 1}: ${slot.solveResult.moves}`);
      }
    });

    if (answers.length === 0) return;
    const allText = answers.join('\n');
    navigator.clipboard.writeText(allText).then(() => {
      const origText = btnEl.textContent;
      btnEl.textContent = '✓ All Copied!';
      btnEl.style.background = '#16a34a';
      setTimeout(() => {
        btnEl.textContent = origText;
        btnEl.style.background = '#2563eb';
      }, 1500);
    });
  };

  // Expose init
  window.initMultiMazeModule = initMultiMazeModule;

  // Auto-init if DOM is already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMultiMazeModule);
  } else {
    initMultiMazeModule();
  }

})();
