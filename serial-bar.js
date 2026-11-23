/**
 * Bomb serial bar (from bomb_boomed's SerialBar): the serial number is the same on every bomb in one
 * game, so it is typed once at the top of the page. The Button, Complex Wires, Venn and Simon Says
 * read it from there: their own serial fields are filled in (and typing in one of them updates the
 * bar and the others). Saved in localStorage under the key Simon Says already used, so a reload
 * mid-game keeps it.
 */
(function () {
  'use strict';

  const KEY = 'ktane_bomb_serial';
  // module serial fields kept in step with the bar (each module listens for 'input' on its own)
  const FIELDS = ['buttonSerialInput', 'cwSerialInput', 'vennSerialInput', 'simonsSerial'];

  const clean = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const load = () => { try { return clean(localStorage.getItem(KEY)); } catch (e) { return ''; } };
  const save = (v) => { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) { /* private mode */ } };

  let serial = load();
  let syncing = false;

  function injectStyles() {
    const css = `
      .serial-bar { display: inline-flex; align-items: center; gap: 8px; margin-top: 8px; padding: 5px 6px 5px 12px;
        background: var(--bg-card, #0e0e1c); border: 1px solid var(--border, #1e1e32); border-radius: 999px; max-width: 100%; }
      .serial-bar.set { border-color: rgba(255, 216, 117, 0.45); }
      .serial-bar-label { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: var(--accent, #ffd875); }
      .serial-bar input { width: 120px; min-width: 0; padding: 5px 10px; background: var(--bg-input, #0a0a18);
        border: 1px solid var(--border, #1e1e32); border-radius: 999px; color: #fff; font-family: monospace;
        font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
      .serial-bar input:focus { outline: none; border-color: var(--accent, #ffd875); }
      .serial-bar input::placeholder { text-transform: none; letter-spacing: 0; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 12px; }
      .serial-bar-facts { font-size: 11px; font-weight: 700; color: var(--text-dim, #94a3b8); white-space: nowrap; }
      .serial-bar-clear { width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--border, #1e1e32);
        background: transparent; color: var(--text-dim, #94a3b8); cursor: pointer; font-size: 12px; line-height: 1; }
      .serial-bar-clear:hover { color: var(--red, #ff5f57); border-color: var(--red, #ff5f57); }
      @media (max-width: 480px) { .serial-bar input { width: 108px; } .serial-bar-facts { font-size: 10px; } }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function facts(s) {
    if (!s) return '';
    const digits = s.match(/\d/g);
    const last = digits ? Number(digits[digits.length - 1]) : null;
    return (/[AEIOU]/.test(s) ? 'VOWEL' : 'NO VOWEL') + (last === null ? '' : ` · LAST ${last % 2 ? 'ODD' : 'EVEN'}`);
  }

  function render() {
    const bar = document.getElementById('serialBar');
    if (!bar) return;
    const input = document.getElementById('serialBarInput');
    if (input && clean(input.value) !== serial) input.value = serial;
    bar.classList.toggle('set', !!serial);
    document.getElementById('serialBarFacts').textContent = facts(serial);
    document.getElementById('serialBarClear').style.display = serial ? '' : 'none';
  }

  /** Fill every module serial field on the page that differs (skipping the one being typed in). */
  function pushToFields(except) {
    syncing = true;
    try {
      for (const id of FIELDS) {
        const el = document.getElementById(id);
        if (!el || el === except || clean(el.value) === serial) continue;
        el.value = serial;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } finally { syncing = false; }
  }

  function setSerial(v, from) {
    v = clean(v);
    if (v === serial) { pushToFields(from); return; }
    serial = v;
    save(serial);
    render();
    pushToFields(from);
  }

  function mount() {
    const header = document.querySelector('.site-header');
    if (!header || document.getElementById('serialBar')) return;
    const bar = document.createElement('label');
    bar.id = 'serialBar';
    bar.className = 'serial-bar';
    bar.title = 'The serial number is the same on every bomb this game — The Button, Complex Wires, Venn and Simon Says read it from here';
    bar.innerHTML = `
      <span class="serial-bar-label">SERIAL</span>
      <input id="serialBarInput" type="text" placeholder="once per game" spellcheck="false" autocomplete="off" autocapitalize="characters">
      <span id="serialBarFacts" class="serial-bar-facts"></span>
      <button id="serialBarClear" type="button" class="serial-bar-clear" title="Clear the serial (new game)">✕</button>`;
    header.appendChild(bar);
    document.getElementById('serialBarInput').addEventListener('input', (e) => setSerial(e.target.value, e.target));
    document.getElementById('serialBarInput').addEventListener('change', (e) => { e.target.value = serial; }); // tidy it on leaving
    document.getElementById('serialBarClear').addEventListener('click', (e) => { e.preventDefault(); setSerial(''); });
    render();
  }

  // Typing in a module's own serial field updates the bar and the other modules
  document.addEventListener('input', (e) => {
    if (syncing || !e.target || !FIELDS.includes(e.target.id)) return;
    setSerial(e.target.value, e.target);
  });

  // Modules build their fields when their tab first opens: fill them in after every tab switch
  function hookShowSection() {
    const orig = window.showSection;
    if (typeof orig !== 'function' || orig.__serialHooked) return;
    const hooked = function (id) {
      const r = orig.apply(this, arguments);
      if (serial) pushToFields();
      return r;
    };
    hooked.__serialHooked = true;
    window.showSection = hooked;
  }

  function init() {
    injectStyles();
    mount();
    hookShowSection();
    // a serial typed in a module before this bar existed (or Button's restored one) seeds the bar
    if (!serial) {
      const found = FIELDS.map(id => clean(document.getElementById(id)?.value)).find(Boolean);
      if (found) { serial = found; save(serial); render(); }
    }
    if (serial) pushToFields();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
