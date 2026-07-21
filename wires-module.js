/**
 * Wire Sequences Module Solver
 * Supports 5 sequential panels, cumulative occurrence tracking across stages,
 * image recognition, manual input controls, and dynamic guidebook rule parsing.
 */

(function () {
  const DEFAULT_WIRE_RULES = `Red
first red occurrence: cut if connected to A or B.
second red occurrence: cut if connected to B or C.
third red occurrence: cut if connected to A or C.
fourth red occurrence: cut if connected to C.
fifth red occurrence: cut if connected to B.
sixth red occurrence: cut if connected to A or C.
seventh red occurrence: cut if connected to A or B.
eighth red occurrence: cut if connected to A, B or C.
ninth red occurrence: cut if connected to B or C.

Blue
first blue occurrence: cut if connected to C.
second blue occurrence: cut if connected to A.
third blue occurrence: cut if connected to A or B.
fourth blue occurrence: cut if connected to B or C.
fifth blue occurrence: cut if connected to A or C.
sixth blue occurrence: cut if connected to B.
seventh blue occurrence: cut if connected to A or B.
eighth blue occurrence: cut if connected to B.
ninth blue occurrence: cut if connected to A.

Black
first black occurrence: cut if connected to B.
second black occurrence: cut if connected to B.
third black occurrence: cut if connected to A or B.
fourth black occurrence: cut if connected to A or C.
fifth black occurrence: cut if connected to C.
sixth black occurrence: cut if connected to B.
seventh black occurrence: cut if connected to B or C.
eighth black occurrence: cut if connected to A or B.
ninth black occurrence: cut if connected to A, B or C.`;

  const wireState = {
    initialized: false,
    activeStage: 1, // 1 to 5
    rulesText: DEFAULT_WIRE_RULES,
    parsedRules: null,
    stages: [
      [{ color: 'none', to: 'none' }, { color: 'none', to: 'none' }, { color: 'none', to: 'none' }], // Stage 1
      [{ color: 'none', to: 'none' }, { color: 'none', to: 'none' }, { color: 'none', to: 'none' }], // Stage 2
      [{ color: 'none', to: 'none' }, { color: 'none', to: 'none' }, { color: 'none', to: 'none' }], // Stage 3
      [{ color: 'none', to: 'none' }, { color: 'none', to: 'none' }, { color: 'none', to: 'none' }], // Stage 4
      [{ color: 'none', to: 'none' }, { color: 'none', to: 'none' }, { color: 'none', to: 'none' }]  // Stage 5
    ]
  };

  function initWiresModule() {
    if (wireState.initialized) return;
    wireState.initialized = true;

    wireState.parsedRules = parseWireRulesText(wireState.rulesText);

    // Bind Stage buttons
    for (let s = 1; s <= 5; s++) {
      const btn = document.getElementById(`wireStageBtn-${s}`);
      if (btn) {
        btn.addEventListener('click', () => {
          setWireActiveStage(s);
        });
      }
    }

    // Bind Reset button
    const resetBtn = document.getElementById('wireResetAllBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        for (let s = 0; s < 5; s++) {
          wireState.stages[s] = [
            { color: 'none', to: 'none' },
            { color: 'none', to: 'none' },
            { color: 'none', to: 'none' }
          ];
        }
        updateWireStageControlsUI();
        evaluateWireSequences();
      });
    }

    // Bind 3 Wire Inputs for current stage
    for (let slot = 1; slot <= 3; slot++) {
      const colSel = document.getElementById(`wireColorSelect-${slot}`);
      const toSel = document.getElementById(`wireToSelect-${slot}`);

      if (colSel) {
        colSel.addEventListener('change', () => {
          const sIdx = wireState.activeStage - 1;
          wireState.stages[sIdx][slot - 1].color = colSel.value;
          evaluateWireSequences();
        });
      }
      if (toSel) {
        toSel.addEventListener('change', () => {
          const sIdx = wireState.activeStage - 1;
          wireState.stages[sIdx][slot - 1].to = toSel.value;
          evaluateWireSequences();
        });
      }
    }

    // Bind Rules Textarea
    const rulesArea = document.getElementById('wireRulesInput');
    const resetRulesBtn = document.getElementById('wireResetRulesBtn');
    if (rulesArea) {
      rulesArea.value = wireState.rulesText;
      rulesArea.addEventListener('input', () => {
        wireState.rulesText = rulesArea.value;
        wireState.parsedRules = parseWireRulesText(wireState.rulesText);
        evaluateWireSequences();
      });
    }
    if (resetRulesBtn) {
      resetRulesBtn.addEventListener('click', () => {
        wireState.rulesText = DEFAULT_WIRE_RULES;
        if (rulesArea) rulesArea.value = DEFAULT_WIRE_RULES;
        wireState.parsedRules = parseWireRulesText(DEFAULT_WIRE_RULES);
        evaluateWireSequences();
      });
    }

    // Bind Dropzone & File Input
    const dropzone = document.getElementById('wireDropzone');
    const fileInput = document.getElementById('wireFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) processWireImage(file);
        e.target.value = '';
      });
    }
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('active');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('active'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('active');
        const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
        if (file) processWireImage(file);
      });
    }

    document.addEventListener('paste', handleWirePaste);

    setWireActiveStage(1);
  }

  function setWireActiveStage(s) {
    wireState.activeStage = s;
    for (let i = 1; i <= 5; i++) {
      const btn = document.getElementById(`wireStageBtn-${i}`);
      if (btn) {
        const isActive = (i === s);
        btn.classList.toggle('active', isActive);
        if (isActive) {
          btn.style.background = '#f5c542';
          btn.style.color = '#0e0e1e';
          btn.style.borderColor = '#f5c542';
          btn.style.fontWeight = 'bold';
          btn.style.boxShadow = '0 0 14px rgba(245, 197, 66, 0.7)';
          btn.style.transform = 'scale(1.06)';
        } else {
          btn.style.background = '#131328';
          btn.style.color = '#aaa';
          btn.style.borderColor = '#2d2d54';
          btn.style.fontWeight = 'normal';
          btn.style.boxShadow = 'none';
          btn.style.transform = 'scale(1.0)';
        }
      }
    }
    const titleEl = document.getElementById('wireCurrentStageTitle');
    if (titleEl) titleEl.textContent = `Stage ${s} / 5 Inputs`;

    updateWireStageControlsUI();
    evaluateWireSequences();
  }

  function updateWireStageControlsUI() {
    const sIdx = wireState.activeStage - 1;
    const currentSlotState = wireState.stages[sIdx];

    for (let slot = 1; slot <= 3; slot++) {
      const colSel = document.getElementById(`wireColorSelect-${slot}`);
      const toSel = document.getElementById(`wireToSelect-${slot}`);
      if (colSel) colSel.value = currentSlotState[slot - 1].color;
      if (toSel) toSel.value = currentSlotState[slot - 1].to;
    }
  }

  function handleWirePaste(e) {
    const section = document.getElementById('wiresSection');
    if (!section || !section.classList.contains('active')) return;

    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          processWireImage(item.getAsFile());
          return;
        }
      }
    }
  }

  // ── DYNAMIC WIRE RULES PARSER ──────────────────────────────────

  function parseWireRulesText(text) {
    const rules = { red: [], blue: [], black: [] };
    let currentColor = null;

    const ordMap = {
      '1st': 0, 'first': 0, '2nd': 1, 'second': 1, '3rd': 2, 'third': 2,
      '4th': 3, 'fourth': 3, '5th': 4, 'fifth': 4, '6th': 5, 'sixth': 5,
      '7th': 6, 'seventh': 6, '8th': 7, 'eighth': 7, '9th': 8, 'ninth': 8
    };

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (lower.startsWith('red')) { currentColor = 'red'; continue; }
      if (lower.startsWith('blue')) { currentColor = 'blue'; continue; }
      if (lower.startsWith('black')) { currentColor = 'black'; continue; }

      const occMatch = lower.match(/(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)/i);
      if (!occMatch) continue;

      let col = currentColor;
      if (lower.includes('red')) col = 'red';
      else if (lower.includes('blue')) col = 'blue';
      else if (lower.includes('black')) col = 'black';

      if (!col || !rules[col]) continue;

      const idx = ordMap[occMatch[1].toLowerCase()];
      if (idx === undefined) continue;

      const targets = [];
      if (/\ba\b/i.test(line) || lower.includes('to a') || lower.includes('a or')) targets.push('A');
      if (/\bb\b/i.test(line) || lower.includes('to b') || lower.includes('b or') || lower.includes('or b')) targets.push('B');
      if (/\bc\b/i.test(line) || lower.includes('to c') || lower.includes('or c')) targets.push('C');

      rules[col][idx] = [...new Set(targets)];
    }

    return rules;
  }

  // ── EVALUATOR (ACROSS ALL 5 STAGES) ───────────────────────────

  function evaluateWireSequences() {
    const occCounts = { red: 0, blue: 0, black: 0 };
    const allResults = [];

    const ordinalNames = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

    for (let sIdx = 0; sIdx < 5; sIdx++) {
      const stageNum = sIdx + 1;
      const stageWires = wireState.stages[sIdx];
      const stageRes = [];

      for (let slot = 0; slot < 3; slot++) {
        const wire = stageWires[slot];
        if (wire.color === 'none' || wire.to === 'none') {
          stageRes.push({
            slot: slot + 1,
            hasWire: false
          });
          continue;
        }

        const color = wire.color;
        occCounts[color] = (occCounts[color] || 0) + 1;
        const occNum = occCounts[color];
        const occIndex = occNum - 1;

        const ruleTargets = wireState.parsedRules?.[color]?.[occIndex] || [];
        const shouldCut = ruleTargets.includes(wire.to);
        const ordName = ordinalNames[occIndex] || `${occNum}th`;

        stageRes.push({
          slot: slot + 1,
          hasWire: true,
          color: color,
          to: wire.to,
          occNum: occNum,
          ordName: ordName,
          shouldCut: shouldCut,
          ruleTargets: ruleTargets
        });
      }

      allResults.push({ stageNum: stageNum, wires: stageRes });
    }

    renderWireResultsUI(allResults);
  }

  function renderWireResultsUI(allResults) {
    const resultCard = document.getElementById('wireResultCard');
    const actionText = document.getElementById('wireActionText');
    const summaryList = document.getElementById('wireSummaryList');
    const statusEl = document.getElementById('wireStatus');

    const activeStageRes = allResults[wireState.activeStage - 1];

    let html = '';
    let activeActions = [];

    if (activeStageRes) {
      for (const w of activeStageRes.wires) {
        if (!w.hasWire) {
          html += `<div style="padding:10px; border-radius:8px; background:#121224; margin-bottom:8px; border:1px solid #222244; color:#666; font-size:14px;">
          Wire ${w.slot}: <em style="color:#888;">No wire connected</em>
        </div>`;
        } else {
          const cutColor = w.shouldCut ? '#4caf50' : '#f44336';
          const cutBadge = w.shouldCut ? '✂️ CUT WIRE' : '⛔ LEAVE WIRE';
          const colorUpper = w.color.toUpperCase();

          activeActions.push(`Wire ${w.slot} (${colorUpper} -> ${w.to}): ${w.shouldCut ? 'CUT' : 'LEAVE'}`);

          html += `<div style="padding:12px; border-radius:10px; background:${w.shouldCut ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)'}; margin-bottom:10px; border:1px solid ${cutColor}; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="color:#fff; font-weight:600; font-size:15px;">Wire ${w.slot}: <span style="color:#f5c542;">${w.color.toUpperCase()}</span> connected to <span style="color:#f5c542;">${w.to}</span></div>
            <div style="color:#aaa; font-size:12px; margin-top:2px;">Occurrence: <strong>${w.ordName} ${colorUpper}</strong> wire across module</div>
          </div>
          <div style="font-weight:700; font-size:14px; color:${cutColor}; padding:6px 12px; border-radius:6px; background:rgba(0,0,0,0.3); border:1px solid ${cutColor};">
            ${cutBadge}
          </div>
        </div>`;
        }
      }
    }

    if (summaryList) summaryList.innerHTML = html;

    if (actionText) {
      if (activeActions.length > 0) {
        actionText.textContent = activeActions.join(' | ');
      } else {
        actionText.textContent = "No wires connected on this stage";
      }
    }

    if (statusEl) {
      statusEl.textContent = `Stage ${wireState.activeStage} evaluated. Switch stages above to configure all 5 panels.`;
      statusEl.style.color = '#aaa';
    }
  }

  // ── IMAGE RECOGNITION FOR WIRE SEQUENCES ───────────────────────

  function processWireImage(file) {
    if (!file) return;

    const status = document.getElementById('wireStatus');
    if (status) { status.textContent = 'Tracing wire sequences in image...'; status.style.color = '#aaa'; }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        renderWireCanvas(img);
        analyzeWireImage(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderWireCanvas(img) {
    const canvas = document.getElementById('wireCanvas');
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

  function analyzeWireImage(img) {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, img.width, img.height).data;

    // 1. Calculate median panel background brightness for robust contrast comparison
    const brList = [];
    for (let y = Math.floor(img.height * 0.35); y <= Math.floor(img.height * 0.65); y += 3) {
      for (let x = Math.floor(img.width * 0.35); x <= Math.floor(img.width * 0.65); x += 3) {
        const idx = (y * img.width + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const br = (r + g + b) / 3;
        const diff = Math.max(r, g, b) - Math.min(r, g, b);
        if (br >= 15 && br <= 75 && diff < 20) {
          brList.push(br);
        }
      }
    }
    brList.sort((a, b) => a - b);
    const bgBr = brList.length > 0 ? brList[Math.floor(brList.length / 2)] : 40;

    // 2. Define geometry for Left (1, 2, 3) and Right (A, B, C) sockets
    const leftX = Math.floor(img.width * 0.22);
    const rightX = Math.floor(img.width * 0.78);
    const topY = Math.floor(img.height * 0.22);
    const botY = Math.floor(img.height * 0.78);

    const panelW = rightX - leftX;
    const panelH = botY - topY;

    const x_left_socket = Math.floor(leftX + panelW * 0.10);
    const x_right_socket = Math.floor(leftX + panelW * 0.90);

    const slotHeights = [
      Math.floor(topY + panelH * 0.15), // Slot 1 (Top)
      Math.floor(topY + panelH * 0.50), // Slot 2 (Mid)
      Math.floor(topY + panelH * 0.85)  // Slot 3 (Bot)
    ];

    const targetHeights = {
      'A': Math.floor(topY + panelH * 0.15),
      'B': Math.floor(topY + panelH * 0.50),
      'C': Math.floor(topY + panelH * 0.85)
    };

    const sIdx = wireState.activeStage - 1;

    for (let slot = 0; slot < 3; slot++) {
      const sy = slotHeights[slot];

      let bestMatch = { color: 'none', to: 'none', matchScore: 0 };
      const targets = ['A', 'B', 'C'];

      for (const target of targets) {
        const ty = targetHeights[target];

        let redPts = 0, bluePts = 0, blackPts = 0, totalPts = 0;

        // Sample 35 points along the ray line from (x_left_socket, sy) to (x_right_socket, ty)
        const numSteps = 35;
        for (let step = 4; step <= numSteps - 4; step++) {
          const t = step / numSteps;
          const px = Math.floor(x_left_socket + (x_right_socket - x_left_socket) * t);
          const py = Math.floor(sy + (ty - sy) * t);

          // Check 3x3 neighborhood around (px, py) along line
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = px + dx;
              const ny = py + dy;
              if (nx < 0 || nx >= img.width || ny < 0 || ny >= img.height) continue;

              const idx = (ny * img.width + nx) * 4;
              const r = imgData[idx];
              const g = imgData[idx + 1];
              const b = imgData[idx + 2];
              const br = (r + g + b) / 3;

              totalPts++;

              // Red wire (vibrant red rubber)
              if (r > 105 && (r - g > 25) && (r - b > 25)) {
                redPts++;
              }
              // Blue wire (vibrant blue rubber)
              else if (b > 85 && (b - r > 18) && (b - g > 10)) {
                bluePts++;
              }
              // Black wire (dark rubber tube distinctly lower than background)
              else if (br < bgBr - 6 && br < 50 && (Math.max(r, g, b) - Math.min(r, g, b) < 22)) {
                blackPts++;
              }
            }
          }
        }

        const minScore = Math.max(5, Math.floor(totalPts * 0.08));

        if (redPts > minScore && redPts > bestMatch.matchScore) {
          bestMatch = { color: 'red', to: target, matchScore: redPts };
        }
        if (bluePts > minScore && bluePts > bestMatch.matchScore) {
          bestMatch = { color: 'blue', to: target, matchScore: bluePts };
        }
        if (blackPts > minScore && blackPts > bestMatch.matchScore) {
          bestMatch = { color: 'black', to: target, matchScore: blackPts };
        }
      }

      wireState.stages[sIdx][slot] = { color: bestMatch.color, to: bestMatch.to };
    }

    updateWireStageControlsUI();
    evaluateWireSequences();

    const status = document.getElementById('wireStatus');
    if (status) {
      status.textContent = `Stage ${wireState.activeStage} wires analyzed successfully!`;
      status.style.color = '#4caf50';
    }
  }

  window.initWiresModule = initWiresModule;
})();
