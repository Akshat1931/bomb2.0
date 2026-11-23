(function() {
  // Reading, row splitting, the password list and matching are bomb_boomed's (window.BombLogic.password,
  // bomb-logic.js). One screenshot of the dials = one row (the letter showing on each column).
  const PW = window.BombLogic.password;
  const DEFAULT_PASSWORDS_TEXT = PW.MASTER_PASSWORDS.join(' ');

  const passwordState = {
    initialized: false,
    cols: [new Set(), new Set(), new Set(), new Set(), new Set()],
    rows: [],
    words: [],
    busy: false
  };

  // ── DYNAMIC STYLE INJECTION ───────────────────────────────
  function injectPasswordStyles() {
    if (document.getElementById('passwordStyles')) return;
    const css = `
    .password-drop { border: 2px dashed #35355c; border-radius: 10px; padding: 12px; color: #aaa; font-size: 13px; cursor: pointer; text-align: center; margin-bottom: 6px; }
    .password-drop:hover, .password-drop.dragover { border-color: #ffd875; color: #ffd875; background: rgba(255,216,117,0.05); }
    .password-read-status { font-size: 12px; min-height: 16px; margin-bottom: 6px; text-align: left; }
    .password-copied { color: #00ff66; font-weight: 700; }
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
    if (window.BombDragDrop) window.BombDragDrop.attachDropzone('passwordDropzone', (file) => readPasswordPicture(file));
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
              <div class="password-card-title">1. Dial letters — one screenshot per row, or type them</div>
              <div id="passwordDropzone" class="password-drop" onclick="document.getElementById('passwordFileInput').click()">
                <input type="file" id="passwordFileInput" accept="image/*" style="display:none;" onchange="window.handlePasswordFile(this)">
                🔑 <b>Paste</b> (Ctrl+V), drop or click: a screenshot of the dials adds one row
              </div>
              <div id="passwordReadStatus" class="password-read-status"></div>
              <div style="font-size:12px; color:#aaa; text-align:left; margin-bottom:8px;">
                Rows of 5 letters (every 5 letters is a row). Column 1 matches letter 1, etc.
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
    // every 5 letters is a row (spaces, new lines and other characters are ignored)
    passwordState.rows = PW.splitPasswordRows(textarea.value);
    passwordState.cols = [new Set(), new Set(), new Set(), new Set(), new Set()];
    passwordState.rows.forEach(row => { for (let i = 0; i < 5; i++) passwordState.cols[i].add(row[i]); });

    for (let i = 0; i < 5; i++) {
      const el = document.getElementById(`password-col-${i}`);
      if (el) {
        const sortedLetters = Array.from(passwordState.cols[i]).sort().join(' ');
        el.textContent = sortedLetters || '-';
      }
    }

    solvePassword();
  }

  // One screenshot = one row: the letter currently showing on each of the 5 columns
  async function readPasswordPicture(file) {
    const status = document.getElementById('passwordReadStatus');
    const say = (msg, color) => { if (status) { status.textContent = msg; status.style.color = color; } };
    if (passwordState.busy) { say('Still reading the last row — paste again in a moment.', '#ffd875'); return; }
    passwordState.busy = true;
    say('Reading letters…', '#aaa');
    try {
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error('could not open that file as an image'));
        im.src = URL.createObjectURL(file);
      });
      // letters each column can show according to the list — used to flag doubtful reads
      const allowed = Array.from({ length: 5 }, (_, i) => new Set(passwordState.words.map(w => w[i])));
      const r = await PW.readPasswordRow(img, allowed, t => say(t, '#aaa'));
      if (!r.ok) { say(r.reason, '#ff9800'); return; }
      const ta = document.getElementById('passwordDialsInput');
      if (passwordState.rows.includes(r.row)) { say(`Row ${r.row} is already in the list.`, '#00ff66'); return; }
      if (ta) {
        ta.value = ta.value.trim() ? `${ta.value.trim()}\n${r.row}` : r.row;
        handlePasswordDialsInput(ta);
      }
      const doubt = r.unsure.map((u, i) => (u ? i + 1 : 0)).filter(Boolean);
      say(doubt.length ? `⚠ Added row ${r.row} — check letter ${doubt.join(', ')} (edit the rows if it's wrong).` : `✓ Added row ${r.row}.`,
        doubt.length ? '#ff9800' : '#00ff66');
    } catch (e) {
      say(`⚠ ${e.message} — type the row instead.`, '#ff5c5c');
    } finally {
      passwordState.busy = false;
    }
  }

  window.handlePasswordFile = function (input) {
    const f = input.files && input.files[0];
    if (f) readPasswordPicture(f);
    input.value = '';
  };

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
    const hasDialsInput = passwordState.rows.length > 0;
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

    const { matches } = PW.filterPasswordCandidates(passwordState.rows, passwordState.words.join(' '));
    const uniqueMatches = Array.from(new Set(matches));
    // click to copy: the password, or every candidate (space-separated) when several are left
    const copyAttr = (t) => `onclick="window.copyPasswordText('${t}', this)" title="Click to copy" style="cursor:pointer;"`;

    if (uniqueMatches.length === 1) {
      resultPanel.innerHTML = `
        <div class="password-solution-box" style="border-color:#00ff66;">
          <div class="password-solution-title">Match Found!</div>
          <div class="password-solution-word" ${copyAttr(uniqueMatches[0])}>${uniqueMatches[0]}</div>
          <div class="password-solution-desc">Enter this password on the module dials. <span class="password-copied">(click it to copy)</span></div>
        </div>
      `;
    } else if (uniqueMatches.length > 1) {
      resultPanel.innerHTML = `
        <div class="password-solution-box" style="border-color:#ffd875;">
          <div class="password-solution-title" style="color:#ffd875;">Multiple Matches (${uniqueMatches.length})</div>
          <div class="password-solution-desc" style="margin-bottom:15px;">Narrow down by entering more dial letters. <a href="#" ${copyAttr(uniqueMatches.join(' '))}>Copy all</a> <span class="password-copied"></span></div>
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
    passwordState.rows = [];
    const st = document.getElementById('passwordReadStatus');
    if (st) st.textContent = '';
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
  window.copyPasswordText = function (text, el) {
    if (window.event) window.event.preventDefault();
    const tag = el && el.parentElement && el.parentElement.parentElement && el.parentElement.parentElement.querySelector('.password-copied');
    try {
      navigator.clipboard.writeText(text).then(() => {
        if (!tag) return;
        const was = tag.textContent;
        tag.textContent = '✓ Copied';
        setTimeout(() => { tag.textContent = was; }, 1200);
      }).catch(() => {});
    } catch (e) {}
  };

  // A pasted picture (Discord links are routed to the file input by dragdrop-helper.js)
  document.addEventListener('paste', (e) => {
    if (!document.getElementById('passwordSection')?.classList.contains('active')) return;
    const el = document.activeElement;
    if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text'))) return;
    for (const item of (e.clipboardData?.items || [])) {
      if (item.type && item.type.startsWith('image/')) {
        e.preventDefault();
        const f = item.getAsFile();
        if (f) readPasswordPicture(f);
        return;
      }
    }
  });
})();
