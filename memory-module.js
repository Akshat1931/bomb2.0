(function() {
  const DEFAULT_RULES_TEXT = `Stage 1
- If the display is 1, press the button labeled 3.
- If the display is 2, press the button in position 3.
- If the display is 3, press the button labeled 3.
- If the display is 4, press the button labeled 2.

Stage 2
- If the display is 1, press the button in position 4.
- If the display is 2, press the button with the same label you pressed in stage 1.
- If the display is 3, press the button with the same label you pressed in stage 1.
- If the display is 4, press the button in position 4.

Stage 3
- If the display is 1, press the button with the same label you pressed in stage 2.
- If the display is 2, press the button labeled 4.
- If the display is 3, press the button with the same label you pressed in stage 2.
- If the display is 4, press the button in the same position you pressed in stage 2.

Stage 4
- If the display is 1, press the button with the same label you pressed in stage 2.
- If the display is 2, press the button with the same label you pressed in stage 3.
- If the display is 3, press the button in the same position you pressed in stage 2.
- If the display is 4, press the button with the same label you pressed in stage 2.

Stage 5
- If the display is 1, press the button with the same label you pressed in stage 1.
- If the display is 2, press the button with the same label you pressed in stage 3.
- If the display is 3, press the button with the same label you pressed in stage 4.
- If the display is 4, press the button in the same position you pressed in stage 2.`;

  const memoryState = {
    initialized: false,
    currentStage: 1, // 1..5
    history: {}, // 1..5 -> { display, buttons: [], pressed: { position, label } }
    rules: {},
    activeDisplay: null // Selected display for current stage
  };

  // ── DYNAMIC STYLE INJECTION ───────────────────────────────
  function injectMemoryStyles() {
    if (document.getElementById('memoryStyles')) return;
    const css = `
    .memory-shell {
      max-width: 950px;
      margin: auto;
      background: #12122a;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #222;
    }
    .memory-layout {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 820px) {
      .memory-layout {
        grid-template-columns: 1fr;
      }
    }
    .memory-col-left {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .memory-col-right {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .memory-card {
      background: #0f0f1c;
      border: 2px solid #25253f;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .memory-card-title {
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
    .memory-stage-indicator {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      background: #080814;
      padding: 10px;
      border-radius: 10px;
      border: 1px solid #1a1a33;
    }
    .memory-stage-dot {
      flex: 1;
      text-align: center;
      padding: 6px 4px;
      font-size: 13px;
      font-weight: bold;
      color: #555;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .memory-stage-dot.active {
      color: #ffd875;
      background: rgba(255, 216, 117, 0.1);
      box-shadow: inset 0 0 5px rgba(255, 216, 117, 0.2);
    }
    .memory-stage-dot.completed {
      color: #00ff66;
    }
    .memory-display-selector {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin: 15px 0 25px 0;
    }
    .memory-display-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #18182a;
      border: 2px solid #334;
      color: #aaa;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s;
    }
    .memory-display-btn:hover {
      border-color: #ffd875;
      color: #fff;
    }
    .memory-display-btn.active {
      background: radial-gradient(circle, #f5c542 0%, #a67c00 100%);
      border-color: #fff;
      color: #090915;
      box-shadow: 0 0 15px rgba(245, 197, 66, 0.4);
    }
    .memory-buttons-preview {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 12px;
      min-height: 42px;
    }
    .memory-btn-preview-box {
      width: 42px;
      height: 42px;
      border-radius: 8px;
      background: #1e1e38;
      border: 2px solid #32324e;
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .memory-btn-preview-box.pressed {
      border-color: #00ff66;
      box-shadow: 0 0 10px rgba(0, 255, 102, 0.3);
      background: rgba(0, 255, 102, 0.05);
    }
    .memory-btn-preview-box.pressed .press-label {
      font-size: 9px;
      color: #00ff66;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .memory-solution-box {
      background: #070712;
      border: 1px solid #222;
      border-radius: 10px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      width: 100%;
    }
    .memory-solution-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 12px;
    }
    .memory-solution-press {
      font-size: 38px;
      font-weight: 900;
      color: #00ff66;
      letter-spacing: 1px;
      text-shadow: 0 0 15px rgba(0, 255, 102, 0.4);
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .memory-solution-label {
      font-size: 16px;
      color: #aaa;
    }
    .memory-solution-label strong {
      color: #ffd875;
    }
    .memory-textarea {
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
    .memory-textarea:focus {
      border-color: #ffd875;
      box-shadow: 0 0 8px rgba(255, 216, 117, 0.3);
    }
    .memory-action-btn {
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
    .memory-action-btn:hover {
      background: rgba(244, 67, 54, 0.1);
    }
    .memory-confirm-btn {
      margin-top: 16px;
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #ffd875 0%, #f5c542 100%);
      color: #090915;
      font-weight: bold;
      font-size: 15px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .memory-confirm-btn:hover:not(:disabled) {
      box-shadow: 0 0 15px rgba(245, 197, 66, 0.4);
      transform: translateY(-1px);
    }
    .memory-confirm-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .memory-status-box {
      font-size: 13px;
      margin-top: 10px;
      text-align: left;
      line-height: 1.6;
      padding: 10px 14px;
      background: #070712;
      border-radius: 6px;
      border: 1px solid #25253f;
    }
    .memory-status-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .memory-history-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      margin-top: 15px;
      text-align: left;
    }
    .memory-history-item {
      background: #14142b;
      border: 1px solid #25253f;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .memory-history-item strong {
      color: #00ff66;
    }
    .memory-history-item span.lbl {
      color: #ffd875;
    }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'memoryStyles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  // ── INITIALIZATION ─────────────────────────────────────────
  function initMemoryModule() {
    if (memoryState.initialized) return;
    memoryState.initialized = true;

    injectMemoryStyles();
    renderMemoryUI();
    setupMemoryEvents();
    
    // Parse default rules
    memoryState.rules = parseMemoryRules(DEFAULT_RULES_TEXT);
    const rulesInput = document.getElementById('memoryRulesInput');
    if (rulesInput) {
      rulesInput.value = DEFAULT_RULES_TEXT;
    }
    updateManualStatus();
    solveMemory();
  }

  function renderMemoryUI() {
    const container = document.getElementById('memorySection');
    if (!container) return;

    container.innerHTML = `
      <div class="memory-shell">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #25253f; padding-bottom:10px;">
          <h2 style="color:#f5c542; margin:0;">Memory Solver</h2>
          <div>
            <button id="memoryUndoBtn" class="memory-action-btn" type="button" style="margin-top:0; margin-right:8px; border-color:#00d2ff; color:#00d2ff;" onclick="window.undoMemoryStage()" disabled>Undo Stage</button>
            <button id="memoryResetBtn" class="memory-action-btn" type="button" style="margin-top:0;" onclick="window.resetMemorySolver()">Reset Solver</button>
          </div>
        </div>

        <div class="memory-layout">
          <!-- Left Column -->
          <div class="memory-col-left">
            <!-- Stage Control Card -->
            <div class="memory-card">
              <div class="memory-card-title">Active Stage Inputs</div>
              
              <!-- Stage Dot Indicator -->
              <div class="memory-stage-indicator">
                <div class="memory-stage-dot active" id="memory-dot-1">Stage 1</div>
                <div class="memory-stage-dot" id="memory-dot-2">Stage 2</div>
                <div class="memory-stage-dot" id="memory-dot-3">Stage 3</div>
                <div class="memory-stage-dot" id="memory-dot-4">Stage 4</div>
                <div class="memory-stage-dot" id="memory-dot-5">Stage 5</div>
              </div>

              <!-- Display Digit Selection -->
              <div style="text-align:left; font-size:13px; color:#aaa; margin-bottom:6px; font-weight:bold;">1. Click Display Number:</div>
              <div class="memory-display-selector">
                <button type="button" class="memory-display-btn" data-val="1" onclick="window.selectMemoryDisplay(1)">1</button>
                <button type="button" class="memory-display-btn" data-val="2" onclick="window.selectMemoryDisplay(2)">2</button>
                <button type="button" class="memory-display-btn" data-val="3" onclick="window.selectMemoryDisplay(3)">3</button>
                <button type="button" class="memory-display-btn" data-val="4" onclick="window.selectMemoryDisplay(4)">4</button>
              </div>

              <!-- Button Labels Entry -->
              <div style="text-align:left; font-size:13px; color:#aaa; margin-bottom:6px; font-weight:bold;">2. Type 4 Button Labels (left to right):</div>
              <input type="text" id="memoryButtonsInput" class="knobs-textarea" maxlength="4" placeholder="e.g. 4132" style="font-size:16px; font-weight:bold; width:100%; max-width:280px; letter-spacing:6px;" oninput="window.handleMemoryButtonsInput(this)">
              
              <!-- Button Labels Visual Preview -->
              <div class="memory-buttons-preview" id="memoryButtonsPreview">
                <div class="memory-btn-preview-box">-</div>
                <div class="memory-btn-preview-box">-</div>
                <div class="memory-btn-preview-box">-</div>
                <div class="memory-btn-preview-box">-</div>
              </div>

              <!-- Confirm Stage Button -->
              <button id="memoryConfirmBtn" class="memory-confirm-btn" type="button" onclick="window.confirmMemoryStage()" disabled>Confirm Solution & Next Stage</button>
            </div>

            <!-- Rules Guide Text area -->
            <div class="memory-card">
              <div class="memory-card-title">Memory Module Guide / Manual</div>
              <div style="font-size:12px; color:#aaa; text-align:left; margin-bottom:8px;">
                If the memory module rules are modded/custom, paste the guidebook lines here.
              </div>
              <textarea id="memoryRulesInput" class="memory-textarea" rows="8" placeholder="Stage 1&#10;- If the display is 1, press..." oninput="window.handleMemoryRulesInput(this)"></textarea>
              
              <!-- Rules Parse Status -->
              <div id="memoryManualParseStatus" class="memory-status-box" style="display: none;"></div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="memory-col-right">
            <!-- Computed Solutions & History Card -->
            <div class="memory-card" style="min-height:380px; display:flex; flex-direction:column;">
              <div class="memory-card-title">Computed Solution</div>
              <div id="memoryResultPanel" style="flex:1; display:flex; align-items:center; justify-content:center;">
                <!-- Solution box will render here -->
              </div>
              
              <div style="border-top:1px solid #25253f; padding-top:15px; margin-top:20px; width:100%;">
                <div style="text-align:left; font-size:13px; font-weight:bold; color:#ffd875; margin-bottom:8px;">Solved Stages History:</div>
                <div class="memory-history-list" id="memoryHistoryList">
                  <div style="color:#666; font-size:12px; text-align:center; padding:15px 0;">No stages solved yet.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function setupMemoryEvents() {
    // Add Enter key event listener to the input area to submit the solution
    const container = document.getElementById('memorySection');
    if (!container) return;

    container.addEventListener('keydown', (e) => {
      if (e.target.id === 'memoryButtonsInput' && e.key === 'Enter') {
        const btn = document.getElementById('memoryConfirmBtn');
        if (btn && !btn.disabled) {
          btn.click();
        }
      }
    });
  }

  function selectMemoryDisplay(val) {
    memoryState.activeDisplay = val;
    
    // Toggle active display button
    document.querySelectorAll('.memory-display-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.val) === val);
    });

    solveMemory();
  }

  function handleMemoryButtonsInput(input) {
    // Sanitize input to only allow digits 1-4 and maximum length of 4
    let val = input.value.replace(/[^1-4]/g, '');
    if (val.length > 4) val = val.substring(0, 4);
    input.value = val;

    // Update the visual preview buttons
    const preview = document.getElementById('memoryButtonsPreview');
    if (preview) {
      const boxes = preview.children;
      for (let i = 0; i < 4; i++) {
        if (i < val.length) {
          boxes[i].textContent = val[i];
          boxes[i].style.opacity = '1';
        } else {
          boxes[i].textContent = '-';
          boxes[i].style.opacity = '0.4';
          boxes[i].classList.remove('pressed');
        }
      }
    }

    solveMemory();
  }

  function parseMemoryRules(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const parsed = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
    let currentStage = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();

      // Anchor to start of line, ignoring markdown bullets/headers
      const stageHeaderMatch = line.match(/^\s*(?:#|\*|-)*\s*STAGE\s+(\d)/i);
      if (stageHeaderMatch) {
        currentStage = parseInt(stageHeaderMatch[1]);
        continue;
      }

      if (currentStage && currentStage >= 1 && currentStage <= 5) {
        const displayMatch = line.match(/display is \*{0,2}(\d)\*{0,2}/i);
        if (!displayMatch) continue;
        const displayVal = parseInt(displayMatch[1]);

        let rule = null;
        if (/same label.*stage \*{0,2}(\d)\*{0,2}/i.test(line)) {
          const m = line.match(/stage \*{0,2}(\d)\*{0,2}/i);
          rule = { type: 'SAME_LABEL_STAGE', stage: parseInt(m[1]) };
        } else if (/same position.*stage \*{0,2}(\d)\*{0,2}/i.test(line)) {
          const m = line.match(/stage \*{0,2}(\d)\*{0,2}/i);
          rule = { type: 'SAME_POSITION_STAGE', stage: parseInt(m[1]) };
        } else if (/labeled \*{0,2}(\d)\*{0,2}/i.test(line)) {
          const m = line.match(/labeled \*{0,2}(\d)\*{0,2}/i);
          rule = { type: 'LABEL', label: parseInt(m[1]) };
        } else if (/position \*{0,2}(\d)\*{0,2}/i.test(line)) {
          const m = line.match(/position \*{0,2}(\d)\*{0,2}/i);
          rule = { type: 'POSITION', position: parseInt(m[1]) };
        }

        if (rule) {
          parsed[currentStage][displayVal] = rule;
        }
      }
    }
    return parsed;
  }

  function handleMemoryRulesInput(textarea) {
    const text = textarea.value;
    memoryState.rules = parseMemoryRules(text);
    updateManualStatus();
    solveMemory();
  }

  function updateManualStatus() {
    const statusBox = document.getElementById('memoryManualParseStatus');
    if (!statusBox) return;

    let totalRules = 0;
    const stagesDetail = [];
    for (let s = 1; s <= 5; s++) {
      const count = Object.keys(memoryState.rules[s] || {}).length;
      totalRules += count;
      stagesDetail.push(`S${s}(${count}/4)`);
    }

    if (totalRules > 0) {
      statusBox.style.display = 'block';
      statusBox.innerHTML = `<div class="memory-status-item" style="color:#00d2ff;">
        <span>🔵</span>
        <span><strong>Rules Parsed:</strong> ${stagesDetail.join(', ')}</span>
      </div>`;
    } else {
      statusBox.style.display = 'block';
      statusBox.innerHTML = `<div class="memory-status-item" style="color:#ff3b30;">
        <span>🔴</span>
        <span><strong>Invalid Rules Format:</strong> Check Stage headers and display condition syntax</span>
      </div>`;
    }
  }

  function solveMemory() {
    const S = memoryState.currentStage;
    const displayVal = memoryState.activeDisplay;
    const buttonsInput = document.getElementById('memoryButtonsInput');
    const buttonsVal = buttonsInput ? buttonsInput.value.split('').map(Number) : [];

    const resultPanel = document.getElementById('memoryResultPanel');
    const confirmBtn = document.getElementById('memoryConfirmBtn');

    if (S > 5) {
      if (resultPanel) {
        resultPanel.innerHTML = `
          <div class="memory-solution-box" style="border-color:#00ff66;">
            <div class="memory-solution-title" style="color:#00ff66;">Module Disarmed</div>
            <div class="memory-solution-press" style="font-size:24px;">All stages solved!</div>
            <div class="memory-solution-label">Press Reset to solve another.</div>
          </div>
        `;
      }
      if (confirmBtn) confirmBtn.disabled = true;
      return;
    }

    // Reset visual highlights in buttons preview
    const preview = document.getElementById('memoryButtonsPreview');
    if (preview) {
      Array.from(preview.children).forEach(box => box.classList.remove('pressed'));
    }

    if (!displayVal || buttonsVal.length < 4) {
      if (resultPanel) {
        resultPanel.innerHTML = `
          <div style="color:#888; font-size:13px; text-align:center; padding:20px 0;">
            Select display and type all 4 button labels to calculate...
          </div>
        `;
      }
      if (confirmBtn) confirmBtn.disabled = true;
      return;
    }

    // Solve for S
    const sol = solveMemoryStage(S, displayVal, buttonsVal);
    if (!sol) {
      if (resultPanel) {
        resultPanel.innerHTML = `
          <div class="memory-solution-box" style="border-color:#ff3b30;">
            <div class="memory-solution-title" style="color:#ff3b30;">Solve Error</div>
            <div class="memory-solution-press" style="font-size:20px; color:#ff3b30;">Rule Unavailable</div>
            <div class="memory-solution-label">Verify rules for Stage ${S} with Display ${displayVal} exist.</div>
          </div>
        `;
      }
      if (confirmBtn) confirmBtn.disabled = true;
      return;
    }

    // Solution found!
    if (resultPanel) {
      resultPanel.innerHTML = `
        <div class="memory-solution-box">
          <div class="memory-solution-title">Press Button At</div>
          <div class="memory-solution-press">Position ${sol.position}</div>
          <div class="memory-solution-label">which is labeled <strong>${sol.label}</strong></div>
        </div>
      `;
    }

    // Highlight target button in preview
    if (preview && sol.position >= 1 && sol.position <= 4) {
      preview.children[sol.position - 1].classList.add('pressed');
    }

    if (confirmBtn) confirmBtn.disabled = false;
  }

  function solveMemoryStage(S, displayVal, buttons) {
    const stageRules = memoryState.rules[S];
    if (!stageRules) return null;
    const rule = stageRules[displayVal];
    if (!rule) return null;

    let targetPos = null;
    let targetLabel = null;

    switch (rule.type) {
      case 'LABEL':
        targetLabel = rule.label;
        targetPos = buttons.indexOf(targetLabel) + 1;
        break;
      case 'POSITION':
        targetPos = rule.position;
        targetLabel = buttons[targetPos - 1];
        break;
      case 'SAME_LABEL_STAGE': {
        const prev = memoryState.history[rule.stage];
        if (prev && prev.pressed) {
          targetLabel = prev.pressed.label;
          targetPos = buttons.indexOf(targetLabel) + 1;
        }
        break;
      }
      case 'SAME_POSITION_STAGE': {
        const prev = memoryState.history[rule.stage];
        if (prev && prev.pressed) {
          targetPos = prev.pressed.position;
          targetLabel = buttons[targetPos - 1];
        }
        break;
      }
    }

    if (targetPos >= 1 && targetPos <= 4 && targetLabel !== undefined) {
      return { position: targetPos, label: targetLabel };
    }
    return null;
  }

  function confirmMemoryStage() {
    const S = memoryState.currentStage;
    const displayVal = memoryState.activeDisplay;
    const buttonsInput = document.getElementById('memoryButtonsInput');
    const buttonsVal = buttonsInput ? buttonsInput.value.split('').map(Number) : [];

    if (!displayVal || buttonsVal.length < 4) return;

    const sol = solveMemoryStage(S, displayVal, buttonsVal);
    if (!sol) return;

    // Save history
    memoryState.history[S] = {
      display: displayVal,
      buttons: buttonsVal,
      pressed: sol
    };

    // Mark previous dot as completed
    const currentDot = document.getElementById(`memory-dot-${S}`);
    if (currentDot) {
      currentDot.classList.remove('active');
      currentDot.classList.add('completed');
    }

    // Advance Stage
    memoryState.currentStage++;
    const nextS = memoryState.currentStage;

    const nextDot = document.getElementById(`memory-dot-${nextS}`);
    if (nextDot) {
      nextDot.classList.add('active');
    }

    // Reset current active variables
    memoryState.activeDisplay = null;
    if (buttonsInput) buttonsInput.value = '';
    
    // Clear buttons preview
    const preview = document.getElementById('memoryButtonsPreview');
    if (preview) {
      Array.from(preview.children).forEach(box => {
        box.textContent = '-';
        box.style.opacity = '0.4';
        box.classList.remove('pressed');
      });
    }

    // De-select display buttons
    document.querySelectorAll('.memory-display-btn').forEach(btn => btn.classList.remove('active'));

    // Enable undo button
    const undoBtn = document.getElementById('memoryUndoBtn');
    if (undoBtn) undoBtn.disabled = false;

    // Focus input
    if (buttonsInput) buttonsInput.focus();

    updateHistoryList();
    solveMemory();
  }

  function undoMemoryStage() {
    if (memoryState.currentStage <= 1) return;

    // Remove active class from current dot
    const activeDot = document.getElementById(`memory-dot-${memoryState.currentStage}`);
    if (activeDot) activeDot.classList.remove('active');

    // Go back to previous stage
    memoryState.currentStage--;
    const S = memoryState.currentStage;

    // Remove completed status and add active status
    const prevDot = document.getElementById(`memory-dot-${S}`);
    if (prevDot) {
      prevDot.classList.remove('completed');
      prevDot.classList.add('active');
    }

    // Restore input values from history
    const prevData = memoryState.history[S];
    if (prevData) {
      memoryState.activeDisplay = prevData.display;
      
      // Highlight selector button
      document.querySelectorAll('.memory-display-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.val) === prevData.display);
      });

      const buttonsInput = document.getElementById('memoryButtonsInput');
      if (buttonsInput) {
        buttonsInput.value = prevData.buttons.join('');
        handleMemoryButtonsInput(buttonsInput); // Trigger preview updates
      }

      // Delete from history
      delete memoryState.history[S];
    }

    // Disable undo button if we are back at stage 1
    const undoBtn = document.getElementById('memoryUndoBtn');
    if (undoBtn && memoryState.currentStage === 1) {
      undoBtn.disabled = true;
    }

    updateHistoryList();
    solveMemory();
  }

  function updateHistoryList() {
    const list = document.getElementById('memoryHistoryList');
    if (!list) return;

    const stages = Object.keys(memoryState.history).sort((a,b) => a - b);
    if (stages.length === 0) {
      list.innerHTML = `<div style="color:#666; font-size:12px; text-align:center; padding:15px 0;">No stages solved yet.</div>`;
      return;
    }

    let html = '';
    for (const s of stages) {
      const data = memoryState.history[s];
      html += `
        <div class="memory-history-item">
          <div>
            <strong>Stage ${s}:</strong> Disp <span class="lbl">${data.display}</span> | Buttons: <span class="lbl">${data.buttons.join('')}</span>
          </div>
          <div>
            Pressed Pos <strong>${data.pressed.position}</strong> (labeled <span class="lbl">${data.pressed.label}</span>)
          </div>
        </div>
      `;
    }
    list.innerHTML = html;
  }

  function resetMemorySolver() {
    memoryState.currentStage = 1;
    memoryState.history = {};
    memoryState.activeDisplay = null;

    // Reset indicator dots
    for (let s = 1; s <= 5; s++) {
      const dot = document.getElementById(`memory-dot-${s}`);
      if (dot) {
        dot.className = 'memory-stage-dot';
        if (s === 1) dot.classList.add('active');
      }
    }

    // De-select display buttons
    document.querySelectorAll('.memory-display-btn').forEach(btn => btn.classList.remove('active'));

    const buttonsInput = document.getElementById('memoryButtonsInput');
    if (buttonsInput) buttonsInput.value = '';

    // Clear preview
    const preview = document.getElementById('memoryButtonsPreview');
    if (preview) {
      Array.from(preview.children).forEach(box => {
        box.textContent = '-';
        box.style.opacity = '0.4';
        box.classList.remove('pressed');
      });
    }

    // Disable undo button
    const undoBtn = document.getElementById('memoryUndoBtn');
    if (undoBtn) undoBtn.disabled = true;

    updateHistoryList();
    solveMemory();
  }

  // ── PUBLIC EXPORTS ─────────────────────────────────────────
  window.initMemoryModule = initMemoryModule;
  window.selectMemoryDisplay = selectMemoryDisplay;
  window.handleMemoryButtonsInput = handleMemoryButtonsInput;
  window.handleMemoryRulesInput = handleMemoryRulesInput;
  window.confirmMemoryStage = confirmMemoryStage;
  window.undoMemoryStage = undoMemoryStage;
  window.resetMemorySolver = resetMemorySolver;
})();
