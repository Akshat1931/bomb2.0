(function() {
  const DEFAULT_PASSWORDS_TEXT = `ABOUT AFTER AGAIN BELOW COULD
EVERY FIRST FOUND HOUSE LARGE
LEARN NEVER OTHER PLACE PLANT
POINT RIGHT SMALL SOUND SPELL
STILL STUDY THEIR THERE THESE
THING THINK THREE WATER WHERE
WHICH WORLD WOULD WRITE YEARS`;

  const passwordState = {
    initialized: false,
    cols: [new Set(), new Set(), new Set(), new Set(), new Set()],
    words: []
  };

  // ── DYNAMIC STYLE INJECTION ───────────────────────────────
  function injectPasswordStyles() {
    if (document.getElementById('passwordStyles')) return;
    const css = `
    .password-shell {
      max-width: 950px;
      margin: auto;
      background: #12122a;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #222;
    }
    .password-layout {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 820px) {
      .password-layout {
        grid-template-columns: 1fr;
      }
    }
    .password-col-left {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .password-col-right {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .password-card {
      background: #0f0f1c;
      border: 2px solid #25253f;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .password-card-title {
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
    .password-textarea {
      width: 100%;
      background: #0a0a1a;
      border: 1px solid #333;
      color: #ffd875;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
      resize: vertical;
      margin-top: 10px;
      outline: none;
      line-height: 1.5;
    }
    .password-textarea:focus {
      border-color: #ffd875;
      box-shadow: 0 0 8px rgba(255, 216, 117, 0.3);
    }
    .password-action-btn {
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
    .password-action-btn:hover {
      background: rgba(244, 67, 54, 0.1);
    }
    .password-cols-display {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-top: 15px;
      background: #080814;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #1a1a33;
    }
    .password-col-box {
      background: #14142b;
      border: 1px solid #25253f;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
    }
    .password-col-title {
      font-size: 11px;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 6px;
      font-weight: bold;
    }
    .password-col-letters {
      font-family: monospace;
      font-size: 14px;
      color: #ffd875;
      font-weight: bold;
      word-break: break-all;
      letter-spacing: 1px;
    }
    .password-solution-box {
      background: #070712;
      border: 1px solid #222;
      border-radius: 10px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      width: 100%;
    }
    .password-solution-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 12px;
    }
    .password-solution-word {
      font-size: 38px;
      font-weight: 900;
      color: #00ff66;
      letter-spacing: 2px;
      text-shadow: 0 0 15px rgba(0, 255, 102, 0.4);
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .password-solution-desc {
      font-size: 13px;
      color: #aaa;
    }
    .password-candidate-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
      text-align: left;
    }
    .password-candidate-item {
      background: #14142b;
      border: 1px solid #25253f;
      border-radius: 6px;
      padding: 8px 12px;
      font-family: monospace;
      font-size: 15px;
      color: #00d2ff;
      font-weight: bold;
      letter-spacing: 2px;
      text-align: center;
    }
    .password-status-box {
      font-size: 13px;
      margin-top: 10px;
      text-align: left;
      line-height: 1.6;
      padding: 10px 14px;
      background: #070712;
      border-radius: 6px;
      border: 1px solid #25253f;
    }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'passwordStyles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  // ── INITIALIZATION ─────────────────────────────────────────
  function initPasswordModule() {
    if (passwordState.initialized) return;
    passwordState.initialized = true;

    injectPasswordStyles();
    renderPasswordUI();
    
    // Pre-populate passwords list
    const wordsInput = document.getElementById('passwordWordsInput');
    if (wordsInput) {
      wordsInput.value = DEFAULT_PASSWORDS_TEXT;
    }
    
    handlePasswordWordsInput(wordsInput);
    solvePassword();
  }

  function renderPasswordUI() {
    const container = document.getElementById('passwordSection');
    if (!container) return;

    container.innerHTML = `
      <div class="password-shell">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #25253f; padding-bottom:10px;">
          <h2 style="color:#f5c542; margin:0;">Password Solver</h2>
          <button id="passwordResetBtn" class="password-action-btn" type="button" style="margin-top:0;" onclick="window.resetPasswordSolver()">Reset Solver</button>
        </div>

        <div class="password-layout">
          <!-- Left Column -->
          <div class="password-col-left">
            <!-- Dials Entry Card -->
            <div class="password-card">
              <div class="password-card-title">1. Paste Dials letters (6 lines, 5 letters each)</div>
              <div style="font-size:12px; color:#aaa; text-align:left; margin-bottom:8px;">
                Paste the 6 scrolling rows of letters. Column 1 matches letter 1, etc.
              </div>
              <textarea id="passwordDialsInput" class="password-textarea" rows="6" placeholder="e.g.&#10;GPIIT&#10;WVUPC&#10;HURNC&#10;..." oninput="window.handlePasswordDialsInput(this)"></textarea>
              
              <!-- Parsed Columns Visualization -->
              <div class="password-cols-display" id="passwordColsDisplay">
                <div class="password-col-box">
                  <div class="password-col-title">Col 1</div>
                  <div class="password-col-letters" id="password-col-0">-</div>
                </div>
                <div class="password-col-box">
                  <div class="password-col-title">Col 2</div>
                  <div class="password-col-letters" id="password-col-1">-</div>
                </div>
                <div class="password-col-box">
                  <div class="password-col-title">Col 3</div>
                  <div class="password-col-letters" id="password-col-2">-</div>
                </div>
                <div class="password-col-box">
                  <div class="password-col-title">Col 4</div>
                  <div class="password-col-letters" id="password-col-3">-</div>
                </div>
                <div class="password-col-box">
                  <div class="password-col-title">Col 5</div>
                  <div class="password-col-letters" id="password-col-4">-</div>
                </div>
              </div>
            </div>

            <!-- Password Words Dictionary List Card -->
            <div class="password-card">
              <div class="password-card-title">2. Paste Password List (Guide/Manual)</div>
              <div style="font-size:12px; color:#aaa; text-align:left; margin-bottom:8px;">
                Paste the dictionary of possible passwords (separated by spaces or commas).
              </div>
              <textarea id="passwordWordsInput" class="password-textarea" rows="6" placeholder="e.g. BREAD THESE CHAIR..." oninput="window.handlePasswordWordsInput(this)"></textarea>
              
              <!-- Dictionary Parse Status -->
              <div id="passwordWordsParseStatus" class="password-status-box" style="display: none;"></div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="password-col-right">
            <!-- Computed Solutions Card -->
            <div class="password-card" style="min-height:380px; display:flex; flex-direction:column;">
              <div class="password-card-title">Computed Solution</div>
              <div id="passwordResultPanel" style="flex:1; display:flex; align-items:center; justify-content:center;">
                <!-- Result Box Renders Here -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function handlePasswordDialsInput(textarea) {
    const text = textarea.value;
    const lines = text.split('\n').map(line => line.trim().toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean);

    // Reset cols sets
    passwordState.cols = [new Set(), new Set(), new Set(), new Set(), new Set()];

    lines.forEach(line => {
      for (let i = 0; i < Math.min(5, line.length); i++) {
        passwordState.cols[i].add(line[i]);
      }
    });

    // Update UI visualization
    for (let i = 0; i < 5; i++) {
      const el = document.getElementById(`password-col-${i}`);
      if (el) {
        const sortedLetters = Array.from(passwordState.cols[i]).sort().join(' ');
        el.textContent = sortedLetters || '-';
      }
    }

    solvePassword();
  }

  function handlePasswordWordsInput(textarea) {
    const text = textarea.value;
    
    // Extract starting after Passwords header if found
    let targetText = text;
    const headerIndex = text.search(/Passwords/i);
    if (headerIndex !== -1) {
      targetText = text.substring(headerIndex + 9);
    }

    const rawTokens = targetText.split(/[^A-Za-z]/).filter(w => w.length === 5);
    const uppercaseTokens = rawTokens.filter(w => w === w.toUpperCase());
    
    const finalTokens = (uppercaseTokens.length > 0) ? uppercaseTokens : rawTokens;
    passwordState.words = finalTokens.map(w => w.toUpperCase());

    const statusBox = document.getElementById('passwordWordsParseStatus');
    if (statusBox) {
      if (text.trim() === '') {
        statusBox.style.display = 'none';
      } else {
        statusBox.style.display = 'block';
        statusBox.innerHTML = `
          <div class="password-status-item" style="color:#00d2ff;">
            <span>🔵</span>
            <span><strong>Dictionary Loaded:</strong> Parsed ${passwordState.words.length} valid 5-letter words.</span>
          </div>
        `;
      }
    }

    solvePassword();
  }

  function solvePassword() {
    const resultPanel = document.getElementById('passwordResultPanel');
    if (!resultPanel) return;

    // Check if dials input is empty
    const hasDialsInput = passwordState.cols.some(set => set.size > 0);
    if (!hasDialsInput) {
      resultPanel.innerHTML = `
        <div style="color:#888; font-size:13px; text-align:center; padding:20px 0;">
          Paste dial letters to calculate...
        </div>
      `;
      return;
    }

    if (passwordState.words.length === 0) {
      resultPanel.innerHTML = `
        <div class="password-solution-box" style="border-color:#ff3b30;">
          <div class="password-solution-title" style="color:#ff3b30;">Error</div>
          <div class="password-solution-word" style="font-size:24px; color:#ff3b30;">No Dictionary</div>
          <div class="password-solution-desc">Please enter possible passwords in Section 2.</div>
        </div>
      `;
      return;
    }

    // Filter matching words
    const matches = passwordState.words.filter(word => {
      for (let i = 0; i < 5; i++) {
        if (!passwordState.cols[i].has(word[i])) return false;
      }
      return true;
    });

    // Remove duplicates from matches
    const uniqueMatches = Array.from(new Set(matches));

    if (uniqueMatches.length === 1) {
      resultPanel.innerHTML = `
        <div class="password-solution-box" style="border-color:#00ff66;">
          <div class="password-solution-title">Match Found!</div>
          <div class="password-solution-word">${uniqueMatches[0]}</div>
          <div class="password-solution-desc">Enter this password on the module dials.</div>
        </div>
      `;
    } else if (uniqueMatches.length > 1) {
      resultPanel.innerHTML = `
        <div class="password-solution-box" style="border-color:#ffd875;">
          <div class="password-solution-title" style="color:#ffd875;">Multiple Matches (${uniqueMatches.length})</div>
          <div class="password-solution-desc" style="margin-bottom:15px;">Narrow down by entering more dial letters.</div>
          <div class="password-candidate-list">
            ${uniqueMatches.map(w => `<div class="password-candidate-item">${w}</div>`).join('')}
          </div>
        </div>
      `;
    } else {
      resultPanel.innerHTML = `
        <div class="password-solution-box" style="border-color:#ff3b30;">
          <div class="password-solution-title" style="color:#ff3b30;">No Match</div>
          <div class="password-solution-word" style="font-size:28px; color:#ff3b30;">No Words Match</div>
          <div class="password-solution-desc">Verify dial letters and word list dictionary.</div>
        </div>
      `;
    }
  }

  function resetPasswordSolver() {
    passwordState.cols = [new Set(), new Set(), new Set(), new Set(), new Set()];
    // Note: We keep the loaded words dictionary intact for easy reuse, but we clear the dials input

    const dialsInput = document.getElementById('passwordDialsInput');
    if (dialsInput) dialsInput.value = '';

    // Clear column labels
    for (let i = 0; i < 5; i++) {
      const el = document.getElementById(`password-col-${i}`);
      if (el) el.textContent = '-';
    }

    solvePassword();
  }

  // ── PUBLIC EXPORTS ─────────────────────────────────────────
  window.initPasswordModule = initPasswordModule;
  window.handlePasswordDialsInput = handlePasswordDialsInput;
  window.handlePasswordWordsInput = handlePasswordWordsInput;
  window.resetPasswordSolver = resetPasswordSolver;
})();
