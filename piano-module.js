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
      <div class="piano-shell">
        <h2 style="color:#f5c542; margin-bottom: 20px;">Piano Solver</h2>
        <div id="pianoOpenCvStatus" class="opencv-status">🔴 OpenCV.js Loading (Please wait)...</div>
        
        <div class="piano-grid">
          <!-- Left Column -->
          <div class="piano-card">
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
              <canvas id="pianoPreviewCanvas" width="440" height="440"></canvas>
            </div>
          </div>

          <!-- Right Column -->
          <div class="piano-card">
            <div class="piano-card-title">Analysis Result</div>
            <div class="piano-result-box" id="pianoResultBox">
              <div style="color:#718096;">Waiting for image paste...</div>
            </div>

            <div class="piano-card-title" style="margin-top:30px;">Interval Codes Config</div>
            <div style="font-size:12px; color:#718096; margin-bottom:12px; text-align: left;">
              Codes change each stage. Modify these to match your manual page:
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
        </div>
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
  }

  window.updatePianoCode = function(input) {
    const interval = input.getAttribute("data-interval");
    intervalCodes[interval] = input.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(intervalCodes));
  };

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

      // Render UI
      resultBox.innerHTML = `
        <div style="width: 100%;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #cbd5e0; letter-spacing: 1.5px; margin-bottom: 10px; text-align: center;">
            Interval Detected (${isBass ? "Bass Clef" : "Treble Clef"})
          </div>
          <div class="piano-solution-press">${code}</div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
            <div style="background: #12122a; padding: 10px; border-radius: 6px; border: 1px solid #25253f; text-align: center;">
              <span style="font-size: 11px; color: #718096; display: block; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Lower Note</span>
              <strong style="font-size: 18px; color: #ffd875; font-family: monospace;">${lower.str}</strong>
              <span style="font-size: 11px; color: #4a5568; display: block; margin-top: 2px;">(pitch: ${lower.semitone})</span>
            </div>
            <div style="background: #12122a; padding: 10px; border-radius: 6px; border: 1px solid #25253f; text-align: center;">
              <span style="font-size: 11px; color: #718096; display: block; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Upper Note</span>
              <strong style="font-size: 18px; color: #ffd875; font-family: monospace;">${upper.str}</strong>
              <span style="font-size: 11px; color: #4a5568; display: block; margin-top: 2px;">(pitch: ${upper.semitone})</span>
            </div>
          </div>
          
          <div style="margin-top: 15px; padding: 8px 12px; background: #0c0c1b; border-radius: 6px; border: 1px solid #1e1e38; text-align: center; font-size: 13px; color: #cbd5e0;">
            Interval: <span style="color: #ffd875; font-weight: bold;">${intervalName}</span> (${diff} semitones)
          </div>
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
