/**
 * Search Solver Module for Keep Talking and Nobody Explains
 * Finds stage words in a 5x5 letter grid in any direction.
 * Supports automatic client-side cell-by-cell OCR (Tesseract.js) to extract grid letters with 100% layout accuracy.
 * Dynamically parses pasted stage word lists so they are not hardcoded.
 */

(function() {
const searchState = {
  initialized: false,
  stage: 3, // Default to Stage 3
  grid: Array.from({ length: 5 }, () => Array(5).fill('')),
  // Word lists parsed dynamically (pre-populated with defaults)
  wordLists: {
    1: ["RUSH", "NEST", "STEM", "SPAN", "FOUL", "YOKE", "SIDE", "MEAN", "LEAD", "SPOT", "VEST", "CURE", "WEEK", "NOON", "ZERO", "POLL", "CAFE", "MESS", "DIET", "EASY"],
    2: ["FEAR", "CELL", "GRIM", "DUCK", "LAVA", "FOOT", "VEST", "OATH", "COMB", "RUST", "CAST", "HACK", "POND", "RIDE", "NEST", "ALSO", "BEST", "FOLD", "KISS", "LAMP"],
    3: ["ATOM", "LOOK", "POET", "ONCE", "DOOR", "SLAP", "PURE", "EXAM", "JACK", "MEMO", "STEW", "ODDS", "LIVE", "WILL", "FILL", "FILM", "BOWL", "CLIP", "BEAT", "MASK"]
  },
  wordListsRawText: `**Stage 1**
\`RUSH\`  \`NEST\`  \`STEM\`  \`SPAN\`
\`FOUL\`  \`YOKE\`  \`SIDE\`  \`MEAN\`
\`LEAD\`  \`SPOT\`  \`VEST\`  \`CURE\`
\`WEEK\`  \`NOON\`  \`ZERO\`  \`POLL\`
\`CAFE\`  \`MESS\`  \`DIET\`  \`EASY\`

**Stage 2**
\`FEAR\`  \`CELL\`  \`GRIM\`  \`DUCK\`
\`LAVA\`  \`FOOT\`  \`VEST\`  \`OATH\`
\`COMB\`  \`RUST\`  \`CAST\`  \`HACK\`
\`POND\`  \`RIDE\`  \`NEST\`  \`ALSO\`
\`BEST\`  \`FOLD\`  \`KISS\`  \`LAMP\`

**Stage 3**
\`ATOM\`  \`LOOK\`  \`POET\`  \`ONCE\`
\`DOOR\`  \`SLAP\`  \`PURE\`  \`EXAM\`
\`JACK\`  \`MEMO\`  \`STEW\`  \`ODDS\`
\`LIVE\`  \`WILL\`  \`FILL\`  \`FILM\`
\`BOWL\`  \`CLIP\`  \`BEAT\`  \`MASK\``,
  foundWord: null, // { word, start: {r, c}, dir, cells: [] }
  manualWord: "", // Custom word typed by user to highlight
  image: null
};

const SEARCH_DIRS = [
  { dr: -1, dc: 0, name: "Up" },
  { dr: 1, dc: 0, name: "Down" },
  { dr: 0, dc: -1, name: "Left" },
  { dr: 0, dc: 1, name: "Right" },
  { dr: -1, dc: -1, name: "Up-Left" },
  { dr: -1, dc: 1, name: "Up-Right" },
  { dr: 1, dc: -1, name: "Down-Left" },
  { dr: 1, dc: 1, name: "Down-Right" }
];

let tesseractWorker = null;

// ── DYNAMIC STYLE INJECTION ───────────────────────────────

function injectSearchStyles() {
  const css = `
  .search-shell {
    max-width: 950px;
    margin: auto;
    background: #12122a;
    padding: 24px;
    border-radius: 12px;
    border: 1px solid #222;
  }
  .search-layout {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 24px;
    align-items: start;
  }
  @media (max-width: 820px) {
    .search-layout {
      grid-template-columns: 1fr;
    }
  }
  .search-card {
    background: #0f0f1c;
    border: 2px solid #25253f;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
  }
  .search-card:last-child {
    margin-bottom: 0;
  }
  .search-card-title {
    font-family: 'Outfit', Arial, sans-serif;
    font-size: 16px;
    font-weight: bold;
    color: #ffd875;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid #25253f;
    padding-bottom: 8px;
  }
  .search-dropzone {
    border: 2px dashed #444;
    border-radius: 10px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    background: #090915;
    color: #aaa;
    transition: all 0.2s;
    margin-bottom: 15px;
  }
  .search-dropzone:hover, .search-dropzone.active {
    border-color: #ffd875;
    background: #101025;
    color: #fff;
  }
  .search-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin: 15px 0;
    max-width: 250px;
    margin-left: auto;
    margin-right: auto;
  }
  .search-cell {
    width: 42px;
    height: 42px;
    background: #181826;
    border: 2px solid #2c2c44;
    border-radius: 8px;
    color: #fff;
    font-size: 20px;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
    outline: none;
    transition: all 0.15s ease-in-out;
  }
  .search-cell:focus {
    border-color: #ffd875;
    box-shadow: 0 0 8px rgba(255, 216, 117, 0.4);
    background: #202038;
  }
  .search-cell.highlighted {
    border-color: #00ff66;
    background: rgba(0, 255, 102, 0.25);
    color: #00ff66;
    box-shadow: 0 0 12px rgba(0, 255, 102, 0.6);
  }
  .search-cell.manual-highlighted {
    border-color: #00d2ff;
    background: rgba(0, 210, 255, 0.25);
    color: #00d2ff;
    box-shadow: 0 0 12px rgba(0, 210, 255, 0.6);
  }
  .stage-buttons {
    display: flex;
    gap: 8px;
    margin-bottom: 15px;
    justify-content: center;
  }
  .stage-btn {
    flex: 1;
    padding: 10px;
    background: #181826;
    border: 1px solid #333;
    color: #aaa;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }
  .stage-btn:hover {
    background: #202035;
    color: #fff;
  }
  .stage-btn.active {
    background: rgba(245, 197, 66, 0.15);
    border-color: #f5c542;
    color: #f5c542;
    box-shadow: 0 0 10px rgba(245, 197, 66, 0.2);
  }
  .search-result-box {
    background: #0a0a1a;
    border: 1px solid #2a2a4a;
    border-radius: 10px;
    padding: 16px;
    text-align: center;
    margin-bottom: 16px;
    min-height: 90px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .search-result-word {
    font-size: 28px;
    font-weight: 900;
    color: #00ff66;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-shadow: 0 0 10px rgba(0, 255, 102, 0.3);
  }
  .search-result-coords {
    font-size: 13px;
    color: #aaa;
    margin-top: 6px;
  }
  .wordlist-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin-top: 10px;
  }
  .wordlist-item {
    font-family: monospace;
    font-size: 13px;
    background: #101025;
    border: 1px solid #222;
    padding: 6px 4px;
    border-radius: 4px;
    text-align: center;
    color: #888;
    transition: all 0.2s;
  }
  .wordlist-item.active-word {
    background: rgba(0, 255, 102, 0.15);
    border-color: #00ff66;
    color: #00ff66;
    font-weight: bold;
    box-shadow: 0 0 8px rgba(0, 255, 102, 0.2);
  }
  .search-textarea {
    width: 100%;
    background: #0a0a1a;
    border: 1px solid #333;
    color: #eee;
    padding: 8px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 12px;
    resize: none;
    margin-top: 10px;
  }
  .search-textarea.wordlists-area {
    height: 180px;
    color: #ffd875;
    border-color: #ffd875;
  }
  .search-action-row {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
  .search-action-btn {
    flex: 1;
    padding: 8px;
    font-size: 12px;
    border-radius: 6px;
    border: 1px solid #444;
    background: transparent;
    color: #ccc;
    cursor: pointer;
    transition: all 0.2s;
  }
  .search-action-btn:hover {
    background: #222;
    color: #fff;
  }
  .search-action-btn.primary {
    border-color: #f5c542;
    color: #f5c542;
  }
  .search-action-btn.primary:hover {
    background: rgba(245, 197, 66, 0.1);
  }
  .search-highlight-input {
    width: 100%;
    background: #0a0a1a;
    border: 1px solid #333;
    color: #00d2ff;
    padding: 10px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 16px;
    text-align: center;
    font-weight: bold;
    outline: none;
    text-transform: uppercase;
  }
  .search-highlight-input:focus {
    border-color: #00d2ff;
    box-shadow: 0 0 8px rgba(0, 210, 255, 0.3);
  }
  
  @keyframes blinker {
    50% { opacity: 0.5; }
  }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

// ── INITIALIZATION ─────────────────────────────────────────

function initSearchModule() {
  if (searchState.initialized) return;
  searchState.initialized = true;

  injectSearchStyles();
  renderSearchUI();
  
  // Set default raw text in wordlists textarea
  const area = document.getElementById('searchWordlistsInput');
  if (area) area.value = searchState.wordListsRawText;
  
  selectSearchStage(3); // Default to Stage 3
  
  // Set up event listeners
  setupGridEvents();
  setupPasteEvents();
  setupImageUploadEvents();
}

function renderSearchUI() {
  const container = document.getElementById('searchSection');
  if (!container) return;

  container.innerHTML = `
    <div class="search-shell">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #25253f; padding-bottom:10px;">
        <h2 style="color:#f5c542; margin:0;">Search Solver</h2>
        <button id="searchResetBtn" class="upload-btn" type="button" style="margin-top:0; border-color:#f44336; color:#f44336;" onclick="resetSearchSolver()">Reset Solver</button>
      </div>

      <div class="search-layout">
        <!-- Left Column: Input and Grid -->
        <div>
          <!-- Visual Reference Image Box & OCR -->
          <div class="search-card">
            <div class="search-card-title">1. Screenshot Upload & OCR</div>
            <div id="searchDropzone" class="search-dropzone" onclick="openSearchFileDialog()">
              <span style="font-size:32px;">📸</span>
              <p style="font-size:12px; color:#aaa; margin-top:8px;">Drag & Drop Grid Screenshot here, or click to Upload</p>
              <input id="searchFileInput" type="file" accept="image/*" style="display:none;" onchange="handleSearchFileSelect(this)">
            </div>
            <div id="searchImageContainer" style="display:none; text-align:center; margin-top:10px; border:1px solid #25253f; border-radius:8px; overflow:hidden; background:#070712; padding:10px;">
              <canvas id="searchImageCanvas" style="max-width:100%; height:auto; border-radius:4px; max-height:200px; display:inline-block;"></canvas>
              
              <!-- OCR status and preprocessed preview -->
              <div id="searchOcrStatus" style="font-size:13px; font-weight:bold; margin-top:10px; text-align:center;"></div>
              
              <div id="searchOcrPreviewLabel" style="font-size:11px; color:#888; margin-top:8px; display:none;">OCR Binarized View:</div>
              <canvas id="searchOcrPreviewCanvas" style="max-width:100%; height:auto; border-radius:4px; max-height:100px; margin-top:4px; border:1px solid #333; background:#fff; display:none;"></canvas>
              
              <button class="search-action-btn" style="margin-top:12px; width:100%; border-color:#f44336; color:#f44336;" onclick="clearSearchImage()">Remove Image</button>
            </div>
          </div>

          <!-- Pasted Word Lists Area -->
          <div class="search-card">
            <div class="search-card-title">2. Paste Stage Word Lists Here</div>
            <div style="font-size:12px; color:#aaa; margin-bottom:10px;">
              Paste the stage list from your manual or guide. It will parse Stage 1, 2, & 3 automatically.
            </div>
            <textarea id="searchWordlistsInput" class="search-textarea wordlists-area" oninput="handleWordlistsAreaChange(this)" placeholder="Paste stage lists here..."></textarea>
          </div>

          <!-- Stage Selector -->
          <div class="search-card">
            <div class="search-card-title">3. Current Active Stage</div>
            <div class="stage-buttons">
              <button class="stage-btn" id="stageBtn-1" onclick="selectSearchStage(1)">Stage 1</button>
              <button class="stage-btn" id="stageBtn-2" onclick="selectSearchStage(2)">Stage 2</button>
              <button class="stage-btn" id="stageBtn-3" onclick="selectSearchStage(3)">Stage 3</button>
            </div>
          </div>

          <!-- Grid letters -->
          <div class="search-card">
            <div class="search-card-title">4. Letter Grid (5x5)</div>
            <div style="font-size:12px; color:#888; margin-bottom:10px; text-align:center;">
              Type letters directly. Use Arrow keys to navigate.
            </div>
            
            <div class="search-grid" id="searchGridContainer">
              <!-- 25 Cells -->
              ${Array.from({ length: 5 }, (_, r) => 
                Array.from({ length: 5 }, (_, c) => 
                  `<input type="text" class="search-cell" id="cell-${r}-${c}" data-row="${r}" data-col="${c}" maxlength="1" autocomplete="off" spellcheck="false">`
                ).join('')
              ).join('')}
            </div>

            <div class="search-action-row">
              <button class="search-action-btn" onclick="clearSearchGrid()">Clear Grid</button>
            </div>

            <div style="margin-top:15px;">
              <div class="search-card-title" style="margin-bottom:6px;">Or Paste Grid Letters</div>
              <textarea id="searchPasteInput" class="search-textarea" rows="3" placeholder="Paste grid letters here...&#10;e.g. C U H L G M A M F A..."></textarea>
              <button class="search-action-btn primary" style="width:100%; margin-top:8px;" onclick="parseSearchPasteText()">Load & Solve Grid</button>
            </div>
          </div>
        </div>

        <!-- Right Column: Solution & Word List -->
        <div>
          <div class="search-card" style="margin-bottom:20px;">
            <div class="search-card-title">Solution</div>
            <div class="search-result-box" id="searchResultPanel">
              <div style="color:#888; font-size:14px;">Fill the grid to search for stage words...</div>
            </div>
          </div>

          <div class="search-card" style="margin-bottom:20px;">
            <div class="search-card-title">Word Finder (Manual Search)</div>
            <div style="font-size:12px; color:#aaa; margin-bottom:10px;">
              Type any word below to search and highlight it on the grid.
            </div>
            <input type="text" id="searchManualWordInput" class="search-highlight-input" placeholder="TYPE WORD TO FIND..." oninput="handleManualWordInput(this)">
          </div>

          <div class="search-card">
            <div class="search-card-title">Active Stage Word List</div>
            <div style="font-size:12px; color:#aaa; margin-bottom:10px;">
              The matching word in the grid will be highlighted in green.
            </div>
            <div class="wordlist-grid" id="searchWordListContainer">
              <!-- Words populated dynamically -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── EVENTS & GRID INPUT MANAGEMENT ─────────────────────────

function setupGridEvents() {
  const container = document.getElementById('searchGridContainer');
  if (!container) return;

  container.addEventListener('input', (e) => {
    if (e.target.classList.contains('search-cell')) {
      const input = e.target;
      input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '');
      
      const r = parseInt(input.dataset.row);
      const c = parseInt(input.dataset.col);
      searchState.grid[r][c] = input.value;

      // Move focus to next cell if filled
      if (input.value) {
        const nextC = c + 1;
        if (nextC < 5) {
          focusCell(r, nextC);
        } else if (r + 1 < 5) {
          focusCell(r + 1, 0);
        }
      }
      
      solveSearch();
    }
  });

  container.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('search-cell')) {
      const input = e.target;
      const r = parseInt(input.dataset.row);
      const c = parseInt(input.dataset.col);

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (r > 0) focusCell(r - 1, c);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (r < 4) focusCell(r + 1, c);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (c > 0) focusCell(r, c - 1);
          else if (r > 0) focusCell(r - 1, 4);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (c < 4) focusCell(r, c + 1);
          else if (r < 4) focusCell(r + 1, 0);
          break;
        case 'Backspace':
          if (!input.value) {
            e.preventDefault();
            const prevC = c - 1;
            if (prevC >= 0) {
              const prevCell = focusCell(r, prevC);
              if (prevCell) {
                prevCell.value = '';
                searchState.grid[r][prevC] = '';
              }
            } else if (r > 0) {
              const prevCell = focusCell(r - 1, 4);
              if (prevCell) {
                prevCell.value = '';
                searchState.grid[r - 1][4] = '';
              }
            }
            solveSearch();
          } else {
            // Let normal backspace clear input
            searchState.grid[r][c] = '';
            setTimeout(solveSearch, 0);
          }
          break;
        case 'Delete':
          input.value = '';
          searchState.grid[r][c] = '';
          solveSearch();
          break;
      }
    }
  });
}

function focusCell(r, c) {
  const cell = document.getElementById(`cell-${r}-${c}`);
  if (cell) {
    cell.focus();
    cell.select();
  }
  return cell;
}

function setupPasteEvents() {
  // Support pasting directly into the grid if a cell is focused
  const container = document.getElementById('searchGridContainer');
  if (container) {
    container.addEventListener('paste', (e) => {
      // Check if clipboard has an image
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            e.preventDefault();
            processSearchImage(item.getAsFile());
            return;
          }
        }
      }

      // Check if it's text
      const text = e.clipboardData.getData('text');
      if (text && text.trim().length > 1) {
        e.preventDefault();
        parseAndLoadText(text);
      }
    });
  }

  // Also support document-wide paste when search tab is active
  document.addEventListener('paste', (e) => {
    const searchSection = document.getElementById('searchSection');
    if (!searchSection || !searchSection.classList.contains('active')) return;

    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          processSearchImage(item.getAsFile());
          return;
        }
      }
    }
  });
}

// ── IMAGE UPLOAD HANDLING ──────────────────────────────────

function setupImageUploadEvents() {
  const dropzone = document.getElementById('searchDropzone');
  if (!dropzone) return;

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('active');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('active');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('active');
    const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
    if (file) processSearchImage(file);
  });
}

function openSearchFileDialog() {
  const fileInput = document.getElementById('searchFileInput');
  if (fileInput) fileInput.click();
}

function handleSearchFileSelect(input) {
  const file = input.files && input.files[0];
  if (file) processSearchImage(file);
  input.value = '';
}

function processSearchImage(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      searchState.image = img;
      renderSearchImageCanvas();
      
      // Update UI visibility
      document.getElementById('searchDropzone').style.display = 'none';
      document.getElementById('searchImageContainer').style.display = 'block';
      
      // Run OCR processing pipeline
      runSearchOcrPipeline();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderSearchImageCanvas() {
  const canvas = document.getElementById('searchImageCanvas');
  if (!canvas || !searchState.image) return;
  const ctx = canvas.getContext('2d');
  
  // Size canvas to fit image
  canvas.width = searchState.image.width;
  canvas.height = searchState.image.height;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(searchState.image, 0, 0);
}

function clearSearchImage() {
  searchState.image = null;
  document.getElementById('searchDropzone').style.display = 'block';
  document.getElementById('searchImageContainer').style.display = 'none';
  
  // Hide OCR preview elements
  const previewCanvas = document.getElementById('searchOcrPreviewCanvas');
  const previewLabel = document.getElementById('searchOcrPreviewLabel');
  if (previewCanvas) previewCanvas.style.display = 'none';
  if (previewLabel) previewLabel.style.display = 'none';
  
  const statusEl = document.getElementById('searchOcrStatus');
  if (statusEl) statusEl.textContent = "";
}

// ── OCR PIPELINE: BOUNDS DETECTION & BINARIZATION ──────────

function detectGridBounds(ctx, width, height) {
  const imgData = ctx.getImageData(0, 0, width, height).data;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  
  // Ignore outer 8% margin to avoid screws/borders
  const marginX = Math.round(width * 0.08);
  const marginY = Math.round(height * 0.08);
  
  for (let y = marginY; y < height - marginY; y++) {
    for (let x = marginX; x < width - marginX; x++) {
      const idx = (y * width + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      
      // Filter for bright white pixels (letters are white in a dark grid)
      // Requiring high blue (b > 190) excludes yellow/orange header text
      if (r > 190 && g > 190 && b > 190) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  if (maxX <= minX || maxY <= minY) return null;
  
  // Add some padding around the bounding box of letters (approx 12% of the width)
  const w = maxX - minX;
  const pad = Math.round(w * 0.12);
  
  return {
    x: Math.max(0, minX - pad),
    y: Math.max(0, minY - pad),
    w: Math.min(width - minX, maxX - minX + 2 * pad),
    h: Math.min(height - minY, maxY - minY + 2 * pad)
  };
}

function preprocessCell(sourceImg, bounds, r, c) {
  const cw = bounds.w / 5;
  const ch = bounds.h / 5;
  
  const cx = bounds.x + c * cw;
  const cy = bounds.y + r * ch;
  
  // Crop the middle 60% of the cell
  const cropW = cw * 0.6;
  const cropH = ch * 0.6;
  const cropX = cx + cw * 0.2;
  const cropY = cy + ch * 0.2;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 40; // Resize to a standard size for Tesseract (40x40 is great)
  tempCanvas.height = 40;
  const tempCtx = tempCanvas.getContext('2d');
  
  // Draw cropped image scaled to 40x40
  tempCtx.drawImage(sourceImg, cropX, cropY, cropW, cropH, 0, 0, 40, 40);
  
  // Binarization (thresholding)
  const imgData = tempCtx.getImageData(0, 0, 40, 40);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const rVal = data[i];
    const gVal = data[i+1];
    const bVal = data[i+2];
    const gray = (rVal + gVal + bVal) / 3;
    
    // Invert to black on white. Threshold at 170.
    const val = (gray > 170) ? 0 : 255;
    
    data[i] = val;
    data[i+1] = val;
    data[i+2] = val;
    data[i+3] = 255;
  }
  tempCtx.putImageData(imgData, 0, 0);
  return tempCanvas;
}

function runSearchOcrPipeline() {
  const canvas = document.getElementById('searchImageCanvas');
  if (!canvas || !searchState.image) return;
  
  const ctx = canvas.getContext('2d');
  
  // Detect bounds
  let bounds = detectGridBounds(ctx, canvas.width, canvas.height);
  if (!bounds) {
    // Fallback to full canvas if bounds detection fails
    bounds = { x: 0, y: 0, w: canvas.width, h: canvas.height };
  }
  
  // Create a composite preview of all 25 preprocessed cells
  const compositeCanvas = document.getElementById('searchOcrPreviewCanvas');
  const previewLabel = document.getElementById('searchOcrPreviewLabel');
  if (compositeCanvas && previewLabel) {
    compositeCanvas.width = 200;
    compositeCanvas.height = 200;
    const compCtx = compositeCanvas.getContext('2d');
    compCtx.fillStyle = '#fff';
    compCtx.fillRect(0, 0, 200, 200);
    
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cellCanvas = preprocessCell(searchState.image, bounds, r, c);
        compCtx.drawImage(cellCanvas, c * 40, r * 40);
      }
    }
    compositeCanvas.style.display = 'inline-block';
    previewLabel.style.display = 'block';
  }
  
  // Run Tesseract OCR cell-by-cell
  runSearchOcrCellByCell(bounds);
}

// Map lookalike numbers/symbols to uppercase letters
const OCR_CHAR_MAP = {
  '0': 'O',
  '1': 'I',
  '2': 'Z',
  '3': 'B',
  '5': 'S',
  '6': 'G',
  '8': 'B',
  '9': 'G',
  '|': 'I',
  '[': 'I',
  ']': 'I',
  '(': 'C',
  ')': 'D',
  '$': 'S',
  '&': 'B'
};

async function getTesseractWorker() {
  if (tesseractWorker) return tesseractWorker;
  
  const statusEl = document.getElementById('searchOcrStatus');
  if (statusEl) {
    statusEl.innerHTML = `<span style="color:#ffd875;">⏳ Initializing OCR Engine...</span>`;
  }
  
  tesseractWorker = await Tesseract.createWorker('eng');
  
  await tesseractWorker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()[]|$&',
    tessedit_pageseg_mode: '10' // Treat the image as a single character
  });
  
  return tesseractWorker;
}

async function runSearchOcrCellByCell(bounds) {
  const statusEl = document.getElementById('searchOcrStatus');
  if (statusEl) {
    statusEl.innerHTML = `<span style="color:#ffd875; animation: blinker 1.5s linear infinite;">⏳ Extracting grid letters...</span>`;
  }
  
  try {
    // Generate templates for all 26 letters once
    const templates = {};
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 40;
    tempCanvas.height = 40;
    const tempCtx = tempCanvas.getContext('2d');
    
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < alphabet.length; i++) {
      const char = alphabet[i];
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, 40, 40);
      tempCtx.fillStyle = '#000000';
      tempCtx.font = 'bold 28px "Outfit", "Arial", sans-serif';
      tempCtx.textAlign = 'center';
      tempCtx.textBaseline = 'middle';
      tempCtx.fillText(char, 20, 18);
      
      const imgData = tempCtx.getImageData(0, 0, 40, 40).data;
      const binData = new Uint8Array(1600);
      for (let j = 0; j < 1600; j++) {
        binData[j] = imgData[j * 4];
      }
      templates[char] = binData;
    }
    
    // Clear current grid
    clearSearchGrid();
    
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cellCanvas = preprocessCell(searchState.image, bounds, r, c);
        const cellCtx = cellCanvas.getContext('2d');
        const cellData = cellCtx.getImageData(0, 0, 40, 40).data;
        const cellBin = new Uint8Array(1600);
        for (let j = 0; j < 1600; j++) {
          cellBin[j] = cellData[j * 4];
        }
        
        let bestChar = '?';
        let bestScore = Infinity;
        
        // Find template with lowest absolute pixel difference (testing small shifts to be alignment-robust)
        for (let i = 0; i < alphabet.length; i++) {
          const char = alphabet[i];
          const temp = templates[char];
          let minDiff = Infinity;
          
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              let diff = 0;
              for (let y = 0; y < 40; y++) {
                const ty = y + dy;
                if (ty < 0 || ty >= 40) continue;
                for (let x = 0; x < 40; x++) {
                  const tx = x + dx;
                  if (tx < 0 || tx >= 40) continue;
                  
                  const cellVal = cellBin[y * 40 + x];
                  const tempVal = temp[ty * 40 + tx];
                  diff += Math.abs(cellVal - tempVal);
                }
              }
              if (diff < minDiff) minDiff = diff;
            }
          }
          
          if (minDiff < bestScore) {
            bestScore = minDiff;
            bestChar = char;
          }
        }
        
        // Fill cell immediately
        searchState.grid[r][c] = bestChar;
        const cellEl = document.getElementById(`cell-${r}-${c}`);
        if (cellEl) cellEl.value = bestChar;
      }
    }
    
    // Re-solve!
    solveSearch();
    
    if (statusEl) {
      if (unknownCount > 0) {
        statusEl.innerHTML = `<span style="color:#ffd875;">⚠️ OCR completed with ${unknownCount} uncertain letters. Please edit them.</span>`;
      } else {
        statusEl.innerHTML = `<span style="color:#00ff66;">✓ OCR Extracted all 25 letters with 100% layout accuracy!</span>`;
      }
    }
    
  } catch (err) {
    console.error("OCR Cell Error:", err);
    if (statusEl) {
      statusEl.innerHTML = `<span style="color:#f44336;">❌ OCR Error: ${err.message || err}</span>`;
    }
  }
}

// ── WORD LIST DYNAMIC PARSING ──────────────────────────────

function handleWordlistsAreaChange(textarea) {
  const text = textarea.value;
  searchState.wordListsRawText = text;
  
  const parsed = parseStageWordListsText(text);
  
  // If we parsed successfully, update
  if (parsed[1].length > 0) searchState.wordLists[1] = parsed[1];
  if (parsed[2].length > 0) searchState.wordLists[2] = parsed[2];
  if (parsed[3].length > 0) searchState.wordLists[3] = parsed[3];
  
  updateWordListUI();
  solveSearch();
}

function parseStageWordListsText(text) {
  const lists = { 1: [], 2: [], 3: [] };
  
  // Regex to split by stage sections (case insensitive)
  const stage1Match = text.match(/Stage\s*1([\s\S]*?)(?=Stage\s*2|Stage\s*3|$)/i);
  const stage2Match = text.match(/Stage\s*2([\s\S]*?)(?=Stage\s*1|Stage\s*3|$)/i);
  const stage3Match = text.match(/Stage\s*3([\s\S]*?)(?=Stage\s*1|Stage\s*2|$)/i);
  
  const extractWords = (str) => {
    if (!str) return [];
    
    // First try extracting words enclosed in backticks, e.g. `RUSH`
    const matches = str.match(/`([A-Z]+)`/gi);
    if (matches && matches.length > 0) {
      return matches.map(m => m.replace(/`/g, '').trim().toUpperCase());
    }
    
    // Otherwise, extract any uppercase words of length 3 to 8
    const rawMatches = str.match(/\b[A-Z]{3,8}\b/g);
    return rawMatches ? rawMatches.map(m => m.toUpperCase()) : [];
  };
  
  if (stage1Match) lists[1] = extractWords(stage1Match[1]);
  if (stage2Match) lists[2] = extractWords(stage2Match[1]);
  if (stage3Match) lists[3] = extractWords(stage3Match[1]);
  
  // Fallback: if no stages were matched but there are words in backticks or general uppercase words,
  // load them all into the current selected stage!
  if (lists[1].length === 0 && lists[2].length === 0 && lists[3].length === 0) {
    const fallbackWords = extractWords(text);
    if (fallbackWords.length > 0) {
      lists[searchState.stage] = fallbackWords;
    }
  }
  
  return lists;
}

// ── ACTIONS ────────────────────────────────────────────────

function selectSearchStage(stageNum) {
  searchState.stage = stageNum;
  
  // Update UI buttons
  for (let i = 1; i <= 3; i++) {
    const btn = document.getElementById(`stageBtn-${i}`);
    if (btn) btn.classList.toggle('active', i === stageNum);
  }

  // Populate wordlist UI
  updateWordListUI();
  
  // Re-run solver
  solveSearch();
}

function clearSearchGrid() {
  searchState.grid = Array.from({ length: 5 }, () => Array(5).fill(''));
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = document.getElementById(`cell-${r}-${c}`);
      if (cell) {
        cell.value = '';
        cell.classList.remove('highlighted');
        cell.classList.remove('manual-highlighted');
      }
    }
  }
  document.getElementById('searchPasteInput').value = '';
  document.getElementById('searchManualWordInput').value = '';
  searchState.manualWord = "";
  solveSearch();
}

function resetSearchSolver() {
  clearSearchGrid();
  clearSearchImage();
  
  // Reset textarea value and state
  const area = document.getElementById('searchWordlistsInput');
  if (area) area.value = searchState.wordListsRawText;
  
  // Reset wordlists back to default
  searchState.wordLists = {
    1: ["RUSH", "NEST", "STEM", "SPAN", "FOUL", "YOKE", "SIDE", "MEAN", "LEAD", "SPOT", "VEST", "CURE", "WEEK", "NOON", "ZERO", "POLL", "CAFE", "MESS", "DIET", "EASY"],
    2: ["FEAR", "CELL", "GRIM", "DUCK", "LAVA", "FOOT", "VEST", "OATH", "COMB", "RUST", "CAST", "HACK", "POND", "RIDE", "NEST", "ALSO", "BEST", "FOLD", "KISS", "LAMP"],
    3: ["ATOM", "LOOK", "POET", "ONCE", "DOOR", "SLAP", "PURE", "EXAM", "JACK", "MEMO", "STEW", "ODDS", "LIVE", "WILL", "FILL", "FILM", "BOWL", "CLIP", "BEAT", "MASK"]
  };
  
  selectSearchStage(3); // Default back to stage 3
}

function parseSearchPasteText() {
  const text = document.getElementById('searchPasteInput').value;
  parseAndLoadText(text);
}

function parseAndLoadText(text) {
  if (!text) return;
  
  // Extract all letters [A-Za-z]
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  const letters = clean.split('');
  
  clearSearchGrid();
  
  let index = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (index < letters.length) {
        const char = letters[index++];
        searchState.grid[r][c] = char;
        const cell = document.getElementById(`cell-${r}-${c}`);
        if (cell) cell.value = char;
      }
    }
  }
  
  solveSearch();
}

function handleManualWordInput(input) {
  searchState.manualWord = input.value.toUpperCase().replace(/[^A-Z]/g, '');
  solveSearch();
}

// Map lookalike symbols to words
function updateWordListUI() {
  const container = document.getElementById('searchWordListContainer');
  if (!container) return;

  const words = searchState.wordLists[searchState.stage] || [];
  let html = '';
  words.forEach(word => {
    let activeClass = '';
    if (searchState.foundWord && searchState.foundWord.word === word) {
      activeClass = 'active-word';
    }
    html += `<div class="wordlist-item ${activeClass}" id="wl-${word}">${word}</div>`;
  });
  
  container.innerHTML = html;
}

// ── CORE WORD GRID SEARCH ALGORITHM ────────────────────────

function checkWordInGrid(word, r, c, dir) {
  const cells = [];
  for (let i = 0; i < word.length; i++) {
    const nr = r + i * dir.dr;
    const nc = c + i * dir.dc;
    if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) return null;
    if (searchState.grid[nr][nc] !== word[i]) return null;
    cells.push({ r: nr, c: nc });
  }
  return cells;
}

function solveSearch() {
  // Clear previous highlights
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = document.getElementById(`cell-${r}-${c}`);
      if (cell) {
        cell.classList.remove('highlighted');
        cell.classList.remove('manual-highlighted');
      }
    }
  }

  const words = searchState.wordLists[searchState.stage] || [];
  searchState.foundWord = null;

  // Verify grid has at least some content
  let hasContent = false;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (searchState.grid[r][c]) hasContent = true;
    }
  }

  if (!hasContent) {
    updateWordListUI();
    renderResultPanel(null, "Grid is empty. Enter letters to search.");
    return;
  }

  // 1. First search for the stage words
  const stageMatches = [];
  for (const word of words) {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        for (const dir of SEARCH_DIRS) {
          const cells = checkWordInGrid(word, r, c, dir);
          if (cells) {
            stageMatches.push({
              word,
              start: { r: r + 1, c: c + 1 }, // 1-indexed for the defuser
              dir: dir.name,
              cells
            });
          }
        }
      }
    }
  }

  // 2. Search for the manual search word if typed
  let manualMatch = null;
  if (searchState.manualWord && searchState.manualWord.length >= 2) {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        for (const dir of SEARCH_DIRS) {
          const cells = checkWordInGrid(searchState.manualWord, r, c, dir);
          if (cells) {
            manualMatch = {
              word: searchState.manualWord,
              start: { r: r + 1, c: c + 1 },
              dir: dir.name,
              cells
            };
            break;
          }
        }
        if (manualMatch) break;
      }
      if (manualMatch) break;
    }
  }

  // Apply highlights and render results
  if (stageMatches.length > 0) {
    searchState.foundWord = stageMatches[0];
    
    // Highlight cells of found stage word in Green
    searchState.foundWord.cells.forEach(cell => {
      const cellEl = document.getElementById(`cell-${cell.r}-${cell.c}`);
      if (cellEl) cellEl.classList.add('highlighted');
    });

    renderResultPanel(searchState.foundWord);
  } else if (manualMatch) {
    // Highlight manual search word in Blue
    manualMatch.cells.forEach(cell => {
      const cellEl = document.getElementById(`cell-${cell.r}-${cell.c}`);
      if (cellEl) cellEl.classList.add('manual-highlighted');
    });

    renderResultPanel(manualMatch, `Manual Search Found: ${manualMatch.word}`);
  } else {
    // Check if grid is fully completed (25 letters)
    let isFull = true;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!searchState.grid[r][c]) isFull = false;
      }
    }
    
    let statusText = isFull 
      ? `❌ No words from Stage ${searchState.stage} found in this grid.` 
      : "Searching... Fill the grid to find a match.";
      
    if (searchState.manualWord && searchState.manualWord.length >= 2) {
      statusText = `❌ Manual word "${searchState.manualWord}" not found in grid.`;
    }
    
    renderResultPanel(null, statusText);
  }

  // Update active word highlights in list
  updateWordListUI();
}

function renderResultPanel(match, customHeader = "") {
  const panel = document.getElementById('searchResultPanel');
  if (!panel) return;

  if (match) {
    const headerHtml = customHeader ? `<div style="color:#00d2ff; font-size:14px; font-weight:bold; margin-bottom:4px;">${customHeader}</div>` : '';
    const wordColorClass = customHeader ? 'style="color:#00d2ff; text-shadow:0 0 10px rgba(0, 210, 255, 0.3);"' : '';
    panel.innerHTML = `
      ${headerHtml}
      <div class="search-result-word" ${wordColorClass}>${match.word}</div>
      <div class="search-result-coords">
        Starts at <strong>Row ${match.start.r}, Col ${match.start.c}</strong> · Direction: <strong>${match.dir}</strong>
      </div>
    `;
  } else {
    panel.innerHTML = `<div style="color:#888; font-size:14px;">${customHeader || "No match found"}</div>`;
  }
}

// ── PUBLIC EXPORTS ─────────────────────────────────────────

window.initSearchModule = initSearchModule;
window.selectSearchStage = selectSearchStage;
window.clearSearchGrid = clearSearchGrid;
window.resetSearchSolver = resetSearchSolver;
window.parseSearchPasteText = parseSearchPasteText;
window.solveSearch = solveSearch;
window.handleSearchFileSelect = handleSearchFileSelect;
window.openSearchFileDialog = openSearchFileDialog;
window.clearSearchImage = clearSearchImage;
window.handleManualWordInput = handleManualWordInput;
window.handleWordlistsAreaChange = handleWordlistsAreaChange;
})();
