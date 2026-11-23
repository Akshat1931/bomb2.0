/**
 * Logic Module UI Binder
 * Connects the logic-solver.js engine to the solver.html UI container.
 */

(function() {
const logicState = {
  initialized: false,
  variables: {},
  expressions: ['', '', '', '', ''],
  stageResults: [null, null, null, null, null],
  nextStage: 1,
  answer: ''
};

function injectStyles() {
  const css = `
  /* Logic Solver Styles */
  .logic-shell {
    max-width: 1100px;
    margin: auto;
    background: #12122a;
    padding: 24px;
    border-radius: 12px;
    border: 1px solid #222;
  }
  .logic-grid {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 20px;
  }
  @media (max-width: 820px) {
    .logic-grid {
      grid-template-columns: 1fr;
    }
  }
  .logic-card {
    background: #101025;
    border: 1px solid #2a2a4a;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
  }
  .logic-card-title {
    font-size: 14px;
    font-weight: bold;
    color: #f5c542;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
    border-bottom: 1px solid #25253f;
    padding-bottom: 6px;
  }
  .logic-var-textarea {
    width: 100%;
    background: #0a0a1a;
    border: 1px solid #333;
    color: #eee;
    padding: 10px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 13px;
    resize: none;
  }
  .logic-var-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  .logic-var-pill {
    padding: 4px 8px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
    border: 1px solid transparent;
  }
  .logic-var-pill.val-true {
    background: rgba(76, 175, 80, 0.1);
    color: #4caf50;
    border-color: rgba(76, 175, 80, 0.3);
  }
  .logic-var-pill.val-false {
    background: rgba(244, 67, 54, 0.1);
    color: #f44336;
    border-color: rgba(244, 67, 54, 0.3);
  }
  .logic-greek-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0a0a1a;
    padding: 8px 12px;
    border-radius: 8px;
    margin-bottom: 8px;
    font-size: 13px;
  }
  .logic-greek-badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
  }
  .logic-greek-badge.unset {
    background: #222;
    color: #888;
  }
  .logic-greek-badge.val-true {
    background: #4caf50;
    color: #fff;
  }
  .logic-greek-badge.val-false {
    background: #f44336;
    color: #fff;
  }
  .logic-notepad {
    width: 100%;
    height: 100px;
    background: #0a0a1a;
    border: 1px solid #333;
    color: #eee;
    padding: 8px;
    border-radius: 8px;
    font-family: sans-serif;
    font-size: 13px;
    resize: vertical;
  }
  .logic-notepad-btn {
    padding: 2px 6px;
    background: #1a1a2e;
    border: 1px solid #333;
    color: #ccc;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    font-family: monospace;
    margin-right: 4px;
    margin-top: 6px;
  }
  .logic-notepad-btn:hover {
    background: #2a2a4e;
    color: #fff;
  }
  .logic-stage-card {
    background: #101025;
    border: 1px solid #2a2a4a;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    display: grid;
    grid-template-columns: 1fr 140px;
    gap: 16px;
  }
  @media (max-width: 600px) {
    .logic-stage-card {
      grid-template-columns: 1fr;
    }
  }
  .logic-stage-card.true {
    border-left: 4px solid #4caf50;
  }
  .logic-stage-card.false {
    border-left: 4px solid #f44336;
  }
  .logic-stage-card.error {
    border-left: 4px solid #ff9800;
  }
  .logic-stage-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .logic-stage-title {
    font-size: 14px;
    font-weight: bold;
    color: #ccc;
    text-transform: uppercase;
  }
  .logic-stage-led {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #555;
  }
  .logic-stage-card.true .logic-stage-led {
    background: #4caf50;
    box-shadow: 0 0 8px #4caf50;
  }
  .logic-stage-card.false .logic-stage-led {
    background: #f44336;
    box-shadow: 0 0 8px #f44336;
  }
  .logic-stage-card.error .logic-stage-led {
    background: #ff9800;
    box-shadow: 0 0 8px #ff9800;
  }
  .logic-stage-vars-context {
    font-size: 11px;
    color: #888;
    font-family: monospace;
  }
  .logic-stage-input-row {
    position: relative;
    margin-bottom: 8px;
  }
  .logic-stage-input {
    width: 100%;
    background: #0a0a1a;
    border: 1px solid #333;
    color: #eee;
    padding: 10px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 14px;
  }
  .logic-stage-input:focus {
    outline: none;
    border-color: #4caf50;
  }
  .logic-live-preview {
    background: rgba(0,0,0,0.2);
    border: 1px dashed #222;
    padding: 6px 10px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 13px;
    min-height: 28px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
  }
  .logic-preview-label {
    font-size: 10px;
    color: #555;
    text-transform: uppercase;
    margin-right: 6px;
  }
  .logic-token {
    padding: 1px 4px;
    border-radius: 4px;
    font-weight: bold;
  }
  .logic-token.op { color: #00d2ff; }
  .logic-token.op-not { color: #a855f7; }
  .logic-token.paren { color: #666; }
  .logic-token.val-true { color: #4caf50; }
  .logic-token.val-false { color: #f44336; }
  .logic-token.val-undef { color: #ff9800; border: 1px dashed rgba(255,152,0,0.3); }

  .logic-stage-result-box {
    background: #0a0a1a;
    border: 1px solid #222;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px;
    text-align: center;
  }
  .logic-stage-result-title {
    font-size: 10px;
    text-transform: uppercase;
    color: #777;
    margin-bottom: 4px;
  }
  .logic-stage-result-val {
    font-size: 20px;
    font-weight: bold;
    color: #444;
  }
  .logic-stage-card.true .logic-stage-result-val { color: #4caf50; text-shadow: 0 0 10px rgba(76,175,80,0.3); }
  .logic-stage-card.false .logic-stage-result-val { color: #f44336; text-shadow: 0 0 10px rgba(244,67,54,0.3); }
  .logic-stage-card.error .logic-stage-result-val { color: #ff9800; font-size: 12px; }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

function initLogicModule() {
  if (logicState.initialized) return;
  logicState.initialized = true;

  // Inject Styles
  injectStyles();

  // Restore notepad notes
  const notepad = document.getElementById('logicNotepad');
  if (notepad) {
    const savedNotes = localStorage.getItem('logic_solver_notes');
    if (savedNotes !== null) notepad.value = savedNotes;
  }

  // Restore state
  const savedState = localStorage.getItem('logic_solver_state');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      if (parsed && typeof parsed === 'object') {
        logicState.variables = parsed.variables || {};
        logicState.expressions = parsed.expressions || ['', '', '', '', ''];
        
        // Populate inputs
        const textarea = document.getElementById('logicRawVarsInput');
        if (textarea) {
          let lines = [];
          for (let [k, v] of Object.entries(logicState.variables)) {
            lines.push(`${k} = ${v ? 'T' : 'F'}`);
          }
          textarea.value = lines.join(', ');
        }
        
        for (let i = 1; i <= 5; i++) {
          const input = document.getElementById(`logicStageInput-${i}`);
          if (input) input.value = logicState.expressions[i - 1] || '';
        }
      }
    } catch (e) {
      console.error("Failed to restore logic state", e);
    }
  }

  renderLogicVariables();
  generateLogicHelperButtons();
  evaluateAllLogicStages();
  if (window.BombDragDrop) {
    window.BombDragDrop.attachDropzone('logicDropzone', (file) => logicFileToImage(file, img => readLogicPicture(img, logicState.nextStage || 1)));
  }
}

function saveLogicState() {
  localStorage.setItem('logic_solver_state', JSON.stringify({
    variables: logicState.variables,
    expressions: logicState.expressions
  }));
}

// ── VARIABLES PARSING & UI ────────────────────────────────

function parseVariablesString(str) {
  const env = {};
  // Strip asterisks (e.g. from copy-pasting markdown formats like **P** = **T**)
  const cleanStr = str.replace(/\*/g, '');
  
  // Use regex to locate variable declarations (e.g., P = T or Q: False) and ignore trailing instructions
  const regex = /\b([A-Z])\s*[=:]\s*(T|F|TRUE|FALSE)\b/gi;
  let match;
  while ((match = regex.exec(cleanStr)) !== null) {
    const key = match[1].toUpperCase();
    const valStr = match[2].toUpperCase();
    if (!['TRUE', 'FALSE', 'AND', 'OR', 'NOT'].includes(key)) {
      env[key] = (valStr === 'T' || valStr === 'TRUE');
    }
  }
  
  // Fallback to split-based parsing if regex finds nothing
  if (Object.keys(env).length === 0 && cleanStr.trim().length > 0) {
    const parts = cleanStr.split(/[,;\n\r]+/);
    for (let part of parts) {
      const kv = part.split(/[=:]/);
      if (kv.length === 2) {
        const key = kv[0].trim().toUpperCase();
        const valStr = kv[1].trim().toUpperCase();
        if (key && !['TRUE', 'FALSE', 'AND', 'OR', 'NOT', 'IMPLIES'].includes(key)) {
          let val = null;
          if (valStr === 'T' || valStr === 'TRUE' || valStr === '1' || valStr === 'YES' || valStr === 'Y') {
            val = true;
          } else if (valStr === 'F' || valStr === 'FALSE' || valStr === '0' || valStr === 'NO' || valStr === 'N') {
            val = false;
          }
          if (val !== null) env[key] = val;
        }
      }
    }
  }
  return env;
}

function handleLogicVarsTextAreaChange() {
  const textarea = document.getElementById('logicRawVarsInput');
  if (!textarea) return;
  logicState.variables = parseVariablesString(textarea.value);
  renderLogicVariables();
  evaluateAllLogicStages();
  saveLogicState();
}

function toggleLogicVariable(varName) {
  if (logicState.variables.hasOwnProperty(varName)) {
    logicState.variables[varName] = !logicState.variables[varName];
    
    // Sync textarea
    const textarea = document.getElementById('logicRawVarsInput');
    if (textarea) {
      let list = [];
      for (let [k, v] of Object.entries(logicState.variables)) {
        list.push(`${k} = ${v ? 'T' : 'F'}`);
      }
      textarea.value = list.join(', ');
    }
    
    renderLogicVariables();
    evaluateAllLogicStages();
    saveLogicState();
  }
}

function renderLogicVariables() {
  const container = document.getElementById('logicVariablesPillContainer');
  if (!container) return;
  container.innerHTML = '';
  
  const keys = Object.keys(logicState.variables).sort();
  if (keys.length === 0) {
    container.innerHTML = '<div class="empty-placeholder" style="font-size:12px; color:#666;">No variables parsed yet.</div>';
    return;
  }
  
  keys.forEach(k => {
    const val = logicState.variables[k];
    const pill = document.createElement('span');
    pill.className = `logic-var-pill ${val ? 'val-true' : 'val-false'}`;
    pill.innerHTML = `${k} = ${val ? 'T' : 'F'}`;
    pill.title = `Click to toggle ${k}`;
    pill.onclick = () => toggleLogicVariable(k);
    container.appendChild(pill);
  });
}

function handleLogicCustomVarAdd(e) {
  e.preventDefault();
  const nameInput = document.getElementById('logicNewVarName');
  const valSelect = document.getElementById('logicNewVarVal');
  if (!nameInput || !valSelect) return;
  
  const name = nameInput.value.trim().toUpperCase();
  const val = valSelect.value === 'true';
  
  if (name && !['TRUE', 'FALSE', 'AND', 'OR', 'NOT', 'IMPLIES'].includes(name)) {
    logicState.variables[name] = val;
    
    // Sync textarea
    const textarea = document.getElementById('logicRawVarsInput');
    if (textarea) {
      let list = [];
      for (let [k, v] of Object.entries(logicState.variables)) {
        list.push(`${k} = ${v ? 'T' : 'F'}`);
      }
      textarea.value = list.join(', ');
    }
    
    nameInput.value = '';
    nameInput.focus();
    
    renderLogicVariables();
    evaluateAllLogicStages();
    saveLogicState();
  }
}

// ── HELPERS & INPUTS ──────────────────────────────────────

function generateLogicHelperButtons() {
  const ops = ['¬', '∧', '∨', '⇒', '(', ')'];
  
  for (let s = 1; s <= 5; s++) {
    const row = document.getElementById(`logicHelpers-${s}`);
    if (!row) continue;
    row.innerHTML = '';
    
    // Standard Operators
    ops.forEach(op => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'logic-notepad-btn';
      btn.textContent = op;
      btn.style.margin = '2px';
      btn.onclick = () => insertAtLogicStageInput(s, op);
      row.appendChild(btn);
    });
    
    // Greek variables
    const greekLetters = [
      { symbol: 'α', label: 'α', minStage: 2 },
      { symbol: 'β', label: 'β', minStage: 3 },
      { symbol: 'γ', label: 'γ', minStage: 4 },
      { symbol: 'δ', label: 'δ', minStage: 5 }
    ];
    
    greekLetters.forEach(gl => {
      if (s >= gl.minStage) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'logic-notepad-btn';
        btn.textContent = gl.symbol;
        btn.style.color = '#a855f7';
        btn.style.borderColor = 'rgba(168,85,247,0.3)';
        btn.onclick = () => insertAtLogicStageInput(s, gl.symbol);
        row.appendChild(btn);
      }
    });
  }
}

function insertAtLogicStageInput(stageNum, text) {
  const input = document.getElementById(`logicStageInput-${stageNum}`);
  if (!input) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const val = input.value;
  input.value = val.substring(0, start) + text + val.substring(end);
  input.selectionStart = input.selectionEnd = start + text.length;
  input.focus();
  
  // Trigger input change handler
  handleLogicStageInput({ target: input });
}

function handleLogicStageInput(e) {
  const input = e.target;
  const stageNum = Number(input.dataset.stage);
  let val = input.value;
  
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const lenBefore = val.length;
  
  // Replacements
  val = val.replace(/!|~/g, '¬');
  val = val.replace(/&|&&|\*/g, '∧');
  val = val.replace(/\||\|\||\+|\bV\b/gi, '∨');
  val = val.replace(/->|=>/g, '⇒');
  val = val.replace(/\\a|alpha/gi, 'α');
  val = val.replace(/\\b|beta/gi, 'β');
  val = val.replace(/\\g|gamma/gi, 'γ');
  val = val.replace(/\\d|delta/gi, 'δ');
  
  if (input.value !== val) {
    input.value = val;
    const diff = val.length - lenBefore;
    input.setSelectionRange(start + diff, end + diff);
  }
  
  logicState.expressions[stageNum - 1] = val;
  evaluateAllLogicStages();
  saveLogicState();
}

// ── EVALUATION & RENDER ───────────────────────────────────

function evaluateAllLogicStages() {
  const greekEnv = {};
  
  for (let s = 1; s <= 5; s++) {
    const card = document.getElementById(`logicStageCard-${s}`);
    const resultVal = document.getElementById(`logicResultVal-${s}`);
    const varsContextEl = document.getElementById(`logicStageVars-${s}`);
    const previewEl = document.getElementById(`logicPreviewContent-${s}`);
    
    if (!card || !resultVal || !varsContextEl || !previewEl) continue;
    
    const expression = logicState.expressions[s - 1] || '';
    const stageEnv = Object.assign({}, logicState.variables, greekEnv);
    
    // 1. Build contextual vars text
    let contextParts = [];
    for (let [k, v] of Object.entries(logicState.variables)) {
      contextParts.push(`<span style="color:${v ? '#4caf50':'#f44336'}">${k}:${v ? 'T':'F'}</span>`);
    }
    for (let [k, v] of Object.entries(greekEnv)) {
      if (v !== null && v !== undefined) {
        contextParts.push(`<span style="color:${v ? '#4caf50':'#f44336'}">${k}:${v ? 'T':'F'}</span>`);
      }
    }
    varsContextEl.innerHTML = contextParts.join(' &middot; ');
    
    // 2. Build live highlighted preview
    updateLiveHighlightPreview(previewEl, expression, stageEnv);
    
    // 3. Clear classes
    card.className = 'logic-stage-card';
    
    if (!expression.trim()) {
      resultVal.textContent = 'PENDING';
      logicState.stageResults[s - 1] = null;
    } else {
      try {
        // bomb_boomed's evaluator (¬ ^ V →, P–T, α–δ from earlier stages)
        let res;
        try {
          res = LG.evaluateExpression(expression.replace(/⇒/g, '→'), greekEnv, logicState.variables);
        } catch (err) {
          if (/not solved yet/.test(err.message)) res = null; // waits for an earlier stage
          else throw err;
        }
        
        if (res === null) {
          resultVal.textContent = 'PENDING';
          logicState.stageResults[s - 1] = null;
        } else {
          logicState.stageResults[s - 1] = res;
          resultVal.textContent = res ? 'TRUE' : 'FALSE';
          card.classList.add(res ? 'true' : 'false');
        }
      } catch (err) {
        resultVal.innerHTML = `<span style="font-size:12px;">ERROR</span><div style="font-size:9px; color:#aaa; font-weight:normal; margin-top:2px;">${err.message}</div>`;
        logicState.stageResults[s - 1] = undefined;
        card.classList.add('error');
      }
    }
    
    // Accumulate greek variables
    const currentRes = logicState.stageResults[s - 1];
    const isBool = (currentRes === true || currentRes === false);
    
    if (s === 1) greekEnv['α'] = isBool ? currentRes : undefined;
    else if (s === 2) greekEnv['β'] = isBool ? currentRes : undefined;
    else if (s === 3) greekEnv['γ'] = isBool ? currentRes : undefined;
    else if (s === 4) greekEnv['δ'] = isBool ? currentRes : undefined;
  }
  
  updateGreekSidebar(greekEnv);

  // copied as bomb_boomed copies it: "α=T β=F γ=T δ=F T" (stage 5 has no symbol)
  const sym = ['α', 'β', 'γ', 'δ', ''];
  logicState.answer = logicState.stageResults
    .map((r, i) => (r === true || r === false ? (sym[i] ? `${sym[i]}=${r ? 'T' : 'F'}` : (r ? 'T' : 'F')) : null))
    .filter(Boolean).join(' ');
  const line = document.getElementById('logicCopyLine');
  if (line) {
    line.style.display = logicState.answer ? 'block' : 'none';
    line.textContent = `📋 ${logicState.answer}`;
  }
}

function updateLiveHighlightPreview(container, str, env) {
  if (!str.trim()) {
    container.innerHTML = '<span style="color:#444; font-style:italic;">Waiting...</span>';
    return;
  }
  
  try {
    const rawTokens = tokenize(str);
    const htmlParts = [];
    
    for (let raw of rawTokens) {
      const norm = normalizeToken(raw);
      if (norm.type === 'OP_NOT' || norm.type === 'OP_AND' || norm.type === 'OP_OR' || norm.type === 'OP_IMPLIES') {
        const cls = norm.type === 'OP_NOT' ? 'op-not' : 'op';
        htmlParts.push(`<span class="logic-token ${cls}">${norm.val}</span>`);
      } else if (norm.type === 'LPAREN' || norm.type === 'RPAREN') {
        htmlParts.push(`<span class="logic-token paren">${norm.val}</span>`);
      } else if (norm.type === 'CONST') {
        const cls = norm.val ? 'val-true' : 'val-false';
        htmlParts.push(`<span class="logic-token ${cls}">${norm.val ? 'T' : 'F'}</span>`);
      } else if (norm.type === 'VAR') {
        const varName = norm.val;
        const upper = varName.toUpperCase();
        
        let exists = false;
        let val = undefined;
        
        if (env.hasOwnProperty(upper)) {
          exists = true; val = env[upper];
        } else if (varName === 'α' && env.hasOwnProperty('α')) {
          exists = true; val = env['α'];
        } else if (varName === 'β' && env.hasOwnProperty('β')) {
          exists = true; val = env['β'];
        } else if (varName === 'γ' && env.hasOwnProperty('γ')) {
          exists = true; val = env['γ'];
        } else if (varName === 'δ' && env.hasOwnProperty('δ')) {
          exists = true; val = env['δ'];
        } else if (upper === 'T') {
          exists = true; val = true;
        } else if (upper === 'F') {
          exists = true; val = false;
        }
        
        if (exists && val !== undefined) {
          const cls = val ? 'val-true' : 'val-false';
          htmlParts.push(`<span class="logic-token ${cls}" title="Defined variable">${varName}</span>`);
        } else {
          htmlParts.push(`<span class="logic-token val-undef" title="Undefined variable!">${varName}</span>`);
        }
      } else {
        htmlParts.push(`<span style="color:#888;">${raw}</span>`);
      }
    }
    container.innerHTML = htmlParts.join(' ');
  } catch (e) {
    container.innerHTML = `<span style="color:#ff9800; font-size:11px;">${e.message}</span>`;
  }
}

function updateGreekSidebar(greekEnv) {
  const letters = [
    { key: 'α', badgeId: 'logicGreekBadge-a', itemId: 'logicGreekItem-a' },
    { key: 'β', badgeId: 'logicGreekBadge-b', itemId: 'logicGreekItem-b' },
    { key: 'γ', badgeId: 'logicGreekBadge-g', itemId: 'logicGreekItem-g' },
    { key: 'δ', badgeId: 'logicGreekBadge-d', itemId: 'logicGreekItem-d' }
  ];
  
  letters.forEach(m => {
    const badge = document.getElementById(m.badgeId);
    const item = document.getElementById(m.itemId);
    if (!badge || !item) return;
    
    const val = greekEnv[m.key];
    item.style.opacity = (val !== undefined && val !== null) ? '1' : '0.4';
    badge.className = 'logic-greek-badge unset';
    badge.textContent = 'Unset';
    
    if (val !== undefined && val !== null) {
      badge.className = `logic-greek-badge val-${val ? 'true' : 'false'}`;
      badge.textContent = val ? 'True' : 'False';
    }
  });
}

// ── NOTEPAD ───────────────────────────────────────────────

function saveLogicNotes() {
  const notepad = document.getElementById('logicNotepad');
  if (notepad) localStorage.setItem('logic_solver_notes', notepad.value);
}

function insertInLogicNotepad(text) {
  const notepad = document.getElementById('logicNotepad');
  if (!notepad) return;
  const start = notepad.selectionStart;
  const end = notepad.selectionEnd;
  const val = notepad.value;
  notepad.value = val.substring(0, start) + text + val.substring(end);
  notepad.selectionStart = notepad.selectionEnd = start + text.length;
  notepad.focus();
  saveLogicNotes();
}

function clearLogicNotepad() {
  const notepad = document.getElementById('logicNotepad');
  if (notepad && confirm("Clear notes?")) {
    notepad.value = '';
    saveLogicNotes();
  }
}

// ── GLOBAL ACTIONS ────────────────────────────────────────

function resetLogicSolver() {
  if (confirm("Reset logic expressions and variables?")) {
    logicState.variables = {};
    logicState.expressions = ['', '', '', '', ''];
    logicState.stageResults = [null, null, null, null, null];
    
    const textarea = document.getElementById('logicRawVarsInput');
    if (textarea) textarea.value = '';
    
    for (let i = 1; i <= 5; i++) {
      const input = document.getElementById(`logicStageInput-${i}`);
      if (input) input.value = '';
    }
    
    renderLogicVariables();
    evaluateAllLogicStages();
    saveLogicState();
  }
}

function loadLogicDemoScenario() {
  logicState.variables = {
    P: true,
    Q: true,
    R: false,
    S: false,
    T: false
  };
  
  logicState.expressions = [
    '( P ∧ ¬ S ∨ ¬ T )',
    '( Q ∧ α ∨ R )',
    'β ⇒ S',
    '¬ γ ∧ P',
    'δ ∧ (α ∨ β)'
  ];
  
  const textarea = document.getElementById('logicRawVarsInput');
  if (textarea) {
    let lines = [];
    for (let [k, v] of Object.entries(logicState.variables)) {
      lines.push(`${k} = ${v ? 'T' : 'F'}`);
    }
    textarea.value = lines.join(', ');
  }
  
  for (let i = 1; i <= 5; i++) {
    const input = document.getElementById(`logicStageInput-${i}`);
    if (input) input.value = logicState.expressions[i - 1];
  }
  
  renderLogicVariables();
  evaluateAllLogicStages();
  saveLogicState();
}

// ── LOGIC OCR ──────────────────────────────────────────────

// ── SCREENSHOT: bomb_boomed's reader (window.BombLogic.logic, bomb-logic.js) ──
// The symbol tiles are read by shape; the stage comes from the pager dots under the grid when they
// can be read, otherwise the stage field the picture was pasted into (or the next one to fill).
const LG = window.BombLogic.logic;

function readLogicPicture(img, fallbackStage) {
  let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const MAXDIM = 1200;
  if (w > MAXDIM || h > MAXDIM) {
    const scale = MAXDIM / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const { text } = LG.readLogicGrid(data, w, h);
  const { idx, count } = LG.detectStage(data, w, h);
  const say = (n, msg, color) => {
    const st = document.getElementById(`logicOcrStatus-${n}`);
    if (st) { st.textContent = msg; st.style.color = color; }
  };
  if (!text) { say(fallbackStage, 'Could not read the grid — type it', '#ff9800'); return; }
  const stage = count > 0 ? Math.min(idx, 4) + 1 : fallbackStage;
  const inp = document.getElementById(`logicStageInput-${stage}`);
  if (!inp) return;
  inp.value = text;
  handleLogicStageInput({ target: inp });
  logicState.nextStage = Math.min(5, stage + 1); // the next picture fills the next stage
  const unsure = text.includes('?');
  say(stage, `Read${count > 0 ? ` (stage ${stage} of ${count}, from the dots)` : ''}: ${text}${unsure ? ' — ⚠ fix the ?' : ''}`, unsure ? '#ff9800' : '#3ddc84');
}

function logicFileToImage(file, cb) {
  const i = new Image();
  i.onload = () => { cb(i); URL.revokeObjectURL(i.src); };
  i.src = URL.createObjectURL(file);
}

function handleLogicImagePaste(e, stageNum) {
  const items = [...((e.clipboardData || e.dataTransfer || {}).items || [])];
  const it = items.find(x => x.type && x.type.startsWith('image/'));
  if (it) {
    e.preventDefault();
    const f = it.getAsFile();
    if (f) logicFileToImage(f, img => readLogicPicture(img, stageNum));
    return;
  }
  // a pasted Discord link: the helper fetches it and hands back the picture
  if (window.BombDragDrop) {
    window.BombDragDrop.handleDataTransfer(e.clipboardData || e.dataTransfer, (file, img) => {
      if (img) readLogicPicture(img, stageNum);
      else if (file) logicFileToImage(file, im => readLogicPicture(im, stageNum));
    });
  }
}

window.handleLogicFile = function (input) {
  const f = input.files && input.files[0];
  if (f) logicFileToImage(f, img => readLogicPicture(img, logicState.nextStage || 1));
  input.value = '';
};

// A picture pasted anywhere on the Logic page (not into a field)
document.addEventListener('paste', (e) => {
  if (!document.getElementById('logicSection')?.classList.contains('active')) return;
  const el = document.activeElement;
  if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) return;
  handleLogicImagePaste(e, logicState.nextStage || 1);
});

window.copyLogicAnswer = function (el) {
  const t = logicState.answer;
  if (!t) return;
  try {
    navigator.clipboard.writeText(t).then(() => {
      el.textContent = '✓ Copied';
      setTimeout(() => { el.textContent = `📋 ${logicState.answer}`; }, 1200);
    }).catch(() => {});
  } catch (e) {}
};

// Attach to window
window.initLogicModule = initLogicModule;
window.handleLogicVarsTextAreaChange = handleLogicVarsTextAreaChange;
window.handleLogicCustomVarAdd = handleLogicCustomVarAdd;
window.handleLogicStageInput = handleLogicStageInput;
window.saveLogicNotes = saveLogicNotes;
window.insertInLogicNotepad = insertInLogicNotepad;
window.clearLogicNotepad = clearLogicNotepad;
window.resetLogicSolver = resetLogicSolver;
window.loadLogicDemoScenario = loadLogicDemoScenario;
window.handleLogicImagePaste = handleLogicImagePaste;
})();
