/**
 * The Button Module Solver
 * The checklist parser, rule evaluation and screenshot reader are bomb_boomed's
 * (window.BombLogic.button, bomb-logic.js): the round's checklist is pasted as-is ("<conditions>: <N>s"
 * lines, "Serial: …" / module count lines), the first rule that matches gives the seconds. When a rule
 * above the match needs a fact that isn't entered yet, the answer waits and names the missing input.
 */

(function() {
const B = window.BombLogic.button;

const buttonState = {
  initialized: false,
  rulesText: '',
  color: '',
  label: '',
  serial: '',
  facts: { total: '', nonNeedy: '', needy: '', buttonMods: '' },
  stage: null,          // { current, total, done } — which button this is (dots under it, or typed)
  warn: { color: false, label: false },
  busy: false,
  answer: ''
};

const FACT_INPUTS = { total: 'buttonTotalInput', nonNeedy: 'buttonNonNeedyInput', needy: 'buttonNeedyInput', buttonMods: 'buttonModsInput' };
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function initButtonModule() {
  const colorSelect = $('buttonColorSelect');
  const labelInput = $('buttonLabelInput');
  const serialInput = $('buttonSerialInput');
  const rulesArea = $('buttonRulesInput');
  const fileInput = $('buttonFileInput');
  const dropzone = $('buttonDropzone');

  if (colorSelect) {
    if (!colorSelect.options.length) {
      colorSelect.innerHTML = `<option value="">-- colour --</option>` +
        B.BUTTON_COLORS.map(c => `<option value="${c}">${c[0].toUpperCase() + c.slice(1)}</option>`).join('');
    }
    colorSelect.value = buttonState.color;
    colorSelect.onchange = () => {
      buttonState.color = colorSelect.value;
      buttonState.warn.color = false;
      evaluateButton();
    };
  }

  if (labelInput) {
    labelInput.value = buttonState.label;
    labelInput.oninput = () => {
      buttonState.label = labelInput.value.trim();
      buttonState.warn.label = false;
      evaluateButton();
    };
  }

  if (serialInput) {
    serialInput.value = buttonState.serial;
    serialInput.oninput = () => {
      buttonState.serial = serialInput.value.trim().toUpperCase();
      updateSerialDetailsUI(buttonState.serial);
      evaluateButton();
    };
  }

  Object.entries(FACT_INPUTS).forEach(([k, id]) => {
    const el = $(id);
    if (!el) return;
    el.value = buttonState.facts[k];
    el.oninput = () => { buttonState.facts[k] = el.value.trim(); evaluateButton(); };
  });

  const numInput = $('buttonIndexInput');
  if (numInput) {
    numInput.value = buttonState.stage ? buttonState.stage.current : '';
    numInput.oninput = () => {
      const n = parseInt(numInput.value, 10);
      const s = buttonState.stage;
      buttonState.stage = Number.isFinite(n) && n > 0 ? { total: s ? s.total : NaN, done: n - 1, current: n } : null;
      evaluateButton();
    };
  }

  if (rulesArea) {
    rulesArea.value = buttonState.rulesText;
    rulesArea.oninput = () => {
      buttonState.rulesText = rulesArea.value;
      applyPastedFacts(rulesArea.value);
      evaluateButton();
    };
  }

  const resetRulesBtn = $('buttonResetRulesBtn');
  if (resetRulesBtn) {
    resetRulesBtn.onclick = () => {
      buttonState.rulesText = '';
      if (rulesArea) rulesArea.value = '';
      evaluateButton();
    };
  }

  const sampleBtn = $('buttonSampleBtn');
  if (sampleBtn) sampleBtn.onclick = loadSample;
  const nextBtn = $('buttonNextBtn');
  if (nextBtn) nextBtn.onclick = nextButton;

  if (fileInput) {
    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) processButtonImage(file);
      e.target.value = '';
    };
  }

  if (dropzone && !buttonState.initialized) {
    dropzone.ondragover = (e) => { e.preventDefault(); dropzone.classList.add('active'); };
    dropzone.ondragleave = () => dropzone.classList.remove('active');
    dropzone.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('active');
      if (window.BombDragDrop) {
        window.BombDragDrop.handleDataTransfer(e.dataTransfer, (file) => { if (file) processButtonImage(file); });
      } else {
        const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
        if (file) processButtonImage(file);
      }
    };
  }

  document.removeEventListener('paste', handleButtonPaste);
  document.addEventListener('paste', handleButtonPaste);

  buttonState.initialized = true;
  updateSerialDetailsUI(buttonState.serial);
  evaluateButton();
}

function updateSerialDetailsUI(serial) {
  const el = $('buttonSerialDetails');
  if (!el) return;
  const s = (serial || '').trim().toUpperCase();
  const digits = s.match(/\d/g) || [];
  const letters = s.match(/[A-Z]/g) || [];
  const vowels = s.match(/[AEIOU]/g) || [];
  const lastDigit = digits.length > 0 ? parseInt(digits[digits.length - 1], 10) : null;
  const rightmostStr = lastDigit !== null ? `${lastDigit} (${lastDigit % 2 === 0 ? 'Even' : 'Odd'})` : 'None';
  const vowelsStr = vowels.length > 0 ? `${vowels.length} (${vowels.join(', ')})` : '0';
  el.textContent = s ? `Digits: ${digits.length} | Letters: ${letters.length} | Vowels: ${vowelsStr} | Rightmost: ${rightmostStr}` : '';
}

function handleButtonPaste(e) {
  const section = $('buttonSection');
  if (!section || !section.classList.contains('active')) return;
  // text pasted into a field is just text (the checklist, a serial…)
  const el = document.activeElement;
  if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'file'))) return;

  if (window.BombDragDrop) {
    window.BombDragDrop.handleDataTransfer(e.clipboardData, (file) => { if (file) processButtonImage(file); });
    return;
  }
  for (const item of (e.clipboardData?.items || [])) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      processButtonImage(item.getAsFile());
      return;
    }
  }
}

// "Serial: …" and module count lines in the pasted checklist fill the bomb facts
function applyPastedFacts(text) {
  const pf = B.parseChecklist(text).facts;
  if (pf.serial) {
    buttonState.serial = pf.serial;
    const s = $('buttonSerialInput');
    if (s) s.value = pf.serial;
    updateSerialDetailsUI(pf.serial);
  }
  Object.entries(FACT_INPUTS).forEach(([k, id]) => {
    if (!Number.isFinite(pf[k])) return;
    buttonState.facts[k] = String(pf[k]);
    const el = $(id);
    if (el) el.value = buttonState.facts[k];
  });
}

// ── EVALUATION (bomb_boomed's parseChecklist / evaluateRules) ──────

function context() {
  const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));
  const f = buttonState.facts;
  let total = num(f.total);
  const nonNeedy = num(f.nonNeedy), needy = num(f.needy);
  // Total = non-needy + needy when only those two were given
  if (!Number.isFinite(total) && Number.isFinite(nonNeedy) && Number.isFinite(needy)) total = nonNeedy + needy;
  const st = buttonState.stage;
  return {
    color: buttonState.color, label: buttonState.label,
    serial: buttonState.serial,
    total, nonNeedy, needy,
    buttonMods: num(f.buttonMods),
    buttonNum: st ? num(st.current) : NaN,
    buttonTotal: st ? num(st.total) : NaN
  };
}

function evaluateButton() {
  const resultCard = $('buttonResultCard');
  const actionEl = $('buttonActionText');
  const ruleEl = $('buttonMatchedRule');
  const listEl = $('buttonConditionalContainer');

  $('buttonColorSelect')?.classList.toggle('button-warn', !!buttonState.warn.color);
  $('buttonLabelInput')?.classList.toggle('button-warn', !!buttonState.warn.label);

  const { rules } = B.parseChecklist(buttonState.rulesText);
  const ctx = context();
  const { rows, match, blocked } = B.evaluateRules(rules, ctx);
  const paint = (border, bg) => { if (resultCard) { resultCard.style.borderColor = border; resultCard.style.background = bg; } };

  // the checklist's rules with what each one came to (✓ match, ✗ no, ? needs a fact)
  if (listEl) {
    listEl.style.display = rows.length ? 'block' : 'none';
    listEl.innerHTML = rows.map(r => {
      const icon = r.status === 'match' ? '✓' : r.status === 'no' ? '✗' : '?';
      const color = match && r.n === match.n ? '#4caf50' : r.status === 'unknown' ? '#ffd875' : r.status === 'no' ? '#666' : '#81c784';
      return `<div class="button-rule-row" style="color:${color};"><span>${icon} ${r.n}. ${esc(r.text)}</span><span>${r.seconds}s</span></div>`;
    }).join('');
  }

  buttonState.answer = match ? `${match.seconds}s` : '';
  if (!rules.length) {
    if (actionEl) actionEl.textContent = '--';
    if (ruleEl) ruleEl.textContent = 'Paste this round\'s Button checklist below.';
    paint('#3a3a5e', 'transparent');
    return;
  }
  if (match) {
    if (actionEl) {
      actionEl.innerHTML = `<span class="button-answer" title="Click to copy" onclick="window.copyButtonAnswer(this)">⏱️ ${esc(buttonState.answer)}</span>`;
    }
    if (ruleEl) ruleEl.textContent = `Rule ${match.n}: "${match.text}"`;
    paint('#4caf50', 'rgba(76, 175, 80, 0.1)');
    return;
  }
  if (blocked) {
    // which inputs are still needed to decide the blocking rule
    const missing = [];
    blocked.clauses.forEach((c, i) => {
      if (blocked.vals[i] !== null) return;
      if (c.unknown) missing.push(`rule ${blocked.n} wording ("${c.desc}")`);
      else if (c.kind === 'color') missing.push('button colour');
      else if (c.kind === 'label') missing.push('label');
      else if (c.kind === 'labelColor') missing.push(!ctx.label ? 'label' : 'button colour');
      else if (c.kind === 'stage') missing.push('which button (#)');
      else if (c.kind === 'serial') missing.push('serial');
      else if (c.kind === 'count') missing.push(B.FACT_LABELS[c.fact]);
    });
    if (actionEl) actionEl.textContent = 'Need more info';
    if (ruleEl) ruleEl.textContent = `Rule ${blocked.n} needs: ${Array.from(new Set(missing)).join(', ')}`;
    paint('#ffd875', 'rgba(255, 216, 117, 0.08)');
    return;
  }
  if (actionEl) actionEl.textContent = 'No rule matched';
  if (ruleEl) ruleEl.textContent = 'Check the colour, label and checklist.';
  paint('#f44336', 'rgba(244, 67, 54, 0.1)');
}

window.copyButtonAnswer = function (el) {
  const t = buttonState.answer;
  if (!t) return;
  try {
    navigator.clipboard.writeText(t).then(() => {
      const was = el.textContent;
      el.textContent = '✓ Copied';
      setTimeout(() => { el.textContent = was; }, 1200);
    }).catch(() => {});
  } catch (e) {}
};

function setField(id, v) { const el = $(id); if (el) el.value = v; }

// New button (next stage): keep the checklist + bomb facts, clear the button itself
function nextButton() {
  buttonState.color = '';
  buttonState.label = '';
  buttonState.warn = { color: false, label: false };
  const s = buttonState.stage;
  if (s) buttonState.stage = { ...s, current: Number.isFinite(s.total) ? Math.min(s.total, s.current + 1) : s.current + 1, done: s.done + 1 };
  setField('buttonColorSelect', '');
  setField('buttonLabelInput', '');
  setField('buttonIndexInput', buttonState.stage ? buttonState.stage.current : '');
  setButtonStatus('', '#aaa');
  const c = $('buttonCanvas');
  if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
  evaluateButton();
}

function loadSample() {
  buttonState.rulesText = B.SAMPLE_CHECKLIST;
  setField('buttonRulesInput', B.SAMPLE_CHECKLIST);
  applyPastedFacts(B.SAMPLE_CHECKLIST);
  buttonState.facts = { total: '6', nonNeedy: '5', needy: '1', buttonMods: '3' };
  Object.entries(FACT_INPUTS).forEach(([k, id]) => setField(id, buttonState.facts[k]));
  buttonState.color = 'green';
  buttonState.label = 'WHITE';
  buttonState.stage = { total: 3, current: 3, done: 2 };
  buttonState.warn = { color: false, label: false };
  setField('buttonColorSelect', 'green');
  setField('buttonLabelInput', 'WHITE');
  setField('buttonIndexInput', 3);
  evaluateButton();
}

// ── SCREENSHOT (bomb_boomed's readButtonImage: colour, label by OCR, the stage dots) ──

function processButtonImage(file) {
  if (!file) return;
  if (buttonState.busy) { setButtonStatus('Still reading the last button — paste again in a moment.', '#ffd875'); return; }
  setButtonStatus('Reading button…', '#aaa');
  const img = new Image();
  img.onload = async () => {
    renderButtonCanvas(img);
    buttonState.busy = true;
    try {
      const vocab = B.labelVocab(B.parseChecklist(buttonState.rulesText).rules);
      const r = await B.readButtonImage(img, vocab, (t) => setButtonStatus(t, '#aaa'));
      if (!r.ok) { setButtonStatus(r.reason, '#ff9800'); return; }
      buttonState.color = r.color;
      setField('buttonColorSelect', r.color);
      if (r.label) { buttonState.label = r.label; setField('buttonLabelInput', r.label); }
      buttonState.stage = r.stage;
      setField('buttonIndexInput', r.stage ? r.stage.current : '');
      const colorUnsure = r.confidence < 0.45 || !B.BUTTON_COLORS.includes(r.color);
      buttonState.warn = { color: colorUnsure, label: !r.labelSure };
      const parts = [`colour ${r.color.toUpperCase()}`];
      if (r.label) parts.push(`label ${r.label}${r.labelSure ? '' : ` (read "${r.labelRaw}" — check)`}`);
      else parts.push(r.ocrError ? `label unreadable (${r.ocrError})` : 'label not read — type it above');
      if (r.stage) parts.push(`button ${r.stage.current}/${r.stage.total}`);
      setButtonStatus(`✓ ${parts.join(' · ')}`, r.label && !colorUnsure ? '#4caf50' : '#ffd875');
      evaluateButton();
    } catch (e) {
      setButtonStatus('Could not read that image — set colour and label above.', '#ff9800');
    } finally {
      buttonState.busy = false;
      URL.revokeObjectURL(img.src);
    }
  };
  img.onerror = () => setButtonStatus('Could not open that file as an image.', '#ff5c5c');
  img.src = URL.createObjectURL(file);
}

function renderButtonCanvas(img) {
  const canvas = $('buttonCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
}

function setButtonStatus(msg, color) {
  const status = $('buttonStatus');
  if (!status) return;
  status.textContent = msg;
  status.style.color = color;
}

window.initButtonModule = initButtonModule;

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initButtonModule();
} else {
  document.addEventListener('DOMContentLoaded', initButtonModule);
}
})();
