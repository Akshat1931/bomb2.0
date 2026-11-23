/**
 * Symbols Module Solver for KTaNE Solver Deck
 * 
 * Capabilities:
 * - Scans 1 to 3 reference grid images (supporting single 5x5 grids, stacked 2-stage grids, or multi-stage strips)
 * - Detects all 12 canonical symbols: Ω, Ѣ, ©, Ψ, ☆, ★, Ж, Ϙ, ¿, ƛ, Ѿ, ⩪
 * - Auto-detects 4-button module keypad (Buttons 1, 2, 3, 4)
 * - Supports 1-click manual symbol selector / overrides for each button
 * - Aggregates total symbol counts across all reference slots
 * - Sorts buttons in descending order of count and displays the exact press sequence
 */

(function () {
  'use strict';

  // ── 12 CANONICAL SYMBOL DEFINITIONS ──────────────────────────────
  const SYMBOLS_DEF = {
    OMEGA:         { id: 'OMEGA',         name: 'Omega',          glyph: 'Ω',  label: 'Omega (Ω)' },
    YAT:           { id: 'YAT',           name: 'Yat',            glyph: 'Ѣ',  label: 'Yat (Ѣ)' },
    COPYRIGHT:     { id: 'COPYRIGHT',     name: 'Copyright',      glyph: '©',  label: 'Copyright (©)' },
    PSI:           { id: 'PSI',           name: 'Psi',            glyph: 'Ψ',  label: 'Psi (Ψ)' },
    STAR_HOLLOW:   { id: 'STAR_HOLLOW',   name: 'White Star',     glyph: '☆',  label: 'Hollow Star (☆)' },
    STAR_SOLID:    { id: 'STAR_SOLID',    name: 'Black Star',     glyph: '★',  label: 'Solid Star (★)' },
    ZHE:           { id: 'ZHE',           name: 'Zhe',            glyph: 'Ж',  label: 'Zhe / Spider (Ж)' },
    KOPPA:         { id: 'KOPPA',         name: 'Koppa',          glyph: 'Ϙ',  label: 'Koppa / Balloon (Ϙ)' },
    INV_QUESTION:  { id: 'INV_QUESTION',  name: 'Inverted ?',     glyph: '¿',  label: 'Inverted ? (¿)' },
    LAMBDA_STROKE: { id: 'LAMBDA_STROKE', name: 'Lambda Stroke',  glyph: 'ƛ',  label: 'Lambda Stroke (ƛ)' },
    OT:            { id: 'OT',            name: 'Ot (C-Q)',       glyph: 'Ѿ',  label: 'Ot / C-Q (Ѿ)' },
    DOUBLE_CROSS:  { id: 'DOUBLE_CROSS',  name: 'Double Cross',   glyph: '҂',  label: 'Double Cross (҂)' }
  };

  // Helper to render exact glyph or crisp SVG for in-game accuracy
  function getSymbolGlyphHTML(symKey, size = 28) {
    if (!symKey || !SYMBOLS_DEF[symKey]) return '?';
    if (symKey === 'DOUBLE_CROSS') {
      return `<svg class="sym-svg-glyph" viewBox="0 0 24 24" width="${size}" height="${size}" style="display:inline-block; vertical-align:middle; fill:currentColor;"><path d="M 17.7 2.7 L 15.7 2.0 L 13.0 5.3 L 9.7 3.3 L 7.7 4.7 L 11.0 10.0 L 9.0 12.7 L 5.7 10.7 L 3.0 12.7 L 7.0 16.0 L 5.7 21.3 L 8.3 22.0 L 11.0 18.0 L 15.0 20.7 L 17.0 17.3 L 12.3 14.7 L 15.0 10.7 L 18.3 12.7 L 21.0 10.7 L 17.0 7.3 Z" /></svg>`;
    }
    return SYMBOLS_DEF[symKey].glyph;
  }

  // Precomputed 16x16 bitmasks for the 12 symbols
  const SYMBOL_TEMPLATES = {
    OMEGA:         [0, 1584, 6172, 12302, 12294, 24582, 24582, 24582, 24582, 12294, 12300, 7192, 512, 16384, 32318, 0],
    YAT:           [0, 8064, 8064, 1536, 32704, 26208, 18016, 1536, 1912, 1564, 1564, 1548, 1564, 1564, 8184, 0],
    COPYRIGHT:     [0, 448, 1040, 2056, 9190, 9762, 17440, 19456, 19456, 19456, 17442, 9762, 12772, 2056, 1584, 0],
    LAMBDA_STROKE: [0, 2048, 15872, 13056, 1792, 3328, 2304, 768, 896, 1664, 3264, 3136, 6240, 6180, 12348, 0],
    OT:            [0, 2884, 7292, 14590, 31182, 29134, 29062, 29062, 25030, 29126, 29134, 14830, 14590, 7420, 1650, 0],
    PSI:           [0, 992, 12482, 12482, 12486, 12486, 12486, 12486, 6342, 3276, 992, 192, 192, 192, 0, 0],
    DOUBLE_CROSS:  [0, 32, 568, 1912, 4080, 1008, 508, 12796, 15260, 32640, 7936, 4064, 4064, 7904, 7168, 0],
    STAR_SOLID:    [0, 128, 128, 128, 448, 448, 32766, 8188, 4088, 2032, 2032, 2032, 1584, 1040, 0, 0],
    STAR_HOLLOW:   [0, 128, 128, 0, 320, 0, 32318, 4, 2056, 1040, 1040, 1168, 544, 1040, 0, 0],
    ZHE:           [0, 0, 31726, 2176, 144, 1168, 1184, 2016, 1168, 3224, 6284, 12740, 6, 2, 0, 0],
    KOPPA:         [0, 448, 992, 1048, 3096, 2056, 6152, 6152, 2056, 3080, 1048, 1008, 192, 128, 128, 0],
    INV_QUESTION:  [0, 128, 192, 128, 0, 128, 128, 128, 768, 1536, 1536, 3584, 3584, 1568, 864, 0]
  };

  // Precompute normalized vectors for NCC matching
  const PRECOMPUTED_TEMPLATES = {};
  for (const [key, rows] of Object.entries(SYMBOL_TEMPLATES)) {
    const vec = new Float32Array(256);
    let sum = 0;
    for (let r = 0; r < 16; r++) {
      const val = rows[r];
      for (let c = 0; c < 16; c++) {
        if (val & (1 << (15 - c))) {
          vec[r * 16 + c] = 1.0;
          sum += 1.0;
        }
      }
    }
    const mean = sum / 256;
    let normSq = 0;
    for (let i = 0; i < 256; i++) {
      vec[i] -= mean;
      normSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(normSq);
    PRECOMPUTED_TEMPLATES[key] = { vec, norm };
  }

  // ── MODULE STATE ──────────────────────────────────────────────────
  const state = {
    // 3 Reference slots
    refImages: [null, null, null],
    refCounts: [{}, {}, {}],
    refPanels: [[], [], []],   // grids read from each slot's picture: { cells, group }
    puzzle: 0,                 // which puzzle's grids are counted (section of a strip)
    refMeta: ['', '', ''],
    // 4 module buttons: index 0 -> Button 1, index 1 -> Button 2, etc.
    buttons: [null, null, null, null],
    moduleImage: null,
    // Aggregated counts for all 12 symbols
    totalCounts: {},
    // Currently selected target for paste (default: Slot 1)
    activeTarget: 'ref0' // 'ref0' | 'ref1' | 'ref2' | 'mod'
  };

  // ── SCREENSHOT READING: bomb_boomed's (window.BombLogic.symbols, bomb-logic.js) ──
  // A picture is a reference grid / strip when it has full 5×5 grids, otherwise the 4-button keypad
  // — whichever slot it was dropped on. Section #n of a strip belongs to puzzle #n; a single grid
  // belongs to the puzzle being counted. The same grid added twice is counted once.
  const SYV = window.BombLogic.symbols;

  function imageData(img) {
    const sc = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const W = Math.round(img.naturalWidth * sc), H = Math.round(img.naturalHeight * sc);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    return g.getImageData(0, 0, W, H);
  }

  // → { kind: 'grids', panels } | { kind: 'keypad', buttons } | { kind: 'none' }
  function readSymbolsPicture(img) {
    const d = imageData(img);
    const pr = SYV.syReadPanels(d);
    const fullGrids = pr.panels.filter(p => p.cells.filter(Boolean).length >= 20);
    if (!fullGrids.length) {
      const probe = SYV.syReadModule(d);
      if (probe.tiles >= 4) return { kind: 'keypad', buttons: probe.buttons };
    }
    const panels = fullGrids.length ? fullGrids : pr.panels;
    if (!panels.length) return { kind: 'none' };
    const used = [...new Set(panels.map(p => p.group || 0))].sort((a, b) => a - b);
    return {
      kind: 'grids',
      panels: panels.map(p => ({ cells: p.cells, group: panels.length === 1 ? state.puzzle : used.indexOf(p.group || 0) }))
    };
  }

  // grids of the puzzle being counted, every slot together, each distinct grid once
  function countedGrids() {
    const out = [];
    state.refPanels.forEach(list => list.forEach(g => {
      if (g.group !== state.puzzle) return;
      if (!out.some(o => o.cells.every((k, i) => k === g.cells[i]))) out.push(g);
    }));
    return out;
  }

  // ── SOLVER & UI LOGIC ─────────────────────────────────────────────
  function recalcTotalCounts() {
    const total = {};
    const grids = countedGrids();
    for (const g of grids) for (const k of g.cells) if (k) total[k] = (total[k] || 0) + 1;
    state.totalCounts = total;
    state.gridCount = grids.length;
  }

  function solveSymbols() {
    recalcTotalCounts();
    updateCountsDisplay();
    updateButtonTiles();
    updateSolutionDisplay();
  }

  function updateCountsDisplay() {
    const gridEl = document.getElementById('symbolsCountsGrid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    // a strip with several puzzles: pick which one is counted
    const pick = document.getElementById('symPuzzlePick');
    const groups = Math.max(0, ...state.refPanels.flat().map(g => g.group)) + 1;
    if (pick) {
      pick.style.display = groups > 1 || state.puzzle > 0 ? 'flex' : 'none';
      pick.innerHTML = 'Counting puzzle: ' + Array.from({ length: Math.max(groups, state.puzzle + 1) }, (_, i) =>
        `<button type="button" class="upload-btn${i === state.puzzle ? ' sym-puzzle-on' : ''}" style="margin-top:0; padding:2px 10px; font-size:11px;" onclick="window.symbolsModule.setPuzzle(${i})">#${i + 1}</button>`).join(' ') +
        ` <span style="color:#94a3b8;">(${state.gridCount || 0} grid${state.gridCount === 1 ? '' : 's'})</span>`;
    }

    for (const [key, def] of Object.entries(SYMBOLS_DEF)) {
      const count = state.totalCounts[key] || 0;
      const card = document.createElement('div');
      card.className = 'sym-count-badge';
      card.innerHTML = `
        <div class="sym-count-glyph">${getSymbolGlyphHTML(key, 22)}</div>
        <div class="sym-count-num ${count > 0 ? 'active' : ''}">${count}</div>
      `;
      gridEl.appendChild(card);
    }
  }

  function updateButtonTiles() {
    for (let i = 1; i <= 4; i++) {
      const symKey = state.buttons[i - 1];
      const glyphEl = document.getElementById(`symBtnGlyph-${i}`);
      const nameEl = document.getElementById(`symBtnName-${i}`);
      const countEl = document.getElementById(`symBtnCount-${i}`);

      if (symKey && SYMBOLS_DEF[symKey]) {
        const def = SYMBOLS_DEF[symKey];
        const count = state.totalCounts[symKey] || 0;
        if (glyphEl) glyphEl.innerHTML = getSymbolGlyphHTML(symKey, 38);
        if (nameEl) nameEl.textContent = def.name;
        if (countEl) countEl.textContent = `Count: ${count}`;
      } else {
        if (glyphEl) glyphEl.textContent = '?';
        if (nameEl) nameEl.textContent = 'Click to select';
        if (countEl) countEl.textContent = 'Count: -';
      }
    }
  }

  function updateSolutionDisplay() {
    const solBanner = document.getElementById('symbolsSolutionBanner');
    const stepsEl = document.getElementById('symbolsSolutionSteps');
    if (!solBanner || !stepsEl) return;

    // Check how many buttons are assigned
    const assignedButtons = [];
    for (let i = 0; i < 4; i++) {
      const symKey = state.buttons[i];
      if (symKey && SYMBOLS_DEF[symKey]) {
        assignedButtons.push({
          num: i + 1,
          symbolKey: symKey,
          symbolDef: SYMBOLS_DEF[symKey],
          count: state.totalCounts[symKey] || 0
        });
      }
    }

    if (assignedButtons.length < 4) {
      solBanner.style.display = 'none';
      stepsEl.innerHTML = `<div style="color:#64748b; font-size:13.5px; padding:12px; text-align:center;">
        Assign all 4 buttons (by pasting the module screenshot or clicking on each button) to see the descending press sequence.
      </div>`;
      return;
    }

    // With no grid read every count is 0 — there is no order to give ("1 2 3 4" would just be the
    // button numbers)
    if (!state.gridCount) {
      solBanner.style.display = 'none';
      stepsEl.innerHTML = `<div style="color:#64748b; font-size:13.5px; padding:12px; text-align:center;">
        Add the reference grid(s) to count the symbols.
      </div>`;
      state.answer = '';
      return;
    }

    // Sort buttons in descending order of count
    // In case of ties, preserve numerical order (1, 2, 3, 4)
    const sorted = [...assignedButtons].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.num - b.num;
    });

    const seqText = sorted.map(b => b.num).join('  ➔  ');
    state.answer = sorted.map(b => b.num).join(' ');   // copied as bomb_boomed copies it: "3 1 4 2"
    const warnings = [];
    const seen = new Set();
    for (const b of sorted) {
      if (seen.has(b.symbolKey)) warnings.push(`${b.symbolDef.name} is set on two buttons`);
      seen.add(b.symbolKey);
    }
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].count === sorted[i - 1].count && sorted[i].symbolKey !== sorted[i - 1].symbolKey) {
        warnings.push(`Tie: buttons ${sorted[i - 1].num} & ${sorted[i].num} both have ${sorted[i].count}`);
      }
    }
    solBanner.style.display = 'block';
    solBanner.style.cursor = 'pointer';
    solBanner.title = `Click to copy: ${state.answer}`;
    solBanner.onclick = () => {
      try {
        navigator.clipboard.writeText(state.answer).then(() => {
          const tag = document.getElementById('symCopied');
          if (tag) { tag.textContent = '✓ Copied'; setTimeout(() => { tag.textContent = ''; }, 1200); }
        }).catch(() => {});
      } catch (e) {}
    };
    solBanner.innerHTML = `
      <div style="font-size:11.5px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#ffd875; margin-bottom:4px;">
        PRESS SEQUENCE (DESCENDING BY COUNT)
      </div>
      <div style="font-family:'Outfit',sans-serif; font-size:32px; font-weight:900; color:#3ddc84; letter-spacing:1px;">
        ${seqText}
      </div>
      <div id="symCopied" style="font-size:12px; color:#3ddc84; min-height:14px;"></div>
      ${warnings.map(w => `<div style="font-size:12px; color:#ffd875;">⚠️ ${w}</div>`).join('')}
    `;

    let stepsHtml = '<div style="display:flex; flex-direction:column; gap:8px; width:100%;">';
    sorted.forEach((item, rank) => {
      stepsHtml += `
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid #1e2442; border-radius:10px; padding:10px 16px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-family:'Outfit',sans-serif; font-size:16px; font-weight:800; color:#ffd875; min-width:24px;">#${rank + 1}</span>
            <div style="background:#1e2442; border:1px solid #3b82f6; border-radius:8px; padding:4px 12px; font-size:20px; font-weight:900; color:#fff;">
              Button ${item.num}
            </div>
            <div style="font-size:24px; color:#a5b4fc; font-weight:800; min-width:32px; text-align:center; display:flex; align-items:center; justify-content:center;">
              ${getSymbolGlyphHTML(item.symbolKey, 24)}
            </div>
            <span style="font-size:13.5px; color:#cbd5e1; font-weight:600;">${item.symbolDef.name}</span>
          </div>
          <div style="font-size:16px; font-weight:800; color:#3ddc84;">
            ${item.count} <span style="font-size:11.5px; color:#94a3b8; font-weight:500;">occurrences</span>
          </div>
        </div>
      `;
    });
    stepsHtml += '</div>';
    stepsEl.innerHTML = stepsHtml;
  }

  // ── MODAL PICKER FOR MANUAL SYMBOL SELECTION ──────────────────────
  let activePickingButton = null;

  function openSymbolPicker(btnIndex) {
    activePickingButton = btnIndex;
    const modal = document.getElementById('symbolsPickerModal');
    const titleEl = document.getElementById('symbolsPickerTitle');
    if (!modal) return;
    if (titleEl) titleEl.textContent = `Select Symbol for Button ${btnIndex}`;
    modal.style.display = 'flex';
  }

  function closeSymbolPicker() {
    const modal = document.getElementById('symbolsPickerModal');
    if (modal) modal.style.display = 'none';
    activePickingButton = null;
  }

  function selectSymbolForActiveButton(symKey) {
    if (activePickingButton !== null) {
      state.buttons[activePickingButton - 1] = symKey;
      closeSymbolPicker();
      solveSymbols();
    }
  }

  // ── IMAGE HANDLING ────────────────────────────────────────────────
  function loadImage(file, cb) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => cb(img, e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleReferenceImage(file, slotIndex) {
    loadImage(file, (img, uri) => {
      const r = readSymbolsPicture(img);
      if (r.kind === 'keypad') { applyKeypad(r.buttons, uri); return; }
      state.refImages[slotIndex] = img;
      state.refPanels[slotIndex] = r.kind === 'grids' ? r.panels : [];
      const cells = state.refPanels[slotIndex].reduce((n, g) => n + g.cells.filter(Boolean).length, 0);
      const groups = new Set(state.refPanels[slotIndex].map(g => g.group)).size;
      state.refMeta[slotIndex] = r.kind === 'grids'
        ? `${state.refPanels[slotIndex].length} grid(s)${groups > 1 ? ` in ${groups} puzzles` : ''}, ${cells} cells read`
        : '⚠️ No symbols found';

      const prevEl = document.getElementById(`symRefPrev-${slotIndex}`);
      const metaEl = document.getElementById(`symRefMeta-${slotIndex}`);
      const clearBtn = document.getElementById(`symRefClear-${slotIndex}`);
      if (prevEl) { prevEl.src = uri; prevEl.style.display = 'block'; }
      if (metaEl) { metaEl.textContent = state.refMeta[slotIndex]; metaEl.style.display = 'block'; }
      if (clearBtn) clearBtn.style.display = 'inline-block';
      // the next paste goes to the next empty slot
      const nextEmpty = [0, 1, 2].find(i => !state.refImages[i]);
      if (nextEmpty !== undefined) selectTarget(`ref${nextEmpty}`);
      solveSymbols();
    });
  }

  function applyKeypad(buttons, uri) {
    for (let i = 0; i < 4; i++) if (buttons[i]) state.buttons[i] = buttons[i];
    const got = buttons.filter(Boolean).length;
    const prevEl = document.getElementById('symModPrev');
    const metaEl = document.getElementById('symModMeta');
    const clearBtn = document.getElementById('symModClear');
    if (prevEl) { prevEl.src = uri; prevEl.style.display = 'block'; }
    if (metaEl) { metaEl.textContent = got === 4 ? '4/4 buttons read' : `${got}/4 buttons read — pick the rest`; metaEl.style.display = 'block'; }
    if (clearBtn) clearBtn.style.display = 'inline-block';
    solveSymbols();
  }

  function clearReferenceSlot(slotIndex) {
    state.refImages[slotIndex] = null;
    state.refCounts[slotIndex] = {};
    state.refPanels[slotIndex] = [];
    state.refMeta[slotIndex] = '';

    const prevEl = document.getElementById(`symRefPrev-${slotIndex}`);
    const metaEl = document.getElementById(`symRefMeta-${slotIndex}`);
    const clearBtn = document.getElementById(`symRefClear-${slotIndex}`);
    const inputEl = document.getElementById(`symRefInput-${slotIndex}`);

    if (prevEl) { prevEl.src = ''; prevEl.style.display = 'none'; }
    if (metaEl) { metaEl.textContent = ''; metaEl.style.display = 'none'; }
    if (clearBtn) clearBtn.style.display = 'none';
    if (inputEl) inputEl.value = '';

    selectTarget(`ref${slotIndex}`);
    solveSymbols();
  }

  function handleModuleImage(file) {
    loadImage(file, (img, uri) => {
      const r = readSymbolsPicture(img);
      if (r.kind === 'grids') {
        // a reference grid dropped on the keypad slot: add it to the first empty grid slot
        const slot = [0, 1, 2].find(i => !state.refImages[i]);
        if (slot !== undefined) { handleReferenceImage(file, slot); return; }
      }
      state.moduleImage = img;
      if (r.kind === 'keypad') applyKeypad(r.buttons, uri);
      else {
        const metaEl = document.getElementById('symModMeta');
        if (metaEl) { metaEl.textContent = '⚠️ Keypad not found — click each button to pick its symbol'; metaEl.style.display = 'block'; }
      }
    });
  }

  function clearModuleImage() {
    state.moduleImage = null;
    state.buttons = [null, null, null, null];
    const prevEl = document.getElementById('symModPrev');
    const metaEl = document.getElementById('symModMeta');
    const clearBtn = document.getElementById('symModClear');
    const inputEl = document.getElementById('symModInput');
    if (prevEl) { prevEl.src = ''; prevEl.style.display = 'none'; }
    if (metaEl) { metaEl.textContent = ''; metaEl.style.display = 'none'; }
    if (clearBtn) clearBtn.style.display = 'none';
    if (inputEl) inputEl.value = '';
    selectTarget('mod');
    solveSymbols();
  }

  function resetAll() {
    for (let i = 0; i < 3; i++) clearReferenceSlot(i);
    state.puzzle = 0;
    clearModuleImage();
    selectTarget('ref0');
  }

  // ── TARGET SELECTION FOR PASTING ──────────────────────────────────
  function selectTarget(targetId) {
    state.activeTarget = targetId;
    for (let i = 0; i < 3; i++) {
      const slotEl = document.getElementById(`symRefSlot-${i}`);
      const pillEl = document.getElementById(`symRefTargetPill-${i}`);
      const isSelected = targetId === `ref${i}`;
      if (slotEl) slotEl.classList.toggle('selected', isSelected);
      if (pillEl) {
        pillEl.textContent = isSelected ? '🎯 Target (Ctrl+V)' : 'Click to Target';
      }
    }
    const modEl = document.getElementById('symModSlot');
    const modPill = document.getElementById('symModTargetPill');
    const isModSelected = targetId === 'mod';
    if (modEl) modEl.classList.toggle('selected', isModSelected);
    if (modPill) {
      modPill.textContent = isModSelected ? '🎯 Target (Ctrl+V)' : 'Click to Target';
    }
  }

  // ── RENDER DOM ────────────────────────────────────────────────────
  function renderUI() {
    const section = document.getElementById('symbolsSection');
    if (!section) return;

    section.innerHTML = `
      <style>
        .sym-shell {
          max-width: 1040px;
          margin: 0 auto;
          background: #0b0d19;
          border: 1px solid #1a1e36;
          border-radius: 16px;
          padding: 24px;
          color: #e2e8f0;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .sym-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #1e2442;
          padding-bottom: 14px;
          margin-bottom: 20px;
        }
        .sym-title {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: #ffd875;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sym-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 820px) {
          .sym-grid-2col { grid-template-columns: 1fr; }
        }
        .sym-panel {
          background: #101426;
          border: 1px solid #1e2442;
          border-radius: 12px;
          padding: 16px;
        }
        .sym-panel-title {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #a5b4fc;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sym-drop-slots {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .sym-slot {
          background: #141930;
          border: 2px dashed #2d3766;
          border-radius: 10px;
          padding: 12px 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .sym-slot:hover {
          border-color: #3b82f6;
          background: #18203f;
        }
        .sym-slot.selected {
          border-color: #ffd875 !important;
          border-style: solid !important;
          background: #1c2242 !important;
          box-shadow: 0 0 16px rgba(255, 216, 117, 0.4);
        }
        .sym-target-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          margin-top: 4px;
          letter-spacing: 0.3px;
          transition: all 0.15s ease;
        }
        .sym-slot.selected .sym-target-pill {
          background: #ffd875;
          color: #0b0d19;
        }
        .sym-slot:not(.selected) .sym-target-pill {
          background: rgba(255, 255, 255, 0.06);
          color: #64748b;
        }
        .sym-slot img {
          max-width: 100%;
          max-height: 90px;
          border-radius: 6px;
          margin: 6px auto;
          display: none;
          object-fit: contain;
        }
        .sym-btn-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          max-width: 320px;
          margin: 0 auto;
        }
        .sym-btn-tile {
          background: #f1f5f9;
          color: #0f172a;
          border: 2px solid #cbd5e1;
          border-radius: 12px;
          padding: 12px 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s;
          position: relative;
          min-height: 100px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .sym-btn-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
          border-color: #ffd875;
        }
        .sym-btn-num {
          position: absolute;
          top: 6px;
          left: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 800;
          color: #475569;
        }
        .sym-btn-glyph {
          font-size: 38px;
          font-weight: 900;
          line-height: 1;
          margin: 4px 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sym-btn-name {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
        }
        .sym-btn-count {
          font-size: 11px;
          font-weight: 700;
          color: #0284c7;
          margin-top: 2px;
        }
        .sym-counts-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          margin-top: 14px;
        }
        @media (max-width: 600px) {
          .sym-counts-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .sym-count-badge {
          background: #141930;
          border: 1px solid #1e2442;
          border-radius: 8px;
          padding: 6px;
          text-align: center;
        }
        .sym-count-glyph {
          font-size: 20px;
          font-weight: 800;
          color: #a5b4fc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 26px;
        }
        .sym-count-num {
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 800;
          color: #64748b;
        }
        .sym-count-num.active {
          color: #ffd875;
        }
        .sym-modal-overlay {
          position: fixed; inset: 0; z-index: 99999;
          background: rgba(4, 6, 18, 0.85);
          backdrop-filter: blur(8px);
          display: none; align-items: center; justify-content: center;
          padding: 16px;
        }
        .sym-modal-card {
          background: #0f1224;
          border: 1px solid #2d3766;
          border-radius: 16px;
          padding: 24px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.8);
        }
        .sym-picker-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin: 18px 0;
        }
        .sym-picker-item {
          background: #18203f;
          border: 1px solid #2d3766;
          border-radius: 10px;
          padding: 10px 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sym-picker-item:hover {
          background: #ffd875;
          color: #0b0d19;
          border-color: #ffd875;
          transform: scale(1.06);
        }
        .sym-picker-glyph {
          font-size: 28px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
        }
        .sym-picker-label {
          font-size: 10.5px;
          margin-top: 4px;
        }
      </style>

      <div class="sym-shell">
        <div class="sym-header">
          <h2 class="sym-title">
            <span>🔣</span> Symbols Solver
          </h2>
          <div style="display:flex; gap:8px;">
            <button class="upload-btn" style="margin-top:0; padding:6px 14px; font-size:12.5px;" onclick="window.symbolsModule.resetAll()">
              ↺ Reset All
            </button>
          </div>
        </div>

        <div style="background:#12162e; border:1px solid #202750; border-radius:10px; padding:10px 14px; font-size:12.5px; line-height:1.5; color:#94a3b8; margin-bottom:20px;">
          <strong>Quick Instructions:</strong><br>
          1. <strong>Click any slot or box</strong> below to select it as the active paste target (highlighted in gold), then press <kbd style="background:#222; padding:1px 4px; border-radius:3px;">Ctrl+V</kbd> to paste into it, or use its <strong>Upload</strong> button.<br>
          2. <strong>Reference Slots (1–3):</strong> Load your reference sheets with symbol grids (handles single 5×5 or multi-stage strips).<br>
          3. <strong>Module Keypad:</strong> Paste your 4-button module screenshot into the keypad slot, or click any button tile below to pick symbols manually.<br>
          4. <strong>Solution:</strong> The solver computes total symbol frequencies and gives the exact descending press sequence!
        </div>

        <div class="sym-grid-2col">
          <!-- LEFT COLUMN: REFERENCE IMAGES (1 to 3 slots) -->
          <div class="sym-panel">
            <div class="sym-panel-title">
              <span>🖼️</span> Reference Symbol Grids (1–3 Slots)
            </div>
            <div class="sym-drop-slots">
              ${[0, 1, 2].map(idx => `
                <div class="sym-slot ${state.activeTarget === 'ref' + idx ? 'selected' : ''}" id="symRefSlot-${idx}" onclick="window.symbolsModule.selectTarget('ref${idx}')">
                  <input type="file" id="symRefInput-${idx}" accept="image/*" style="display:none;" onchange="window.symbolsModule.onRefFile(event, ${idx})">
                  <div style="font-size:12px; font-weight:700; color:#ffd875;">Slot ${idx + 1}</div>
                  <div class="sym-target-pill" id="symRefTargetPill-${idx}">
                    ${state.activeTarget === 'ref' + idx ? '🎯 Target (Ctrl+V)' : 'Click to Target'}
                  </div>
                  <img id="symRefPrev-${idx}">
                  <div id="symRefMeta-${idx}" style="font-size:10px; color:#3ddc84; font-weight:600; display:none; margin-top:4px;"></div>
                  <div style="display:flex; gap:6px; justify-content:center; margin-top:8px; align-items:center;">
                    <button type="button" class="upload-btn" style="margin-top:0; padding:3px 10px; font-size:11px;" onclick="event.stopPropagation(); document.getElementById('symRefInput-${idx}').click()">Upload</button>
                    <button type="button" id="symRefClear-${idx}" style="display:none; background:#ff5f57; color:#fff; border:none; border-radius:4px; font-size:10.5px; padding:3px 8px; cursor:pointer;" onclick="event.stopPropagation(); window.symbolsModule.clearRef(${idx})">Clear</button>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- LIVE COUNTS BREAKDOWN -->
            <div style="margin-top:20px; border-top:1px solid #1e2442; padding-top:14px;">
              <div style="font-size:12px; font-weight:700; color:#cbd5e1; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                Total Reference Symbol Counts (All Slots, each grid once)
              </div>
              <div id="symPuzzlePick" style="display:none; gap:6px; align-items:center; flex-wrap:wrap; font-size:12px; color:#cbd5e1; margin-bottom:8px;"></div>
              <div class="sym-counts-grid" id="symbolsCountsGrid"></div>
            </div>
          </div>

          <!-- RIGHT COLUMN: 4-BUTTON MODULE SCREENSHOT & PICKER -->
          <div class="sym-panel">
            <div class="sym-panel-title">
              <span>🔘</span> 4 Module Buttons (1, 2, 3, 4)
            </div>

            <!-- Module Screenshot Upload Box -->
            <div class="sym-slot ${state.activeTarget === 'mod' ? 'selected' : ''}" id="symModSlot" style="margin-bottom:16px; padding:12px;" onclick="window.symbolsModule.selectTarget('mod')">
              <input type="file" id="symModInput" accept="image/*" style="display:none;" onchange="window.symbolsModule.onModFile(event)">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                <div style="font-size:13px; font-weight:700; color:#a5b4fc;">4-Button Keypad Screenshot</div>
                <div class="sym-target-pill" id="symModTargetPill">
                  ${state.activeTarget === 'mod' ? '🎯 Target (Ctrl+V)' : 'Click to Target'}
                </div>
              </div>
              <div style="font-size:11px; color:#94a3b8; margin:4px 0 6px;">Click here to target for pasting, or click Upload</div>
              <img id="symModPrev">
              <div id="symModMeta" style="font-size:11px; color:#3ddc84; font-weight:600; display:none; margin-top:4px;"></div>
              <div style="display:flex; gap:8px; justify-content:center; margin-top:8px; align-items:center;">
                <button type="button" class="upload-btn" style="margin-top:0; padding:4px 14px; font-size:11.5px;" onclick="event.stopPropagation(); document.getElementById('symModInput').click()">Upload</button>
                <button type="button" id="symModClear" style="display:none; background:#ff5f57; color:#fff; border:none; border-radius:4px; font-size:11px; padding:4px 10px; cursor:pointer;" onclick="event.stopPropagation(); window.symbolsModule.clearMod()">Clear</button>
              </div>
            </div>

            <!-- 4-Button Interactive Grid -->
            <div class="sym-btn-grid">
              ${[1, 2, 3, 4].map(btnNum => `
                <div class="sym-btn-tile" id="symBtnTile-${btnNum}" onclick="window.symbolsModule.openPicker(${btnNum})">
                  <span class="sym-btn-num">${btnNum}</span>
                  <div class="sym-btn-glyph" id="symBtnGlyph-${btnNum}">?</div>
                  <div class="sym-btn-name" id="symBtnName-${btnNum}">Click to select</div>
                  <div class="sym-btn-count" id="symBtnCount-${btnNum}">Count: -</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- SOLUTION BANNER -->
        <div style="margin-top:24px;">
          <div id="symbolsSolutionBanner" style="display:none; background:rgba(61,220,132,0.08); border:2px solid #3ddc84; border-radius:12px; padding:18px; text-align:center; box-shadow:0 0 30px rgba(61,220,132,0.15);"></div>
          <div id="symbolsSolutionSteps" style="margin-top:14px;"></div>
        </div>
      </div>

      <!-- MODAL PICKER FOR MANUAL SELECTION -->
      <div class="sym-modal-overlay" id="symbolsPickerModal" onclick="window.symbolsModule.closePicker()">
        <div class="sym-modal-card" onclick="event.stopPropagation()">
          <h3 id="symbolsPickerTitle" style="font-family:'Outfit',sans-serif; font-size:18px; color:#ffd875; margin:0 0 10px;">Select Symbol</h3>
          <div style="font-size:12px; color:#94a3b8; margin-bottom:12px;">Click a symbol to assign it to this button:</div>
          <div class="sym-picker-grid">
            ${Object.entries(SYMBOLS_DEF).map(([key, def]) => `
              <div class="sym-picker-item" onclick="window.symbolsModule.pickSymbol('${key}')">
                <div class="sym-picker-glyph">${getSymbolGlyphHTML(key, 28)}</div>
                <div class="sym-picker-label">${def.name}</div>
              </div>
            `).join('')}
          </div>
          <button class="upload-btn" style="margin-top:8px; padding:6px 16px; font-size:12px;" onclick="window.symbolsModule.closePicker()">Cancel</button>
        </div>
      </div>
    `;
  }

  // ── GLOBAL PASTE LISTENER ─────────────────────────────────────────
  let pasteListenerAttached = false;

  function setupPasteListener() {
    if (pasteListenerAttached) return;
    pasteListenerAttached = true;

    window.addEventListener('paste', (e) => {
      const activeSection = document.querySelector('.page-section.active');
      if (!activeSection || activeSection.id !== 'symbolsSection') return;

      const target = state.activeTarget || 'mod';
      const targetHandler = (file) => {
        if (!file) return;
        if (target === 'mod') {
          handleModuleImage(file);
        } else if (target === 'ref0') {
          handleReferenceImage(file, 0);
        } else if (target === 'ref1') {
          handleReferenceImage(file, 1);
        } else if (target === 'ref2') {
          handleReferenceImage(file, 2);
        } else {
          handleReferenceImage(file, 0);
        }
      };

      if (window.BombDragDrop) {
        window.BombDragDrop.handleDataTransfer(e.clipboardData, targetHandler);
        return;
      }

      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            targetHandler(file);
            break;
          }
        }
      }
    });
  }

  // ── PUBLIC INTERFACE ──────────────────────────────────────────────
  let isInitialized = false;

  window.symbolsModule = {
    init: function () {
      if (!isInitialized) {
        window.symbolsModuleState = state;
        renderUI();
        solveSymbols();
        setupPasteListener();
        if (window.BombDragDrop) window.BombDragDrop.initAllDropzones();
        isInitialized = true;
      }
    },
    selectTarget: function (targetId) {
      selectTarget(targetId);
    },
    onRefFile: function (event, slotIndex) {
      const file = event.target.files && event.target.files[0];
      if (file) {
        handleReferenceImage(file, slotIndex);
        event.target.value = '';
      }
    },
    clearRef: function (slotIndex) {
      clearReferenceSlot(slotIndex);
    },
    onModFile: function (event) {
      const file = event.target.files && event.target.files[0];
      if (file) {
        handleModuleImage(file);
        event.target.value = '';
      }
    },
    clearMod: function () {
      clearModuleImage();
    },
    openPicker: function (btnIndex) {
      openSymbolPicker(btnIndex);
    },
    closePicker: function () {
      closeSymbolPicker();
    },
    pickSymbol: function (symKey) {
      selectSymbolForActiveButton(symKey);
    },
    resetAll: function () {
      resetAll();
    },
    setPuzzle: function (i) {
      state.puzzle = i;
      solveSymbols();
    }
  };

  window.initSymbolsModule = function () {
    if (window.symbolsModule && typeof window.symbolsModule.init === 'function') {
      window.symbolsModule.init();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.symbolsModule.init());
  } else {
    window.symbolsModule.init();
  }
})();
