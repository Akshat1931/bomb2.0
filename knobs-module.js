(function() {
  // The table (8 patterns per direction) changes every game, so nothing is built in: last game's
  // table could match by chance and give a confident wrong answer. It is read from the manual
  // picture (knobs-manual.js) or pasted as text, and remembered for the game.
  const MANUAL_KEY = 'ktane_knobs_manual'; // { text, at, picture }
  const EMPTY_CONFIGS = () => ({ UP: [], DOWN: [], LEFT: [], RIGHT: [] });
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, JSON.stringify(v)); else localStorage.removeItem(k); } catch (e) {} }

  const knobsState = {
    initialized: false,
    // 2 rows of 6 LEDs: true (lit), false (unlit)
    lights: [
      [false, false, false, false, false, false],
      [false, false, false, false, false, false]
    ],
    configs: EMPTY_CONFIGS(),
    manual: lsGet(MANUAL_KEY),   // this game's manual
    manualMsg: ''
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
    .knobs-copy-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 22px;
      background: #181b36;
      border: 1.5px solid #22c55e;
      color: #4ade80;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
      transition: all 0.15s ease;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
    }
    .knobs-copy-btn:hover {
      background: #133824;
      border-color: #4ade80;
      box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
      transform: translateY(-1px);
    }
    .knobs-copy-btn:active {
      transform: translateY(0);
    }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'knobsStyles';
    const manualCss = `
    .knobs-manual-drop { border: 2px dashed #35355c; border-radius: 10px; padding: 12px; text-align: center; color: #aaa; font-size: 13px; cursor: pointer; transition: all 0.15s; margin-bottom: 8px; }
    .knobs-manual-drop:hover, .knobs-manual-drop.dragover { border-color: #ffd875; color: #ffd875; background: rgba(255,216,117,0.05); }
    .knobs-manual-state { font-size: 12px; text-align: left; margin-bottom: 8px; }
    `;
    styleEl.textContent = css + manualCss;
    document.head.appendChild(styleEl);
  }

  // ── INITIALIZATION ─────────────────────────────────────────
  function initKnobsModule() {
    if (knobsState.initialized) return;
    knobsState.initialized = true;

    injectKnobsStyles();
    renderKnobsUI();
    setupKnobsEvents();

    // Restore this game's manual (if one was loaded)
    const manualInput = document.getElementById('knobsManualInput');
    if (manualInput && knobsState.manual) {
      manualInput.value = knobsState.manual.text;
      handleKnobsManualInput(manualInput, true);
    }
    setupKnobsManualPicture();
    renderKnobsManualState();

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
              <div class="knobs-card-title">3. Knobs Manual (this game)</div>
              <div style="font-size:12px; color:#aaa; text-align:left; margin-bottom:8px;">
                The manual changes every game. Paste its picture (UP / DOWN / LEFT / RIGHT panels) once — it fills the table below, which you can still edit or type.
              </div>
              <div id="knobsManualDrop" class="knobs-manual-drop" onclick="document.getElementById('knobsManualFile').click()">
                <input type="file" id="knobsManualFile" accept="image/*" style="display:none;" onchange="window.handleKnobsManualFile(this)">
                📋 Paste / drop the <b>Knobs manual picture</b> or the <b>knob LEDs screenshot</b> <span style="color:#777;">(Ctrl+V or click — it tells them apart)</span>
              </div>
              <div id="knobsManualState" class="knobs-manual-state"></div>
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
      const m = line.toUpperCase().match(/[XO01]{6}/);
      if (m) activeRows.push(m[0].replace(/1/g, 'X').replace(/0/g, 'O'));
    }
    return activeRows;
  }

  // ── bomb_boomed/src/modules/knob/knobSolver.js ─────────────
  // "UP" with or without a colon, X/O or 1/0, the 6-light pattern anywhere on the line
  function parseManualText(text) {
    const rules = { UP: [], DOWN: [], LEFT: [], RIGHT: [] };
    let curDir = null;
    const lines = String(text || '').split(/\r?\n/);
    for (const raw of lines) {
      const l = raw.trim().toUpperCase();
      if (l.startsWith('UP')) { curDir = 'UP'; continue; }
      if (l.startsWith('DOWN')) { curDir = 'DOWN'; continue; }
      if (l.startsWith('LEFT')) { curDir = 'LEFT'; continue; }
      if (l.startsWith('RIGHT')) { curDir = 'RIGHT'; continue; }
      const match = l.match(/[XO01]{6}/);
      if (match && curDir && rules[curDir]) {
        const pat = match[0].replace(/1/g, 'X').replace(/0/g, 'O');
        if (!rules[curDir].includes(pat)) rules[curDir].push(pat);
      }
    }
    return rules;
  }

  const countLit = (pat) => (pat.match(/X/g) || []).length;

  function findPatternDir(pat, rules) {
    if (!pat || pat.length !== 6) return null;
    for (const dir of ['UP', 'DOWN', 'LEFT', 'RIGHT']) {
      if (rules[dir] && rules[dir].includes(pat)) return dir;
    }
    return null;
  }

  // One row matching is enough; with both, ODD → the row with MORE lit lights, EVEN → FEWER,
  // a tie → the top row.
  function solveKnob(topPat, botPat, disarmed, rules) {
    const dirTop = findPatternDir(topPat, rules);
    const dirBot = findPatternDir(botPat, rules);
    const litTop = countLit(topPat), litBot = countLit(botPat);
    if (!dirTop && !dirBot) return { ok: false, msg: 'No matching pattern found for top or bottom row' };
    const isOdd = disarmed % 2 !== 0;
    let chosenDir = null, reason = '';
    if (dirTop && !dirBot) {
      chosenDir = dirTop;
      reason = `Only Top Row matched (${topPat} → ${dirTop})`;
    } else if (!dirTop && dirBot) {
      chosenDir = dirBot;
      reason = `Only Bottom Row matched (${botPat} → ${dirBot})`;
    } else if (isOdd) {
      chosenDir = litBot > litTop ? dirBot : dirTop;
      reason = litTop === litBot ? `Tie (${litTop} lit each) → top row` : `ODD → row with MOST lit lights (${litTop} vs ${litBot})`;
    } else {
      chosenDir = litBot < litTop ? dirBot : dirTop;
      reason = litTop === litBot ? `Tie (${litTop} lit each) → top row` : `EVEN → row with FEWEST lit lights (${litTop} vs ${litBot})`;
    }
    return { ok: true, direction: chosenDir, reason, dirTop, dirBot, litTop, litBot };
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

  function handleKnobsManualInput(textarea, restoring) {
    const text = textarea.value;
    const newConfigs = parseManualText(text);
    const statusBox = document.getElementById('knobsManualParseStatus');

    let newManualFound = false;
    let manualDetails = [];

    // the table is exactly what was pasted / read — no built-in rows fill the gaps
    knobsState.configs = EMPTY_CONFIGS();
    for (const dir of ['UP', 'DOWN', 'LEFT', 'RIGHT']) {
      if (newConfigs[dir].length > 0) {
        knobsState.configs[dir] = newConfigs[dir];
        newManualFound = true;
        manualDetails.push(`${dir} (${newConfigs[dir].length}/8)`);
      }
    }
    if (!restoring) {
      knobsState.manual = newManualFound
        ? { text, at: Date.now(), picture: Boolean(knobsState.manual && knobsState.manual.picture && knobsState.manual.text === text) }
        : null;
      lsSet(MANUAL_KEY, knobsState.manual);
      knobsState.manualMsg = '';
      renderKnobsManualState();
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
            <span>No UP: / DOWN: / LEFT: / RIGHT: rows found — paste the manual picture</span>
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

    const haveManual = Object.values(knobsState.configs).some(c => c.length);
    if (!haveManual) {
      resultPanel.innerHTML = `
        <div style="color:#ffd875; font-size:13px; text-align:center; padding:10px 0;">
          Paste this game's Knobs manual picture first (card 3)
        </div>
      `;
      return;
    }

    const resOdd = solveKnob(row1Str, row2Str, 1, knobsState.configs);
    const resEven = solveKnob(row1Str, row2Str, 0, knobsState.configs);
    if (!resOdd.ok) {
      resultPanel.innerHTML = `
        <div style="color:#888; font-size:13px; text-align:center; padding:10px 0;">
          Neither row matches a pattern in the manual — check the lights (or the manual)...
        </div>
      `;
      return;
    }
    const oddAnswer = resOdd.direction, oddDesc = resOdd.reason;
    const evenAnswer = resEven.direction, evenDesc = resEven.reason;

    const copyText = `# odd ${oddAnswer.toLowerCase()}\n# even ${evenAnswer.toLowerCase()}`;
    window.__knobsCopyText = copyText;

    resultPanel.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%; gap: 12px; margin-top: 8px;">
        <button id="knobsCopyBtn" class="knobs-copy-btn" type="button" onclick="window.copyKnobsAnswer(this)">
          📋 Copy Answer
        </button>
        <div style="display: flex; gap: 16px; width: 100%; justify-content: center;">
          <div class="knobs-solution-card odd" onclick="window.copyKnobsSingle('# odd ${oddAnswer.toLowerCase()}', this)" style="cursor: pointer;" title="Click to copy: # odd ${oddAnswer.toLowerCase()}">
            <div class="knobs-solution-title">Odd Disarmed Count</div>
            <div class="knobs-solution-dir">${oddAnswer}</div>
            <div class="knobs-solution-desc">${oddDesc}</div>
          </div>
          <div class="knobs-solution-card even" onclick="window.copyKnobsSingle('# even ${evenAnswer.toLowerCase()}', this)" style="cursor: pointer;" title="Click to copy: # even ${evenAnswer.toLowerCase()}">
            <div class="knobs-solution-title">Even Disarmed Count</div>
            <div class="knobs-solution-dir">${evenAnswer}</div>
            <div class="knobs-solution-desc">${evenDesc}</div>
          </div>
        </div>
      </div>
    `;
  }

  function copyKnobsAnswer(btn) {
    if (!window.__knobsCopyText) return;
    performClipboardCopy(window.__knobsCopyText, () => {
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '✓ Copied!';
        btn.style.borderColor = '#22c55e';
        btn.style.color = '#22c55e';
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.style.borderColor = '';
          btn.style.color = '';
        }, 1500);
      }
    });
  }

  function copyKnobsSingle(text, el) {
    performClipboardCopy(text, () => {
      if (el) {
        const titleEl = el.querySelector('.knobs-solution-title');
        if (titleEl) {
          const orig = titleEl.textContent;
          titleEl.textContent = '✓ Copied!';
          titleEl.style.color = '#22c55e';
          setTimeout(() => {
            titleEl.textContent = orig;
            titleEl.style.color = '';
          }, 1500);
        }
      }
    });
  }

  function performClipboardCopy(text, callback) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(callback).catch(() => {
        fallbackCopy(text, callback);
      });
    } else {
      fallbackCopy(text, callback);
    }
  }

  function fallbackCopy(text, callback) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (callback) callback();
    } catch (e) {}
    document.body.removeChild(ta);
  }

  function resetKnobsSolver() {
    window.__knobsCopyText = null;
    knobsState.lights = [
      [false, false, false, false, false, false],
      [false, false, false, false, false, false]
    ];

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 6; c++) {
        const led = document.getElementById(`knobs-led-${r}-${c}`);
        if (led) led.classList.remove('active');
      }
    }

    const activeInput = document.getElementById('knobsActiveInput');
    if (activeInput) activeInput.value = '';

    // the manual is kept: it is the same for every bomb this game ("forget" clears it)

    const activeStatus = document.getElementById('knobsActiveParseStatus');
    if (activeStatus) activeStatus.style.display = 'none';

    solveKnobs();
  }

  // ── MANUAL PICTURE ─────────────────────────────────────────
  function renderKnobsManualState() {
    const el = document.getElementById('knobsManualState');
    if (!el) return;
    const m = knobsState.manual;
    let html = '';
    if (m) {
      const mins = Math.round((Date.now() - m.at) / 60000);
      const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
      html = `<span style="color:#00ff66;">✓ Manual loaded</span> <span style="color:#888;">· ${m.picture ? 'read from the picture' : 'typed / pasted text — check it\'s this game\'s'} · ${ago} ·</span> <a href="#" style="color:#f44336;" onclick="window.forgetKnobsManual(); return false;">forget</a>`;
    } else {
      html = `<span style="color:#ffd875;">No manual yet — paste this game's manual picture.</span>`;
    }
    if (knobsState.manualMsg) html += `<div style="color:${knobsState.manualMsg.startsWith('⚠') ? '#f44336' : '#00ff66'}; margin-top:4px;">${knobsState.manualMsg}</div>`;
    el.innerHTML = html;
  }

  function readKnobsManualFile(file) {
    if (!window.KnobsManual) { knobsState.manualMsg = '⚠ Manual reader not loaded.'; renderKnobsManualState(); return; }
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      const man = window.KnobsManual.readKnobManual(ctx.getImageData(0, 0, W, H).data, W, H);
      const marks = man.panels.reduce((n, pnl) => n + pnl.rows.join('').length, 0);
      if (man.panels.length !== 4 || marks < 150) { // 4 panels × 48 X / O when read cleanly
        // not the manual: the defuser's 12 LEDs
        readKnobsLeds(img, cv);
        return;
      }
      const text = window.KnobsManual.knobManualText(man.dirs);
      const ta = document.getElementById('knobsManualInput');
      if (ta) {
        ta.value = text;
        knobsState.manual = { text, at: Date.now(), picture: true };
        handleKnobsManualInput(ta, true);
        lsSet(MANUAL_KEY, knobsState.manual);
      }
      knobsState.manualMsg = man.ok ? '✓ Read 4 × 8 patterns from the picture'
        : `⚠ Picture not read cleanly: ${man.problems.join('; ')} — fix the table by hand`;
      renderKnobsManualState();
    };
    img.onerror = () => { knobsState.manualMsg = '⚠ Could not open that file as an image.'; renderKnobsManualState(); };
    img.src = URL.createObjectURL(file);
  }

  // ── bomb_boomed/src/modules/knob/knobVision.js ─────────────
  // OCR of the X / O rows first, then the lights' brightness at fixed spots.
  let knobsOcrWorker = null;
  async function ensureKnobsOcr() {
    if (knobsOcrWorker) return knobsOcrWorker;
    if (typeof Tesseract === 'undefined' || typeof Tesseract.createWorker !== 'function') throw new Error('no OCR');
    knobsOcrWorker = await Tesseract.createWorker('eng');
    return knobsOcrWorker;
  }

  async function detectKnobStateFromImage(img, canvas) {
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const knobState = new Array(12).fill(0);
    let foundText = false;
    try {
      const worker = await ensureKnobsOcr();
      await worker.setParameters({ tessedit_char_whitelist: 'XO01 \n\r\t', tessedit_pageseg_mode: '6', user_defined_dpi: '150' });
      const { data } = await worker.recognize(canvas);
      const text = data.text.toUpperCase().replace(/[01]/g, m => (m === '1' ? 'X' : 'O'));
      const matches = text.match(/[XO]{6}/g);
      if (matches && matches.length >= 2) {
        for (let i = 0; i < 6; i++) knobState[i] = matches[0][i] === 'X' ? 1 : 0;
        for (let i = 0; i < 6; i++) knobState[i + 6] = matches[1][i] === 'X' ? 1 : 0;
        foundText = true;
      }
    } catch (e) {}

    if (!foundText) {
      const imgData = ctx.getImageData(0, 0, W, H).data;
      const samples = [];
      const rowY = [0.35, 0.65];
      const colX = [0.15, 0.29, 0.43, 0.57, 0.71, 0.85];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 6; c++) {
          const cx = Math.floor(colX[c] * W), cy = Math.floor(rowY[r] * H);
          const rad = Math.max(2, Math.floor(Math.min(W, H) * 0.03));
          let rSum = 0, gSum = 0, bSum = 0, count = 0;
          for (let dy = -rad; dy <= rad; dy++) {
            for (let dx = -rad; dx <= rad; dx++) {
              const px = cx + dx, py = cy + dy;
              if (px >= 0 && px < W && py >= 0 && py < H) {
                const idx = (py * W + px) * 4;
                rSum += imgData[idx]; gSum += imgData[idx + 1]; bSum += imgData[idx + 2]; count++;
              }
            }
          }
          samples.push(count ? (0.299 * rSum + 0.587 * gSum + 0.114 * bSum) / count : 0);
        }
      }
      const maxB = Math.max(...samples), minB = Math.min(...samples);
      const thresh = minB + 0.45 * (maxB - minB);
      for (let i = 0; i < 12; i++) knobState[i] = (samples[i] > thresh && (maxB - minB > 25)) ? 1 : 0;
    }
    return knobState;
  }

  async function readKnobsLeds(img, canvas) {
    knobsState.manualMsg = 'Reading the knob LEDs…';
    renderKnobsManualState();
    let st = null;
    try { st = await detectKnobStateFromImage(img, canvas); } catch (e) {}
    if (!st || st.length !== 12) {
      knobsState.manualMsg = '⚠ Could not read that picture — click the LEDs instead.';
      renderKnobsManualState();
      return;
    }
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
      knobsState.lights[r][c] = Boolean(st[r * 6 + c]);
      const led = document.getElementById(`knobs-led-${r}-${c}`);
      if (led) led.classList.toggle('active', knobsState.lights[r][c]);
    }
    if (typeof updateActiveInputFromLeds === 'function') updateActiveInputFromLeds();
    knobsState.manualMsg = '✓ Knob LEDs read from the screenshot — check them against the picture';
    renderKnobsManualState();
    solveKnobs();
  }

  function setupKnobsManualPicture() {
    const dz = document.getElementById('knobsManualDrop');
    if (dz) {
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
      dz.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover');
        if (window.BombDragDrop) window.BombDragDrop.handleDataTransfer(e.dataTransfer, (f) => { if (f) readKnobsManualFile(f); });
        else { const f = [...(e.dataTransfer?.files || [])].find(x => x.type.startsWith('image/')); if (f) readKnobsManualFile(f); }
      });
    }
    // Ctrl+V of the manual picture on this tab (Discord links go via dragdrop-helper.js)
    document.addEventListener('paste', (e) => {
      if (!document.getElementById('knobsSection')?.classList.contains('active')) return;
      for (const item of (e.clipboardData?.items || [])) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const f = item.getAsFile(); if (f) readKnobsManualFile(f);
          return;
        }
      }
    });
  }

  function handleKnobsManualFile(input) {
    const f = input.files && input.files[0];
    if (f) readKnobsManualFile(f);
    input.value = '';
  }

  function forgetKnobsManual() {
    knobsState.manual = null;
    knobsState.manualMsg = '';
    knobsState.configs = EMPTY_CONFIGS();
    lsSet(MANUAL_KEY, null);
    const ta = document.getElementById('knobsManualInput');
    if (ta) ta.value = '';
    const st = document.getElementById('knobsManualParseStatus');
    if (st) st.style.display = 'none';
    renderKnobsManualState();
    solveKnobs();
  }

  // ── PUBLIC EXPORTS ─────────────────────────────────────────
  window.initKnobsModule = initKnobsModule;
  window.handleKnobsActiveInput = handleKnobsActiveInput;
  window.handleKnobsManualInput = handleKnobsManualInput;
  window.resetKnobsSolver = resetKnobsSolver;
  window.handleKnobsManualFile = handleKnobsManualFile;
  window.forgetKnobsManual = forgetKnobsManual;
  window.copyKnobsAnswer = copyKnobsAnswer;
  window.copyKnobsSingle = copyKnobsSingle;
})();
