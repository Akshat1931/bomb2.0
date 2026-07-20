(function() {
  const DEFAULT_CONFIGS = {
    UP: [
      "OXXXOO", "XXXXXO", "XOXXOX", "OXXOOO", "OOOXXO", "OXXXOX", "OOXOOO", "OOOOOX"
    ],
    DOWN: [
      "XOOOOO", "XXXOOO", "XXXXOX", "XOOXOX", "OOXXOO", "XXXXXX", "OXXOXO", "XOOXXX"
    ],
    LEFT: [
      "XXXOOX", "OXOXOO", "XXXOXX", "XXXOXO", "XXOXOO", "OXXOOX", "OOXXXO", "OOOXOX"
    ],
    RIGHT: [
      "XXOXXO", "OOXXOX", "XOOOXX", "XOXOOO", "XOOXXO", "XXOOOX", "OOOXOO", "XXOOXX"
    ]
  };

  const DEFAULT_MANUAL_TEXT = `UP:
OXXXOO
XXXXXO
XOXXOX
OXXOOO
OOOXXO
OXXXOX
OOXOOO
OOOOOX

DOWN:
XOOOOO
XXXOOO
XXXXOX
XOOXOX
OOXXOO
XXXXXX
OXXOXO
XOOXXX

LEFT:
XXXOOX
OXOXOO
XXXOXX
XXXOXO
XXOXOO
OXXOOX
OOXXXO
OOOXOX

RIGHT:
XXOXXO
OOXXOX
XOOOXX
XOXOOO
XOOXXO
XXOOOX
OOOXOO
XXOOXX`;

  const knobsState = {
    initialized: false,
    // 2 rows of 6 LEDs: true (lit), false (unlit)
    lights: [
      [false, false, false, false, false, false],
      [false, false, false, false, false, false]
    ],
    configs: JSON.parse(JSON.stringify(DEFAULT_CONFIGS))
  };

  // ── DYNAMIC STYLE INJECTION ───────────────────────────────
  function injectKnobsStyles() {
    if (document.getElementById('knobsStyles')) return;
    const css = `
    .knobs-shell {
      max-width: 950px;
      margin: auto;
      background: #12122a;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #222;
    }
    .knobs-layout {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 820px) {
      .knobs-layout {
        grid-template-columns: 1fr;
      }
    }
    .knobs-col-left {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .knobs-col-right {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .knobs-card {
      background: #0f0f1c;
      border: 2px solid #25253f;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 0;
      text-align: center;
    }
    .knobs-card-title {
      font-family: 'Outfit', Arial, sans-serif;
      font-size: 16px;
      font-weight: bold;
      color: #ffd875;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #25253f;
      padding-bottom: 8px;
      text-align: left;
    }
    .knobs-grid-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
      background: #181826;
      border: 2px solid #2c2c44;
      border-radius: 10px;
      padding: 24px;
      margin: 15px auto;
      width: 100%;
      max-width: 440px;
    }
    .knobs-led-row {
      display: flex;
      gap: 16px;
    }
    .knobs-led {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #252538;
      border: 2px solid #1a1a26;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      box-shadow: inset 0 2px 5px rgba(0,0,0,0.55);
    }
    .knobs-led:hover {
      background: #32324e;
    }
    .knobs-led.active {
      background: radial-gradient(circle, #ff5e00 20%, #b33600 100%);
      border-color: #ffd875;
      box-shadow: 0 0 15px #ff5e00, inset 0 1px 3px #ffffff;
    }
    .knobs-match-info {
      font-family: monospace;
      font-size: 14px;
      color: #ccc;
      margin-top: 5px;
      text-align: left;
      padding-left: 20px;
    }
    .knobs-solution-card {
      flex: 1;
      background: #070712;
      border: 1px solid #222;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    }
    .knobs-solution-card.odd {
      border-color: rgba(255, 94, 0, 0.4);
    }
    .knobs-solution-card.even {
      border-color: rgba(0, 210, 255, 0.4);
    }
    .knobs-solution-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 8px;
    }
    .knobs-solution-dir {
      font-size: 32px;
      font-weight: 900;
      margin-bottom: 8px;
      letter-spacing: 2px;
    }
    .knobs-solution-card.odd .knobs-solution-dir {
      color: #ff5e00;
      text-shadow: 0 0 10px rgba(255, 94, 0, 0.3);
    }
    .knobs-solution-card.even .knobs-solution-dir {
      color: #00d2ff;
      text-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
    }
    .knobs-solution-desc {
      font-size: 12px;
      color: #777;
    }
    .knobs-textarea {
      width: 100%;
      background: #0a0a1a;
      border: 1px solid #333;
      color: #ffd875;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 13px;
      resize: vertical;
      margin-top: 10px;
      outline: none;
      line-height: 1.5;
    }
    .knobs-textarea:focus {
      border-color: #ffd875;
      box-shadow: 0 0 8px rgba(255, 216, 117, 0.3);
    }
    .knobs-action-btn {
      margin-top: 12px;
      padding: 8px 16px;
      background: transparent;
      border: 1px solid #f44336;
      color: #f44336;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .knobs-action-btn:hover {
      background: rgba(244, 67, 54, 0.1);
    }
    .knobs-status-box {
      font-size: 13px;
      margin-top: 10px;
      text-align: left;
      line-height: 1.6;
      padding: 10px 14px;
      background: #070712;
      border-radius: 6px;
      border: 1px solid #25253f;
    }
    .knobs-status-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'knobsStyles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  // ── INITIALIZATION ─────────────────────────────────────────
  function initKnobsModule() {
    if (knobsState.initialized) return;
    knobsState.initialized = true;

    injectKnobsStyles();
    renderKnobsUI();
    setupKnobsEvents();

    // Pre-populate manual guide text area with default
    const manualInput = document.getElementById('knobsManualInput');
    if (manualInput) {
      manualInput.value = DEFAULT_MANUAL_TEXT;
    }

    solveKnobs();
  }

  function renderKnobsUI() {
    const container = document.getElementById('knobsSection');
    if (!container) return;

    container.innerHTML = `
      <div class="knobs-shell">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #25253f; padding-bottom:10px;">
          <h2 style="color:#f5c542; margin:0;">Knobs Solver</h2>
          <button id="knobsResetBtn" class="knobs-action-btn" type="button" style="margin-top:0;" onclick="window.resetKnobsSolver()">Reset Solver</button>
        </div>

        <div class="knobs-layout">
          <!-- Left Column -->
          <div class="knobs-col-left">
            <!-- LEDs Card -->
            <div class="knobs-card">
              <div class="knobs-card-title">1. Interactive LED Lights (2x6)</div>
              <div style="font-size:12px; color:#aaa; margin-bottom:15px; text-align:left;">
                Click individual circular lights below to toggle them Lit (lit orange-red) or Off.
              </div>

              <div class="knobs-grid-container">
                <!-- Column Numbers -->
                <div style="display:flex; justify-content:space-between; width: 272px; margin-bottom: 8px; font-family: 'Outfit', monospace; font-size: 13px; color: #5c5c7d; font-weight: bold;">
                  <span style="width:32px; text-align:center;">1</span>
                  <span style="width:32px; text-align:center;">2</span>
                  <span style="width:32px; text-align:center;">3</span>
                  <span style="width:32px; text-align:center;">4</span>
                  <span style="width:32px; text-align:center;">5</span>
                  <span style="width:32px; text-align:center;">6</span>
                </div>
                <!-- Row 1 LEDs -->
                <div class="knobs-led-row" id="knobsLedRow-0">
                  ${Array.from({ length: 6 }, (_, i) => 
                    `<div class="knobs-led" data-row="0" data-col="${i}" id="knobs-led-0-${i}"></div>`
                  ).join('')}
                </div>
                <!-- Row 2 LEDs -->
                <div class="knobs-led-row" id="knobsLedRow-1">
                  ${Array.from({ length: 6 }, (_, i) => 
                    `<div class="knobs-led" data-row="1" data-col="${i}" id="knobs-led-1-${i}"></div>`
                  ).join('')}
                </div>
              </div>

              <div style="border-top:1px solid #25253f; padding-top:15px; text-align:left; max-width:440px; margin:0 auto;">
                <div style="font-size:12px; font-weight:bold; color:#ffd875; margin-bottom:8px;">Row Match Status:</div>
                <div class="knobs-match-info" id="knobsRow1Match"></div>
                <div class="knobs-match-info" id="knobsRow2Match" style="margin-top:5px;"></div>
              </div>
            </div>

            <!-- Active Input Card -->
            <div class="knobs-card">
              <div class="knobs-card-title">2. Paste Active Lights (2 lines)</div>
              <div style="font-size:12px; color:#aaa; text-align:left; margin-bottom:8px;">
                Paste the 2 active lines of lit/off status (e.g. xoxoxo / ooxooo) from the defuser here.
              </div>
              <textarea id="knobsActiveInput" class="knobs-textarea" rows="2" placeholder="xoxoxo&#10;ooxooo" oninput="window.handleKnobsActiveInput(this)"></textarea>
              
              <!-- Active Parser Feedback -->
              <div id="knobsActiveParseStatus" class="knobs-status-box" style="display: none;"></div>
            </div>

            <!-- Manual Input Card -->
            <div class="knobs-card">
              <div class="knobs-card-title">3. Paste Knobs Manual Guide Text</div>
              <div style="font-size:12px; color:#aaa; text-align:left; margin-bottom:8px;">
                If the manual updates or changes, paste the dynamic directions here.
              </div>
              <textarea id="knobsManualInput" class="knobs-textarea" rows="8" placeholder="UP:&#10;OXXXOO&#10;..." oninput="window.handleKnobsManualInput(this)"></textarea>
              
              <!-- Manual Parser Feedback -->
              <div id="knobsManualParseStatus" class="knobs-status-box" style="display: none;"></div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="knobs-col-right">
            <!-- Solution Card -->
            <div class="knobs-card" style="height: 100%; display: flex; flex-direction: column;">
              <div class="knobs-card-title">4. Computed Solutions</div>
              <div class="knobs-match-info" style="color:#aaa; font-size:12px; margin-bottom:20px; padding:0; text-align:left;">
                Odd disarmed count points to the row with the **most lit lights**. Even disarmed count points to the row with the **fewest**.
              </div>
              <div id="knobsResultPanel" style="flex: 1; display: flex; align-items: center; justify-content: center; width: 100%;">
                <!-- Rendered dynamically -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function setupKnobsEvents() {
    const container = document.getElementById('knobsSection');
    if (!container) return;

    container.addEventListener('click', (e) => {
      if (e.target.classList.contains('knobs-led')) {
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        
        // Toggle light state
        knobsState.lights[row][col] = !knobsState.lights[row][col];
        
        // Update visual LED state
        e.target.classList.toggle('active', knobsState.lights[row][col]);
        
        // Update active input text representation
        updateActiveInputFromLeds();

        // Re-solve!
        solveKnobs();
      }
    });
  }

  function updateActiveInputFromLeds() {
    const activeInput = document.getElementById('knobsActiveInput');
    if (!activeInput) return;

    const row1 = knobsState.lights[0].map(val => val ? 'X' : 'O').join('');
    const row2 = knobsState.lights[1].map(val => val ? 'X' : 'O').join('');
    
    activeInput.value = `${row1}\n${row2}`;
    
    // Clear parse status as it matches perfectly
    const statusBox = document.getElementById('knobsActiveParseStatus');
    if (statusBox) statusBox.style.display = 'none';
  }

  function parseActiveLightsText(text) {
    const lines = text.split('\n').map(line => line.trim());
    const activeRows = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const normalized = line.toUpperCase().replace(/0/g, 'O').replace(/[^XO]/g, '');
      if (normalized.length === 6 && line.replace(/[^a-zA-Z0-9]/g, '').length === 6) {
        activeRows.push(normalized);
      }
    }
    return activeRows;
  }

  function parseManualText(text) {
    const lines = text.split('\n').map(line => line.trim());
    const parsedConfigs = { UP: [], DOWN: [], LEFT: [], RIGHT: [] };
    let currentDir = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();

      if (upperLine.startsWith('UP:')) { currentDir = 'UP'; continue; }
      else if (upperLine.startsWith('DOWN:')) { currentDir = 'DOWN'; continue; }
      else if (upperLine.startsWith('LEFT:')) { currentDir = 'LEFT'; continue; }
      else if (upperLine.startsWith('RIGHT:')) { currentDir = 'RIGHT'; continue; }

      if (currentDir) {
        if (parsedConfigs[currentDir].length < 8) {
          const normalized = line.toUpperCase().replace(/0/g, 'O').replace(/[^XO]/g, '');
          if (normalized.length === 6 && line.replace(/[^a-zA-Z0-9]/g, '').length === 6) {
            parsedConfigs[currentDir].push(normalized);
          } else {
            currentDir = null;
          }
        } else {
          currentDir = null;
        }
      }
    }
    return parsedConfigs;
  }

  function handleKnobsActiveInput(textarea) {
    const text = textarea.value;
    const rows = parseActiveLightsText(text);
    const statusBox = document.getElementById('knobsActiveParseStatus');

    let activeFound = false;
    if (rows.length >= 2) {
      activeFound = true;
      for (let r = 0; r < 2; r++) {
        const rowStr = rows[r];
        for (let c = 0; c < 6; c++) {
          knobsState.lights[r][c] = rowStr[c] === 'X';
          const led = document.getElementById(`knobs-led-${r}-${c}`);
          if (led) led.classList.toggle('active', knobsState.lights[r][c]);
        }
      }
    } else if (rows.length === 1) {
      activeFound = true;
      const rowStr = rows[0];
      for (let c = 0; c < 6; c++) {
        knobsState.lights[0][c] = rowStr[c] === 'X';
        const led = document.getElementById(`knobs-led-0-${c}`);
        if (led) led.classList.toggle('active', knobsState.lights[0][c]);
      }
    }

    if (statusBox) {
      if (text.trim() === '') {
        statusBox.style.display = 'none';
      } else {
        statusBox.style.display = 'block';
        if (activeFound && rows.length >= 2) {
          statusBox.innerHTML = `<div class="knobs-status-item" style="color:#00ff66;">
            <span>🟢</span>
            <span><strong>Active Lights Read:</strong> Row 1 = <code>${rows[0]}</code>, Row 2 = <code>${rows[1]}</code></span>
          </div>`;
        } else if (activeFound && rows.length === 1) {
          statusBox.innerHTML = `<div class="knobs-status-item" style="color:#ffae00;">
            <span>🟡</span>
            <span><strong>Partial Active Lights:</strong> Row 1 = <code>${rows[0]}</code> (Need 2 rows)</span>
          </div>`;
        } else {
          statusBox.innerHTML = `<div class="knobs-status-item" style="color:#ff3b30;">
            <span>🔴</span>
            <span><strong>No Active Rows:</strong> Enter two 6-character rows (e.g. xoxoxo / ooxooo)</span>
          </div>`;
        }
      }
    }

    solveKnobs();
  }

  function handleKnobsManualInput(textarea) {
    const text = textarea.value;
    const newConfigs = parseManualText(text);
    const statusBox = document.getElementById('knobsManualParseStatus');

    let newManualFound = false;
    let manualDetails = [];

    for (const dir of ['UP', 'DOWN', 'LEFT', 'RIGHT']) {
      if (newConfigs[dir].length > 0) {
        knobsState.configs[dir] = newConfigs[dir];
        newManualFound = true;
        manualDetails.push(`${dir} (${newConfigs[dir].length}/8)`);
      }
    }

    if (statusBox) {
      if (text.trim() === '') {
        statusBox.style.display = 'none';
      } else {
        statusBox.style.display = 'block';
        if (newManualFound) {
          statusBox.innerHTML = `<div class="knobs-status-item" style="color:#00d2ff;">
            <span>🔵</span>
            <span><strong>Manual Rules Loaded:</strong> ${manualDetails.join(', ')}</span>
          </div>`;
        } else {
          statusBox.innerHTML = `<div class="knobs-status-item" style="color:#ffd875;">
            <span>ℹ️</span>
            <span>Using fallback/default rules</span>
          </div>`;
        }
      }
    }

    solveKnobs();
  }

  function findMatchedDirection(rowString) {
    for (const [dir, configs] of Object.entries(knobsState.configs)) {
      if (configs.includes(rowString)) {
        return dir;
      }
    }
    return null;
  }

  function solveKnobs() {
    const row1Str = knobsState.lights[0].map(val => val ? 'X' : 'O').join('');
    const row2Str = knobsState.lights[1].map(val => val ? 'X' : 'O').join('');

    const dir1 = findMatchedDirection(row1Str);
    const dir2 = findMatchedDirection(row2Str);

    const litCount1 = knobsState.lights[0].filter(Boolean).length;
    const litCount2 = knobsState.lights[1].filter(Boolean).length;

    const resultPanel = document.getElementById('knobsResultPanel');
    if (!resultPanel) return;

    // Render row matches
    const row1MatchEl = document.getElementById('knobsRow1Match');
    const row2MatchEl = document.getElementById('knobsRow2Match');
    if (row1MatchEl) {
      row1MatchEl.innerHTML = dir1 
        ? `Row 1 (Top): <span style="font-family:monospace; color:#ffd875; font-weight:bold;">${row1Str}</span> matches <strong style="color:#00ff66; text-transform:uppercase;">${dir1}</strong> (${litCount1} lit)`
        : `Row 1 (Top): <span style="font-family:monospace; color:#888;">${row1Str}</span> &rarr; <span style="color:#f44336; font-weight:bold;">No Match</span>`;
    }
    if (row2MatchEl) {
      row2MatchEl.innerHTML = dir2 
        ? `Row 2 (Bottom): <span style="font-family:monospace; color:#ffd875; font-weight:bold;">${row2Str}</span> matches <strong style="color:#00ff66; text-transform:uppercase;">${dir2}</strong> (${litCount2} lit)`
        : `Row 2 (Bottom): <span style="font-family:monospace; color:#888;">${row2Str}</span> &rarr; <span style="color:#f44336; font-weight:bold;">No Match</span>`;
    }

    if (!dir1 || !dir2) {
      resultPanel.innerHTML = `
        <div style="color:#888; font-size:13px; text-align:center; padding:10px 0;">
          Configure both rows to valid manual configurations to solve...
        </div>
      `;
      return;
    }

    // Odd Solution: direction tied to the row with the most lit lights
    let oddAnswer = "";
    let oddDesc = "";
    if (litCount1 > litCount2) {
      oddAnswer = dir1;
      oddDesc = `Row 1 has more lit lights (${litCount1} > ${litCount2})`;
    } else if (litCount2 > litCount1) {
      oddAnswer = dir2;
      oddDesc = `Row 2 has more lit lights (${litCount2} > ${litCount1})`;
    } else {
      oddAnswer = `${dir1} / ${dir2}`;
      oddDesc = `Tie! Both rows have ${litCount1} lit lights`;
    }

    // Even Solution: direction tied to the row with the fewest lit lights
    let evenAnswer = "";
    let evenDesc = "";
    if (litCount1 < litCount2) {
      evenAnswer = dir1;
      evenDesc = `Row 1 has fewer lit lights (${litCount1} < ${litCount2})`;
    } else if (litCount2 < litCount1) {
      evenAnswer = dir2;
      evenDesc = `Row 2 has fewer lit lights (${litCount2} < ${litCount1})`;
    } else {
      evenAnswer = `${dir1} / ${dir2}`;
      evenDesc = `Tie! Both rows have ${litCount1} lit lights`;
    }

    resultPanel.innerHTML = `
      <div style="display: flex; gap: 16px; width: 100%; justify-content: center; margin-top: 10px;">
        <div class="knobs-solution-card odd">
          <div class="knobs-solution-title">Odd Disarmed Count</div>
          <div class="knobs-solution-dir">${oddAnswer}</div>
          <div class="knobs-solution-desc">${oddDesc}</div>
        </div>
        <div class="knobs-solution-card even">
          <div class="knobs-solution-title">Even Disarmed Count</div>
          <div class="knobs-solution-dir">${evenAnswer}</div>
          <div class="knobs-solution-desc">${evenDesc}</div>
        </div>
      </div>
    `;
  }

  function resetKnobsSolver() {
    knobsState.lights = [
      [false, false, false, false, false, false],
      [false, false, false, false, false, false]
    ];
    knobsState.configs = JSON.parse(JSON.stringify(DEFAULT_CONFIGS));

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 6; c++) {
        const led = document.getElementById(`knobs-led-${r}-${c}`);
        if (led) led.classList.remove('active');
      }
    }

    const activeInput = document.getElementById('knobsActiveInput');
    if (activeInput) activeInput.value = '';

    const manualInput = document.getElementById('knobsManualInput');
    if (manualInput) manualInput.value = DEFAULT_MANUAL_TEXT;

    const activeStatus = document.getElementById('knobsActiveParseStatus');
    if (activeStatus) activeStatus.style.display = 'none';

    const manualStatus = document.getElementById('knobsManualParseStatus');
    if (manualStatus) manualStatus.style.display = 'none';

    solveKnobs();
  }

  // ── PUBLIC EXPORTS ─────────────────────────────────────────
  window.initKnobsModule = initKnobsModule;
  window.handleKnobsActiveInput = handleKnobsActiveInput;
  window.handleKnobsManualInput = handleKnobsManualInput;
  window.resetKnobsSolver = resetKnobsSolver;
})();
