/**
 * Piano Solver Module for Keep Talking and Nobody Explodes
 * Paste / drop the staff picture (clef and both notes are read), or click the staff: left half for
 * Note 1, right half for Note 2. The answer is the interval between the two notes as drawn (no
 * up / down); clicking it copies its name ("Major 6th"). The key signature is in the bot's message ("Key Signature: E Major") — paste it
 * into the key field: notes without their own ♯ / ♭ take it.
 * Reading and interval logic are bomb_boomed's (window.BombLogic.piano, bomb-logic.js).
 */

(function() {
  const STORAGE_KEY = "ktane_piano_codes";

  const PN = window.BombLogic.piano;
  // no answer until notes are placed (two default notes would read as an answer)
  let touched = false;
  let keySig = ''; // '' = no key signature / C major

  const defaultCodes = {
    "Minor 2nd": "5.31",
    "Major 2nd": "7.77",
    "Minor 3rd": "4.40",
    "Major 3rd": "7.37",
    "Perfect 4th": "1.60",
    "Tritone": "9.83",
    "Perfect 5th": "8.56",
    "Minor 6th": "1.15",
    "Major 6th": "4.25",
    "Minor 7th": "8.82",
    "Major 7th": "2.41",
    "Octave": "4.61"
  };

  let intervalCodes = {...defaultCodes};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      intervalCodes = Object.assign({}, defaultCodes, JSON.parse(stored));
    }
  } catch (e) {
    // Silent catch
  }

  function injectPianoStyles() {
    if (document.getElementById('pianoCustomStyles')) return;
    const css = `
    .piano-shell {
      max-width: 680px;
      margin: auto;
      background: #0f1026;
      padding: 24px;
      border-radius: 16px;
      border: 1px solid #23254e;
      color: #e2e8f0;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .piano-drop { border: 2px dashed #35355c; border-radius: 10px; padding: 14px; color: #aaa; font-size: 13px; cursor: pointer; transition: all 0.15s; }
    .piano-drop:hover, .piano-drop.dragover { border-color: #ffd875; color: #ffd875; background: rgba(255,216,117,0.05); }
    .piano-read-status { font-size: 12px; min-height: 16px; margin: 8px 0; text-align: left; }
    .piano-key-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; text-align: left; }
    .piano-key-row label { color: #ffd875; font-size: 12px; font-weight: 800; letter-spacing: 1px; }
    .piano-key-row input, .piano-key-row select { background: #080814; border: 1px solid #25253f; color: #fff; border-radius: 6px; padding: 7px 8px; font-size: 13px; outline: none; max-width: 100%; }
    .piano-key-row input { width: 9.5em; }
    .piano-key-row input.bad { border-color: #ff5c5c; }
    .piano-key-tip { font-size: 12px; color: #8c8fae; flex-basis: 100%; }
    .piano-dirs { display: flex; flex-wrap: wrap; gap: 12px; width: 100%; }
    .piano-dir { flex: 1 1 200px; min-width: 0; background: #12132a; border: 1px solid #25284e; border-radius: 12px; padding: 12px; cursor: pointer; text-align: center; }
    .piano-dir:hover { border-color: #ffd875; }
    .piano-dir.drawn { border-color: #4caf50; box-shadow: 0 0 0 1px #4caf50 inset; }
    .piano-dir-lbl { font-size: 12px; font-weight: 800; letter-spacing: 1px; color: #94a3b8; }
    .piano-dir-how { font-size: 12px; color: #8c8fae; margin-top: 4px; }
    .piano-dir-code { font-size: 13px; color: #ffd875; margin-top: 6px; }
    .piano-dir-copied { font-size: 12px; color: #4caf50; min-height: 14px; margin-top: 2px; font-weight: 800; }
    .piano-card {
      background: #090a18;
      border: 1.5px solid #1f2142;
      border-radius: 14px;
      padding: 20px;
      text-align: center;
    }
    .piano-card-title {
      font-family: 'Outfit', 'Arial Black', sans-serif;
      font-size: 18px;
      font-weight: 800;
      color: #ffd875;
      letter-spacing: 1.2px;
      margin-bottom: 16px;
      text-transform: uppercase;
      border-bottom: 1px solid #1f2142;
      padding-bottom: 8px;
    }
    .piano-canvas-container {
      display: flex;
      justify-content: center;
      background: #070714;
      border-radius: 10px;
      padding: 10px;
      border: 1px solid #1e1e38;
      margin-bottom: 16px;
    }
    .piano-canvas-container canvas {
      max-width: 100%;
      height: auto;
      display: block;
      cursor: crosshair;
      border-radius: 6px;
    }
    .piano-result-box {
      min-height: 100px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: #070714;
      border-radius: 10px;
      padding: 18px;
      border: 1px solid #1e1e38;
      color: #eee;
    }
    .piano-solution-press {
      font-family: 'Outfit', sans-serif;
      font-size: 42px;
      font-weight: 900;
      color: #00ff66;
      margin: 4px 0;
      text-shadow: 0 0 20px rgba(0, 255, 102, 0.45);
      letter-spacing: 2px;
      text-align: center;
      text-transform: uppercase;
    }
    .piano-codes-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 10px;
    }
    .piano-codes-table th, .piano-codes-table td {
      border: 1px solid #25253f;
      padding: 8px 10px;
      text-align: left;
    }
    .piano-codes-table th {
      background: #0a0a1a;
      color: #ffd875;
    }
    .piano-codes-table input {
      background: #080811;
      border: 1px solid #25253f;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      width: 70px;
      font-family: monospace;
      outline: none;
    }
    .piano-codes-table input:focus {
      border-color: #ffd875;
    }
    `;
    const style = document.createElement('style');
    style.id = 'pianoCustomStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function initPianoModule() {
    injectPianoStyles();

    const container = document.getElementById("pianoSection");
    if (!container) return;

    container.innerHTML = `
      <div class="piano-shell">
        <h2 style="color:#f5c542; margin-bottom: 6px; text-align:center; font-family:'Outfit', sans-serif; font-size:26px;">Piano Solver</h2>
        <p style="text-align:center; color:#94a3b8; font-size:13px; margin-bottom:20px;">
          Click the <strong>left half</strong> of the staff to set <span style="color:#4caf50; font-weight:700;">Note 1</span>, 
          and the <strong>right half</strong> to set <span style="color:#3b82f6; font-weight:700;">Note 2</span> —
          or paste / drop the staff picture.
        </p>

        <div class="piano-card" style="margin-bottom: 20px;">
          <div id="pianoDropzone" class="piano-drop" onclick="document.getElementById('pianoFileInput').click()">
            <input type="file" id="pianoFileInput" accept="image/*" style="display:none;" onchange="window.handlePianoFile(this)">
            🎹 <b>Paste</b> (Ctrl+V), drop or click to upload the <b>staff picture</b>
          </div>
          <div id="pianoReadStatus" class="piano-read-status"></div>
          <div class="piano-key-row">
            <label for="pianoKeyText">KEY SIGNATURE</label>
            <input id="pianoKeyText" type="text" placeholder="paste: E Major" spellcheck="false" autocomplete="off"
              title="Paste or type the key from the bot's message: E, E Major, Bb, F# minor, or the whole message">
            <select id="pianoKeySelect" aria-label="Key signature"></select>
            <span id="pianoKeyTip" class="piano-key-tip"></span>
          </div>
        </div>

        <!-- Main Manual Staff Card -->
        <div class="piano-card" style="margin-bottom: 20px;">
          <!-- Clef Toggle -->
          <div style="margin-bottom: 16px; display:flex; justify-content:center; gap:24px;">
            <label style="color:#eee; font-size:14px; font-weight:600; display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="radio" name="pianoClef" value="treble" checked style="accent-color:#ffd875; transform:scale(1.2);"> 𝄞 Treble Clef
            </label>
            <label style="color:#eee; font-size:14px; font-weight:600; display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="radio" name="pianoClef" value="bass" style="accent-color:#ffd875; transform:scale(1.2);"> 𝄢 Bass Clef
            </label>
          </div>

          <!-- Interactive Staff Canvas -->
          <div class="piano-canvas-container">
            <canvas id="pianoManualCanvas" width="560" height="320" title="Click left half for Note 1, right half for Note 2"></canvas>
          </div>

          <!-- Hidden storage for note values -->
          <input type="hidden" id="pianoNoteName-1" value="C">
          <input type="hidden" id="pianoNoteOct-1" value="4">
          <input type="hidden" id="pianoNoteName-2" value="G">
          <input type="hidden" id="pianoNoteOct-2" value="4">

          <!-- Accidental Selectors -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 10px;">
            <div style="background:#12132a; padding:12px; border-radius:10px; border:1px solid #25284e; text-align:left;">
              <label style="color:#4caf50; font-size:12px; font-weight:bold; display:block; margin-bottom:6px;">
                Note 1 Accidental
              </label>
              <select id="pianoNoteAccReal-1" style="width:100%; padding:8px; background:#080814; border:1px solid #25253f; color:#fff; border-radius:6px; outline:none; font-size:13px;">
                <option value="none" selected>None drawn (key decides)</option>
                <option value="natural">♮ Natural (cancels the key)</option>
                <option value="sharp">♯ Sharp</option>
                <option value="flat">♭ Flat</option>
              </select>
            </div>
            <div style="background:#12132a; padding:12px; border-radius:10px; border:1px solid #25284e; text-align:left;">
              <label style="color:#3b82f6; font-size:12px; font-weight:bold; display:block; margin-bottom:6px;">
                Note 2 Accidental
              </label>
              <select id="pianoNoteAccReal-2" style="width:100%; padding:8px; background:#080814; border:1px solid #25253f; color:#fff; border-radius:6px; outline:none; font-size:13px;">
                <option value="none" selected>None drawn (key decides)</option>
                <option value="natural">♮ Natural (cancels the key)</option>
                <option value="sharp">♯ Sharp</option>
                <option value="flat">♭ Flat</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Answer Card -->
        <div class="piano-card" style="margin-bottom: 20px;">
          <div class="piano-card-title">Interval between the two notes — click it to copy</div>
          <div class="piano-result-box" id="pianoResultBox">
            <div style="color:#718096; font-size: 14px;">Paste the staff picture or click the staff.</div>
          </div>
        </div>

        <!-- Interval Codes Config (Collapsible) -->
        <details style="background: #090a18; border: 1px solid #1f2142; border-radius: 10px; padding: 12px; cursor: pointer; outline: none;">
          <summary style="color:#ffd875; font-size: 13px; font-weight: 700; user-select: none;">⚙️ Custom Interval Codes (Click to Expand)</summary>
          <div style="margin-top: 12px; cursor: default;" onclick="event.stopPropagation()">
            <div style="font-size:12px; color:#8c8fae; margin-bottom:10px; text-align: left;">
              If your manual has custom codes, modify them below (saved automatically in browser):
            </div>
            <div style="max-height: 240px; overflow-y: auto; border: 1px solid #23254e; border-radius: 8px;">
              <table class="piano-codes-table">
                <thead>
                  <tr>
                    <th>Interval</th>
                    <th>Code</th>
                  </tr>
                </thead>
                <tbody id="pianoCodesTableBody"></tbody>
              </table>
            </div>
          </div>
        </details>
      </div>
    `;

    // Populate Codes Table
    const tableBody = document.getElementById("pianoCodesTableBody");
    if (tableBody) {
      Object.keys(intervalCodes).forEach(interval => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${interval}</td>
          <td><input type="text" data-interval="${interval}" value="${intervalCodes[interval]}" oninput="window.updatePianoCode(this)"></td>
        `;
        tableBody.appendChild(row);
      });
    }

    // Accidental change listeners
    ['pianoNoteAccReal-1', 'pianoNoteAccReal-2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => { touched = true; evaluatePianoManual(); });
    });

    // Key signature: a text field for what's pasted from the bot, and the full list
    const keySelect = document.getElementById('pianoKeySelect');
    const keyText = document.getElementById('pianoKeyText');
    if (keySelect) {
      const desc = (id) => {
        const a = PN.pnKeyAccidentals(id);
        return Object.keys(a).length ? Object.entries(a).map(([l, x]) => l + (x > 0 ? '♯' : '♭')).join(' ') : 'no ♯ / ♭';
      };
      keySelect.innerHTML = '<option value="">None (no ♯ / ♭)</option>' +
        PN.PN_KEYS.map(k => `<option value="${k.id}">${k.id} — ${desc(k.id)}</option>`).join('');
      keySelect.addEventListener('change', () => {
        keySig = keySelect.value;
        if (keyText) { keyText.value = ''; keyText.classList.remove('bad'); }
        evaluatePianoManual();
      });
    }
    if (keyText) {
      keyText.addEventListener('focus', () => keyText.select());
      keyText.addEventListener('input', () => {
        const v = keyText.value;
        // unreadable text clears the key too: a stale key from the last stage would give a wrong answer
        keySig = PN.pnParseKeyField(v) || '';
        keyText.classList.toggle('bad', v.trim() !== '' && !keySig);
        if (keySelect) keySelect.value = keySig;
        evaluatePianoManual();
      });
    }

    // A pasted picture (Discord links are routed to the file input by dragdrop-helper.js)
    document.addEventListener('paste', (e) => {
      if (!document.getElementById('pianoSection')?.classList.contains('active')) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text'))) return;
      for (const item of (e.clipboardData?.items || [])) {
        if (item.type && item.type.startsWith('image/')) {
          e.preventDefault();
          const f = item.getAsFile();
          if (f) readPianoPicture(f);
          return;
        }
      }
    });
    if (window.BombDragDrop) {
      window.BombDragDrop.attachDropzone('pianoDropzone', (file) => readPianoPicture(file));
    }

    // Clef change listener
    document.querySelectorAll('input[name="pianoClef"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const isBass = radio.value === 'bass';
        const oct1 = document.getElementById("pianoNoteOct-1");
        const oct2 = document.getElementById("pianoNoteOct-2");
        if (oct1 && oct2) {
          if (isBass) {
            oct1.value = 3;
            oct2.value = 3;
          } else {
            oct1.value = 4;
            oct2.value = 4;
          }
        }
        evaluatePianoManual();
      });
    });

    // Canvas click listener to place notes interactively
    const manualCanvas = document.getElementById("pianoManualCanvas");
    if (manualCanvas) {
      manualCanvas.addEventListener('click', (e) => {
        const rect = manualCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const scaleX = manualCanvas.width / rect.width;
        const scaleY = manualCanvas.height / rect.height;
        const canvasX = clickX * scaleX;
        const canvasY = clickY * scaleY;

        // Note 1 on left half, Note 2 on right half
        const isNote1 = canvasX < manualCanvas.width / 2;

        const clefEl = document.querySelector('input[name="pianoClef"]:checked');
        const isBass = clefEl ? clefEl.value === 'bass' : false;

        const centerY = Math.floor(manualCanvas.height / 2);
        const lineSpacing = 18; 
        const stepSpacing = lineSpacing / 2;

        const step = Math.round((centerY - canvasY) / stepSpacing);

        let noteName, octave;
        if (isBass) {
          const idx = step + 1; // Middle line D3 is step 0 (C3 is idx 0)
          const octOffset = Math.floor(idx / 7);
          const noteIndex = ((idx % 7) + 7) % 7;
          noteName = ["C", "D", "E", "F", "G", "A", "B"][noteIndex];
          octave = 3 + octOffset;
          if (octave < 2) octave = 2;
          if (octave > 4) octave = 4;
        } else {
          const idx = step + 6; // Middle line B4 is step 0 (C4 is idx 0)
          const octOffset = Math.floor(idx / 7);
          const noteIndex = ((idx % 7) + 7) % 7;
          noteName = ["C", "D", "E", "F", "G", "A", "B"][noteIndex];
          octave = 4 + octOffset;
          if (octave < 3) octave = 3;
          if (octave > 6) octave = 6;
        }

        const num = isNote1 ? 1 : 2;
        const nameEl = document.getElementById(`pianoNoteName-${num}`);
        const octEl = document.getElementById(`pianoNoteOct-${num}`);
        if (nameEl) nameEl.value = noteName;
        if (octEl) octEl.value = octave;
        touched = true;

        evaluatePianoManual();
      });
    }

    // Initial render
    evaluatePianoManual();
  }

  window.updatePianoCode = function(input) {
    const interval = input.getAttribute("data-interval");
    intervalCodes[interval] = input.value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(intervalCodes));
    } catch(e) {}
    evaluatePianoManual();
  };

  function drawStaffDiagram(canvasId, isBass, note1, note2) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#090a18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerY = Math.floor(canvas.height / 2);
    const lineSpacing = 18; 
    const stepSpacing = lineSpacing / 2; 

    // Draw 5 staff lines
    ctx.strokeStyle = '#38385a';
    ctx.lineWidth = 2.0;
    for (let i = -2; i <= 2; i++) {
      const y = centerY + i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(35, y);
      ctx.lineTo(canvas.width - 65, y);
      ctx.stroke();
    }

    // Draw Clef Badge / unicode
    ctx.fillStyle = '#ffd875';
    ctx.font = '48px sans-serif';
    ctx.fillText(isBass ? '𝄢' : '𝄞', 35, centerY + (isBass ? -6 : 10));

    // Draw guide labels on the right side
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const stepsToLabel = [4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6];
    const trebleNames = {
      '4': 'F5', '3': 'E5', '2': 'D5', '1': 'C5', '0': 'B4',
      '-1': 'A4', '-2': 'G4', '-3': 'F4', '-4': 'E4', '-5': 'D4', '-6': 'C4'
    };
    const bassNames = {
      '4': 'A3', '3': 'G3', '2': 'F3', '1': 'E3', '0': 'D3',
      '-1': 'C3', '-2': 'B2', '-3': 'A2', '-4': 'G2', '-5': 'F2', '-6': 'E2'
    };
    const names = isBass ? bassNames : trebleNames;

    stepsToLabel.forEach(step => {
      const y = centerY - step * stepSpacing;
      const name = names[step];
      
      if (step % 2 === 0) {
        ctx.fillStyle = '#f5c542';
      } else {
        ctx.fillStyle = '#718096';
      }
      ctx.fillText(name, canvas.width - 15, y);
      
      ctx.fillStyle = step % 2 === 0 ? 'rgba(245,197,66,0.3)' : 'rgba(113,128,150,0.3)';
      ctx.beginPath();
      ctx.arc(canvas.width - 42, y, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    });

    const getStepIndex = (name, oct, bass) => {
      const scale = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
      if (bass) {
        return scale[name] + 7 * (oct - 3);
      } else {
        return scale[name] + 7 * (oct - 4);
      }
    };

    const drawNote = (note, x, color, labelText) => {
      if (!note || !note.name) return;
      let step;
      if (isBass) {
        step = getStepIndex(note.name, note.octave, true) - 1;
      } else {
        step = getStepIndex(note.name, note.octave, false) - 6;
      }

      const y = centerY - step * stepSpacing;

      // Draw ledger lines
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2.0;
      if (Math.abs(step) >= 6) {
        const startStep = step > 0 ? 6 : -6;
        const endStep = step;
        const dir = step > 0 ? 2 : -2;
        for (let s = startStep; step > 0 ? s <= endStep : s >= endStep; s += dir) {
          if (s % 2 === 0) { 
            const ly = centerY - s * stepSpacing;
            ctx.beginPath();
            ctx.moveTo(x - 16, ly);
            ctx.lineTo(x + 16, ly);
            ctx.stroke();
          }
        }
      }

      // Note circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, 2 * Math.PI);
      ctx.fill();

      // Accidental symbol
      if (note.acc && note.acc !== 'none') {
        ctx.fillStyle = '#ffd875';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(note.acc === 'sharp' ? '♯' : note.acc === 'natural' ? '♮' : '♭', x - 12, y);
      }

      // Note Name & Label
      ctx.fillStyle = color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labelText, x, centerY + 90);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${note.name}${note.acc === 'sharp' ? '♯' : note.acc === 'flat' ? '♭' : note.acc === 'natural' ? '♮' : ''}${note.octave}`, x, centerY + 110);
    };

    drawNote(note1, Math.floor(canvas.width * 0.38), '#4caf50', 'Note 1 (Click Left)');
    drawNote(note2, Math.floor(canvas.width * 0.64), '#3b82f6', 'Note 2 (Click Right)');
  }

  const ACC_OF = { sharp: 1, flat: -1, none: 0, natural: 0 };
  const ACC_SIGN = { 1: '♯', '-1': '♭', 0: '' };

  // a note's pitch with the key signature: its own ♯ / ♭ when drawn, else the key's for its letter
  function notePitch(noteName, octave, accidental) {
    // a drawn ♮ cancels the key's ♯ / ♭ for this note
    const drawn = ACC_OF[accidental] || 0;
    const acc = accidental === 'natural' ? 0 : drawn || PN.pnKeyAccidentals(keySig)[noteName] || 0;
    const semi = PN.PN_STEPS[PN.PN_LET.indexOf(noteName)] + 12 * octave + acc;
    const sign = accidental === 'natural' ? '♮' : ACC_SIGN[acc];
    return { label: `${noteName}${sign}${octave}`, letter: `${noteName}${sign}`, semi };
  }

  function codeOf(name) {
    return (name && intervalCodes[name]) || '';
  }

  function evaluatePianoManual() {
    const clefEl = document.querySelector('input[name="pianoClef"]:checked');
    const isBass = clefEl ? clefEl.value === 'bass' : false;

    const n1Name = document.getElementById("pianoNoteName-1")?.value || "C";
    const n1Acc = document.getElementById("pianoNoteAccReal-1")?.value || "none";
    const n1Oct = parseInt(document.getElementById("pianoNoteOct-1")?.value || (isBass ? "3" : "4"), 10);

    const n2Name = document.getElementById("pianoNoteName-2")?.value || "G";
    const n2Acc = document.getElementById("pianoNoteAccReal-2")?.value || "none";
    const n2Oct = parseInt(document.getElementById("pianoNoteOct-2")?.value || (isBass ? "3" : "4"), 10);

    // drawn notes (for the staff drawing) and the pitches they sound with the key signature
    const p1 = { name: n1Name, acc: n1Acc, octave: n1Oct };
    const p2 = { name: n2Name, acc: n2Acc, octave: n2Oct };
    const a = notePitch(n1Name, n1Oct, n1Acc), b = notePitch(n2Name, n2Oct, n2Acc);

    const tip = document.getElementById('pianoKeyTip');
    const keyText = document.getElementById('pianoKeyText');
    if (tip) {
      const acc = PN.pnKeyAccidentals(keySig);
      tip.textContent = keyText && keyText.classList.contains('bad') ? "can't read that key — try “E Major”, “Bb”, “F#”"
        : keySig ? `notes without their own ♯ / ♭: ${Object.keys(acc).length ? Object.entries(acc).map(([l, x]) => l + (x > 0 ? '♯' : '♭')).join(' ') : 'none'}`
        : 'changes every stage — paste the new one each time';
    }

    const resultBox = document.getElementById("pianoResultBox");
    if (resultBox) {
      if (!touched) {
        resultBox.innerHTML = `<div style="color:#718096; font-size: 14px;">Paste the staff picture or click the staff.</div>`;
      } else {
        // the distance between the two notes as drawn — the game wants no up / down
        const iv = PN.pnInterval(a.semi, b.semi);
        const code = codeOf(iv.name);
        resultBox.innerHTML = `<div class="piano-dirs"><div class="piano-dir drawn" onclick="window.copyPianoAnswer('${iv.name}', this)" title="Click to copy ${iv.name}">
            <div class="piano-dir-lbl">INTERVAL</div>
            <div class="piano-solution-press">${iv.name}</div>
            <div class="piano-dir-how">${a.label} → ${b.label} · ${iv.distance} half-step${iv.distance === 1 ? '' : 's'}${iv.octaveDropped ? ' (octave dropped)' : ''}</div>
            ${code ? `<div class="piano-dir-code">Code: <span>${code}</span></div>` : ''}
            <div class="piano-dir-copied"></div>
          </div></div>
          <div style="font-size: 12px; color: #8c8fae; margin-top: 8px; text-align:center;">Key: ${keySig || 'none'}</div>`;
      }
    }

    drawStaffDiagram("pianoManualCanvas", isBass, p1, p2);
  }

  window.copyPianoAnswer = function (text, el) {
    const done = () => {
      const tag = el && el.querySelector('.piano-dir-copied');
      if (!tag) return;
      tag.textContent = '✓ COPIED';
      setTimeout(() => { tag.textContent = ''; }, 1200);
    };
    try { navigator.clipboard.writeText(text).then(done).catch(() => {}); } catch (e) {}
  };

  // ── Staff picture: clef and both notes (bomb_boomed's reader) ──
  async function readPianoPicture(file) {
    const status = document.getElementById('pianoReadStatus');
    const say = (msg, color) => { if (status) { status.textContent = msg; status.style.color = color; } };
    let src;
    try { src = await createImageBitmap(file); } catch (e) { say('⚠ Could not open that file as an image.', '#ff5c5c'); return; }
    let w = src.width, h = src.height;
    const MAXDIM = 1200;
    if (w > MAXDIM || h > MAXDIM) { const sc = MAXDIM / Math.max(w, h); w = Math.round(w * sc); h = Math.round(h * sc); }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0, w, h);
    const r = PN.pnAnalyze(ctx.getImageData(0, 0, w, h).data, w, h);
    if (!r || r.notes.length < 2) {
      say(r ? `⚠ Found ${r.notes.length} note(s) — place them by clicking the staff.` : '⚠ Could not find the musical staff — click the staff instead.', '#ff9800');
      return;
    }
    // clef (set without the radio's change handler, which resets the octaves)
    const radio = document.querySelector(`input[name="pianoClef"][value="${r.clef}"]`);
    if (radio) radio.checked = true;
    r.notes.slice(0, 2).forEach((n, i) => {
      const nm = PN.pnNote(r.clef, n.pos, 0).name; // e.g. "E2"
      const num = i + 1;
      document.getElementById(`pianoNoteName-${num}`).value = nm[0];
      document.getElementById(`pianoNoteOct-${num}`).value = parseInt(nm.slice(1), 10);
      document.getElementById(`pianoNoteAccReal-${num}`).value = n.acc === 'n' ? 'natural' : n.acc > 0 ? 'sharp' : n.acc < 0 ? 'flat' : 'none';
    });
    touched = true;
    const names = r.notes.slice(0, 2).map(n => PN.pnDrawnName(r.clef, n.pos, n.acc)).join(' then ');
    if (r.notes.length !== 2 || r.stray) say(`⚠ Read ${r.clef} clef, ${names} — but ${r.notes.length} note(s)${r.stray ? ' and a loose ♯/♭' : ''} were found: check them.`, '#ff9800');
    else say(`✓ Read: ${r.clef} clef, ${names} (as drawn). Set the key signature from the bot's message.`, '#4caf50');
    evaluatePianoManual();
  }

  window.handlePianoFile = function (input) {
    const f = input.files && input.files[0];
    if (f) readPianoPicture(f);
    input.value = '';
  };

  window.initPianoModule = initPianoModule;
})();
