/**
 * Piano Solver Module for Keep Talking and Nobody Explains
 * Identifies notes, clef, and intervals from staff images and matches stages.
 */

(function() {
  const STORAGE_KEY = "ktane_piano_codes";

  // Interval Names to Semitone Differences
  const INTERVALS_DICT = {
    1: "Minor 2nd",
    2: "Major 2nd",
    3: "Minor 3rd",
    4: "Major 3rd",
    5: "Perfect 4th",
    6: "Tritone",
    7: "Perfect 5th",
    8: "Minor 6th",
    9: "Major 6th",
    10: "Minor 7th",
    11: "Major 7th",
    12: "Octave"
  };

  const BASS_MAP = {
    "-4": "C2", "-3": "D2", "-2": "E2", "-1": "F2",
    "0": "G2", "1": "A2", "2": "B2", "3": "C3",
    "4": "D3", "5": "E3", "6": "F3", "7": "G3",
    "8": "A3", "9": "B3", "10": "C4"
  };

  const TREBLE_MAP = {
    "-4": "A3", "-3": "B3", "-2": "C4", "-1": "D4",
    "0": "E4", "1": "F4", "2": "G4", "3": "A4",
    "4": "B4", "5": "C5", "6": "D5", "7": "E5",
    "8": "F5", "9": "G5", "10": "A5", "11": "B5",
    "12": "C6"
  };

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
      intervalCodes = JSON.parse(stored);
    }
  } catch (e) {
    // Silent catch
  }

  function injectPianoStyles() {
    const css = `
    .piano-shell {
      max-width: 900px;
      margin: auto;
      background: #12122a;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #222;
    }
    .piano-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 820px) {
      .piano-grid {
        grid-template-columns: 1fr;
      }
    }
    .piano-card {
      background: #0f0f1c;
      border: 2px solid #25253f;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .piano-card-title {
      font-family: 'Outfit', 'Arial Black', sans-serif;
      font-size: 20px;
      font-weight: 900;
      color: #ffd875;
      letter-spacing: 1.5px;
      margin-bottom: 20px;
      text-transform: uppercase;
      border-bottom: 1px solid #25253f;
      padding-bottom: 10px;
    }
    .opencv-status {
      font-size: 13px;
      color: #ff3b30;
      margin-bottom: 15px;
      font-weight: bold;
      text-align: center;
    }
    .opencv-status.ready {
      color: #00ff66;
    }
    .piano-paste-box {
      border: 2px dashed #3b3f5c;
      border-radius: 8px;
      padding: 30px 20px;
      background: #0b0b16;
      transition: border-color 0.2s, background-color 0.2s;
      cursor: pointer;
      outline: none;
      margin-bottom: 15px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .piano-paste-box:focus, .piano-paste-box:hover {
      border-color: #ffd875;
      background: #0e0e22;
    }
    .piano-paste-link {
      font-size: 13px;
      color: #ffd875;
      text-decoration: underline;
      cursor: pointer;
    }
    .piano-canvas-container {
      margin-top: 15px;
      display: flex;
      justify-content: center;
      background: #080811;
      border-radius: 8px;
      padding: 10px;
      border: 1px solid #1e1e38;
    }
    .piano-canvas-container canvas {
      max-width: 100%;
      height: auto;
      display: block;
      border-radius: 4px;
    }
    .piano-result-box {
      min-height: 120px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: #080811;
      border-radius: 8px;
      padding: 20px;
      border: 1px solid #1e1e38;
      color: #eee;
    }
    .piano-solution-press {
      font-family: 'Outfit', sans-serif;
      font-size: 64px;
      font-weight: 900;
      color: #00ff66;
      margin: 15px 0;
      text-shadow: 0 0 20px rgba(0, 255, 102, 0.4);
      letter-spacing: 2px;
    }
    .piano-result-detail {
      font-size: 14px;
      line-height: 1.6;
      color: #a0aec0;
      text-align: left;
      width: 100%;
      margin-top: 10px;
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
      padding: 4px 6px;
      border-radius: 4px;
      width: 60px;
      font-family: monospace;
      outline: none;
    }
    .piano-codes-table input:focus {
      border-color: #ffd875;
    }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function initPianoModule() {
    injectPianoStyles();

    const container = document.getElementById("pianoSection");
    if (!container) return;

    container.innerHTML = `
      <div class="piano-shell" style="max-width: 650px; margin: auto;">
        <h2 style="color:#f5c542; margin-bottom: 20px; text-align:center;">Piano Solver</h2>
        <div id="pianoOpenCvStatus" class="opencv-status">🔴 OpenCV.js Loading (Please wait)...</div>
        
        <!-- Mode Switcher Tabs -->
        <div style="display:flex; justify-content:center; gap:8px; margin-bottom:20px;">
          <button id="pianoModeImageBtn" type="button" class="upload-btn active" style="margin-top:0; padding:8px 16px; font-size:14px; font-weight:bold; background:#f5c542; color:#0e0e1e; border-color:#f5c542; box-shadow:0 0 10px rgba(245,216,117,0.3);">📸 Image Input</button>
          <button id="pianoModeManualBtn" type="button" class="upload-btn" style="margin-top:0; padding:8px 16px; font-size:14px; font-weight:normal; background:#131328; color:#aaa; border-color:#2d2d54;">🎹 Manual Staff</button>
        </div>

        <div class="piano-card" style="margin-bottom: 20px;">
          
          <!-- Image Input Area -->
          <div id="pianoImageArea">
            <div class="piano-card-title">Image Input</div>
            <div class="piano-paste-box" id="pianoPasteBox" tabindex="0">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p style="margin: 0; font-size: 14px; color: #a0aec0;">Click here, then press <strong>Ctrl + V</strong> to Paste Screenshot</p>
              <label for="pianoFileInput" class="piano-paste-link" onclick="event.stopPropagation()">
                or click here to browse file
              </label>
              <input type="file" id="pianoFileInput" accept="image/*" style="display: none;">
            </div>
            <div class="piano-canvas-container">
              <canvas id="pianoPreviewCanvas" width="440" height="240" style="background:#0a0a1c;"></canvas>
            </div>
          </div>

          <!-- Manual Note Builder Section (Visual Staff in Middle) -->
          <div id="pianoManualArea" style="display:none; text-align:left;">
            
            <!-- Clef Toggle -->
            <div style="margin-bottom: 16px; display:flex; justify-content:center; gap:20px;">
              <label style="color:#eee; font-size:14px; font-weight:600; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="radio" name="pianoClef" value="treble" checked style="accent-color:#ffd875; transform:scale(1.15);"> Treble Clef
              </label>
              <label style="color:#eee; font-size:14px; font-weight:600; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="radio" name="pianoClef" value="bass" style="accent-color:#ffd875; transform:scale(1.15);"> Bass Clef
              </label>
            </div>

            <!-- Manual Staff Canvas (Big and Center) -->
            <div class="piano-canvas-container" style="margin-bottom: 20px;">
              <canvas id="pianoManualCanvas" width="540" height="320" style="background:#0f0f1c; width:100%; max-width:540px; height:auto; display:block; cursor:pointer; border-radius: 8px; border: 1px solid #2d2d54;"></canvas>
            </div>

            <!-- Note Controls (Hidden or collapsed as they are redundant with tap-to-mark) -->
            <div style="display:none;">
              <select id="pianoNoteName-1"><option value="C">C</option><option value="D">D</option><option value="E">E</option><option value="F">F</option><option value="G">G</option><option value="A">A</option><option value="B">B</option></select>
              <select id="pianoNoteAcc-1"><option value="none">Natural</option><option value="sharp">Sharp</option><option value="flat">Flat</option></select>
              <select id="pianoNoteOct-1"><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select>
              <select id="pianoNoteName-2"><option value="C">C</option><option value="D">D</option><option value="E">E</option><option value="F">F</option><option value="G">G</option><option value="A">A</option><option value="B">B</option></select>
              <select id="pianoNoteAcc-2"><option value="none">Natural</option><option value="sharp">Sharp</option><option value="flat">Flat</option></select>
              <select id="pianoNoteOct-2"><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select>
            </div>

            <!-- Accidental Selectors (Just in case they need to add a sharp/flat to Note 1 or Note 2) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
              <div style="background:#13132a; padding:10px; border-radius:8px; border:1px solid #2d2d54;">
                <label style="color:#4caf50; font-size:11px; font-weight:bold; display:block; margin-bottom:4px;">Note 1 Accidental</label>
                <select id="pianoNoteAccReal-1" style="width:100%; padding:6px; background:#080811; border:1px solid #25253f; color:#fff; border-radius:4px; outline:none; font-size:12px;">
                  <option value="none" selected>♮ Natural</option>
                  <option value="sharp">♯ Sharp</option>
                  <option value="flat">♭ Flat</option>
                </select>
              </div>
              <div style="background:#13132a; padding:10px; border-radius:8px; border:1px solid #2d2d54;">
                <label style="color:#3b82f6; font-size:11px; font-weight:bold; display:block; margin-bottom:4px;">Note 2 Accidental</label>
                <select id="pianoNoteAccReal-2" style="width:100%; padding:6px; background:#080811; border:1px solid #25253f; color:#fff; border-radius:4px; outline:none; font-size:12px;">
                  <option value="none" selected>♮ Natural</option>
                  <option value="sharp">♯ Sharp</option>
                  <option value="flat">♭ Flat</option>
                </select>
              </div>
            </div>

          </div>
        </div>

        <!-- Answer Result Card (Directly Below Staff) -->
        <div class="piano-card" style="margin-bottom: 20px;">
          <div class="piano-card-title">Answer</div>
          <div class="piano-result-box" id="pianoResultBox" style="min-height: 90px; background: #080811; border: 1px solid #1e1e38; border-radius: 8px;">
            <div style="color:#718096; font-size: 14px;">Waiting for note markings...</div>
          </div>
        </div>

        <!-- Interval Codes Config (Collapsible Details at Bottom) -->
        <details style="background: #0f0f1c; border: 1px solid #25253f; border-radius: 8px; padding: 12px; cursor: pointer; outline: none; margin-bottom: 20px;">
          <summary style="color:#ffd875; font-size: 14px; font-weight: bold; user-select: none;">⚙️ Interval Codes Config (Click to Expand)</summary>
          <div style="margin-top: 12px; cursor: default;" onclick="event.stopPropagation()">
            <div style="font-size:12px; color:#718096; margin-bottom:12px; text-align: left;">
              If your manual has custom codes, modify them here (they persist in your browser):
            </div>
            <div style="max-height: 250px; overflow-y: auto; border: 1px solid #25253f; border-radius: 8px;">
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
    Object.keys(intervalCodes).forEach(interval => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${interval}</td>
        <td><input type="text" data-interval="${interval}" value="${intervalCodes[interval]}" oninput="window.updatePianoCode(this)"></td>
      `;
      tableBody.appendChild(row);
    });

    // Check OpenCV Ready status
    const statusEl = document.getElementById("pianoOpenCvStatus");
    if (window.openCvReady) {
      statusEl.textContent = "🟢 OpenCV.js Ready";
      statusEl.className = "opencv-status ready";
    }

    // Tab switcher events
    const modeImageBtn = document.getElementById("pianoModeImageBtn");
    const modeManualBtn = document.getElementById("pianoModeManualBtn");
    const imageArea = document.getElementById("pianoImageArea");
    const manualArea = document.getElementById("pianoManualArea");

    if (modeImageBtn && modeManualBtn && imageArea && manualArea) {
      modeImageBtn.addEventListener('click', () => {
        setPianoMode('image');
      });
      modeManualBtn.addEventListener('click', () => {
        setPianoMode('manual');
      });
    }

    function setPianoMode(mode) {
      if (mode === 'image') {
        modeImageBtn.className = "upload-btn active";
        modeImageBtn.style.background = "#f5c542";
        modeImageBtn.style.color = "#0e0e1e";
        modeImageBtn.style.borderColor = "#f5c542";
        modeImageBtn.style.fontWeight = "bold";
        modeImageBtn.style.boxShadow = "0 0 10px rgba(245,216,117,0.3)";

        modeManualBtn.className = "upload-btn";
        modeManualBtn.style.background = "#131328";
        modeManualBtn.style.color = "#aaa";
        modeManualBtn.style.borderColor = "#2d2d54";
        modeManualBtn.style.fontWeight = "normal";
        modeManualBtn.style.boxShadow = "none";

        imageArea.style.display = "block";
        manualArea.style.display = "none";
      } else {
        modeManualBtn.className = "upload-btn active";
        modeManualBtn.style.background = "#f5c542";
        modeManualBtn.style.color = "#0e0e1e";
        modeManualBtn.style.borderColor = "#f5c542";
        modeManualBtn.style.fontWeight = "bold";
        modeManualBtn.style.boxShadow = "0 0 10px rgba(245,216,117,0.3)";

        modeImageBtn.className = "upload-btn";
        modeImageBtn.style.background = "#131328";
        modeImageBtn.style.color = "#aaa";
        modeImageBtn.style.borderColor = "#2d2d54";
        modeImageBtn.style.fontWeight = "normal";
        modeImageBtn.style.boxShadow = "none";

        imageArea.style.display = "none";
        manualArea.style.display = "block";
        evaluatePianoManual();
      }
    }

    // Register paste box events
    const pasteBox = document.getElementById("pianoPasteBox");
    const fileInput = document.getElementById("pianoFileInput");

    pasteBox.addEventListener('click', () => {
      pasteBox.focus();
    });

    pasteBox.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          const img = new Image();
          img.onload = () => {
            handlePianoImage(img);
          };
          img.src = URL.createObjectURL(blob);
          e.preventDefault();
          break;
        }
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        handlePianoImage(img);
      };
      img.src = URL.createObjectURL(file);
    });

    // Register manual note builder inputs event listeners
    const manualInputs = [
      "pianoNoteName-1", "pianoNoteAcc-1", "pianoNoteOct-1",
      "pianoNoteName-2", "pianoNoteAcc-2", "pianoNoteOct-2",
      "pianoNoteAccReal-1", "pianoNoteAccReal-2"
    ];
    manualInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', evaluatePianoManual);
    });

    document.querySelectorAll('input[name="pianoClef"]').forEach(radio => {
      radio.addEventListener('change', () => {
        // Adjust default octaves based on clef choice
        const isBass = radio.value === 'bass';
        const oct1 = document.getElementById("pianoNoteOct-1");
        const oct2 = document.getElementById("pianoNoteOct-2");
        if (oct1 && oct2) {
          if (isBass) {
            if (oct1.value > 4) oct1.value = 3;
            if (oct2.value > 4) oct2.value = 3;
          } else {
            if (oct1.value < 3) oct1.value = 4;
            if (oct2.value < 3) oct2.value = 4;
          }
        }
        evaluatePianoManual();
      });
    });

    // Canvas click listener to place notes interactively on lines or spaces
    const manualCanvas = document.getElementById("pianoManualCanvas");
    if (manualCanvas) {
      manualCanvas.addEventListener('click', (e) => {
        const rect = manualCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Scale coordinates to internal canvas resolution
        const scaleX = manualCanvas.width / rect.width;
        const scaleY = manualCanvas.height / rect.height;
        const canvasX = clickX * scaleX;
        const canvasY = clickY * scaleY;

        // Note 1 on left half, Note 2 on right half of canvas
        const isNote1 = canvasX < manualCanvas.width / 2;

        const clefEl = document.querySelector('input[name="pianoClef"]:checked');
        const isBass = clefEl ? clefEl.value === 'bass' : false;

        const centerY = Math.floor(manualCanvas.height / 2);
        const lineSpacing = 18; 
        const stepSpacing = lineSpacing / 2;

        // Calculate step index from click Y
        const step = Math.round((centerY - canvasY) / stepSpacing);

        // Convert step index back to note letter and octave
        let noteName, octave;
        if (isBass) {
          const idx = step + 1; // Middle line D3 is step 0 (C3 is idx 0)
          const octOffset = Math.floor(idx / 7);
          const noteIndex = ((idx % 7) + 7) % 7;
          noteName = ["C", "D", "E", "F", "G", "A", "B"][noteIndex];
          octave = 3 + octOffset;
        } else {
          const idx = step + 6; // Middle line B4 is step 0 (C4 is idx 0)
          const octOffset = Math.floor(idx / 7);
          const noteIndex = ((idx % 7) + 7) % 7;
          noteName = ["C", "D", "E", "F", "G", "A", "B"][noteIndex];
          octave = 4 + octOffset;
        }

        // Clip octaves to valid ranges
        if (isBass) {
          if (octave < 2) octave = 2;
          if (octave > 4) octave = 4;
        } else {
          if (octave < 3) octave = 3;
          if (octave > 6) octave = 6;
        }

        const num = isNote1 ? 1 : 2;
        const nameEl = document.getElementById(`pianoNoteName-${num}`);
        const octEl = document.getElementById(`pianoNoteOct-${num}`);
        if (nameEl) nameEl.value = noteName;
        if (octEl) octEl.value = octave;

        evaluatePianoManual();
      });
    }
  }

  window.updatePianoCode = function(input) {
    const interval = input.getAttribute("data-interval");
    intervalCodes[interval] = input.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(intervalCodes));
    // Re-evaluate if manual mode is active
    const manualArea = document.getElementById("pianoManualArea");
    if (manualArea && manualArea.style.display !== "none") {
      evaluatePianoManual();
    }
  };

  function drawStaffDiagram(canvasId, isBass, note1, note2) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#0f0f1c';
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
      ctx.moveTo(30, y);
      ctx.lineTo(canvas.width - 60, y);
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
      
      // Highlight line guides differently than space guides
      if (step % 2 === 0) {
        ctx.fillStyle = '#f5c542'; // Golden for line notes
      } else {
        ctx.fillStyle = '#718096'; // Muted grey for space notes
      }
      ctx.fillText(name, canvas.width - 15, y);
      
      // Draw faint dot guide next to the text
      ctx.fillStyle = step % 2 === 0 ? 'rgba(245,197,66,0.3)' : 'rgba(113,128,150,0.3)';
      ctx.beginPath();
      ctx.arc(canvas.width - 38, y, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    });

    const getStepIndex = (name, oct, bass) => {
      const scale = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
      if (bass) {
        // C3 is 0. G2 is line 1.
        return scale[name] + 7 * (oct - 3);
      } else {
        // C4 is 0. E4 is line 1.
        return scale[name] + 7 * (oct - 4);
      }
    };

    const drawNote = (note, x, color) => {
      if (!note || note.name === 'none') return;
      let step;
      if (isBass) {
        step = getStepIndex(note.name, note.octave, true) - 1; // Relative to middle line D3 (step 1 relative to C3)
      } else {
        step = getStepIndex(note.name, note.octave, false) - 6; // Relative to middle line B4 (step 6 relative to C4)
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
        ctx.fillText(note.acc === 'sharp' ? '♯' : '♭', x - 12, y);
      }

      // Label
      ctx.fillStyle = '#a0aec0';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${note.name}${note.acc === 'sharp' ? '#' : (note.acc === 'flat' ? 'b' : '')}${note.octave}`, x, centerY + 105);
    };

    drawNote(note1, Math.floor(canvas.width * 0.45), '#4caf50');
    drawNote(note2, Math.floor(canvas.width * 0.65), '#3b82f6');
  }

  function evaluatePianoManual() {
    const clefEl = document.querySelector('input[name="pianoClef"]:checked');
    const isBass = clefEl ? clefEl.value === 'bass' : false;

    const n1Name = document.getElementById("pianoNoteName-1").value;
    const n1Acc = document.getElementById("pianoNoteAccReal-1").value;
    const n1Oct = parseInt(document.getElementById("pianoNoteOct-1").value, 10);

    const n2Name = document.getElementById("pianoNoteName-2").value;
    const n2Acc = document.getElementById("pianoNoteAccReal-2").value;
    const n2Oct = parseInt(document.getElementById("pianoNoteOct-2").value, 10);

    const p1 = {
      name: n1Name,
      acc: n1Acc,
      octave: n1Oct,
      str: `${n1Name}${n1Acc === 'sharp' ? '#' : (n1Acc === 'flat' ? 'b' : '')}${n1Oct}`,
      semitone: getSemitoneValue(n1Name, n1Oct, n1Acc)
    };

    const p2 = {
      name: n2Name,
      acc: n2Acc,
      octave: n2Oct,
      str: `${n2Name}${n2Acc === 'sharp' ? '#' : (n2Acc === 'flat' ? 'b' : '')}${n2Oct}`,
      semitone: getSemitoneValue(n2Name, n2Oct, n2Acc)
    };

    let lower = p1, upper = p2;
    if (p1.semitone > p2.semitone) {
      lower = p2;
      upper = p1;
    }

    const diff = upper.semitone - lower.semitone;
    const intervalName = INTERVALS_DICT[diff] || `Unknown (${diff} semitones)`;
    const code = intervalCodes[intervalName] || "None";

    const resultBox = document.getElementById("pianoResultBox");
    if (resultBox) {
      resultBox.innerHTML = `
        <div style="width: 100%; display: flex; justify-content: center; align-items: center; min-height: 80px;">
          <div class="piano-solution-press" style="font-size: 54px; color: #00ff66; text-shadow: 0 0 25px rgba(0,255,102,0.6); text-align: center; text-transform: uppercase; margin: 0; font-family:'Outfit', sans-serif; font-weight:900; letter-spacing: 2px;">${intervalName}</div>
        </div>
      `;
    }

    drawStaffDiagram("pianoManualCanvas", isBass, p1, p2);
  }

  function sortedUnique(arr) {
    return Array.from(new Set(arr)).sort((a, b) => a - b);
  }

  function find_staff_lines(grouped_y) {
    const n = grouped_y.length;
    if (n < 5) return null;
    for (let i = 0; i < n - 4; i++) {
      const subset = grouped_y.slice(i, i + 5);
      const diffs = [];
      for (let j = 0; j < 4; j++) {
        diffs.push(subset[j + 1] - subset[j]);
      }
      const mean_diff = diffs.reduce((a, b) => a + b, 0) / 4.0;
      if (diffs.every(d => Math.abs(d - mean_diff) <= 2) && mean_diff >= 10 && mean_diff <= 50) {
        return subset;
      }
    }
    return null;
  }

  function getSemitoneValue(noteName, octave, accidental) {
    const offsets = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
    let val = offsets[noteName] + 12 * octave;
    if (accidental === "sharp") {
      val += 1;
    } else if (accidental === "flat") {
      val -= 1;
    }
    return val;
  }

  function handlePianoImage(img) {
    const previewCanvas = document.getElementById("pianoPreviewCanvas");
    const resultBox = document.getElementById("pianoResultBox");
    if (!previewCanvas || !resultBox) return;

    const ctx = previewCanvas.getContext("2d");
    const width = img.width;
    const height = img.height;
    previewCanvas.width = width;
    previewCanvas.height = height;
    ctx.drawImage(img, 0, 0);

    if (!window.openCvReady) {
      resultBox.innerHTML = '<div style="color:#ff3b30; font-weight:bold;">Error: OpenCV.js is not loaded yet.</div>';
      return;
    }

    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      let src = cv.imread(previewCanvas);
      let gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

      let edges = new cv.Mat();
      cv.Canny(gray, edges, 50, 150, 3, false);

      let lines = new cv.Mat();
      cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 30, 30, 10);

      let y_coords = [];
      for (let i = 0; i < lines.rows; ++i) {
        let y1 = lines.data32S[i * 4 + 1];
        let y2 = lines.data32S[i * 4 + 3];
        if (Math.abs(y1 - y2) <= 1) {
          y_coords.push(y1);
        }
      }

      y_coords = sortedUnique(y_coords);
      let groupedY = [];
      if (y_coords.length > 0) {
        let currentGroup = [y_coords[0]];
        for (let i = 1; i < y_coords.length; i++) {
          if (y_coords[i] - currentGroup[currentGroup.length - 1] <= 3) {
            currentGroup.push(y_coords[i]);
          } else {
            groupedY.push(Math.round(currentGroup.reduce((a,b)=>a+b, 0)/currentGroup.length));
            currentGroup = [y_coords[i]];
          }
        }
        groupedY.push(Math.round(currentGroup.reduce((a,b)=>a+b, 0)/currentGroup.length));
      }

      let staff = find_staff_lines(groupedY);

      // Draw horizontal lines in red
      ctx.strokeStyle = "rgba(255, 0, 0, 0.35)";
      ctx.lineWidth = 1;
      groupedY.forEach(ly => {
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(width, ly);
        ctx.stroke();
      });

      if (!staff) {
        resultBox.innerHTML = `
          <div style="color:#ff3b30; font-weight:bold;">Error: Failed to find 5 staff lines.</div>
          <div style="color:#a0aec0; font-size:12px; margin-top:6px; text-align:left;">
            Verify screenshot contains the staff clearly.<br>
            HoughLines Ys: [${groupedY.join(", ")}]
          </div>
        `;
        src.delete(); gray.delete(); edges.delete(); lines.delete();
        return;
      }

      const y_top = staff[0];
      const y_bottom = staff[4];
      const S = (y_bottom - y_top) / 4.0;

      // Draw staff lines in Cyan
      ctx.strokeStyle = "rgba(0, 210, 255, 0.85)";
      ctx.lineWidth = 2;
      staff.forEach(lineY => {
        ctx.beginPath();
        ctx.moveTo(width * 0.1, lineY);
        ctx.lineTo(width * 0.9, lineY);
        ctx.stroke();
      });

      // 2. Clef detection
      const cxStart = Math.floor(width * 0.15);
      const cxEnd = Math.floor(width * 0.35);
      const cyStart = Math.max(0, Math.floor(y_top - 2.0 * S));
      const cyEnd = Math.min(height, Math.floor(y_bottom + 2.0 * S));

      let clefYs = [];
      for (let y = cyStart; y < cyEnd; y++) {
        for (let x = cxStart; x < cxEnd; x++) {
          const idx = (y * width + x) * 4;
          const grayVal = 0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2];
          if (grayVal > 80) {
            clefYs.push(y);
          }
        }
      }

      let isBass = true;
      let maxVal = 0.0;
      if (clefYs.length > 0) {
        const min_y = Math.min(...clefYs);
        const max_y = Math.max(...clefYs);
        const above_s = (y_top - min_y) / S;
        const below_s = (max_y - y_bottom) / S;

        if (above_s > 0.5 && below_s > 0.5) {
          isBass = false;
        }
        maxVal = Math.max(above_s, below_s);
      }

      ctx.strokeStyle = isBass ? "rgba(0, 255, 102, 0.5)" : "rgba(255, 216, 117, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(cxStart, cyStart, cxEnd - cxStart, cyEnd - cyStart);

      // 3. Note head detection
      let thresh = new cv.Mat();
      cv.threshold(gray, thresh, 195, 255, cv.THRESH_BINARY);

      let M_kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
      let anchor = new cv.Point(-1, -1);
      cv.morphologyEx(thresh, thresh, cv.MORPH_OPEN, M_kernel, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

      let contours = new cv.MatVector();
      let hierarchy = new cv.Mat();
      cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let notes_found = [];
      const expectedMinArea = S * S * 0.15;
      const expectedMaxArea = S * S * 1.5;

      const noteMinX = Math.floor(width * 0.35);
      const noteMaxX = Math.floor(width * 0.9);

      for (let i = 0; i < contours.size(); ++i) {
        let cnt = contours.get(i);
        let area = cv.contourArea(cnt);
        let boundingRect = cv.boundingRect(cnt);
        let cX = boundingRect.x + boundingRect.width / 2;
        let cY = boundingRect.y + boundingRect.height / 2;

        if (area >= expectedMinArea && area <= expectedMaxArea &&
            cX >= noteMinX && cX <= noteMaxX &&
            cY >= y_top - S && cY <= y_bottom + S) {
          notes_found.push({ cX, cY, area, rect: boundingRect });
        }
      }

      notes_found.sort((a, b) => a.cX - b.cX);

      let mergedNotes = [];
      for (let note of notes_found) {
        if (mergedNotes.length === 0) {
          mergedNotes.push(note);
        } else {
          let last = mergedNotes[mergedNotes.length - 1];
          let dist = Math.sqrt(Math.pow(note.cX - last.cX, 2) + Math.pow(note.cY - last.cY, 2));
          if (dist < S * 0.5) {
            last.cX = (last.cX + note.cX) / 2;
            last.cY = (last.cY + note.cY) / 2;
            last.area += note.area;
            last.rect.width = Math.max(last.rect.x + last.rect.width, note.rect.x + note.rect.width) - Math.min(last.rect.x, note.rect.x);
            last.rect.height = Math.max(last.rect.y + last.rect.height, note.rect.y + note.rect.height) - Math.min(last.rect.y, note.rect.y);
            last.rect.x = Math.min(last.rect.x, note.rect.x);
            last.rect.y = Math.min(last.rect.y, note.rect.y);
          } else {
            mergedNotes.push(note);
          }
        }
      }

      if (mergedNotes.length !== 2) {
        let debugComponents = [];
        for (let i = 0; i < contours.size(); ++i) {
          let cnt = contours.get(i);
          let boundingRect = cv.boundingRect(cnt);
          let cX = boundingRect.x + boundingRect.width / 2;
          let cY = boundingRect.y + boundingRect.height / 2;
          debugComponents.push(`(${cX.toFixed(0)},${cY.toFixed(0)}): area=${cv.contourArea(cnt).toFixed(0)}`);
        }

        resultBox.innerHTML = `
          <div style="width: 100%;">
            <div style="color: #ff3b30; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; margin-bottom: 8px; text-align: center;">
              ❌ Analysis Error
            </div>
            <div style="background: #1a0f12; border: 1px solid #4a1d24; color: #ff8a93; padding: 12px; border-radius: 6px; font-size: 13px; margin-bottom: 10px; text-align: center;">
              Found <strong>${mergedNotes.length}</strong> note heads instead of 2.
            </div>
            <div style="font-size: 11px; color: #718096; text-align: left; background: #0c0c1b; padding: 10px; border-radius: 6px; border: 1px solid #1e1e38;">
              <strong>Expected area:</strong> [${expectedMinArea.toFixed(0)} - ${expectedMaxArea.toFixed(0)}] px<br>
              <details style="margin-top: 6px; cursor: pointer; outline: none;">
                <summary style="color: #ffd875; font-weight: bold;">Show detected components</summary>
                <div style="margin-top: 6px; font-family: monospace; font-size: 10px; color: #a0aec0; word-break: break-all; line-height: 1.4;">
                  ${debugComponents.join("<br>")}
                </div>
              </details>
            </div>
          </div>
        `;
        src.delete(); gray.delete(); edges.delete(); lines.delete();
        thresh.delete(); M_kernel.delete(); contours.delete(); hierarchy.delete();
        return;
      }

      const pitches = [];
      mergedNotes.forEach((note) => {
        ctx.strokeStyle = "rgba(0, 255, 102, 0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(note.cX, note.cY, S * 0.5, 0, 2 * Math.PI);
        ctx.stroke();

        const axStart = Math.max(0, Math.floor(note.cX - 1.25 * S));
        const axEnd = Math.min(width, Math.floor(note.cX - 0.2 * S));
        const ayStart = Math.max(0, Math.floor(note.cY - 0.75 * S));
        const ayEnd = Math.min(height, Math.floor(note.cY + 0.75 * S));

        let accYellow = 0;
        let accType = null;
        let accMinX = width, accMaxX = 0, accMinY = height, accMaxY = 0;

        const accW = axEnd - axStart;
        const accH = ayEnd - ayStart;
        const yellowMask = new Uint8Array(accW * accH);

        for (let y = ayStart; y < ayEnd; y++) {
          for (let x = axStart; x < axEnd; x++) {
            const pIdx = (y * width + x) * 4;
            const r = data[pIdx];
            const g = data[pIdx+1];
            const b = data[pIdx+2];

            if (r > 100 && r > g && g > b && (r - b) > 40) {
              const mx = x - axStart;
              const my = y - ayStart;
              yellowMask[my * accW + mx] = 1;
              accYellow++;

              if (x < accMinX) accMinX = x;
              if (x > accMaxX) accMaxX = x;
              if (y < accMinY) accMinY = y;
              if (y > accMaxY) accMaxY = y;
            }
          }
        }

        if (accYellow > 8) {
          const colSums = new Array(accW).fill(0);
          for (let my = 0; my < accH; my++) {
            for (let mx = 0; mx < accW; mx++) {
              if (yellowMask[my * accW + mx]) {
                colSums[mx]++;
              }
            }
          }

          let peaks = 0;
          for (let c = 1; c < accW - 1; c++) {
            if (colSums[c] > colSums[c-1] && colSums[c] > colSums[c+1] && colSums[c] > 2) {
              peaks++;
            }
          }

          accType = peaks >= 2 ? "sharp" : "flat";

          ctx.strokeStyle = "rgba(255, 216, 117, 0.85)";
          ctx.lineWidth = 2;
          ctx.strokeRect(accMinX, accMinY, accMaxX - accMinX, accMaxY - accMinY);
        }

        const pitchIdx = Math.round((y_bottom - note.cY) / (S / 2.0));
        
        let noteName, octave;
        if (isBass) {
          const mapped = BASS_MAP[pitchIdx];
          if (mapped) {
            noteName = mapped.slice(0, -1);
            octave = parseInt(mapped.slice(-1));
          } else {
            noteName = "C"; octave = 2;
          }
        } else {
          const mapped = TREBLE_MAP[pitchIdx];
          if (mapped) {
            noteName = mapped.slice(0, -1);
            octave = parseInt(mapped.slice(-1));
          } else {
            noteName = "C"; octave = 4;
          }
        }

        const accSymbol = accType === "sharp" ? "#" : (accType === "flat" ? "b" : "");
        pitches.push({
          noteName: noteName,
          octave: octave,
          accType: accType || 'none',
          str: `${noteName}${accSymbol}${octave}`,
          semitone: getSemitoneValue(noteName, octave, accType)
        });
      });

      const p1 = pitches[0];
      const p2 = pitches[1];
      let lower = p1, upper = p2;
      if (p1.semitone > p2.semitone) {
        lower = p2;
        upper = p1;
      }

      const diff = upper.semitone - lower.semitone;
      const intervalName = INTERVALS_DICT[diff] || `Unknown (${diff} semitones)`;
      const code = intervalCodes[intervalName] || "None";

      // Auto-populate manual note inputs with OCR results
      const noteInputs = [
        { name: 'pianoNoteName-1', acc: 'pianoNoteAcc-1', oct: 'pianoNoteOct-1' },
        { name: 'pianoNoteName-2', acc: 'pianoNoteAcc-2', oct: 'pianoNoteOct-2' }
      ];

      const clefRadios = document.getElementsByName("pianoClef");
      clefRadios.forEach(radio => {
        radio.checked = (radio.value === (isBass ? 'bass' : 'treble'));
      });

      pitches.forEach((p, idx) => {
        if (idx < 2) {
          const nameEl = document.getElementById(noteInputs[idx].name);
          const accEl = document.getElementById(noteInputs[idx].acc);
          const octEl = document.getElementById(noteInputs[idx].oct);
          const accRealEl = document.getElementById(`pianoNoteAccReal-${idx + 1}`);

          if (nameEl) nameEl.value = p.noteName;
          if (accEl) accEl.value = p.accType;
          if (octEl) octEl.value = p.octave;
          if (accRealEl) accRealEl.value = p.accType;
        }
      });

      // Render manual staff canvas as well
      drawStaffDiagram("pianoManualCanvas", isBass, pitches[0], pitches[1]);

      // Render UI
      resultBox.innerHTML = `
        <div style="width: 100%; display: flex; justify-content: center; align-items: center; min-height: 80px;">
          <div class="piano-solution-press" style="font-size: 54px; color: #00ff66; text-shadow: 0 0 25px rgba(0,255,102,0.6); text-align: center; text-transform: uppercase; margin: 0; font-family:'Outfit', sans-serif; font-weight:900; letter-spacing: 2px;">${intervalName}</div>
        </div>
      `;

      src.delete(); gray.delete(); edges.delete(); lines.delete();
      thresh.delete(); M_kernel.delete(); contours.delete(); hierarchy.delete();
    } catch (e) {
      // Hidden from screen reader/console
    }
  }

  // Load OpenCV dynamically if not loaded
  if (!window.openCvLoading) {
    window.openCvLoading = true;
    window.onOpenCvReady = function() {
      window.openCvReady = true;
      const statusEl = document.getElementById("pianoOpenCvStatus");
      if (statusEl) {
        statusEl.textContent = "🟢 OpenCV.js Ready";
        statusEl.className = "opencv-status ready";
      }
    };
    const script = document.createElement('script');
    script.src = "https://docs.opencv.org/4.5.4/opencv.js";
    script.async = true;
    script.onload = window.onOpenCvReady;
    document.head.appendChild(script);
  }

  window.initPianoModule = initPianoModule;
})();
