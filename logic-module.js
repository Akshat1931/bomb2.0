/**
 * Logic Module UI Binder
 * Connects the logic-solver.js engine to the solver.html UI container.
 */

(function() {
const logicState = {
  initialized: false,
  variables: {},
  expressions: ['', '', '', '', ''],
  stageResults: [null, null, null, null, null]
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
        // Evaluate using shunting yard and postfix resolver from logic-solver.js
        const postfix = shuntingYard(expression);
        const res = evaluatePostfix(postfix, stageEnv);
        
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

const _LT = {"(": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAD+ElEQVRYCX3Bf2iUdRzA8ffn9kvvvN2gZe7UNuHZdqU3bxzNzPkjIxSF2VjhH7GUUBDC8FZJKi2IJMO/LBWssMKMoC6n0mNlqEuztSl6PUUXQugIKs+pDDJ4prdg9zz75/t9vq+XYNZSUbOm6tkI8MHlfwfyKASTylBzbWTtjEVVwBnnysk8CsGksZp1tLcy4Y/PP8qjEIKFq+rqw13tsWom9PX9lEchBJs9veKJ6Q0deF56/94dFEKQcE31rKaWp++jpODu2ouGEKS2/n5r/sPzI5R8f/zcABpCkNo5S5rmL6CkMHpqUxEdIUi6zeqeOo2SoQt/7SyiI+iF5yxuj3bg++oz94siOoKWRJofezWOZ/yXM/t+R0/QKUuVx7s6oniuH/764gh6gk6oNb5qTR2+4f0HbhNA0ClLpbqX4rt18pPjBBE0asrrV3a14hnLHR48TxBBIxl+6I3Z+Ea/3fw3gQSNZCT1+gw89y4e+vQmgQSN5NxlG0N4bm05XBwnkKCxLDV3A567l7aewUDQeGbFg0/iGevfPoSBoGiIJnvS+Mb6dwxiICisWCKTxnfn7GtDGAgKK5bIpPENXDp4AQNBYcUSmTQ+u9dxMRAUViyRSeOzex0XA0FhxRKZNJ4Re4/jYiAorKbuJXE8OTvruBgICmthxoriydlZx8VAUCTXv1CFL2dnHRcDQdHe08mknJ11XAwERXtPJ5NydtZxMRAU7T2dTMrZWcfFQFC093QyKWdnHRcDQfHIpufK8eXsrONiICistdsi+HJ21nExEBTW2m0RfDk767gYCAprYcaK4snZWcfFQFBYTd1L4nhydtZxMRAUViyRSeMZsfc4LgaCwoolMml8dq/jYiAorFgik8bnvHLaxUBQWLFEJo3vn81HXQwEhRVLZNL4br394XUMBEVDtHHLYnxj/TsGMRA0kstXP4lnrH/7EAaCRjL5+AY8d/O7vvyPYIJGcu6yjSF87+wsjBNI0EhWhve04vv54KGbBBI0kpWhvW34Rk9vuUogQaOmvH5lVyuesdET750liKBTlkp1L2XSud3HCCLohFrjq9bU4Rvef+A2AQSdslR5vKsjiuf60JG+EfQELYk0t21twDM+fmHn+RtoCXqRRG1ycQe+a8M/7CiiI+hFElNr5m14YBol12789nKhiIagN2VmZTj66FMLKCmMXum9PIaGEKS2fsrMRc9PwzP4zYkf0RCChGuqI21vxsooKbi73y2iEoLNnj6lkc4OPB/v+/UOCiFYuKpuKuuXz6pmwndHTuVRCCaN1cyrWdfKhL6jA3kUgkllqLm8YnXLiiooHPvz6kAehWDWUsG85hcjMPxW0R3Io/gfKIUmUHCG0GEAAAAASUVORK5CYII=", ")": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAADuUlEQVRYCYXBf0zUZRzA8fdHAvOcAd6GJ82zGDNoyUwHOlrgnDXJmjb1dNScq2/lzsoKm9Z0hk3XrIAc55prp3+4aSttLqakk6KSWO6uIbHxoyG6MEIyEVM4J0TyfeiP7/M8vl6CV8682X4HKs42dnFXgsfE+fPypy+E4611rRdvcReCR2BF3uIsRg3Fzr53lbsQPCateTfTx6jhgY6Ddc3YCV6hfVMmcEdPx9fVN7ESvJa8Mzsd5eim89gIXlklawtQfjtyuOUWZoLOx2/xv/I9VzATdHJzq2ag1MejLSOYCFpJJx7z4erp2358EBNBS54sfGUayodfxRIYCHqB4PoV9+FqPln1OwaCgb90SyZK2wsNGAgGEx6uLkb5+2BVJ3qCiX/7qgCuG7U7zo2gJRjlhMpRbn8WaUZLMEp/an8ySsOhyAg6gtmM+gdRuk68OoyOYBbYOz8TV9eZzX8MoyGYZewqzsbV277j5340BLOpLy+fj9JT/m0bGoJZyiPrNkzANVjz+ZdoCDbPHEgXXPFoBA3BpmBnoQ9XPBpBQ7Ap2Fnow3Xh0w/QEGwKdhb6UCrK0BBsst8sTUOpKENDsAmGHT9KRRkagk0w7PhR9r9xDS/BJhh2/Cg/bGscwkOwCYYdP0qssqYfD8EmGHb8KLHKmn48BJtg2PGjxCpr+vEQbIJhx49S90l9Px6CTTDs+FH27rg6hIdgEww7fpSKMjQEm3nvF01GqShDQ7DJ31XowzWwZysagkVy0bZ8H654NIKGYDH1pU1p9+CKRyNoCBZTX9/OuHg0goZglly82mFcPBpBQzBLXhhyULr3NR1DQzBLXrj6RZSLocudaAhmk9cvXoKrt2VLXycaglHS3N2zMnGdj+3+qxMNwSgnVM64+m9qr1xAQzBasGYjyvVIzY9oCSYpy1etRLm29Wg3WoJB6uOluXNw3WipPt2NlmCQUbJy1ixcrY3HG7rREgweentp2r24Dn9ETzdagl5u8XP5Exlz6Wh7Az3daAlaKU8sWjET13mn//LA4E20BJ2soudTgjMZ01R7LHGhDwPBKynw6Jy1Uyal8p/hq6fqTl+/dhMDwSv16WVZ9wcYc6PhUFP7AEaCR3p+KC8jLZU7en46GfuzdxAjwSNQsiErnTHDLTVHmhNYCB6Bla9Nn8Idv37R8E+iOYGF4JG6buM0HzDS29b5fWuC5gQWgteC0LIs4PZ3m4Eh2m5hIXjlZS9d9MDAuTMdvwAx7ASvnMklz87tO3XoEqNi2P0LqkkaUHmufQoAAAAASUVORK5CYII=", "->": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAABtklEQVRYCaXBv0vUcRzH8edrauiHoF1RYVy1FeQQfMeGhIOWc3FKkAqPcrEC3U4adErHNm3yHyhM6AIDW/KrB8ZxFEhIt4hQw01FRNjx4cMH7m75fHg/HsJIGAkjYSSMhJEwEkbCSBgJI2EkjESky2X48oE+IlKpBqsV+ogoFx9euw/1N5826SGiZDnO8hw9RJQsx9nderdJFxEly/HmF+kiohTGrj/DqX+GV9sEIlKpRjC5RiAinb8No49wdlov6ngiwdQKXnkdTyS4dGO8grP3A6YP6BBJZpcIRhp0iCQXhh8/wGv+GjsCkWihSlBsgTi9S4qzQwQHf0EMtLHQkc5hoWNsdIyNfusEFmKgjYU4s0+KUycJfv4DkWihSlBsgUgyWHgyjff9z51DEElmlwhGGnSIBIUrEzM4+22Y+EaHSDC1gldexxORhm7B3ac4zcPn23giUqlGMLlGIKIMjt6s4jS/wsuPBCJKluPNL9JFRMlynMbO6w26iChZjrM8Rw8RZXimOA6N91tv6SEilWqwWqGPiHT1Huxt0EcYCSNhJIyEkTASRsJIGAkjYSSMhJEwEkb/Ae8fW/sk/PjAAAAAAElFTkSuQmCC", "AND": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAEg0lEQVRYCaXBT2hTdwDA8e9PO/8061tFXJQZVILd1pQ39bCR3uYIAfWwR33gWA6jD+HtIvjMwUFLGRvsUhLw0qBLxmwO23LIpYxFhrDDFC/rHH0RlUxHO20UmWaJ+Kedez/Tkj++VyL9fASrJFglgaeNa3ju2UNWIPBk+nduw1E98RfeBJ5MfzSMo3q4gDeBJ9MfDeN4+Glh4R5eBJ5MfzSMdLFQTuFF4Mn0R8NIjx+XJ85UcSdwt62bg5uiYermU8kK7gTuYkEgGqauPJGs4E7gLvZWH7zTR115IlnBncBdbK9Fw4Pzib9v4ErgLrbXolliOosrgbvYXotmieksrgQudm9h3y6LZrevZm+cx4XAhaaCYtGiNFnM4ULgQlNBsWhRmizmcCFwoamgWHB/6gkR6OkF7hftUzO8SOBCU0GxoDBUYwzCUSR7NM+LBC40FRQLCkM1xiAcRbJH87xI0G5gN4FNoFhQGKqhsv6LKJJ9epbrM7QRtDsygvT0Osx/VgN8X22Fg908mIMvv6ONoN1wGqmSAMZrgC8OWAqSkaGNoEX/PvacQKokpu5zcxFYu5PeQ5aCZGRoI2gxGCFgID1Ipsos85tHe+jqhmPfslijmaDFYISAgVRJpMos85tASIcL55hL00zQYjBCwMAxZSfvLbDMbwIhHWpVfjhGM0GLwQgBA8fkdJIGvwmEdKSMQTNBi+M6PQNweX7yym80+E0gpCNlDJoJGvoPYAaRcna2RJM1G9l5OKQjZQyaCRpUDSOAlLOzJVoFYyEdKWPQTNCgahgBpJydLdEqGAvpSBmDZoIGVcMI4MiPFGkXjOEwAjjyI0WWCRpUDSOAIz9SpF0whsMI4MiPFFkmWLJ2A/0HMAI48iNF2u3Q6VqPEcDx4+f2o0XqBEuCsc198F4v/86QP1vGhaphBJBydrZEnWBJMBbSkWbT5P/AjaphBJBydrZEnUDq2sz2QyEd6copzl/DTd9+jr2NlLMn/6ROIPlNIKQjZQy8pYeRcna2RJ1A8ptASEfKGHhLDyM9XJj8/WueE0h+EwjpSBkDb+lh6n6+mpx9gkMg+U0gpCNlDLylh1lSSaTKOASS3+x7he1hpIyBt5EjdO9CqiRSZRwCuvp5bb+lIN29xU8n8bZ7gHdPIlUSqTIOAb44YClIF84xl2ZFw2mkSiJVxiHAFwcsBenCOebSrGg4jVRJpMo4BPjigKVw4/vr3LzGkzus6NCHsH8Xi7cuVi998xQBvjhgKdijeToQGQQ9hFQYqiHAFwcsBXs0Twcig6CHkApDNUSEde/3whEf9mieDux4g4GPd9G1DS59UkWMQTiKZI/m6YymgmIB41XEGISjSPZons5oKigWMF5FjEE4Ctz51T49S2c0FRQLsBcQM7B5K0zNTFbm6JCmgmLB5WsgnvFcYjpLxzQVFAsKF0GcZYPOP1PJ+dt07PUePnjTgsKJR4jjvBqnPHGmykuJ7TkKv3xUQ4AvTjnFS4oFcYzXELBmCwv3eEmb1uG4+x+CVRKskmCVBKskWKX/AaKRYYa3o3RgAAAAAElFTkSuQmCC", "NOT": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAABS0lEQVRYCaXBsU4UYBCF0e9qyAYWNmOc1bCB0pIOO6O1Hb7AhILWRBtj89e8ka2FpQ2NjVJDQYwRRV0LNJPsC+zMOaJJNIkm0SSaRJNoEk2iSTSJJtEkmkSTaBJNgsWjQyq+Xl38AMHiyTEV51/OLkHvmNzbo+Lm1/Xy02/9o+PDT31jukHZ8lafWUxp0BkPNlnbnRkrerWxx/osWBG7b1mfBSti9pz1TZ9xNCOJEh+EkUSJD8JIosQHYSRR4oMwkijxQRhJlPggjCRKfBBGEiU+CCOJEh+EkUSJD8JIosQHYSRR4oMwkijxQRhJlPggjCRKfBBGEiU+CCOJEh+EkUTJ/Td3X+xsb/79jijZevrw9dbcbi4QJZOD/ZeTuf35uBRFByfMjdNLUbT7mLnx/lo0iSbRJJpEk2gSTaJJNIkm0SSaRJNoEk2i6T+09DhdcZHdHgAAAABJRU5ErkJggg==", "OR": "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", "P": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAADLElEQVRYCZXBsWpcRxSA4f8UCelilqgxAaXY45RunNknMGjU5AGGpDKk2u0CaWwwfoPdRhBXMdMljQpP4SKoHKMmjSC+g7EaNwqLQsAEDCFc7+qeuULsvf4+4cp84mfc5DCxg3BlPvEzbnKY2EH44PZT9j/Zu8VNTi+4cvqI64QPpg1jpEOuEz7Ye8h3txh0dgQcn1MRrjRTxjlMVIQrL7764hZjPDj5+4KOYJZzxlkt6AhmOWec1YKOYJZzxrn86819tgSznDNWUbYE88O3e/eonJ1fnLKx95Ce5g5bgvFOA5WUS2Rj2tBTlC3BeKeBSsolsrH/gv1PMW/uc/6elmC800Al5RLZmMxZTDDrJas1LcF4p4FKyiWyMZmzmGDWS1ZrWoLxTgOVlEuk00zp0UJLMN5poJJyiXSaKT1aaAnGOw1UUi6RziulRwstwXingUrKJdJppvRooSWYg5kGKimXSOeV0qOFlmC800Al5RLpNFN6tNASjHcaqKRcIp1mSo8WWoLxTgOVlEuk00zp0UJLMN5poJJyiXSaKT1aaAnGOw1UUi6Rjc+/5+EePVpoCcY7DVRSLpGNyZzFhB4ttARzMNNAJeUS2fjyV+5+hrl4wrNLWoLxTgOVlEtkY9rQU5QtwXingcrpn29/Z+P2U3qaO2wJxjsNjFOULcF4p4FxirIlGO80MMZqQUcw3mlgjNWCjmC808CwR6fnZ3QE450Ghh0mKoI5mGlgp/Nj4OiMimC808BO6ZDrBOOdBnre/8OayskDrhOMdxroaSKP2U0w3mmgp4k8ZjfBeKeByskfJbJmN8F4p4FKyiUyRDAHMw1UUi6RIYLxTgOVlEtkiGC800Al5RIZIhjvNFBJuUSGCMY7DVRSLpEhgvFOA5WUS2SIYLzTQCXlEhkiGO80UHnyy7u3DBGMdxqoLFYME8zBTAOVxYphgvFOA5XFimGC8U4Dncv/fvqZYYLxTgOd5Tq9ZJhgvNNAZ7lOLxkmGO800Pnm9bt/GSYY7zTQ0cIYgjmYaaB18hvw7JIxBOOdBlqrBaMJ5t7Xd38kAcdHjCbU/HOEjyPU/HOEj/M/rewDUE5MIj0AAAAASUVORK5CYII=", "Q": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAEZUlEQVRYCY3BXYgVdRjA4d9b6fpRu6uUC2L2uQqWK6IDZiOZY3UxW6ZFwZaEBMGZqLQvR5QskuZ4EdbNDgWmYg5BZl04XYhCqawXnrLaCJvFQjN1s8ij5MdqWjIz553/7rrr8wj9KrVjKi+jf0IvUn/NDbBwFab21XD8DH0JvdT5TSX61xrTl2AaN9wfNZ/+vb7n6PnDFzEJJr/B58rC7vI5TEJR8zD/+ke4su3V8umfMAhFpTH+MAZUrpYxCGrS6NKY2dehfji595xdZ1HwVfVRDIJqay41UfTRofeqKxuWUFRtxCCoNffeNQK1bu/+Uz/0TB86ZdTMsVPJ9aw9sooCQW11KXoqIjV+0eTHUJ0tFAg5q/nVqaj1m/cdITV83MPvon7zf/+aGiHnTm+bgFpWRrVtQnWHXRE1Qm71M4115H7c9cU2lLVo6gxyF/7a/jQ1Qq69hNob79iNmrzAnouKW6kRUjNmz5uB+vDFC/+irhny2tuo/Ru+3UZGSNmOa6FCD5MfoJKoEpMRUrbjWqjQw+QHqCSqxGSE1IOPzrqb3LkTG5ZiemH5DSPIHfxy5ydkhJQfoJKoEmOyHddChR4ZIeUHqCSqxJhsx7VQoUdGSPkBKokqMSbbcS1U6JERUn6ASqJKjMl2XAsVemSElB+gkqgSY7Id10KFHhkh5QeojqVHD2Aad+vL81GhR0ZI+QEqbqWv9hIq9MgIKT9AffPOL99hmnjXcw+hQo+MkPIDVBJVYky241qo0CMjpPwAlUSVGJPtuBYq9MgIKT9AJVElxmQ7roUKPTJCyg9QSVSJMdmOa6FCj4yQ8gNUElViTLbjWqjQIyOkbMe1yCVRJcZkO66FCj0yQsp2XIvcr190bMbkuHOmkDt/eu0rZISU7bgWKvQw+QEqiSoxGSHVMm3h/aiNK06cpMgPUN+/v38PGSHXXkLtjXfspsgPUHErNUJu+ZO31JP7Zd+mz1GNNz/7EipupUbIudPbJqCWlVGTF9hzUXErNUJu4rhVM1AffPzzcXJzlt16J7l/9nUspUZQW13U9t1bOsm1bUJ1h10RNYJaac2qJ3f46JbOjr+57I5XmueSO7+tO6x2USOotuZSE+qzznWHuMzehTpb/iOkQFBjR5aaHh9K7uipw2e4bPQ9qFPTeg5SIBSVxvjDGFi1EYNQNPo6v/5ZBjKz+hMGweQ3+AyksYpJMNVJ3aQO+vfpgbXHT17CJPQxqQOGDqev9T+vPU5vQr9K7fTVGtOX0K8nVvC/UUNuvBb1/K6us/QmDGDR+CUNFLV00pswgAduWtwwgYLW5MBFTMKAFje8SUHYXT6HSRjQnOFbKdh56onTmIRBXMLQWMUkDMJvXErBmupbGITBjD9IUbURgzCYkfMmvoHq2VzdfqyDGmFw9i6KusOuiBphcPUtt9/XMp1cz7Ek2r+HjHA1Ji+w56KSqBKTEa7GkBF1w2DebQtvBP7c2BX1nCEjXL225lIT0B12RdT8B/CzW1CMHqvQAAAAAElFTkSuQmCC", "R": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAADKUlEQVRYCY3BsYtdRRTA4d+REFIYIYRwbbWwELxbWKVL8878A6bM+A9YehsDitYXq2DSmilMYRmUmRXBQixki7uKRYpYCOaGkEIT1CLwfMs7bziZt7D3+wS6mWVSZJ9AN7NMiuwTuPIL5y6zwNcf8M8zGsKJfmKZcaAhnOgnlhkHGsKJfmKZLz/n0RM84UQ/sdgw4gkn+onFhhFPOPHmbS6/S+OnZ2wojWHEE4xmGgfHbKxpDCOeYDTTODhmY01jGPEEoxnvu0fc/IONu1y4jvfVt/z4kEowmvFCYaebacREJRjNeKGw0800YqISzKrg6SE7Fz/myvt4MVEJRjNeKDj9hBcTlWA044WC0094MVEJZlXw9BCnn/BiohKMZrxQcPoJLyYqwWjGCwWnn/BiohKMZrxQcPoJLyYqwWjGCwWnn/BiohKMZrxQcPoJLyYqwawKnh6yc+keF6/ixUQlGM14obDTzTRiohKMZrxQ2OlmGjFRCWZV8B4+5/oDvr8MnHubRkxUgtFM4+CYueM0MVEJRjONg2PmjtPERCUYzTSevuDKK+z59DZ//UclGM0sM4x4gtHMMsOIJxjNLDAONASjmQXGgYZgNHOWf//mi89oCEYzZ0mRfYLRzFlSZJ9gVoWz3L/Jk0c0BKOZBcaBhmA0s8A40BDMquAdPWXj2nleNg40BKMZLxQ25o6XjQMNwWjGC4WNueNl40BDMJrxQmHj1mvcwPvmHke/4QlGM14obK1pDCOeYDTjhcLWmsYw4glmVfD0kK01jWHEE4xmvFDYWtMYRjzBaMYLha01jWHEE8yq4OkhWx/y6id4P/zMvSMqwWjGC4WdbqYRE5VgNOOFwk4304iJSjCa8UJhp5tpxEQlGM14obDTzTRiohKMZrxQ2OlmGjFRCWZV8PSQnfPXeOMO3q9/8tERW4LRjBcKTj/RCIUtwWjGCwWnn2iEwpZgVoXq5n1+f4Zz4S2u3sF7+JzrD9gQjGaqmNijmcbBMRuC0UwVE3s00zg4ZkMwmqliYs/5S7x3C+/pC955gmA0U8XEaW7cpfH6YwSjmSomTnPjLo3XH/M/Cw34Qd4YWlgAAAAASUVORK5CYII=", "S": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAEUklEQVRYCYXBT2ibdRzA4c+3NpnunS6RLZmFsb0V7cRMxosMRHJpFXXaeAjCuslykB3Sy7tDeljuC0JyycEVnB46kFRBhBVEDy1oQA9qlTHEV7EZHsb6brpMfctMnPOlefO+v3f59zzCYIk8HYs2oJ8iPUPNouKgEAZL5OlYtAH9FOkZahYVB4XQa/8E2+JZOj6+BUwc48iz1CwqDgqh17kiA9UsKg4Kode5IgPVLCoOCkG18zSuV19koJpFxUEhqBKbjFCzqDgoBFVikxFqFhUHhRB4Wdv9PiPULCoOCiFgxrQFRqhZVBwUQsCMaQuMULOoOCiEwPcHxnbjS20BT7/Atsg8HX+3efImCiGwoaPY5QDGLNuiRXxJG4Xg2THOlYN03blLYgs4/BKuh8YiZ3jgQTqSNgrBk01hxulaalBq05VPAHqOjqSNQvBkU5hxupYalNp05ROAnqMjaaMQPNkUZpyutU1K7X+u0vHK7rEn0HN0JG0UgiebwoyjKLXsRboiRfQcHUkbheDJpjDjKEote5GuSBE9R0fSRiF4sinMOIpSa+s7rv3EtrHniR3mwONcvknVQSF4sinMOIpSC1hfQZGeZtkiTPBkU5hxFKUWsL6CIj3NskWY4Nm7iy/2o7h679Yl/rrJ17/QFYuzuUWYENjQCbHP41pZZxghsKETYp/HtbLOMEKgEN95BsW9Nq67/3HhRqvCAELAjGkL9HPebpcYQAicfERbIBqjx4e/t0u4HIcegkorMDVHH60SrvoaPQSVVmBqjj5aJVz1NXoIKq3AvqNM7ON+/36Kq77Gr7cJE1RaAddMmv7qqyxbhAkqrYBrJk1/9VWWLcIE1fgzuKbTPLeXPq5fo2bxeQuF0Gs6TU6nv5pFxUEh9JpOk9Ppr2ZRcVAIvTSNUzqnI/TRbFF2/vwAn9DXKZ1ilP7KTrOKT+jrxEHORoGxcXqUnWYVnzBIMQIYGXqUnWYVnzBIMQIYGXqUnWYVnzDIiXHAyLDnYcLKTrOKTxjKmCVjEFZ2mlV8wlDGLBmDsLLTrOIThpo4RMbA0FDUW9ffxCeMMmswnyCkMYlPGGXWYD5BSGMSnxB4N3nnE1yXf0SRjJFPjL+BojGJTwhs6E4Z11qdsHwiWkTRmMQnBDZ0p4xrrU5YPhEtomhM4hM8rx3i7KP3tnCt1vnoNxT5RLSI752tP97GJ3iyKcw421brXGygyCeiRXxlp1nFJ3iyKcw42776hosbdO3cwck9kXl8ZadZxSd4sinMOF1LDboyBmFlp1nFJ3iyKcw4XUsNujIGYWWnWcUneI7ux4yNP0XHlzfoMnTC3rrtfIZPCJgxbYHRkjYKIWDGtAVGS9oohMCRHdoCCYNh3rvChS0UgkorMDXHMK9fIkxQaQWm5hjm9UuECaqxx5iaw3VsgpD2Eq4fvuXnW4QJ95k6jiunE9Iq4aqv0UO4z9RxXDmdkFYJV32NHv8DQLtCUMPK3LcAAAAASUVORK5CYII=", "alpha": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAFaklEQVRYCaXBb2yU9QHA8e8PitAyOsq0zHZatkeEZD0n2bpg5GHuycKyNNuRxUR58UTBnEu7jEQaZVm3NVt4XlilL7rl2GxiO3khbg9LT0MynqlJYeyZSKSQn/vPzFXL9BHauTKucAfP+tzP5+5+9Dnf+PkIFmvZzd5GdOcOFgap0dOa3kREsFjLbvY2ojt3sDBIjZ7W9CYiAt3mlGEtXcutS9DNXywM8sJ/KVu6i57WliZ4fxyBbts9nfeTqPAkw7OUNfTT28qC6REEtR5bf9vaNQaJSqcZnj19ngXLj9PZyILpEQS1JrbyUYZnDksWNF5GmR5B8KEVG/nCku/fSdUbZ6DpAWr8/vLTf4CV65f/iciFt8+PIPhQaw/9y6j1QwfaptHsOAQdDy/rJ/L6kfMjCMpWNLf28GgDZdcu8n4IP3sGWl8Bbm8m9p3xy5fueKzhUSLHDgWHEZTdnW7tJTYzzGCBqvE0MVf63tYJlAO9gKDs7nRrL7GZYQYLVI2nibnS97ZOoBzoBQRlD42IBpQ3x2eGKVHjpqV7B1Bcef16R4bIS2dfewkQlO18lph0Z4e5Qf8+FFdCx04iudOnjgCCBZs3mrtQTr4pDxfPc4P+fSiu/PyXl3+ayOO/mZsBBAu6v7QpjXLUl4dZpH8fiivv+TrKrlEiAjY3d3fdcgfK8KEL/2CRHQ/d/EUif7946zoiJy4NeUQEZNq6u4j1DZHAtAwbTTbITRIRkGnr7kL51+WnniOBaRk2mj1Tp/JEBGTaurtQRvOeTwLTMmw0KYkiWsi033cXkdlwdOr4aRKYlmFTFc6y5S8oYoBMO4pTHMuTyLQMm6qiw4EARQyQaUdximN5EpmWYVNVdDgQoIgBMu0oTnF0ikSmZdhUFT7FfIgiBsi0ozjFsTyJTMuwqSo0USH+SfsKlM756XkSmZZhE3vPKz5ChQipaCpQh2kZNrH8aMmhQoQol07yjavUYVqGTezM966foEKEKEEWp0QdpmXYxI59hRoiRAmyOCXqMC3DRpkJTtnUECFKkMUpUYdpGTaKfzQ/Rg0RogRZnBJ1mJZho0y8+M6vqSFClCCLU6IO0zJslKE+NCJECbI4JeowLcNGGepDI0KUP29mjnpMy7CJHPnrsRfRiBBFpqjPtAybiCt9D40IUWSKerZ8xrRW3kbElb6HRoQoMkU9D27YaqG40vfQiBBFpqjnp/eu+xyKK30PjQhRZIp6xtPEXOl7aESIIlMk62j4xdeIudL30IgQRaZItmfVgxuJudL30IgQRaZI9oPmb68n5krfQyNCFJki2XQbVa70PTQiRJEpkk23UeVK30MjQhSZIsHKR/jJaqpc6XtoRIgiUyRYtYe+VVS50vfQiBBlag/j17jRLa+yYRlVrvQ9NCJECbI4JW7UNo3Glb6HRoQol07wravojPQnf4zm7L9/+wwaEVLRVECXHmeRoT40IqRiw5V3r1C17vYtDsoH/1mxFmXEmX+PGiKkwimO5ana10/s2KuGjeIfzY9RQ4RUPFl67u1iiUgDS5cM7EW5eu2Pxw0b5bWXpw4CpfBaSESEaPqGiDzRaBvEtudMy7DRZIPcJBERoukbIvJEo20Q254zLcNGkw1yk0REJ893UvXuBSI3L1l9E8qv/vfLs02fuO8FNNkgN0lEwMkuPsr+uUN/g21H0WSD3CQRAU+tv+uz1FHw2D/31gfQvq3p59TIBrlJIgIybd1d1DG3n6E5ytZcpEY2yE0SEXDv6s6OjV8lwVu/m3+Fl69Q1vQ0qeXGGpTv5s+8Q0RQtvNZEuS2o9ndcn8nSkqiCMq++SMSTDyO5oFmy0DZcQ5F8DEJPqb/AymZ5LRo6PVeAAAAAElFTkSuQmCC", "beta": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAADAklEQVRYCZXBIXcjNxSA0e+BJVnQEhOTkNHSkuAUSyCkpQ0K1fQXOCS/YDUkICilRQESKUlxcEBHJCRkSUtCFrjnHWdtSTP2Wd8rHGIjLaEmHGIjLaEm7HO3hMUZrcT1EwVhn7FjnksUhH3+MaiBrfOfUC5REPYZO5SwFTzKJQrCrA+n/HUKb68YtlaXJ0vAJQrCrG5EJUfFRsAlCsKsbkQlR8VGwCUKwqxuBG7u314prC5PloBLFIRZ3Qj0A5XgUS5REGac//rDJdAPVD73KJcoCDN8QPUDleBRLlEQZviA6gcqwaNcoiDM8AHVD1SCR7lEQZjhA6ofqASPcomCMMMHVD9QGDuUUBNm+IDqBwpjhxJqwgwfUP3AN8s7zj+ihJowwwdUP/BNN/JOqAkzfADu//vz79MLNhYr1MsDPTVhhg+AyWAjleRoCRPLk8sVYDLYyNbLV3i8oiVMRIsyGWxky2TmCBPRokwGG9kymTnCRLQok8FGtl6+wuMVLWEiWpTJYCOV5GgJE9GiTIbTCzYWK9TLAz01YSJalMnsdCPvhJowES3KZHaWd5x/RDmevlAQJqJFmUxl7NhwiYIwES3KZCpjx4ZLFISJaCEbpoJHuURBmIgWsmEqeJRLFIRG5GwB4yemgke5REForFHZMBU8yiUKQmONGj8x9bkHBm6fKQiNNSobpoIHhJrQWKOyoXX6YXUJCDWhsUZlQ2vsUEJNaKxR2dAaO5RQExprVDa0xg4l1ITGGpUNrbFDCTWhsUb9+wc3X9hZrPjtR3i+ZaAmNNa8M5mdbkQlR0soLc6IvLt6ZWd5Bzy/PF3TEko2ckA/MCWUbOSAfmBKKNnIXiYzRyjZyF4mM0co2Yh6uAXulmxcP6Ee35gjlGxEDT0wdmy4xAFCyUZU+B1YLdi4feYAoWQjauj5bkLJRuD17f6G7yaUbARc4ghCyUbAJY4glGwEXOIIQslGwCWOIOz88vPpBeASRxB2gke5xBGEneBRLnEEYSd4lEscQdgJHuUSR/gfPZfiQdGaN1MAAAAASUVORK5CYII=", "T": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAABm0lEQVRYCZXBwQnYBhBE0T9tGNKCVIRht6icU9QupAipBYPrsHQcMxe9J17HxXfnzUO8jovvzpuHeB0X3503D/E6Lr47bx7idVx8d948xOu4+O68eYjXcfHdefMQr+Piu/PmIV7HxXfnzUO8jovvzpuHeB0X3503D/H65z/+8vMH7vf//OXfXzxENoXbJhLZFG6bSGRTuG0ikU3htolENoXbJhLZFG6bSGRTuG0ikU3htolENoXbJhLZFG6bSGRTuG0ikU3htolENoXbJhLZFG6bSGRTuG0ikU3htolENoXbJhLZFG6bSGRTuG0ikU3htolENoXbJhLZFG6bSGRTuG0ikU3htolENoXbJhLZFG6bSGRTuG0ikU3htolENoXbJhLZFG6bSGRTuG0ikU3htolENoXbJhLZFG6bSGRTuG0ikU3htolENoXbJhLZFG6bSGRTuG0ikU3htolENoXbJhLZFG6bSGRTuG0ikU3htolENoXbJhLZFG6bSGRTuG0ikU3htolENoXbJhLZFG6bSGRTuG0ikU3hton+ALMMgkEjMHfgAAAAAElFTkSuQmCC"};



let _ltLoaded = null;
function _loadLT() {
  if (_ltLoaded) return _ltLoaded;
  const SZ = 64;
  _ltLoaded = Promise.all(Object.entries(_LT).map(([sym, b64]) => new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = SZ;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, SZ, SZ);
      const d = ctx.getImageData(0, 0, SZ, SZ).data;
      const g = new Float32Array(SZ * SZ);
      for (let i = 0; i < SZ * SZ; i++) g[i] = (d[i*4] + d[i*4+1] + d[i*4+2]) / 3;
      res([sym, g]);
    };
    img.src = 'data:image/png;base64,' + b64;
  }))).then(pairs => Object.fromEntries(pairs));
  return _ltLoaded;
}

function _ncc(a, b) {
  let ma = 0, mb = 0;
  for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; }
  ma /= a.length; mb /= b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] - ma, bi = b[i] - mb;
    num += ai * bi; da += ai * ai; db += bi * bi;
  }
  return (da === 0 || db === 0) ? 0 : num / Math.sqrt(da * db);
}

function _cellGray(pixels, W, cx, cy, cw, ch) {
  const SZ = 64;
  
  // Find maximum pixel value in this cell first
  let maxVal = 0;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = ((cy + y) * W + cx + x) * 4;
      const g = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
      if (g > maxVal) maxVal = g;
    }
  }
  
  // Calculate dynamic threshold
  const T = Math.max(100, Math.min(160, maxVal * 0.7));
  
  let x0 = cw, x1 = 0, y0 = ch, y1 = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = ((cy + y) * W + cx + x) * 4;
    const g = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
    if (g > T) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  if (x0 > x1) return null;
  const sw = x1 - x0 + 1, sh = y1 - y0 + 1, side = Math.max(sw, sh);
  const sq = new Float32Array(side * side);
  const px = Math.floor((side - sw) / 2), py = Math.floor((side - sh) / 2);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const i = ((cy + y0 + y) * W + cx + x0 + x) * 4;
    const g = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
    sq[(py + y) * side + (px + x)] = g > T ? 255 : 0;
  }
  const out = new Float32Array(SZ * SZ);
  for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) {
    out[y * SZ + x] = sq[Math.floor(y * side / SZ) * side + Math.floor(x * side / SZ)];
  }
  const wf = out.filter(v => v > 100).length / (SZ * SZ);
  return wf < 0.025 ? null : out;
}

async function _runLogicOCR(imageData) {
  const tmpl = await _loadLT();
  const { data, width: W, height: H } = imageData;
  
  // 1. Auto-detect crop level based on image width
  let x0_base, x1_base, y0_base, y1_base;
  if (W < 500) {
    x0_base = 0;
    x1_base = W;
    y0_base = H > 120 ? Math.floor(H * 0.12) : 0;
    y1_base = H > 120 ? Math.floor(H * 0.90) : H;
  } else {
    x0_base = Math.floor(W * 0.08);
    x1_base = Math.floor(W * 0.92);
    y0_base = Math.floor(H * 0.17);
    y1_base = Math.floor(H * 0.85);
  }
  
  // 2. Find bounding box of all white pixels inside base area
  let minX = W, maxX = 0;
  for (let y = y0_base; y < y1_base; y++) {
    for (let x = x0_base; x < x1_base; x++) {
      const i = (y * W + x) * 4;
      const g = (data[i] + data[i+1] + data[i+2]) / 3;
      if (g > 120) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  
  // Fallback if no white pixels found
  if (minX > maxX) {
    minX = x0_base;
    maxX = x1_base;
  }
  
  const x0 = minX;
  const x1 = maxX;
  const cw = x1 - x0 + 1;
  const cellW = cw / 5;
  const y0 = y0_base;
  const y1 = y1_base;
  
  // 3. Row detection using pixel density in the [x0, x1] horizontal span
  const rowD = [];
  for (let y = y0; y < y1; y++) {
    let n = 0;
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      if ((data[i]+data[i+1]+data[i+2])/3 > 120) n++;
    }
    rowD.push(n);
  }
  
  const segs = [];
  let inR = false, rs = 0;
  for (let i = 0; i < rowD.length; i++) {
    if (!inR && rowD[i] > 2) { inR = true; rs = i; }
    else if (inR && rowD[i] <= 2) {
      let gap = 0;
      for (let j = i; j < Math.min(i + 10, rowD.length); j++) if (rowD[j] <= 2) gap++;
      if (gap >= 10) { inR = false; segs.push([rs, i]); }
    }
  }
  if (inR) segs.push([rs, rowD.length]);
  if (!segs.length) return null;
  
  const symMap = {'NOT':'¬','AND':'∧','OR':'∨','->':'⇒','alpha':'α','beta':'β'};
  const tokens = [];
  
  for (const [rs2, re] of segs) {
    const pad = 4;
    const rowY = Math.max(0, y0 + rs2 - pad);
    const rowH = Math.min(H - rowY, re - rs2 + 2 * pad);
    for (let c = 0; c < 5; c++) {
      const cellX = Math.floor(x0 + c * cellW);
      const gray = _cellGray(data, W, cellX, rowY, Math.floor(cellW), rowH);
      if (!gray) continue;
      let best = null, bestS = 0.60;
      for (const [sym, tg] of Object.entries(tmpl)) {
        const s = _ncc(gray, tg);
        if (s > bestS) { bestS = s; best = sym; }
      }
      if (best) tokens.push(symMap[best] || best);
    }
  }
  return tokens.length ? tokens.join(' ') : null;
}

function handleLogicImagePaste(e, stageNum) {
  const processImg = (img) => {
    if (!img) return;
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    const id = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    _runLogicOCR(id).then(expr => {
      if (!expr) return;
      const inp = document.getElementById(`logicStageInput-${stageNum}`);
      if (!inp) return;
      inp.value = expr;
      handleLogicStageInput({ target: inp });
      const statusEl = document.getElementById(`logicOcrStatus-${stageNum}`);
      if (statusEl) { statusEl.textContent = 'Read: ' + expr; statusEl.style.color = '#3ddc84'; }
    });
  };

  if (window.BombDragDrop) {
    window.BombDragDrop.handleDataTransfer(e.clipboardData || e.dataTransfer, (file, img) => {
      if (img) processImg(img);
      else if (file) {
        const r = new FileReader();
        r.onload = ev => {
          const i = new Image();
          i.onload = () => processImg(i);
          i.src = ev.target.result;
        };
        r.readAsDataURL(file);
      }
    });
    return;
  }

  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (const item of items) {
    if (!item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => processImg(img);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.preventDefault();
    break;
  }
}

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
