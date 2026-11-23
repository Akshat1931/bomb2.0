/**
 * Switches Solver Module for Keep Talking and Nobody Explains
 * Computes shortest path from current switch positions to target green lights
 * while avoiding forbidden states managed dynamically by the user.
 * A screenshot is read with bomb_boomed's reader (window.BombLogic.switches, bomb-logic.js); the
 * answer is copied as bomb_boomed copies it: "SW1 → SW3 → SW2".
 */

(function() {
const switchesState = {
  initialized: false,
  // Current state of the 5 switches: 'U' (Up) or 'D' (Down)
  current: ['D', 'U', 'D', 'U', 'D'],
  // Target state (green lights): 'U' (above) or 'D' (below)
  target: ['D', 'U', 'U', 'U', 'D'],
  // Parsed forbidden states (Set of strings)
  forbidden: new Set(),
  // Current step in the solution playback
  solutionPath: [],
  currentStepIndex: 0
};

// No built-in forbidden states (as in bomb_boomed): the list changes between games — the old
// built-in one forbade DUDDU, the target of a real 22 Nov board. Add this game's states above.
const DEFAULT_FORBIDDEN_TEXT = ``;

// ── DYNAMIC STYLE INJECTION ───────────────────────────────

function injectSwitchesStyles() {
  const css = `
  .switches-shell {
    max-width: 900px;
    margin: auto;
    background: #12122a;
    padding: 24px;
    border-radius: 12px;
    border: 1px solid #222;
  }
  .switches-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: start;
  }
  @media (max-width: 820px) {
    .switches-grid {
      grid-template-columns: 1fr;
    }
  }
  .switches-panel-card {
    background: #0f0f1c;
    border: 2px solid #25253f;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  }
  .switches-panel-title {
    font-family: 'Outfit', 'Arial Black', sans-serif;
    font-size: 24px;
    font-weight: 900;
    color: #ffd875;
    letter-spacing: 2px;
    margin-bottom: 20px;
    text-transform: uppercase;
  }
  .switches-row {
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: #181826;
    border: 2px solid #2c2c44;
    border-radius: 10px;
    padding: 20px 10px;
    margin-bottom: 15px;
  }
  .switches-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 60px;
  }
  .switches-light {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #22252b;
    border: 1px solid #111;
    cursor: pointer;
    transition: all 0.2s;
  }
  .switches-light.active {
    background: #00ff66;
    box-shadow: 0 0 12px #00ff66, inset 0 0 4px #ffffff;
  }
  .switches-slider-container {
    position: relative;
    width: 20px;
    height: 120px;
    background: #0d0d15;
    border-radius: 10px;
    margin: 10px 0;
    border: 1px solid #333;
    cursor: pointer;
  }
  .switches-track {
    position: absolute;
    left: 8px;
    top: 10px;
    width: 4px;
    height: 100px;
    background: #050508;
    border-radius: 2px;
  }
  .switches-handle {
    position: absolute;
    left: -6px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
    border: 2px solid #475569;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: top 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .switches-handle::after {
    content: '';
    width: 16px;
    height: 2px;
    background: #475569;
    border-radius: 1px;
  }
  .switches-handle.up {
    top: 4px;
  }
  .switches-handle.down {
    top: 84px;
  }
  .switches-num {
    font-family: monospace;
    font-size: 14px;
    color: #888;
    margin-top: 4px;
    font-weight: bold;
  }
  .forbidden-chips-container {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
    min-height: 32px;
  }
  .forbidden-chip {
    font-family: monospace;
    font-size: 12px;
    background: rgba(244, 67, 54, 0.15);
    border: 1px solid rgba(244, 67, 54, 0.3);
    color: #ef4444;
    padding: 4px 10px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .forbidden-chip.current-match {
    background: #ef4444;
    color: #fff;
    font-weight: bold;
    animation: blinker-warn 1s linear infinite;
  }
  @keyframes blinker-warn {
    50% { opacity: 0.5; }
  }
  .switches-instructions {
    background: #0f0f1c;
    border: 2px solid #25253f;
    border-radius: 12px;
    padding: 20px;
    min-height: 380px;
    display: flex;
    flex-direction: column;
  }
  .switches-step-item {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    border: 1px solid #25253f;
    background: #0a0a15;
    border-radius: 8px;
    margin-bottom: 8px;
    font-size: 14px;
    transition: all 0.2s;
  }
  .switches-step-item.active {
    border-color: #ffd875;
    background: rgba(255, 216, 117, 0.08);
  }
  .switches-step-item.active .step-num {
    background: #ffd875;
    color: #000;
  }
  .switches-step-item .step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #25253f;
    color: #ccc;
    font-weight: bold;
    font-family: monospace;
    margin-right: 12px;
  }
  .switches-step-item .step-desc {
    flex: 1;
  }
  .switches-step-item .step-state {
    font-family: monospace;
    color: #00d2ff;
    font-weight: bold;
  }
  .switches-highlight-btn {
    border-color: #ffd875 !important;
    color: #ffd875 !important;
    animation: pulse-border 1.5s infinite;
  }
  @keyframes pulse-border {
    0% { box-shadow: 0 0 0 0 rgba(255, 216, 117, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(255, 216, 117, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 216, 117, 0); }
  }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

// ── INITIALIZATION ─────────────────────────────────────────

function initSwitchesModule() {
  if (switchesState.initialized) return;
  switchesState.initialized = true;

  injectSwitchesStyles();

  // Load default forbidden states
  const parsedDefaults = parseForbiddenStates(DEFAULT_FORBIDDEN_TEXT);
  parsedDefaults.forEach(state => {
    switchesState.forbidden.add(state);
  });

  // Bind Form Submit
  const addForm = document.getElementById('switchesAddForm');
  if (addForm) {
    addForm.addEventListener('submit', handleSwitchesAddState);
  }

  // Bind Switch interaction
  const sliderContainers = document.querySelectorAll('.switches-slider-container');
  sliderContainers.forEach(container => {
    container.addEventListener('click', (e) => {
      const idx = parseInt(container.dataset.switch) - 1;
      // Toggle current switch state
      switchesState.current[idx] = switchesState.current[idx] === 'U' ? 'D' : 'U';
      updateSwitchesUI();
      solveSwitches();
    });
  });

  // Bind Target lights click interaction
  const lights = document.querySelectorAll('.switches-light[data-switch]');
  lights.forEach(light => {
    light.addEventListener('click', () => {
      const idx = parseInt(light.dataset.switch) - 1;
      const position = light.dataset.pos; // 'top' or 'bottom'
      switchesState.target[idx] = position === 'top' ? 'U' : 'D';
      updateSwitchesUI();
      solveSwitches();
    });
  });

  if (window.BombDragDrop) window.BombDragDrop.attachDropzone('switchesDropzone', (file) => readSwitchesPicture(file));

  // Load defaults
  updateSwitchesUI();
  solveSwitches();
}

// ── UI UPDATE ──────────────────────────────────────────────

function updateSwitchesUI() {
  // Update handle UI positions
  for (let i = 0; i < 5; i++) {
    const handle = document.getElementById(`switchHandle-${i + 1}`);
    if (handle) {
      if (switchesState.current[i] === 'U') {
        handle.className = 'switches-handle up';
      } else {
        handle.className = 'switches-handle down';
      }
    }

    // Update target lights green configurations
    const topLight = document.getElementById(`targetLightTop-${i + 1}`);
    const bottomLight = document.getElementById(`targetLightBottom-${i + 1}`);
    if (topLight && bottomLight) {
      const isTopActive = switchesState.target[i] === 'U';
      topLight.classList.toggle('active', isTopActive);
      bottomLight.classList.toggle('active', !isTopActive);
    }
  }

  // Update current state string displays
  const curStateStr = switchesState.current.join('');
  const targetStateStr = switchesState.target.join('');
  const curStateEl = document.getElementById('switchesCurrentStateStr');
  const targetStateEl = document.getElementById('switchesTargetStateStr');
  if (curStateEl) curStateEl.textContent = curStateStr;
  if (targetStateEl) targetStateEl.textContent = targetStateStr;
}

// ── REGEX PARSING FORBIDDEN STATES ────────────────────────

function parseForbiddenStates(text) {
  const matches = text.toUpperCase().match(/\b[UD]{5}\b/g) || [];
  const unique = new Set(matches);
  return unique;
}

function handleSwitchesAddState(e) {
  e.preventDefault();
  const input = document.getElementById('switchesForbiddenInput');
  if (!input) return;

  const text = input.value;
  const parsed = parseForbiddenStates(text);

  parsed.forEach(state => {
    switchesState.forbidden.add(state);
  });

  input.value = ''; // Clear input field
  solveSwitches();
}

function renderForbiddenChips(forbiddenSet) {
  const container = document.getElementById('switchesForbiddenChips');
  if (!container) return;

  container.innerHTML = '';
  const currentStr = switchesState.current.join('');

  if (forbiddenSet.size === 0) {
    container.innerHTML = '<span style="font-size:12px; color:#666; font-style:italic;">No forbidden states. All configurations are safe!</span>';
    return;
  }

  forbiddenSet.forEach(state => {
    const chip = document.createElement('span');
    chip.className = 'forbidden-chip';
    chip.textContent = state;

    const deleteBtn = document.createElement('span');
    deleteBtn.innerHTML = '&times;';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.fontWeight = 'bold';
    deleteBtn.style.color = '#ef4444';
    deleteBtn.style.marginLeft = '4px';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchesState.forbidden.delete(state);
      solveSwitches();
    });

    chip.appendChild(deleteBtn);

    if (state === currentStr) {
      chip.classList.add('current-match');
    }
    container.appendChild(chip);
  });
}

function clearAllForbiddenStates() {
  switchesState.forbidden.clear();
  solveSwitches();
}

// ── PATHFINDING BFS ALGORITHM ─────────────────────────────

function findSwitchesPath(start, target, forbiddenSet) {
  if (forbiddenSet.has(start) || forbiddenSet.has(target)) {
    return null; // Start or target itself is forbidden
  }

  const queue = [[start, []]]; // [currentState, pathOfFlips]
  const visited = new Set([start]);

  while (queue.length > 0) {
    const [curr, path] = queue.shift();
    if (curr === target) {
      return path;
    }

    for (let i = 0; i < 5; i++) {
      // Flip the i-th switch
      const nextArr = curr.split('');
      nextArr[i] = nextArr[i] === 'U' ? 'D' : 'U';
      const nextState = nextArr.join('');

      if (!forbiddenSet.has(nextState) && !visited.has(nextState)) {
        visited.add(nextState);
        queue.push([nextState, path.concat(i)]); // store index 0-4
      }
    }
  }

  return null; // No path found
}

// ── SOLUTION RENDERING ────────────────────────────────────

function solveSwitches() {
  const start = switchesState.current.join('');
  const target = switchesState.target.join('');
  
  // Compute path (bomb_boomed's BFS: the states from start to target), as switch flips
  const SW = window.BombLogic.switches;
  const states = switchesState.forbidden.has(target) ? null : SW.swBFS(start, target, [...switchesState.forbidden]);
  const path = states ? states.slice(1).map((st, i) => st.split('').findIndex((c, j) => c !== states[i][j])) : null;
  const line = document.getElementById('switchesCopyLine');
  switchesState.moves = path && path.length ? path.map(i => `SW${i + 1}`).join(' → ') : '';
  if (line) {
    line.style.display = switchesState.moves ? 'block' : 'none';
    line.textContent = switchesState.moves ? `📋 ${switchesState.moves}` : '';
  }
  switchesState.solutionPath = path;
  switchesState.currentStepIndex = 0;

  // Render chips
  renderForbiddenChips(switchesState.forbidden);

  renderSolutionUI(path, start);
}

function renderSolutionUI(path, start) {
  const container = document.getElementById('switchesSolutionContainer');
  const playerControls = document.getElementById('switchesPlayerControls');
  if (!container) return;

  // Clear highlights from switches
  for (let i = 1; i <= 5; i++) {
    const slider = document.getElementById(`switchSlider-${i}`);
    if (slider) slider.classList.remove('switches-highlight-btn');
  }

  if (switchesState.forbidden.has(start)) {
    container.innerHTML = `
      <div style="background:rgba(244,67,54,0.15); border:1px solid #ef4444; color:#ef4444; border-radius:8px; padding:12px; font-weight:bold; text-align:center;">
        ⚠️ CURRENT STATE (${start}) IS FORBIDDEN!<br>
        Please flip switches to a safe starting state.
      </div>
    `;
    if (playerControls) playerControls.style.display = 'none';
    return;
  }

  const target = switchesState.target.join('');
  if (switchesState.forbidden.has(target)) {
    container.innerHTML = `
      <div style="background:rgba(244,67,54,0.15); border:1px solid #ef4444; color:#ef4444; border-radius:8px; padding:12px; font-weight:bold; text-align:center;">
        ⚠️ TARGET STATE (${target}) IS FORBIDDEN!<br>
        Green lights configuration is invalid under these rules.
      </div>
    `;
    if (playerControls) playerControls.style.display = 'none';
    return;
  }

  if (path === null) {
    container.innerHTML = `
      <div style="background:rgba(244,67,54,0.15); border:1px solid #ef4444; color:#ef4444; border-radius:8px; padding:12px; font-weight:bold; text-align:center;">
        ❌ NO SAFE PATH POSSIBLE!<br>
        All routes to the target configuration pass through forbidden states.
      </div>
    `;
    if (playerControls) playerControls.style.display = 'none';
    return;
  }

  if (path.length === 0) {
    container.innerHTML = `
      <div style="background:rgba(76,175,80,0.15); border:1px solid #4caf50; color:#4caf50; border-radius:8px; padding:12px; font-weight:bold; text-align:center;">
        ✅ TARGET STATE REACHED!<br>
        All switches match the target green lights.
      </div>
    `;
    if (playerControls) playerControls.style.display = 'none';
    return;
  }

  // Render steps list
  let html = '';
  let tempState = start.split('');

  path.forEach((switchIdx, stepNum) => {
    const fromVal = tempState[switchIdx];
    const toVal = fromVal === 'U' ? 'D' : 'U';
    tempState[switchIdx] = toVal;
    const nextStateStr = tempState.join('');

    html += `
      <div class="switches-step-item" id="switchesStepItem-${stepNum}">
        <span class="step-num">${stepNum + 1}</span>
        <span class="step-desc">Flip Switch <strong>${switchIdx + 1}</strong> (${fromVal} ➔ ${toVal})</span>
        <span class="step-state">${nextStateStr}</span>
      </div>
    `;
  });

  container.innerHTML = html;
  if (playerControls) playerControls.style.display = 'flex';

  // Highlight the first step
  highlightStep(0);
}

function highlightStep(index) {
  if (!switchesState.solutionPath || switchesState.solutionPath.length === 0) return;
  if (index < 0 || index >= switchesState.solutionPath.length) return;

  switchesState.currentStepIndex = index;

  // Clear previous active steps
  const steps = document.querySelectorAll('.switches-step-item');
  steps.forEach(step => step.classList.remove('active'));

  // Highlight step item in list
  const activeStep = document.getElementById(`switchesStepItem-${index}`);
  if (activeStep) {
    activeStep.classList.add('active');
    activeStep.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Highlight target slider on the panel
  for (let i = 1; i <= 5; i++) {
    const slider = document.getElementById(`switchSlider-${i}`);
    if (slider) slider.classList.remove('switches-highlight-btn');
  }

  const targetSwitchIdx = switchesState.solutionPath[index];
  const targetSlider = document.getElementById(`switchSlider-${targetSwitchIdx + 1}`);
  if (targetSlider) {
    targetSlider.classList.add('switches-highlight-btn');
  }

  // Update step status text
  const stepStatus = document.getElementById('switchesStepStatusText');
  if (stepStatus) {
    stepStatus.textContent = `Step ${index + 1} of ${switchesState.solutionPath.length}`;
  }
}

function switchesPrevStep() {
  if (switchesState.currentStepIndex > 0) {
    highlightStep(switchesState.currentStepIndex - 1);
  }
}

function switchesNextStep() {
  if (switchesState.currentStepIndex < switchesState.solutionPath.length - 1) {
    highlightStep(switchesState.currentStepIndex + 1);
  }
}

// ── RESET FUNCTIONS ───────────────────────────────────────

function resetSwitchesSolver() {
  switchesState.current = ['D', 'U', 'D', 'U', 'D'];
  switchesState.target = ['D', 'U', 'U', 'U', 'D'];
  
  // Reset set to defaults
  switchesState.forbidden.clear();
  const parsedDefaults = parseForbiddenStates(DEFAULT_FORBIDDEN_TEXT);
  parsedDefaults.forEach(state => {
    switchesState.forbidden.add(state);
  });

  updateSwitchesUI();
  solveSwitches();
}

// ── SCREENSHOT ────────────────────────────────────────────

function readSwitchesPicture(file) {
  const status = document.getElementById('switchesReadStatus');
  const say = (msg, color) => { if (status) { status.textContent = msg; status.style.color = color; } };
  const img = new Image();
  img.onload = () => {
    const d = window.BombLogic.switches.detectSwitchesAndGoals(img);
    URL.revokeObjectURL(img.src);
    if (!d) { say('⚠ Could not read the switches — set them by clicking.', '#ff9800'); return; }
    const init = window.BombLogic.switches.swNorm(d.detectedInit || 'UUUUU');
    const goal = window.BombLogic.switches.swNorm(d.detectedGoal || 'DDDDD');
    switchesState.current = init.split('');
    switchesState.target = goal.split('');
    updateSwitchesUI();
    solveSwitches();
    say(`✓ Read: switches ${init}, target lights ${goal} — check them against the picture.`, '#4caf50');
  };
  img.onerror = () => say('⚠ Could not open that file as an image.', '#ff5c5c');
  img.src = URL.createObjectURL(file);
}

window.handleSwitchesFile = function (input) {
  const f = input.files && input.files[0];
  if (f) readSwitchesPicture(f);
  input.value = '';
};

window.copySwitchesMoves = function (el) {
  const t = switchesState.moves;
  if (!t) return;
  try {
    navigator.clipboard.writeText(t).then(() => {
      el.textContent = '✓ Copied';
      setTimeout(() => { el.textContent = `📋 ${switchesState.moves}`; }, 1200);
    }).catch(() => {});
  } catch (e) {}
};

document.addEventListener('paste', (e) => {
  if (!document.getElementById('switchesSection')?.classList.contains('active')) return;
  const el = document.activeElement;
  if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text'))) return;
  for (const item of (e.clipboardData?.items || [])) {
    if (item.type && item.type.startsWith('image/')) {
      e.preventDefault();
      const f = item.getAsFile();
      if (f) readSwitchesPicture(f);
      return;
    }
  }
});

// Attach to window
window.initSwitchesModule = initSwitchesModule;
window.resetSwitchesSolver = resetSwitchesSolver;
window.switchesPrevStep = switchesPrevStep;
window.switchesNextStep = switchesNextStep;
window.clearAllForbiddenStates = clearAllForbiddenStates;
window.handleSwitchesAddState = handleSwitchesAddState;
window.parseForbiddenStates = parseForbiddenStates;
window.findSwitchesPath = findSwitchesPath;
})();
