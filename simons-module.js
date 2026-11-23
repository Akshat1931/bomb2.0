/**
 * Simon Says Module Solver for Keep Talking and Nobody Explains
 *
 * One screenshot / GIF = one stage. A GIF replays every flash so far; the LAST
 * flash in it is the new colour for this stage. The manual table changes every
 * game, so this game's manual picture is pasted first and read (4 rows × 4
 * flash colours). Its row is picked by whether the bomb SERIAL has a vowel and
 * whether an ODD or EVEN number of modules is disarmed, so both the ODD and
 * EVEN press sequences are shown.
 *
 * Reading and solving are bomb_boomed's (window.BombLogic.simons, bomb-logic.js).
 * Several files at once are read as stages in file-name order; tap a colour on
 * any stage to fix a misread, or a table cell to fix the manual.
 */

(function () {
  'use strict';

  // bomb_boomed's GIF decoder, Simon reader, manual-table reader and solver (bomb-logic.js)
  const { decodeGIFRGBA, SINAMES, simonRules, siAnalyzeFrames, siReadManual } = window.BombLogic.simons;

  // ── UI ──────────────────────────────────────────────────────────
  const SERIAL_KEY = 'ktane_bomb_serial'; // the serial is the same on every bomb in one game
  const THUMB = 56;
  const CHIP = { R: '#e53935', B: '#1e88e5', Y: '#fdd835', G: '#43a047' };

  const store = {
    get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* private mode */ } }
  };

  const state = {
    serial: store.get(SERIAL_KEY),
    entries: [],   // one per upload: { name, color: 'R'|'B'|'Y'|'G'|null, thumb, note, warn }
    busy: false
  };
  window.simonsModuleState = state;

  // The table changes every game: it is read from this game's Simon manual picture (pasted like a
  // stage) and kept for this page only. A misread cell can be fixed by clicking it.
  state.table = null;
  window.cycleSimonTable = function (v, p, c) {
    if (!state.table) return;
    const order = ['R', 'B', 'Y', 'G'];
    const row = state.table[v][p];
    row[c] = order[(order.indexOf(row[c]) + 1) % 4];
    state.tableEdited = true;
    update();
  };
  window.forgetSimonTable = function () {
    state.table = null;
    state.tableEdited = false;
    update();
  };

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cleanSerial = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isGifBytes = (u8) => u8.length > 3 && u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46;
  const chip = (c, sm = false) => (c
    ? `<span class="si-chip${sm ? ' sm' : ''}" style="background:${CHIP[c]}; color:${c === 'Y' ? '#111' : '#fff'};" title="${SINAMES[c]}">${c}</span>`
    : `<span class="si-chip none${sm ? ' sm' : ''}">–</span>`);

  function thumbFrom(data, W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), W, H), 0, 0);
    const t = document.createElement('canvas'); t.width = t.height = THUMB;
    t.getContext('2d').drawImage(c, 0, 0, THUMB, THUMB);
    return t.toDataURL();
  }

  /** One screenshot / GIF → one stage entry. */
  async function readSimonFile(file) {
    const name = (file && file.name) || 'pasted image';
    const buf = await file.arrayBuffer();
    if (isGifBytes(new Uint8Array(buf, 0, Math.min(4, buf.byteLength)))) {
      const g = decodeGIFRGBA(buf);
      if (g.frames.length) {
        const r = siAnalyzeFrames(g.frames, g.w, g.h);
        if (r.notSimon) return { name, notSimon: true };
        const secs = (g.frames.reduce((a, x) => a + x.delay, 0) / 1000).toFixed(1);
        let note = `GIF ${g.frames.length} fr, ${secs}s · ${r.flashes.length} flash${r.flashes.length === 1 ? '' : 'es'}: ${r.flashes.join(' ') || 'none'}`;
        if (r.stage) note += ` · stage ${r.stage}`;
        const warn = (r.stage && r.flashes.length !== r.stage) ? `expected ${r.stage} flashes` : (r.warn ? 'colours look unusual — different crop?' : '');
        return { name, color: r.color, thumb: thumbFrom(g.frames[r.thumbIndex].data, g.w, g.h), note, warn };
      }
    }
    // a still image: one frame
    const src = await createImageBitmap(file);
    const W = src.width, H = src.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);
    const data = ctx.getImageData(0, 0, W, H).data;
    const r = siAnalyzeFrames([{ data }], W, H);
    if (r.notSimon) {
      // not the module: maybe this game's manual table
      const table = siReadManual(data, W, H);
      return table ? { name, manual: table } : { name, notSimon: true };
    }
    return { name, color: r.color, thumb: thumbFrom(data, W, H), note: 'still frame', warn: r.warn ? 'colours look unusual — different crop?' : '' };
  }

  function answers() {
    const serial = cleanSerial(state.serial);
    const hasSerial = Boolean(serial);
    const vowel = /[AEIOU]/.test(serial);
    const rules = simonRules(state.table, vowel);
    const counted = state.entries.filter(e => e.color);
    // no manual or no serial yet → no answer (it would be a guess)
    const ready = Boolean(rules && hasSerial);
    const odd = ready ? counted.map(e => rules.odd[e.color]) : [];
    const even = ready ? counted.map(e => rules.even[e.color]) : [];
    return { serial, hasSerial, vowel, rules, ready, counted, odd, even };
  }

  function injectStyles() {
    if ($('simonsStyles')) return;
    const style = document.createElement('style');
    style.id = 'simonsStyles';
    style.textContent = `
    .si-shell { max-width: 1040px; margin: 0 auto 30px; background: #0d0f22; border: 1.5px solid #202448; border-radius: 18px; padding: 24px; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
    .si-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #1c2042; }
    .si-title { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; color: #ffd875; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .si-pill { font-size: 13px; font-weight: 600; color: #94a3b8; background: #181b36; padding: 3px 10px; border-radius: 99px; border: 1px solid #282d58; }
    .si-layout { display: grid; grid-template-columns: 330px 1fr; gap: 24px; align-items: start; }
    @media (max-width: 860px) { .si-layout { grid-template-columns: 1fr; } }
    .si-card { background: #070814; border: 1px solid #1c2042; border-radius: 14px; padding: 16px; }
    .si-card-title { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #ffd875; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.8px; }
    .si-dropzone { border: 2px dashed #343864; border-radius: 12px; padding: 22px 14px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.015); transition: all 0.2s; margin-bottom: 14px; }
    .si-dropzone:hover, .si-dropzone.dragover { border-color: #ffd875; background: rgba(255,216,117,0.06); }
    .si-btn { background: #181b36; border: 1px solid #2d3366; color: #cbd5e1; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .si-btn:hover { border-color: #ffd875; color: #ffd875; }
    .si-btn:disabled { opacity: 0.4; cursor: default; }
    .si-lbl { font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 6px; }
    .si-serial { display: flex; gap: 8px; align-items: center; margin-bottom: 14px; }
    .si-serial input { width: 130px; background: #0a0a18; border: 1px solid #2d3366; border-radius: 8px; color: #fff; padding: 7px 10px; font: 800 15px 'Outfit', monospace; letter-spacing: 1px; text-transform: uppercase; }
    .si-serial input.need { border-color: #f5c542; box-shadow: 0 0 10px rgba(245,197,66,0.3); }
    .si-vowel { font-size: 12px; font-weight: 800; padding: 3px 9px; border-radius: 6px; background: #181b36; border: 1px solid #2d3366; color: #94a3b8; }
    .si-add { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
    .si-add button { flex: 1; min-width: 60px; border: none; border-radius: 8px; padding: 7px 4px; font: 800 11px 'Outfit', sans-serif; white-space: nowrap; cursor: pointer; }
    .si-help { background: #12152e; border: 1px solid #232a58; border-radius: 10px; padding: 12px; font-size: 12px; color: #cbd5e1; line-height: 1.5; }
    .si-help ol { margin: 6px 0 0; padding-left: 18px; }
    .si-answers { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    @media (max-width: 560px) { .si-answers { grid-template-columns: 1fr; } }
    .si-banner { background: linear-gradient(135deg, rgba(255,216,117,0.10) 0%, rgba(245,197,66,0.04) 100%); border: 2px solid #f5c542; border-radius: 14px; padding: 14px 16px; box-shadow: 0 0 25px rgba(245,197,66,0.12); cursor: pointer; }
    .si-banner-lbl { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .si-banner-lbl b { font-size: 13px; font-weight: 900; color: #ffd875; letter-spacing: 1px; }
    .si-banner-lbl span { font-size: 11px; color: #94a3b8; }
    .si-seq { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; min-height: 34px; align-items: center; }
    .si-chip { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; font: 900 15px 'Outfit', sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
    .si-chip.sm { width: 22px; height: 22px; font-size: 11px; border-radius: 5px; }
    .si-chip.none { background: #181b36; color: #64748b; }
    .si-muted { font-size: 13px; color: #64748b; }
    .si-warn { background: rgba(255,95,87,0.08); border: 1px solid rgba(255,95,87,0.4); color: #ff9b94; border-radius: 10px; padding: 10px 12px; font-size: 13px; margin-bottom: 12px; }
    .si-log { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .si-ent { display: flex; gap: 10px; align-items: flex-start; background: #0a0c1c; border: 1px solid #1c2042; border-radius: 10px; padding: 8px 10px; }
    .si-ent.miss { border-color: rgba(255,95,87,0.45); }
    .si-ent-n { font: 900 15px 'Outfit', sans-serif; color: #ffd875; min-width: 28px; padding-top: 4px; }
    .si-ent img, .si-noimg { width: 44px; height: 44px; border-radius: 6px; border: 1px solid #2a315e; flex-shrink: 0; background: #12152e; }
    .si-ent-body { flex: 1; min-width: 0; font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
    .si-ent-read { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .si-note { font-size: 11px; color: #8892b0; }
    .si-note.warn { color: #ff9b94; }
    .si-fix { display: flex; gap: 4px; }
    .si-fix button { width: 26px; height: 22px; border-radius: 5px; border: 1px solid #2d3366; background: #12152e; color: #cbd5e1; font: 800 11px 'Outfit', sans-serif; cursor: pointer; }
    .si-fix button.on { border-color: #ffd875; color: #ffd875; }
    .si-del { background: none; border: none; color: #64748b; cursor: pointer; font-size: 14px; }
    .si-del:hover { color: #ff9b94; }
    .si-details { background: #070814; border: 1px solid #1c2042; border-radius: 12px; padding: 10px 14px; }
    .si-details summary { color: #ffd875; font-weight: 700; font-size: 13px; cursor: pointer; outline: none; }
    .si-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    .si-table th { text-align: left; color: #94a3b8; font-weight: 600; padding: 4px 6px; border-bottom: 1px solid #1c2042; }
    .si-table td { padding: 4px 6px; border-bottom: 1px solid #141833; color: #cbd5e1; }
    .si-table tr.on td { background: rgba(255,216,117,0.07); }
    .si-table tr.off td { opacity: 0.4; }
    `;
    document.head.appendChild(style);
  }

  function renderUI() {
    const section = $('simonsSection');
    if (!section) return;
    section.innerHTML = `
      <div class="si-shell">
        <div class="si-head">
          <div class="si-title"><span>🔴</span> Simon Says Solver <span class="si-pill">This game's manual · one GIF per stage</span></div>
          <div style="display:flex; gap:10px;">
            <button class="si-btn" type="button" id="simonsUndoBtn" onclick="window.removeLastSimon()">↶ Remove last</button>
            <button class="si-btn" type="button" onclick="window.clearSimons()">Reset</button>
          </div>
        </div>

        <div class="si-layout">
          <div class="si-card">
            <div class="si-card-title">Upload / Paste Stage</div>
            <div id="simonsDropzone" class="si-dropzone" onclick="document.getElementById('simonsFileInput').click()">
              <input type="file" id="simonsFileInput" accept="image/*" multiple style="display:none;" onchange="window.handleSimonsFiles(this)">
              <div id="simonsDropIcon" style="font-size:28px; margin-bottom:8px;">🔴 🔵 🟡 🟢</div>
              <div style="font-weight:700; font-size:14px; color:#fff; margin-bottom:4px;">Upload the manual table picture, then the Simon Says GIFs</div>
              <div style="font-size:12px; color:#94a3b8;">the manual changes every game · one GIF per stage — its <b>last</b> flash is the new colour · several files are read in name order · <kbd style="background:#1e2246; padding:2px 6px; border-radius:4px; color:#ffd875;">Ctrl+V</kbd> anywhere</div>
            </div>
            <div class="si-lbl">Bomb serial (once per game)</div>
            <div class="si-serial">
              <input id="simonsSerial" type="text" placeholder="serial" spellcheck="false" autocomplete="off">
              <span id="simonsVowel" class="si-vowel"></span>
            </div>
            <div class="si-lbl">Add stage by hand</div>
            <div class="si-add">
              ${['R', 'B', 'Y', 'G'].map(c => `<button type="button" style="background:${CHIP[c]}; color:${c === 'Y' ? '#111' : '#fff'};" onclick="window.addSimonColor('${c}')" title="Add a ${SINAMES[c]} flash">+ ${SINAMES[c].toUpperCase()}</button>`).join('')}
            </div>
            <div class="si-help">
              <strong>💡 How to solve:</strong>
              <ol>
                <li>Paste this game's Simon <strong>manual table</strong> picture — it changes every game.</li>
                <li>Type the bomb <strong>serial</strong> once — the table row depends on whether it has a vowel.</li>
                <li>Paste each stage's GIF; its last flash is the new colour.</li>
                <li>Press the <strong>ODD</strong> or <strong>EVEN</strong> sequence, by how many modules are disarmed.</li>
                <li>Misread? Tap the right colour on that stage.</li>
              </ol>
            </div>
          </div>

          <div>
            <div class="si-answers" id="simonsAnswers"></div>
            <div id="simonsWarn"></div>
            <div class="si-log" id="simonsLog"></div>
            <details class="si-details" id="simonsTableBox">
              <summary id="simonsTableSum">Manual table</summary>
              <div style="font-size:12px; color:#8a8ea3; margin:6px 0;">Check it against this game's Simon manual picture — <b>click a cell</b> to change it if it differs (remembered).</div>
              <div id="simonsTable"></div>
            </details>
          </div>
        </div>
      </div>
    `;
    const serial = $('simonsSerial');
    serial.value = state.serial;
    serial.addEventListener('input', () => {
      state.serial = cleanSerial(serial.value);
      store.set(SERIAL_KEY, state.serial);
      update();
    });
    setupInputs();
    update();
  }

  function setupInputs() {
    const dz = $('simonsDropzone');
    if (dz) {
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
      dz.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dz.classList.remove('dragover');
        const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith('image/'));
        if (files.length > 1) { ingest(files); return; }
        if (window.BombDragDrop) {
          window.BombDragDrop.handleDataTransfer(e.dataTransfer, (file) => { if (file) ingest([file]); });
        } else if (files.length) {
          ingest(files);
        }
      });
    }
    // A pasted image blob (Discord links are routed by dragdrop-helper.js)
    document.addEventListener('paste', (e) => {
      if (!$('simonsSection')?.classList.contains('active')) return;
      const el = document.activeElement;
      if (el && el.id === 'simonsSerial') return;
      for (const item of (e.clipboardData?.items || [])) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const f = item.getAsFile();
          if (f) ingest([f]);
          return;
        }
      }
    });
  }

  // Several frames / GIFs at once: one stage each, in file-name order (frame1, frame2, …)
  async function ingest(files) {
    const list = files.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
    state.busy = true;
    update();
    let skipped = 0;
    for (const f of list) {
      try {
        const r = await readSimonFile(f);
        if (r.manual) { state.table = r.manual; state.tableEdited = false; }
        else if (r.notSimon) skipped++;
        else state.entries.push(r);
      }
      catch (e) { state.entries.push({ name: (f && f.name) || 'image', color: null, thumb: '', note: 'could not read file', warn: '' }); }
    }
    state.skipped = skipped;
    state.busy = false;
    update();
  }

  function update() {
    if (!$('simonsAnswers')) return;
    const a = answers();

    $('simonsDropIcon').textContent = state.busy ? '⏳' : '🔴 🔵 🟡 🟢';
    $('simonsSerial').classList.toggle('need', !a.hasSerial);
    $('simonsVowel').textContent = a.hasSerial ? (a.vowel ? 'VOWEL' : 'NO VOWEL') : 'needed';
    $('simonsUndoBtn').disabled = !state.entries.length;

    $('simonsAnswers').innerHTML = [['odd', 'ODD', 'odd # of modules disarmed', a.odd], ['even', 'EVEN', 'even # of modules disarmed', a.even]].map(([k, label, sub, seq]) => `
      <div class="si-banner" onclick="window.copySimons('${k}', this)" title="Click to copy the ${label} sequence">
        <div class="si-banner-lbl"><b>${label}</b><span class="si-copied">${sub}</span></div>
        <div class="si-seq">${seq.length ? seq.map(c => chip(c)).join('') : `<span class="si-muted">${!a.counted.length ? '—' : !state.table ? 'needs the manual picture' : 'needs the serial'}</span>`}</div>
      </div>`).join('');

    $('simonsWarn').innerHTML = [
      !state.table ? '<div class="si-warn">⚠ Paste this game\'s Simon <b>manual table</b> picture — the table changes every game.</div>' : '',
      !a.hasSerial && a.counted.length ? '<div class="si-warn">⚠ Type the bomb serial — the manual row depends on whether it has a vowel.</div>' : '',
      state.skipped ? `<div class="si-warn">⚠ ${state.skipped} picture${state.skipped === 1 ? ' is' : 's are'} neither a Simon module nor its manual — skipped.</div>` : ''
    ].join('');

    let stage = 0;
    $('simonsLog').innerHTML = state.entries.length ? state.entries.map((e, i) => {
      if (e.color) stage++;
      return `<div class="si-ent ${e.color ? '' : 'miss'}">
        <span class="si-ent-n">${e.color ? '#' + stage : '—'}</span>
        ${e.thumb ? `<img src="${e.thumb}" alt="">` : '<span class="si-noimg"></span>'}
        <div class="si-ent-body">
          <div class="si-ent-read">${e.color
            ? `${chip(e.color, true)} <b>${SINAMES[e.color]}</b>${a.ready ? ` → ODD ${chip(a.rules.odd[e.color], true)} EVEN ${chip(a.rules.even[e.color], true)}` : ''}`
            : '<span class="si-note warn">no glow found — pick the colour</span>'}</div>
          <div class="si-note">${esc(e.note)}</div>
          ${e.warn ? `<div class="si-note warn">⚠ ${esc(e.warn)}</div>` : ''}
          <div class="si-fix">${['R', 'B', 'Y', 'G'].map(c => `<button type="button" class="${e.color === c ? 'on' : ''}" onclick="window.fixSimon(${i}, '${c}')" title="It was ${SINAMES[c]}">${c}</button>`).join('')}</div>
        </div>
        <button type="button" class="si-del" onclick="window.removeSimon(${i})" title="Remove this upload">✕</button>
      </div>`;
    }).join('') : '<div class="si-muted">Nothing yet — paste the stage-1 GIF.</div>';

    const T = state.table;
    $('simonsTable').innerHTML = !T
      ? '<div class="si-muted">No manual yet — paste this game\'s Simon manual picture (the 4×4 colour table).</div>'
      : `<table class="si-table"><thead><tr><th>Serial / disarmed</th>${['R', 'B', 'Y', 'G'].map(c => `<th>${SINAMES[c]} flash</th>`).join('')}</tr></thead><tbody>${
      [['noVowel', 'odd'], ['noVowel', 'even'], ['vowel', 'odd'], ['vowel', 'even']].map(([v, p]) => {
        const cls = !a.hasSerial ? '' : (v === 'vowel') === a.vowel ? 'on' : 'off';
        return `<tr class="${cls}"><td>${v === 'vowel' ? 'Vowel' : 'No vowel'} · ${p === 'odd' ? 'Odd' : 'Even'}</td>${['R', 'B', 'Y', 'G'].map(c => `<td style="cursor:pointer;" title="Click to change" onclick="window.cycleSimonTable('${v}','${p}','${c}')">${chip(T[v][p][c], true)}</td>`).join('')}</tr>`;
      }).join('')}</tbody></table><button type="button" class="si-btn" style="margin-top:6px;" onclick="window.forgetSimonTable()">Forget this manual</button>`;
    $('simonsTableSum').textContent = !T ? 'Manual table — paste this game\'s picture'
      : state.tableEdited ? 'Manual table — read from the picture, EDITED (click a cell to change)'
      : 'Manual table — read from this game\'s picture (click a cell to fix a misread)';
    if (T && !state.tableShown) { $('simonsTableBox').open = true; state.tableShown = true; }
  }

  window.handleSimonsFiles = function (input) {
    const files = [...(input.files || [])];
    if (files.length) ingest(files);
    input.value = '';
  };

  window.addSimonColor = function (c) {
    state.entries.push({ name: 'manual', color: c, thumb: '', note: 'added by hand', warn: '' });
    update();
  };

  window.fixSimon = function (i, c) {
    const e = state.entries[i];
    if (!e) return;
    state.entries[i] = { ...e, color: c, note: e.note.includes('manual') ? e.note : `${e.note} · manual`, warn: '' };
    update();
  };

  window.removeSimon = function (i) {
    state.entries.splice(i, 1);
    update();
  };

  window.removeLastSimon = function () {
    state.entries.pop();
    update();
  };

  window.copySimons = function (k, el) {
    const a = answers();
    const text = (k === 'even' ? a.even : a.odd).join(' ');
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const tag = el && el.querySelector('.si-copied');
      if (!tag) return;
      const was = tag.textContent;
      tag.textContent = '✓ Copied';
      setTimeout(() => { tag.textContent = was; }, 1500);
    }).catch(() => {});
  };

  window.clearSimons = function () {
    state.entries = [];
    update();
  };

  window.initSimonsModule = function () {
    injectStyles();
    renderUI();
  };
})();
