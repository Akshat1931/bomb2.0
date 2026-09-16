/**
 * The Button Module Solver
 * Supports dynamic guidebook rule parsing, image OCR/color recognition,
 * multi-option branching for unknown/empty bomb parameters, and manual input controls.
 */

(function() {
const DEFAULT_BUTTON_RULES = `button is green and label says Press: 5s
button is red and label says Blue: 10s
button is white and label says Detonate: 12s
there is exactly 1 needy module, button is white, and label says Punch: 11s
non-needy module count is odd, button is yellow, and label says Blue: 5s
rightmost serial digit is even and button is yellow: 7s
serial has more digits than letters and label says Detonate: 3s
serial has fewer than 2 vowels and label says Blue: 4s
this is button 2 and label says Red: 5s
Otherwise: 7s`;

const COLOR_WORDS = ['red', 'blue', 'green', 'yellow', 'white', 'orange', 'purple', 'black', 'magenta', 'cyan', 'pink', 'gray', 'grey', 'brown'];

const buttonState = {
  initialized: false,
  rulesText: DEFAULT_BUTTON_RULES,
  parsedRules: [],
  color: 'green',
  label: 'Press',
  serial: 'AB3',
  nonNeedyCount: 'unknown',
  needyCount: 'unknown',
  disarmedCount: 'unknown',
  buttonIndex: '1',
  image: null
};

function initButtonModule() {
  const colorSelect = document.getElementById('buttonColorSelect');
  const labelInput = document.getElementById('buttonLabelInput');
  const serialInput = document.getElementById('buttonSerialInput');
  const nonNeedySelect = document.getElementById('buttonNonNeedySelect');
  const needySelect = document.getElementById('buttonNeedySelect');
  const disarmedSelect = document.getElementById('buttonDisarmedSelect');
  const buttonIndexSelect = document.getElementById('buttonIndexSelect');
  const rulesArea = document.getElementById('buttonRulesInput');
  const resetRulesBtn = document.getElementById('buttonResetRulesBtn');
  const dropzone = document.getElementById('buttonDropzone');
  const fileInput = document.getElementById('buttonFileInput');

  if (colorSelect) {
    if (colorSelect.value) buttonState.color = colorSelect.value;
    else colorSelect.value = buttonState.color;

    colorSelect.onchange = () => {
      buttonState.color = colorSelect.value;
      evaluateButton();
    };
  }

  if (labelInput) {
    if (labelInput.value !== undefined && labelInput.value.trim().length > 0) {
      buttonState.label = labelInput.value.trim();
    } else {
      labelInput.value = buttonState.label;
    }

    labelInput.oninput = () => {
      buttonState.label = labelInput.value.trim();
      evaluateButton();
    };
    labelInput.onchange = labelInput.oninput;
  }

  if (serialInput) {
    if (serialInput.value !== undefined && serialInput.value.trim().length > 0) {
      buttonState.serial = serialInput.value.trim();
    } else {
      serialInput.value = buttonState.serial;
    }

    serialInput.oninput = () => {
      buttonState.serial = serialInput.value.trim();
      updateSerialDetailsUI(buttonState.serial);
      evaluateButton();
    };
    serialInput.onchange = serialInput.oninput;
  }

  if (nonNeedySelect) {
    if (nonNeedySelect.value) buttonState.nonNeedyCount = nonNeedySelect.value;
    else nonNeedySelect.value = buttonState.nonNeedyCount;

    nonNeedySelect.onchange = () => {
      buttonState.nonNeedyCount = nonNeedySelect.value;
      evaluateButton();
    };
  }

  if (needySelect) {
    if (needySelect.value) buttonState.needyCount = needySelect.value;
    else needySelect.value = buttonState.needyCount;

    needySelect.onchange = () => {
      buttonState.needyCount = needySelect.value;
      evaluateButton();
    };
  }

  if (disarmedSelect) {
    if (disarmedSelect.value) buttonState.disarmedCount = disarmedSelect.value;
    else disarmedSelect.value = buttonState.disarmedCount;

    disarmedSelect.onchange = () => {
      buttonState.disarmedCount = disarmedSelect.value;
      evaluateButton();
    };
  }

  if (buttonIndexSelect) {
    if (buttonIndexSelect.value) buttonState.buttonIndex = buttonIndexSelect.value;
    else buttonIndexSelect.value = buttonState.buttonIndex;

    buttonIndexSelect.onchange = () => {
      buttonState.buttonIndex = buttonIndexSelect.value;
      evaluateButton();
    };
  }

  if (rulesArea) {
    if (rulesArea.value && rulesArea.value.trim().length > 0) {
      buttonState.rulesText = rulesArea.value;
    } else {
      rulesArea.value = buttonState.rulesText;
    }

    rulesArea.oninput = () => {
      buttonState.rulesText = rulesArea.value;
      buttonState.parsedRules = parseButtonRulesText(buttonState.rulesText);
      evaluateButton();
    };
    rulesArea.onchange = rulesArea.oninput;
  }

  if (resetRulesBtn) {
    resetRulesBtn.onclick = () => {
      buttonState.rulesText = DEFAULT_BUTTON_RULES;
      if (rulesArea) rulesArea.value = DEFAULT_BUTTON_RULES;
      buttonState.parsedRules = parseButtonRulesText(DEFAULT_BUTTON_RULES);
      evaluateButton();
    };
  }

  if (fileInput) {
    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) processButtonImage(file);
      e.target.value = '';
    };
  }

  if (dropzone) {
    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.classList.add('active');
    };
    dropzone.ondragleave = () => dropzone.classList.remove('active');
    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.classList.remove('active');
      const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
      if (file) processButtonImage(file);
    };
  }

  if (typeof document.removeEventListener === 'function') document.removeEventListener('paste', handleButtonPaste);
  if (typeof document.addEventListener === 'function') document.addEventListener('paste', handleButtonPaste);

  updateSerialDetailsUI(buttonState.serial);
  buttonState.parsedRules = parseButtonRulesText(buttonState.rulesText);
  evaluateButton();
}

function updateSerialDetailsUI(serial) {
  const el = document.getElementById('buttonSerialDetails');
  if (!el) return;
  const s = (serial || '').trim().toUpperCase();
  const digits = s.match(/\d/g) || [];
  const letters = s.match(/[A-Z]/g) || [];
  const vowels = s.match(/[AEIOU]/g) || [];
  const lastDigit = digits.length > 0 ? parseInt(digits[digits.length - 1], 10) : null;
  const rightmostStr = lastDigit !== null ? `${lastDigit} (${lastDigit % 2 === 0 ? 'Even' : 'Odd'})` : 'None';
  const vowelsStr = vowels.length > 0 ? `${vowels.length} (${vowels.join(', ')})` : '0';

  el.textContent = `Digits: ${digits.length} | Letters: ${letters.length} | Vowels: ${vowelsStr} | Rightmost: ${rightmostStr}`;
}

function handleButtonPaste(e) {
  const section = document.getElementById('buttonSection');
  if (!section || !section.classList.contains('active')) return;

  const items = e.clipboardData?.items;
  if (items) {
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        processButtonImage(item.getAsFile());
        return;
      }
    }
  }
}

// ── DYNAMIC RULE PARSER ────────────────────────────────────────

function parseButtonRulesText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const rules = [];

  for (const line of lines) {
    const rule = parseSingleRuleLine(line);
    if (rule) rules.push(rule);
  }

  return rules;
}

function parseSingleRuleLine(line) {
  const raw = line.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  let action = "Follow manual rule";
  let condStr = raw;

  if (raw.includes(':')) {
    const colonIdx = raw.lastIndexOf(':');
    condStr = raw.substring(0, colonIdx).trim();
    const actionPart = raw.substring(colonIdx + 1).trim();
    if (actionPart) {
      action = actionPart;
    }
  } else if (lower.includes(', then ')) {
    const parts = raw.split(/,\s*then\s+/i);
    condStr = parts[0].trim();
    action = parts[1].trim();
  } else {
    const actionMatch = raw.match(/(?:wait\s+\d+\s*(?:s|seconds?)|press\s+and\s+release|hold\s+(?:the\s+)?button|\b\d+s\b)/i);
    if (actionMatch) {
      action = actionMatch[0];
      condStr = raw.replace(actionMatch[0], '').replace(/,\s*$/, '').trim();
    }
  }

  if (/^\d+s$/i.test(action)) {
    action = `Wait ${action}`;
  }

  if (/^otherwise\b/i.test(condStr) || condStr === '') {
    return {
      rawText: line,
      isOtherwise: true,
      action: action,
      conditions: []
    };
  }

  const conditions = [];
  const cLower = condStr.toLowerCase();

  // 1. Color: button is (color) OR (color) button
  const colMatch = cLower.match(/(?:button\s+is|is\s+a)\s+(green|red|white|yellow|blue)|(green|red|white|yellow|blue)\s+button/);
  if (colMatch) {
    conditions.push({ type: 'color', color: (colMatch[1] || colMatch[2]).toLowerCase() });
  }

  // 2. Label
  if (cLower.includes('different from the button color') || cLower.includes('different from button color')) {
    conditions.push({ type: 'labelColorDiffers' });
  } else if (cLower.includes('same as the button color') || cLower.includes('matches the button color') || cLower.includes('same color as the button')) {
    conditions.push({ type: 'labelColorMatches' });
  } else if (cLower.includes('label is a color word') || cLower.includes('label is a color')) {
    conditions.push({ type: 'labelIsColorWord' });
  } else if (cLower.includes('label is not a color word') || cLower.includes('label is not a color')) {
    conditions.push({ type: 'labelNotColorWord' });
  } else {
    const lblMatch = cLower.match(/(?:label\s+says|label\s+is|says)\s+["']?([a-z0-9?]+)["']?/i);
    if (lblMatch && !['a', 'the', 'not', 'different', 'same'].includes(lblMatch[1].toLowerCase())) {
      conditions.push({ type: 'label', label: lblMatch[1].toLowerCase() });
    }
  }

  // 3. Needy module count
  if (cLower.includes('needy') && !cLower.includes('non-needy')) {
    if (cLower.includes('no needy') || cLower.includes('0 needy') || cLower.includes('there are no needy')) {
      conditions.push({ type: 'needyCount', exact: 0 });
    } else {
      const needyNum = cLower.match(/(?:exactly\s+)?(\d+)\s+needy/);
      if (needyNum) {
        conditions.push({ type: 'needyCount', exact: parseInt(needyNum[1], 10) });
      }
    }
  }

  // 4. Non-needy module count
  if (cLower.includes('non-needy')) {
    if (cLower.includes('odd')) {
      conditions.push({ type: 'nonNeedyCount', parity: 'odd' });
    } else if (cLower.includes('even')) {
      conditions.push({ type: 'nonNeedyCount', parity: 'even' });
    } else {
      const nnNum = cLower.match(/(?:count\s+is\s+|is\s+)(\d+)/);
      if (nnNum) {
        conditions.push({ type: 'nonNeedyCount', exact: parseInt(nnNum[1], 10) });
      }
    }
  }

  // 5. Disarmed / Solved modules count
  if (cLower.includes('disarmed') || cLower.includes('solved') || cLower.includes('discorded')) {
    if (cLower.includes('odd')) {
      conditions.push({ type: 'disarmedCount', parity: 'odd' });
    } else if (cLower.includes('even')) {
      conditions.push({ type: 'disarmedCount', parity: 'even' });
    } else if (cLower.includes('no modules') || cLower.includes('0 modules') || cLower.includes('empty')) {
      conditions.push({ type: 'disarmedCount', exact: 0 });
    } else {
      const disNum = cLower.match(/(\d+)\s+modules?\s+(?:disarmed|solved)/);
      if (disNum) {
        conditions.push({ type: 'disarmedCount', exact: parseInt(disNum[1], 10) });
      }
    }
  }

  // 6. Serial number conditions
  // a) rightmost / last digit
  if (cLower.includes('rightmost serial') || cLower.includes('last digit') || (cLower.includes('serial') && cLower.includes('digit') && (cLower.includes('even') || cLower.includes('odd')))) {
    if (cLower.includes('even')) {
      conditions.push({ type: 'serialRightmost', isEven: true });
    } else if (cLower.includes('odd')) {
      conditions.push({ type: 'serialRightmost', isEven: false });
    }
  }

  // b) serial digits vs letters
  if (cLower.includes('serial') && cLower.includes('digits') && cLower.includes('letters')) {
    if (cLower.includes('more digits than letters')) {
      conditions.push({ type: 'serialDigitsVsLetters', moreDigits: true });
    } else if (cLower.includes('fewer digits') || cLower.includes('more letters than digits')) {
      conditions.push({ type: 'serialDigitsVsLetters', moreDigits: false });
    } else if (cLower.includes('at least as many letters as digits')) {
      conditions.push({ type: 'serialLettersVsDigits', comparator: '>=' });
    } else if (cLower.includes('at least as many digits as letters')) {
      conditions.push({ type: 'serialLettersVsDigits', comparator: '<=' });
    }
  }

  // c) serial vowels
  if (cLower.includes('serial') && (cLower.includes('vowel') || cLower.includes('vowels'))) {
    if (cLower.includes('no vowels') || cLower.includes('0 vowels') || cLower.includes('without vowels')) {
      conditions.push({ type: 'serialVowels', exact: 0 });
    } else {
      const vowelMatch = cLower.match(/(?:fewer than|less than)\s+(\d+)\s+vowels?/);
      const vowelMore = cLower.match(/(?:more than)\s+(\d+)\s+vowels?/);
      const vowelAtLeast = cLower.match(/(?:at least)\s+(\d+)\s+vowels?/);
      if (vowelMatch) {
        conditions.push({ type: 'serialVowels', maxExclusive: parseInt(vowelMatch[1], 10) });
      } else if (vowelMore) {
        conditions.push({ type: 'serialVowels', minExclusive: parseInt(vowelMore[1], 10) });
      } else if (vowelAtLeast) {
        conditions.push({ type: 'serialVowels', minInclusive: parseInt(vowelAtLeast[1], 10) });
      } else if (cLower.includes('has a vowel') || cLower.includes('contains a vowel')) {
        conditions.push({ type: 'serialVowels', minInclusive: 1 });
      }
    }
  }

  // d) serial duplicate / repeats
  if (cLower.includes('serial') && (cLower.includes('repeat') || cLower.includes('duplicate'))) {
    conditions.push({ type: 'serialRepeats', repeats: true });
  }

  // 7. Button index / position on bomb
  const btnIdxMatch = cLower.match(/(?:this\s+is\s+button|is\s+button)\s+(\d+)/);
  if (btnIdxMatch) {
    conditions.push({ type: 'buttonIndex', index: parseInt(btnIdxMatch[1], 10) });
  }

  return {
    rawText: line,
    isOtherwise: false,
    action: action,
    conditions: conditions
  };
}

// ── EVALUATION & MULTI-OPTION BRANCHING ENGINE ────────────────

function evaluateConditionWithState(cond, state) {
  if (cond.type === 'color') {
    return state.color === cond.color;
  }
  if (cond.type === 'label') {
    return state.label === cond.label;
  }
  if (cond.type === 'labelColorDiffers') {
    if (!state.label || !state.color) return null;
    return COLOR_WORDS.includes(state.label) && state.label !== state.color;
  }
  if (cond.type === 'labelColorMatches') {
    if (!state.label || !state.color) return null;
    return COLOR_WORDS.includes(state.label) && state.label === state.color;
  }
  if (cond.type === 'labelIsColorWord') {
    if (!state.label) return null;
    return COLOR_WORDS.includes(state.label);
  }
  if (cond.type === 'labelNotColorWord') {
    if (!state.label) return null;
    return !COLOR_WORDS.includes(state.label);
  }
  if (cond.type === 'needyCount') {
    if (state.needy === null || state.needy === undefined) return null;
    return state.needy === cond.exact;
  }
  if (cond.type === 'nonNeedyCount') {
    if (state.nonNeedy === null || state.nonNeedy === undefined) return null;
    if (cond.parity) {
      if (state.nonNeedy === 'odd') return cond.parity === 'odd';
      if (state.nonNeedy === 'even') return cond.parity === 'even';
      if (typeof state.nonNeedy === 'number') return (state.nonNeedy % 2 !== 0 ? 'odd' : 'even') === cond.parity;
    }
    if (cond.exact !== undefined) {
      return state.nonNeedy === cond.exact;
    }
  }
  if (cond.type === 'disarmedCount') {
    if (state.disarmed === null || state.disarmed === undefined) return null;
    if (cond.parity) {
      if (state.disarmed === 'odd') return cond.parity === 'odd';
      if (state.disarmed === 'even') return cond.parity === 'even';
      if (typeof state.disarmed === 'number') return (state.disarmed % 2 !== 0 ? 'odd' : 'even') === cond.parity;
    }
    if (cond.exact !== undefined) {
      return state.disarmed === cond.exact;
    }
  }
  if (cond.type === 'serialRightmost') {
    if (state.rightmostIsEven === null || state.rightmostIsEven === undefined) return null;
    return state.rightmostIsEven === cond.isEven;
  }
  if (cond.type === 'serialDigitsVsLetters') {
    if (!state.serial) return null;
    const hasMore = state.digitsCount > state.lettersCount;
    return hasMore === cond.moreDigits;
  }
  if (cond.type === 'serialLettersVsDigits') {
    if (!state.serial) return null;
    if (cond.comparator === '>=') return state.lettersCount >= state.digitsCount;
    if (cond.comparator === '<=') return state.lettersCount <= state.digitsCount;
  }
  if (cond.type === 'serialVowels') {
    if (!state.serial) return null;
    if (cond.exact !== undefined) return state.vowelsCount === cond.exact;
    if (cond.maxExclusive !== undefined) return state.vowelsCount < cond.maxExclusive;
    if (cond.minExclusive !== undefined) return state.vowelsCount > cond.minExclusive;
    if (cond.minInclusive !== undefined) return state.vowelsCount >= cond.minInclusive;
  }
  if (cond.type === 'serialRepeats') {
    if (!state.serial) return null;
    return state.hasDuplicateChar === cond.repeats;
  }
  if (cond.type === 'buttonIndex') {
    if (state.buttonIndex === null || state.buttonIndex === undefined) return null;
    return state.buttonIndex === cond.index;
  }
  return true;
}

function evaluateButton() {
  const resultCard = document.getElementById('buttonResultCard');
  const actionEl = document.getElementById('buttonActionText');
  const ruleEl = document.getElementById('buttonMatchedRule');
  const condContainer = document.getElementById('buttonConditionalContainer');
  const statusEl = document.getElementById('buttonStatus');

  const currentColor = (buttonState.color || 'green').toLowerCase();
  const currentLabel = (buttonState.label || '').trim().toLowerCase();
  const currentSerial = (buttonState.serial || '').trim().toUpperCase();

  const digits = currentSerial.match(/\d/g) || [];
  const letters = currentSerial.match(/[A-Z]/g) || [];
  const vowels = currentSerial.match(/[AEIOU]/g) || [];
  const lastDigit = digits.length > 0 ? parseInt(digits[digits.length - 1], 10) : null;
  const rightmostIsEven = lastDigit !== null ? (lastDigit % 2 === 0) : null;
  const hasDuplicateChar = new Set(currentSerial.split('')).size < currentSerial.length;

  const baseState = {
    color: currentColor,
    label: currentLabel,
    serial: currentSerial,
    digitsCount: digits.length,
    lettersCount: letters.length,
    vowelsCount: vowels.length,
    lastDigit: lastDigit,
    rightmostIsEven: rightmostIsEven,
    hasDuplicateChar: hasDuplicateChar,
    nonNeedy: buttonState.nonNeedyCount === 'unknown' ? null : buttonState.nonNeedyCount,
    needy: buttonState.needyCount === 'unknown' ? null : parseInt(buttonState.needyCount, 10),
    disarmed: buttonState.disarmedCount === 'unknown' ? null : (buttonState.disarmedCount === '0' ? 0 : buttonState.disarmedCount),
    buttonIndex: buttonState.buttonIndex === 'unknown' ? null : parseInt(buttonState.buttonIndex, 10)
  };

  // Identify which unknown dimensions actually matter for the surviving rules
  const candidateRules = buttonState.parsedRules.filter(r => {
    if (r.isOtherwise) return true;
    for (const c of r.conditions) {
      if (c.type === 'color' && c.color !== currentColor) return false;
      if (c.type === 'label' && c.label !== currentLabel) return false;
      if (c.type === 'labelColorDiffers' && (!COLOR_WORDS.includes(currentLabel) || currentLabel === currentColor)) return false;
      if (c.type === 'labelColorMatches' && (!COLOR_WORDS.includes(currentLabel) || currentLabel !== currentColor)) return false;
      if (c.type === 'labelIsColorWord' && !COLOR_WORDS.includes(currentLabel)) return false;
      if (c.type === 'labelNotColorWord' && COLOR_WORDS.includes(currentLabel)) return false;
    }
    return true;
  });

  const needNonNeedy = baseState.nonNeedy === null && candidateRules.some(r => r.conditions.some(c => c.type === 'nonNeedyCount'));
  const needNeedy = baseState.needy === null && candidateRules.some(r => r.conditions.some(c => c.type === 'needyCount'));
  const needDisarmed = baseState.disarmed === null && candidateRules.some(r => r.conditions.some(c => c.type === 'disarmedCount'));
  const needSerialRightmost = baseState.rightmostIsEven === null && candidateRules.some(r => r.conditions.some(c => c.type === 'serialRightmost'));
  const needButtonIndex = baseState.buttonIndex === null && candidateRules.some(r => r.conditions.some(c => c.type === 'buttonIndex'));

  // Build scenarios if any variables are ambiguous
  const scenarios = [];

  if (needNonNeedy) {
    scenarios.push({ desc: 'Non-Needy module count is ODD', patch: { nonNeedy: 'odd' }, key: 'nonNeedy', val: 'odd' });
    scenarios.push({ desc: 'Non-Needy module count is EVEN', patch: { nonNeedy: 'even' }, key: 'nonNeedy', val: 'even' });
  } else if (needDisarmed) {
    scenarios.push({ desc: 'Disarmed modules count is ODD', patch: { disarmed: 'odd' }, key: 'disarmed', val: 'odd' });
    scenarios.push({ desc: 'Disarmed modules count is EVEN (or 0)', patch: { disarmed: 'even' }, key: 'disarmed', val: 'even' });
  } else if (needNeedy) {
    scenarios.push({ desc: 'There is exactly 1 Needy module', patch: { needy: 1 }, key: 'needy', val: '1' });
    scenarios.push({ desc: 'There are 0 or 2+ Needy modules', patch: { needy: 0 }, key: 'needy', val: '0' });
  } else if (needSerialRightmost) {
    scenarios.push({ desc: 'Rightmost serial digit is EVEN', patch: { rightmostIsEven: true }, key: 'serial', val: 'even' });
    scenarios.push({ desc: 'Rightmost serial digit is ODD', patch: { rightmostIsEven: false }, key: 'serial', val: 'odd' });
  } else if (needButtonIndex) {
    scenarios.push({ desc: 'This is Button 2 on the bomb', patch: { buttonIndex: 2 }, key: 'buttonIndex', val: '2' });
    scenarios.push({ desc: 'This is Button 1 (or other)', patch: { buttonIndex: 1 }, key: 'buttonIndex', val: '1' });
  }

  function simulateRuleChain(st) {
    for (const rule of buttonState.parsedRules) {
      if (rule.isOtherwise) {
        return { rule, action: rule.action };
      }
      let matches = true;
      for (const cond of rule.conditions) {
        const res = evaluateConditionWithState(cond, st);
        if (res === false) {
          matches = false;
          break;
        }
        if (res === null) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return { rule, action: rule.action };
      }
    }
    return { rule: null, action: 'No rule matched' };
  }

  if (scenarios.length > 0) {
    const outcomes = [];
    const distinctActions = new Set();

    for (const sc of scenarios) {
      const testState = Object.assign({}, baseState, sc.patch);
      const res = simulateRuleChain(testState);
      outcomes.push({
        desc: sc.desc,
        key: sc.key,
        val: sc.val,
        action: res.action,
        ruleText: res.rule ? res.rule.rawText : ''
      });
      distinctActions.add(res.action);
    }

    if (distinctActions.size === 1) {
      // All scenarios yield the exact same action!
      const act = [...distinctActions][0];
      if (actionEl) actionEl.textContent = act;
      if (ruleEl) ruleEl.textContent = `Matched for all conditions: "${outcomes[0].ruleText}"`;
      if (condContainer) condContainer.style.display = 'none';
    } else {
      // Multiple distinct possibilities!
      const summaryText = outcomes.map(o => `${o.action} (${o.desc.includes('ODD') ? 'Odd' : o.desc.includes('EVEN') ? 'Even' : o.desc.includes('1 Needy') ? '1 Needy' : 'Alt'})`).join('  |  ');
      if (actionEl) actionEl.textContent = summaryText;
      if (ruleEl) ruleEl.textContent = "⚠️ Result depends on bomb parameters (see conditional options below):";

      if (condContainer) {
        condContainer.style.display = 'block';
        let html = `<div style="background:#1a1a36; padding:16px; border-radius:10px; border:1px solid #3d3d66;">
          <div style="color:#f5c542; font-weight:700; font-size:14px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <span>⚡ CONDITIONAL SOLUTIONS (Auto-Evaluated):</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">`;

        outcomes.forEach((o, idx) => {
          const badgeColor = idx === 0 ? '#4caf50' : '#2196f3';
          const bgRgba = idx === 0 ? 'rgba(76,175,80,0.14)' : 'rgba(33,150,243,0.14)';
          html += `
            <div style="padding:12px 14px; border-radius:8px; background:${bgRgba}; border:1px solid ${badgeColor}; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <div style="color:#fff; font-weight:600; font-size:14px;">👉 ${o.desc}:</div>
                <div style="color:#aaa; font-size:12px; margin-top:2px; font-style:italic;">Rule: "${o.ruleText}"</div>
              </div>
              <div style="font-size:20px; font-weight:800; color:${badgeColor}; font-family:'Outfit', sans-serif;">
                ${o.action}
              </div>
            </div>`;
        });

        html += `</div></div>`;
        condContainer.innerHTML = html;
      }
    }

    if (resultCard) {
      resultCard.style.borderColor = '#2196f3';
      resultCard.style.background = 'rgba(33, 150, 243, 0.1)';
    }
    if (statusEl) {
      statusEl.textContent = `Evaluated: Color = ${currentColor.toUpperCase()}, Label = "${currentLabel.toUpperCase()}"`;
      statusEl.style.color = '#aaa';
    }
    return;
  }

  // Single deterministic evaluation
  const res = simulateRuleChain(baseState);
  if (condContainer) condContainer.style.display = 'none';

  if (res.rule) {
    if (actionEl) actionEl.textContent = res.action;
    if (ruleEl) ruleEl.textContent = `Matched Rule: "${res.rule.rawText}"`;
    if (resultCard) {
      resultCard.style.borderColor = '#4caf50';
      resultCard.style.background = 'rgba(76, 175, 80, 0.1)';
    }
    if (statusEl) {
      statusEl.textContent = `Button evaluated: Color = ${currentColor.toUpperCase()}, Label = "${currentLabel.toUpperCase()}"`;
      statusEl.style.color = '#4caf50';
    }
  } else {
    if (actionEl) actionEl.textContent = "No rule matched";
    if (ruleEl) ruleEl.textContent = "Please check inputs or guide text.";
    if (resultCard) {
      resultCard.style.borderColor = '#f44336';
      resultCard.style.background = 'rgba(244, 67, 54, 0.1)';
    }
  }
}

// ── IMAGE OCR & COLOR ANALYSIS ─────────────────────────────────

function processButtonImage(file) {
  if (!file) return;

  setButtonStatus('Analyzing button image...', '#aaa');
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      buttonState.image = img;
      renderButtonCanvas(img);
      analyzeButtonImage(img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderButtonCanvas(img) {
  const canvas = document.getElementById('buttonCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;

  ctx.drawImage(img, x, y, w, h);
}

function analyzeButtonImage(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const fullData = ctx.getImageData(0, 0, img.width, img.height).data;

  // 1. Sample central area to find button color
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  const cx0 = Math.floor(img.width * 0.25);
  const cy0 = Math.floor(img.height * 0.25);
  const cw = Math.floor(img.width * 0.50);
  const ch = Math.floor(img.height * 0.50);

  for (let y = cy0; y < cy0 + ch; y++) {
    for (let x = cx0; x < cx0 + cw; x++) {
      const idx = (y * img.width + x) * 4;
      const r = fullData[idx];
      const g = fullData[idx + 1];
      const b = fullData[idx + 2];
      const br = (r + g + b) / 3;
      const diffRGB = Math.max(r, g, b) - Math.min(r, g, b);

      if (br < 35 || br > 225) continue;
      if (br > 185 && diffRGB < 20) continue;

      rSum += r; gSum += g; bSum += b; count++;
    }
  }

  let detectedColor = 'white';
  let avgR = 150, avgG = 150, avgB = 150;

  if (count > 0) {
    avgR = rSum / count;
    avgG = gSum / count;
    avgB = bSum / count;
    const maxC = Math.max(avgR, avgG, avgB);
    const minC = Math.min(avgR, avgG, avgB);
    const diff = maxC - minC;

    if (avgR > 110 && avgG > 90 && (avgR - avgB > 30) && (avgG - avgB > 20)) {
      detectedColor = 'yellow';
    } else if (avgR > 100 && (avgR - avgG > 30) && (avgR - avgB > 30)) {
      detectedColor = 'red';
    } else if (avgG > 90 && (avgG - avgR > 20) && (avgG - avgB > 20)) {
      detectedColor = 'green';
    } else if (avgB > 90 && (avgB - avgR > 20)) {
      detectedColor = 'blue';
    } else if (avgR > 110 && avgG > 110 && avgB > 110 && diff < 45) {
      detectedColor = 'white';
    }
  }

  const colorSelect = document.getElementById('buttonColorSelect');
  if (colorSelect) {
    colorSelect.value = detectedColor;
    buttonState.color = detectedColor;
  }

  // 2. Find exact Bounding Box of the Button Body using detected color matching
  let minBtnX = img.width, maxBtnX = 0, minBtnY = img.height, maxBtnY = 0;
  let btnPxCount = 0;

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const idx = (y * img.width + x) * 4;
      const r = fullData[idx];
      const g = fullData[idx + 1];
      const b = fullData[idx + 2];

      let isBtnColor = false;
      if (detectedColor === 'yellow' && r > 120 && g > 90 && r - b > 25 && g - b > 15) isBtnColor = true;
      else if (detectedColor === 'red' && r > 100 && r - g > 25 && r - b > 25) isBtnColor = true;
      else if (detectedColor === 'green' && g > 80 && g - r > 15 && g - b > 15) isBtnColor = true;
      else if (detectedColor === 'blue' && b > 80 && b - r > 15) isBtnColor = true;
      else if (detectedColor === 'white' && r > 120 && g > 120 && b > 120 && Math.max(r,g,b)-Math.min(r,g,b) < 40) isBtnColor = true;

      if (isBtnColor) {
        if (x < minBtnX) minBtnX = x;
        if (x > maxBtnX) maxBtnX = x;
        if (y < minBtnY) minBtnY = y;
        if (y > maxBtnY) maxBtnY = y;
        btnPxCount++;
      }
    }
  }

  // Crop inner 70% width & 60% height of the detected button body
  let tx, ty, tw, th;
  if (btnPxCount > 100 && maxBtnX > minBtnX && maxBtnY > minBtnY) {
    const btnW = maxBtnX - minBtnX;
    const btnH = maxBtnY - minBtnY;
    tw = Math.floor(btnW * 0.75);
    th = Math.floor(btnH * 0.65);
    tx = Math.floor(minBtnX + (btnW - tw) / 2);
    ty = Math.floor(minBtnY + (btnH - th) / 2);
  } else {
    tw = Math.floor(img.width * 0.50);
    th = Math.floor(img.height * 0.26);
    tx = Math.floor((img.width - tw) / 2);
    ty = Math.floor((img.height - th) / 2);
  }

  // 3. Render focused 2x high-contrast canvas specifically for button text
  const textCanvas = document.createElement('canvas');
  textCanvas.width = tw * 2;
  textCanvas.height = th * 2;
  const tCtx = textCanvas.getContext('2d');
  tCtx.drawImage(img, tx, ty, tw, th, 0, 0, tw * 2, th * 2);

  const avgBtnBr = (avgR + avgG + avgB) / 3;

  const tData = tCtx.getImageData(0, 0, textCanvas.width, textCanvas.height);
  for (let i = 0; i < tData.data.length; i += 4) {
    const r = tData.data[i];
    const g = tData.data[i + 1];
    const b = tData.data[i + 2];
    const br = (r + g + b) / 3;

    if (Math.abs(br - avgBtnBr) > 30) {
      tData.data[i] = 0; tData.data[i + 1] = 0; tData.data[i + 2] = 0;
    } else {
      tData.data[i] = 255; tData.data[i + 1] = 255; tData.data[i + 2] = 255;
    }
  }
  tCtx.putImageData(tData, 0, 0);

  // Run Tesseract OCR on the perfectly focused text canvas
  if (window.Tesseract && typeof window.Tesseract.recognize === 'function') {
    window.Tesseract.recognize(textCanvas, 'eng').then(res => {
      let detectedLabel = matchButtonLabel(res.data?.text);

      // Feature fallback if OCR is blocked or returns no text
      if (!detectedLabel && th > 0) {
        const aspect = tw / th;
        if (aspect > 2.6) detectedLabel = 'DETONATE';
        else if (aspect < 1.65) detectedLabel = 'HOLD';
      }

      if (detectedLabel) {
        const labelInput = document.getElementById('buttonLabelInput');
        if (labelInput) {
          labelInput.value = detectedLabel;
          buttonState.label = detectedLabel;
        }
      }
      evaluateButton();
    }).catch(() => {
      evaluateButton();
    });
  } else {
    let fallbackLabel = null;
    if (th > 0) {
      const aspect = tw / th;
      if (aspect > 2.6) fallbackLabel = 'DETONATE';
      else if (aspect < 1.65) fallbackLabel = 'HOLD';
    }
    if (fallbackLabel) {
      const labelInput = document.getElementById('buttonLabelInput');
      if (labelInput) {
        labelInput.value = fallbackLabel;
        buttonState.label = fallbackLabel;
      }
    }
    evaluateButton();
  }
}

function levenshtein(a, b) {
  const tmp = [];
  let i, j;
  for (i = 0; i <= a.length; i++) tmp[i] = [i];
  for (j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = a[i - 1] === b[j - 1]
        ? tmp[i - 1][j - 1]
        : Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + 1);
    }
  }
  return tmp[a.length][b.length];
}

function matchButtonLabel(rawText) {
  if (!rawText) return null;
  const clean = rawText.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) return null;

  const possibleLabels = ['ABORT', 'DETONATE', 'HOLD', 'PRESS', 'PUNCH'];

  // 1. Exact substring match
  for (const lab of possibleLabels) {
    if (clean.includes(lab)) return lab;
  }

  // 2. Levenshtein edit distance check
  let bestLab = null;
  let minDistance = 999;

  for (const lab of possibleLabels) {
    const dist = levenshtein(clean, lab);
    if (dist < minDistance) {
      minDistance = dist;
      bestLab = lab;
    }
  }

  // Only accept if edit distance is within tolerance (<= 2 edits)
  if (minDistance <= 2) {
    return bestLab;
  }

  return null;
}

function setButtonStatus(msg, color) {
  const status = document.getElementById('buttonStatus');
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
