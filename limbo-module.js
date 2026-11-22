/**
 * Limbo Module Solver for Keep Talking and Nobody Explains
 *
 * Six white keys sit in a ring. One glows at the start, then pairs of keys swap
 * along arcs; the last frame of the GIF reveals each key's colour.
 *
 * Features:
 * 1. Built-in full-colour GIF decoder (every composited frame as RGBA).
 * 2. Key tracking: finds the six slots, splits the GIF into moves and picks the
 *    pairing of swaps whose arcs best fit the frames.
 * 3. Follows the glowing key to its final slot and reads that slot's colour.
 * 4. Tap a key on the board to override the start key if the glow was missed.
 */

(function () {
  'use strict';

  // ── bomb_boomed/src/utils/gif.js ────────────────────────────────
  const { decodeGIFRGBA } = (function () {
    /**
     * Full-colour GIF decoder (from the standalone simons.html): returns every composited frame as
     * RGBA pixels, honouring transparency, interlacing and disposal. No browser APIs needed.
     * @returns {{ w:number, h:number, frames: Array<{ data: Uint8ClampedArray, delay: number }> }}
     */
    function decodeGIFRGBA(buf) {
      const d = new Uint8Array(buf); let p = 0;
      if (String.fromCharCode(d[0], d[1], d[2]) !== 'GIF') throw new Error('not a GIF');
      p = 6;
      const W = d[p] | d[p + 1] << 8, H = d[p + 2] | d[p + 3] << 8; p += 4;
      const fl = d[p++]; p += 2;
      let gct = null;
      if (fl & 0x80) { const n = 2 << (fl & 7); gct = d.subarray(p, p + n * 3); p += n * 3; }
      let cv = new Uint8ClampedArray(W * H * 4);
      const frames = [];
      let gce = { delay: 0, trans: -1, disp: 0 };
      const skipSub = () => { while (p < d.length && d[p] !== 0) p += d[p] + 1; p++; };
      while (p < d.length) {
        const b = d[p++];
        if (b === 0x3B) break;
        if (b === 0x21) {
          const label = d[p++];
          if (label === 0xF9) {
            p++; const pf = d[p];
            gce = { disp: (pf >> 2) & 7, delay: (d[p + 1] | d[p + 2] << 8) * 10, trans: (pf & 1) ? d[p + 3] : -1 };
            p += 5;
          } else skipSub();
        } else if (b === 0x2C) {
          const x0 = d[p] | d[p + 1] << 8, y0 = d[p + 2] | d[p + 3] << 8, w = d[p + 4] | d[p + 5] << 8, h = d[p + 6] | d[p + 7] << 8, f = d[p + 8]; p += 9;
          let ct = gct;
          if (f & 0x80) { const n = 2 << (f & 7); ct = d.subarray(p, p + n * 3); p += n * 3; }
          const minCode = d[p++];
          const chunks = []; let tot = 0;
          while (p < d.length && d[p] !== 0) { chunks.push(d.subarray(p + 1, p + 1 + d[p])); tot += d[p]; p += d[p] + 1; }
          p++;
          const data = new Uint8Array(tot); let o = 0;
          for (const c of chunks) { data.set(c, o); o += c.length; }
          const idx = gifLzwFull(minCode, data, w * h);
          const rows = new Array(h);
          if (f & 0x40) { let r = 0; for (const [s, st] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let y = s; y < h; y += st) rows[y] = r++; }
          else for (let y = 0; y < h; y++) rows[y] = y;
          const saved = gce.disp === 3 ? cv.slice() : null;
          if (ct) {
            for (let y = 0; y < h; y++) {
              const sy = rows[y] * w, dy = y0 + y; if (dy >= H) continue;
              for (let x = 0; x < w; x++) {
                const dx = x0 + x; if (dx >= W) continue;
                const ci = idx[sy + x]; if (ci === gce.trans) continue;
                const o2 = (dy * W + dx) * 4;
                cv[o2] = ct[ci * 3]; cv[o2 + 1] = ct[ci * 3 + 1]; cv[o2 + 2] = ct[ci * 3 + 2]; cv[o2 + 3] = 255;
              }
            }
          }
          frames.push({ data: cv.slice(), delay: gce.delay || 100 });
          if (gce.disp === 2) {
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
              const dx = x0 + x, dy = y0 + y;
              if (dx < W && dy < H) cv.fill(0, (dy * W + dx) * 4, (dy * W + dx) * 4 + 4);
            }
          } else if (gce.disp === 3 && saved) cv = saved;
          gce = { delay: 0, trans: -1, disp: 0 };
        } else break;
      }
      return { w: W, h: H, frames };
    }

    function gifLzwFull(minCode, data, npix) {
      const clear = 1 << minCode, eoi = clear + 1;
      let size = minCode + 1, next = eoi + 1, mask = (1 << size) - 1;
      const prefix = new Uint16Array(4096), suffix = new Uint8Array(4096), stack = new Uint8Array(4097), out = new Uint8Array(npix);
      for (let i = 0; i < clear; i++) suffix[i] = i;
      let bits = 0, nb = 0, op = 0, old = -1, first = 0;
      for (let i = 0; i < data.length; i++) {
        bits |= data[i] << nb; nb += 8;
        while (nb >= size) {
          let code = bits & mask; bits >>= size; nb -= size;
          if (code === clear) { size = minCode + 1; mask = (1 << size) - 1; next = eoi + 1; old = -1; continue; }
          if (code === eoi) return out;
          if (old === -1) { out[op++] = suffix[code]; old = code; first = code; continue; }
          const inCode = code; let top = 0;
          if (code >= next) { stack[top++] = first; code = old; }
          while (code >= clear) { stack[top++] = suffix[code]; code = prefix[code]; }
          first = suffix[code]; stack[top++] = first;
          if (next < 4096) { prefix[next] = old; suffix[next] = first; next++; if ((next & mask) === 0 && next < 4096) { size++; mask = (1 << size) - 1; } }
          old = inCode;
          while (top > 0 && op < npix) out[op++] = stack[--top];
        }
      }
      return out;
    }
    return { decodeGIFRGBA };
  })();

  // ── src/modules/limbo/limboSolver.js ────────────────────────────
  const { LIMBO_COLORS, SLOT_NAMES, limboColorName, limboBlobs, solveLimbo } = (function () {
    const LIMBO_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
    const SLOT_NAMES = ['top', 'upper right', 'lower right', 'bottom', 'lower left', 'upper left'];

    const ARC_BULGE = 0.28;

    function isKeyPixel(r, g, b) {
        return (r + g + b > 450 && Math.max(r, g, b) - Math.min(r, g, b) < 60);
    }

    function isGlowPixel(r, g, b) {
        return (r > 150 && r - b > 50 && g > 150);
    }

    function dist(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function getPlayArea(W, H) {
        return {
            x0: Math.round(W * 0.08),
            x1: Math.round(W * 0.92),
            y0: Math.round(H * 0.17),
            y1: Math.round(H * 0.92)
        };
    }

    function limboColorName(r, g, b) {
        const max_c = Math.max(r, g, b);
        const min_c = Math.min(r, g, b);
        if (max_c < 90 || max_c - min_c < 70) return null;

        const delta = max_c - min_c;
        let hue;
        if (max_c === r) {
            hue = ((g - b) / delta + 6) % 6;
        } else if (max_c === g) {
            hue = (b - r) / delta + 2;
        } else {
            hue = (r - g) / delta + 4;
        }
        hue *= 60;

        if (hue < 15 || hue >= 330) return 'red';
        if (hue < 38) return 'orange';
        if (hue < 70) return 'yellow';
        if (hue < 170) return 'green';
        if (hue < 250) return 'blue';
        return 'purple';
    }

    function limboBlobs(data, W, H) {
        const { x0, x1, y0, y1 } = getPlayArea(W, H);
        const mask = new Uint8Array(W * H);
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const i = (y * W + x) * 4;
                if (isKeyPixel(data[i], data[i + 1], data[i + 2])) mask[y * W + x] = 1;
            }
        }

        const min_pixels = Math.max(6, Math.round(W * H * 0.0007));
        const blobs = [];
        const stack = [];
        for (let start = 0; start < mask.length; start++) {
            if (mask[start] !== 1) continue;
            let count = 0;
            let sum_x = 0;
            let sum_y = 0;
            mask[start] = 2;
            stack.push(start);
            while (stack.length > 0) {
                const p = stack.pop();
                const px = p % W;
                const py = (p - px) / W;
                count++;
                sum_x += px;
                sum_y += py;
                for (const q of [p - 1, p + 1, p - W, p + W]) {
                    if (q < 0 || q >= mask.length || mask[q] !== 1) continue;
                    if (Math.abs((q % W) - px) > 1) continue;
                    mask[q] = 2;
                    stack.push(q);
                }
            }
            if (count >= min_pixels) {
                blobs.push({ x: sum_x / count, y: sum_y / count, n: count });
            }
        }
        return blobs;
    }

    function countColourPixels(data, W, H) {
        const { x0, x1, y0, y1 } = getPlayArea(W, H);
        let count = 0;
        for (let y = y0; y < y1; y += 2) {
            for (let x = x0; x < x1; x += 2) {
                const i = (y * W + x) * 4;
                if (limboColorName(data[i], data[i + 1], data[i + 2])) count++;
            }
        }
        return count;
    }

    function orderSlots(blobs) {
        let center_x = 0;
        let center_y = 0;
        for (const blob of blobs) {
            center_x += blob.x;
            center_y += blob.y;
        }
        center_x /= blobs.length;
        center_y /= blobs.length;

        const angleOf = (blob) => (Math.atan2(blob.x - center_x, -(blob.y - center_y)) + 2 * Math.PI + Math.PI / 6) % (2 * Math.PI);
        const sorted = blobs.slice().sort((a, b) => angleOf(a) - angleOf(b));

        const slots = [];
        for (const blob of sorted) {
            slots.push({ x: blob.x, y: blob.y });
        }
        return slots;
    }

    function getPairings(items) {
        if (items.length === 0) return [[]];
        const first = items[0];
        const rest = items.slice(1);
        const result = [];
        for (let j = 0; j < rest.length; j++) {
            const others = [];
            for (let k = 0; k < rest.length; k++) {
                if (k !== j) others.push(rest[k]);
            }
            for (const sub_pairing of getPairings(others)) {
                result.push([[first, rest[j]], ...sub_pairing]);
            }
        }
        return result;
    }

    function getArcPoint(A, B, t, side) {
        const mid_x = (A.x + B.x) / 2;
        const mid_y = (A.y + B.y) / 2;
        const half_x = (B.x - A.x) / 2;
        const half_y = (B.y - A.y) / 2;
        const u = -Math.cos(Math.PI * t);
        const v = side * ARC_BULGE * Math.sin(Math.PI * t) ** 2;
        return {
            x: mid_x + u * half_x - v * half_y,
            y: mid_y + u * half_y + v * half_x
        };
    }

    function getPairingCost(pairs, slots, move_frames) {
        const frame_count = move_frames.length;
        let total_cost = 0;
        for (const [a, b] of pairs) {
            const A = slots[a];
            const B = slots[b];
            let best = Infinity;
            for (const side of [1, -1]) {
                let cost = 0;
                for (let k = 0; k < frame_count; k++) {
                    const blobs = move_frames[k];
                    const t = (k + 1) / (frame_count + 1);
                    const expected = [getArcPoint(A, B, t, side), getArcPoint(B, A, t, side)];
                    for (const point of expected) {
                        let nearest = Infinity;
                        for (const blob of blobs) {
                            nearest = Math.min(nearest, dist(blob, point));
                        }
                        cost += nearest;
                    }
                }
                best = Math.min(best, cost);
            }
            total_cost += best;
        }
        return total_cost;
    }

    function solveLimbo(frames, W, H, startOverride = null) {
        if (frames.length === 0) return { ok: false, reason: 'no frames' };
        const unit = Math.min(W, H);
        const tolerance = unit * 0.025;

        const colour_counts = [];
        let colour_max = -Infinity;
        for (const frame of frames) {
            const count = countColourPixels(frame.data, W, H);
            colour_counts.push(count);
            colour_max = Math.max(colour_max, count);
        }

        let reveal_frame = -1;
        if (colour_max > 40) {
            reveal_frame = frames.length - 1;
            while (reveal_frame > 0 && colour_counts[reveal_frame - 1] > colour_max * 0.5) {
                reveal_frame--;
            }
        }
        const last_shuffle = (reveal_frame >= 0) ? reveal_frame : frames.length;

        const frame_blobs = [];
        for (let f = 0; f < last_shuffle; f++) {
            frame_blobs.push(limboBlobs(frames[f].data, W, H));
        }

        let first_rest = -1;
        for (let f = 0; f < frame_blobs.length; f++) {
            if (frame_blobs[f].length === 6) {
                first_rest = f;
                break;
            }
        }
        if (first_rest < 0) return { ok: false, reason: 'could not find the six keys — is this a Limbo GIF?' };
        const slots = orderSlots(frame_blobs[first_rest]);

        const isAtSlot = (blobs, slot) => {
            for (const blob of blobs) {
                if (dist(blob, slot) <= tolerance) return true;
            }
            return false;
        };
        const isRestFrame = (blobs) => {
            if (blobs.length !== 6) return false;
            for (const slot of slots) {
                if (!isAtSlot(blobs, slot)) return false;
            }
            return true;
        };

        let first_move = frame_blobs.length;
        for (let f = first_rest + 1; f < frame_blobs.length; f++) {
            if (!isRestFrame(frame_blobs[f])) {
                first_move = f;
                break;
            }
        }

        const glow_counts = new Array(6).fill(0);
        const radius = unit * 0.1;
        for (let f = 0; f < Math.max(first_move, 1); f++) {
            const data = frames[f].data;
            for (let k = 0; k < slots.length; k++) {
                const slot = slots[k];
                let count = 0;
                for (let y = Math.max(0, Math.round(slot.y - radius)); y < Math.min(H, slot.y + radius); y++) {
                    for (let x = Math.max(0, Math.round(slot.x - radius)); x < Math.min(W, slot.x + radius); x++) {
                        const j = (y * W + x) * 4;
                        if (isGlowPixel(data[j], data[j + 1], data[j + 2])) count++;
                    }
                }
                glow_counts[k] = Math.max(glow_counts[k], count);
            }
        }

        const glow_order = [];
        for (let k = 0; k < glow_counts.length; k++) {
            glow_order.push([glow_counts[k], k]);
        }
        glow_order.sort((a, b) => b[0] - a[0]);
        const detected_start = (glow_order[0][0] > 0) ? glow_order[0][1] : null;
        const start_sure = (detected_start !== null && glow_order[0][0] > 3 * (glow_order[1][0] + 5));
        const start = (startOverride !== null && startOverride !== undefined) ? startOverride : detected_start;

        const moves = [];
        let f = first_rest;
        while (f < frame_blobs.length) {
            if (isRestFrame(frame_blobs[f])) {
                f++;
                continue;
            }
            const move_start = f;
            while (f < frame_blobs.length && !isRestFrame(frame_blobs[f])) f++;
            const move_frames = frame_blobs.slice(move_start, f);

            const moved_slots = [];
            for (let k = 0; k < slots.length; k++) {
                let off_count = 0;
                for (const blobs of move_frames) {
                    if (!isAtSlot(blobs, slots[k])) off_count++;
                }
                if (off_count * 2 >= move_frames.length && off_count > 0) moved_slots.push(k);
            }

            const move = { frames: [move_start, f - 1], pairs: [], cost: 0, margin: Infinity, warn: '' };
            if (moved_slots.length < 2 || moved_slots.length % 2 !== 0) {
                move.warn = `${moved_slots.length} key(s) moved — expected pairs`;
            } else {
                const scored = [];
                for (const pairing of getPairings(moved_slots)) {
                    scored.push({ p: pairing, c: getPairingCost(pairing, slots, move_frames) });
                }
                scored.sort((a, b) => a.c - b.c);
                const scale = move_frames.length * moved_slots.length * unit;
                move.pairs = scored[0].p;
                move.cost = scored[0].c / scale;
                move.margin = (scored.length > 1) ? (scored[1].c - scored[0].c) / scale : Infinity;
            }
            moves.push(move);
        }

        const path = [];
        let current_slot = start;
        if (current_slot !== null) {
            for (const move of moves) {
                for (const [a, b] of move.pairs) {
                    if (current_slot === a) {
                        current_slot = b;
                    } else if (current_slot === b) {
                        current_slot = a;
                    }
                }
                path.push(current_slot);
            }
        }

        let colors = null;
        if (reveal_frame >= 0) {
            const data = frames[reveal_frame].data;
            colors = [];
            for (const slot of slots) {
                const votes = {};
                for (let y = Math.max(0, Math.round(slot.y - radius)); y < Math.min(H, slot.y + radius); y++) {
                    for (let x = Math.max(0, Math.round(slot.x - radius)); x < Math.min(W, slot.x + radius); x++) {
                        const j = (y * W + x) * 4;
                        const name = limboColorName(data[j], data[j + 1], data[j + 2]);
                        if (name) votes[name] = (votes[name] || 0) + 1;
                    }
                }
                let best_name = null;
                let best_count = 0;
                for (const [name, count] of Object.entries(votes)) {
                    if (count > best_count) {
                        best_name = name;
                        best_count = count;
                    }
                }
                colors.push(best_name);
            }
        }

        let unsure_moves = 0;
        for (const move of moves) {
            if (move.warn || move.margin < 0.01) unsure_moves++;
        }

        return {
            ok: true,
            slots,
            start,
            detectedStart: detected_start,
            startSure: start_sure,
            moves,
            unsureMoves: unsure_moves,
            path,
            end: current_slot,
            colors,
            revealFrame: reveal_frame,
            answer: (current_slot !== null && colors && colors[current_slot]) ? colors[current_slot] : ''
        };
    }
    return { LIMBO_COLORS, SLOT_NAMES, limboColorName, limboBlobs, solveLimbo };
  })();

  // ── UI ──────────────────────────────────────────────────────────
  const LIMBO_SWATCH = {
    red: '#ef4444', orange: '#f97316', yellow: '#facc15', green: '#22c55e', blue: '#3b82f6', purple: '#a855f7'
  };

  const state = {
    gif: null,      // { frames, w, h } of the last GIF (kept to re-run with a picked start key)
    result: null,
    error: '',
    busy: false,
    thumbs: { start: '', end: '' },
    meta: ''
  };
  window.limboModuleState = state;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
  const isGifBytes = (u8) => u8.length > 3 && u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46;
  const shortSlot = (k) => SLOT_NAMES[k].replace('upper ', 'U-').replace('lower ', 'L-');

  function frameUri(fr, W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(fr.data), W, H), 0, 0);
    return c.toDataURL();
  }

  function injectStyles() {
    if ($('limboStyles')) return;
    const style = document.createElement('style');
    style.id = 'limboStyles';
    style.textContent = `
    .lb-shell { max-width: 1040px; margin: 0 auto 30px; background: #0d0f22; border: 1.5px solid #202448; border-radius: 18px; padding: 24px; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
    .lb-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #1c2042; }
    .lb-title { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; color: #ffd875; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .lb-pill { font-size: 13px; font-weight: 600; color: #94a3b8; background: #181b36; padding: 3px 10px; border-radius: 99px; border: 1px solid #282d58; }
    .lb-layout { display: grid; grid-template-columns: 330px 1fr; gap: 24px; align-items: start; }
    @media (max-width: 860px) { .lb-layout { grid-template-columns: 1fr; } }
    .lb-card { background: #070814; border: 1px solid #1c2042; border-radius: 14px; padding: 16px; }
    .lb-card-title { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #ffd875; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.8px; }
    .lb-dropzone { border: 2px dashed #343864; border-radius: 12px; padding: 22px 14px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.015); transition: all 0.2s; margin-bottom: 14px; }
    .lb-dropzone:hover, .lb-dropzone.dragover { border-color: #ffd875; background: rgba(255,216,117,0.06); }
    .lb-btn { background: #181b36; border: 1px solid #2d3366; color: #cbd5e1; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .lb-btn:hover { border-color: #ffd875; color: #ffd875; }
    .lb-help { background: #12152e; border: 1px solid #232a58; border-radius: 10px; padding: 12px; font-size: 12px; color: #cbd5e1; line-height: 1.5; }
    .lb-help ol { margin: 6px 0 0; padding-left: 18px; }
    .lb-thumbs { display: flex; gap: 10px; margin-bottom: 12px; justify-content: center; }
    .lb-thumbs figure { margin: 0; text-align: center; font-size: 11px; color: #94a3b8; }
    .lb-thumbs img { width: 130px; border-radius: 8px; border: 1px solid #2a315e; display: block; }
    .lb-meta { font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 12px; }
    .lb-banner { background: linear-gradient(135deg, rgba(255,216,117,0.10) 0%, rgba(245,197,66,0.04) 100%); border: 2px solid #f5c542; border-radius: 14px; padding: 16px 20px; margin-bottom: 18px; box-shadow: 0 0 25px rgba(245,197,66,0.12); }
    .lb-banner-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .lb-banner-lbl { font-size: 12px; font-weight: 800; color: #ffd875; letter-spacing: 1px; text-transform: uppercase; }
    .lb-answer { font-family: 'Outfit', sans-serif; font-size: 34px; font-weight: 900; margin-top: 2px; display: flex; align-items: center; gap: 12px; }
    .lb-answer .lb-swatch { width: 26px; height: 26px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.4); box-shadow: 0 0 12px currentColor; }
    .lb-stats { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .lb-copy { background: #2a2410; border-color: #f5c542; color: #ffd875; font-weight: 800; }
    .lb-warn { background: rgba(255,95,87,0.08); border: 1px solid rgba(255,95,87,0.4); color: #ff9b94; border-radius: 10px; padding: 10px 12px; font-size: 13px; margin-bottom: 12px; }
    .lb-board { background: #05060d; border: 2px solid #23274c; border-radius: 12px; padding: 10px; text-align: center; margin-bottom: 16px; }
    .lb-board svg { width: 100%; max-width: 280px; display: block; margin: 0 auto; }
    .lb-slot { cursor: pointer; }
    .lb-slot:hover circle.lb-key { stroke: #ffd875; stroke-width: 3; }
    .lb-start-ring { fill: none; stroke: #ffd875; stroke-width: 3; }
    .lb-end-ring { fill: none; stroke: #22c55e; stroke-width: 3; stroke-dasharray: 5 4; }
    .lb-tag { font: 800 10px 'Outfit', sans-serif; fill: #ffd875; text-anchor: middle; letter-spacing: 1px; }
    .lb-tag.end { fill: #4ade80; }
    .lb-board-note { font-size: 12px; color: #8892b0; margin-top: 6px; }
    .lb-details { background: #070814; border: 1px solid #1c2042; border-radius: 12px; padding: 10px 14px; }
    .lb-details summary { color: #ffd875; font-weight: 700; font-size: 13px; cursor: pointer; outline: none; }
    .lb-moves { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    .lb-moves th { text-align: left; color: #94a3b8; font-weight: 600; padding: 4px 6px; border-bottom: 1px solid #1c2042; }
    .lb-moves td { padding: 4px 6px; border-bottom: 1px solid #141833; color: #cbd5e1; }
    .lb-moves tr.moved td { color: #ffd875; font-weight: 700; }
    .lb-moves tr.unsure td:last-child { color: #ff9b94; }
    `;
    document.head.appendChild(style);
  }

  function renderUI() {
    const section = $('limboSection');
    if (!section) return;
    section.innerHTML = `
      <div class="lb-shell">
        <div class="lb-head">
          <div class="lb-title"><span>🗝️</span> Limbo Solver <span class="lb-pill">GIF · 6 Keys</span></div>
          <div style="display:flex; gap:10px;">
            <button class="lb-btn" type="button" onclick="window.clearLimbo()">Reset</button>
          </div>
        </div>

        <div class="lb-layout">
          <div class="lb-card">
            <div class="lb-card-title">Upload / Paste GIF</div>
            <div id="limboDropzone" class="lb-dropzone" onclick="document.getElementById('limboFileInput').click()">
              <input type="file" id="limboFileInput" accept="image/gif,image/*" style="display:none;" onchange="window.handleLimboFile(this)">
              <div id="limboDropIcon" style="font-size:32px; margin-bottom:8px;">🗝️</div>
              <div style="font-weight:700; font-size:14px; color:#fff; margin-bottom:4px;">Click to Upload the Limbo GIF</div>
              <div style="font-size:12px; color:#94a3b8;">or drag the GIF / Discord link in, or <kbd style="background:#1e2246; padding:2px 6px; border-radius:4px; color:#ffd875;">Ctrl+V</kbd> a link</div>
            </div>
            <div id="limboThumbs" class="lb-thumbs"></div>
            <div id="limboMeta" class="lb-meta"></div>
            <div class="lb-help">
              <strong>💡 How to solve:</strong>
              <ol>
                <li>Drop the <strong>whole GIF</strong> (glowing key → shuffle → colours).</li>
                <li>The glowing key is followed through every swap.</li>
                <li>Its colour in the <strong>last frame</strong> is the answer.</li>
                <li>No glow found? Tap the start key on the board.</li>
              </ol>
            </div>
          </div>

          <div>
            <div class="lb-banner">
              <div class="lb-banner-row">
                <div>
                  <div class="lb-banner-lbl">Key Colour</div>
                  <div id="limboAnswer" class="lb-answer"><span style="color:#64748b;">— — —</span></div>
                  <div id="limboStats" class="lb-stats"></div>
                </div>
                <button id="limboCopyBtn" class="lb-btn lb-copy" type="button" onclick="window.copyLimboAnswer()">📋 Copy</button>
              </div>
            </div>
            <div id="limboWarnings"></div>
            <div id="limboBoard"></div>
            <details class="lb-details">
              <summary id="limboMovesTitle">Shuffle</summary>
              <div id="limboMoves" style="font-size:13px; color:#94a3b8; margin-top:8px;">Nothing yet — paste the Limbo GIF.</div>
            </details>
          </div>
        </div>
      </div>
    `;
    setupInputs();
    update();
  }

  function setupInputs() {
    const dz = $('limboDropzone');
    if (dz) {
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
      dz.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dz.classList.remove('dragover');
        if (window.BombDragDrop) {
          window.BombDragDrop.handleDataTransfer(e.dataTransfer, (file) => { if (file) loadFile(file); });
        } else {
          const f = [...(e.dataTransfer?.files || [])][0];
          if (f) loadFile(f);
        }
      });
    }
    // A pasted image blob (Discord links are routed by dragdrop-helper.js)
    document.addEventListener('paste', (e) => {
      if (!$('limboSection')?.classList.contains('active')) return;
      for (const item of (e.clipboardData?.items || [])) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const f = item.getAsFile();
          if (f) loadFile(f);
          return;
        }
      }
    });
  }

  function run(override) {
    const g = state.gif;
    if (!g) return null;
    state.result = solveLimbo(g.frames, g.w, g.h, override);
    return state.result;
  }

  async function loadFile(file) {
    state.error = '';
    state.busy = true;
    update();
    try {
      const buf = await file.arrayBuffer();
      if (!isGifBytes(new Uint8Array(buf, 0, Math.min(4, buf.byteLength)))) {
        state.error = 'That is a still image — Limbo needs the GIF (the whole shuffle). A copied GIF often pastes as a still: drag the GIF or its Discord link in instead.';
        return;
      }
      const g = decodeGIFRGBA(buf);
      if (!g.frames.length) throw new Error('no frames');
      state.gif = g;
      const r = run(null);
      const secs = (g.frames.reduce((a, x) => a + (x.delay || 0), 0) / 1000).toFixed(1);
      state.meta = `${g.w}×${g.h} · ${g.frames.length} frames · ${secs}s`;
      state.thumbs = {
        start: frameUri(g.frames[Math.min(1, g.frames.length - 1)], g.w, g.h),
        end: frameUri(g.frames[g.frames.length - 1], g.w, g.h)
      };
      if (!r.ok) state.error = r.reason;
    } catch (e) {
      state.error = `Could not read that GIF (${e.message || e}).`;
    } finally {
      state.busy = false;
      update();
    }
  }

  function boardSvg(r) {
    const { slots, start, end, colors } = r;
    const xs = slots.map(s => s.x), ys = slots.map(s => s.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
    const P = (s) => ({ x: 100 + ((s.x - cx) / span) * 130, y: 100 + ((s.y - cy) / span) * 130 });
    let g = '';
    slots.forEach((s, k) => {
      const p = P(s);
      const col = colors && colors[k] ? LIMBO_SWATCH[colors[k]] : '#3a4060';
      g += `<g class="lb-slot" onclick="window.pickLimboStart(${k})">`;
      g += `<title>${esc(SLOT_NAMES[k])}${colors && colors[k] ? ' · ' + colors[k] : ''} — tap to make this the start key</title>`;
      if (k === end) g += `<circle cx="${p.x}" cy="${p.y}" r="25" class="lb-end-ring"/>`;
      if (k === start) g += `<circle cx="${p.x}" cy="${p.y}" r="20" class="lb-start-ring"/>`;
      g += `<circle class="lb-key" cx="${p.x}" cy="${p.y}" r="14" fill="${col}" stroke="rgba(0,0,0,.35)" stroke-width="2"/>`;
      if (k === start) g += `<text x="${p.x}" y="${p.y - 30}" class="lb-tag">START</text>`;
      if (k === end) g += `<text x="${p.x}" y="${p.y + (k === start ? 40 : 38)}" class="lb-tag end">END</text>`;
      g += '</g>';
    });
    return `<div class="lb-board"><svg viewBox="0 -14 200 228" role="img" aria-label="Limbo key slots">${g}</svg>
      <div class="lb-board-note">Tap a key to change the start</div></div>`;
  }

  function movesTable(r) {
    let rows = '';
    r.moves.forEach((m, i) => {
      const moved = m.pairs.some(p => p.includes(i === 0 ? r.start : r.path[i - 1]));
      const unsure = m.warn || m.margin < 0.01;
      const swaps = m.warn || m.pairs.map(([a, b]) => `${shortSlot(a)} ↔ ${shortSlot(b)}`).join(', ');
      const now = r.path[i] !== undefined && r.path[i] !== null ? shortSlot(r.path[i]) : '—';
      rows += `<tr class="${moved ? 'moved' : ''} ${unsure ? 'unsure' : ''}"><td>${i + 1}</td><td>${m.frames[0]}–${m.frames[1]}</td><td>${esc(swaps)}</td><td>${now}</td><td>${unsure ? '⚠' : '✓'}</td></tr>`;
    });
    return `<table class="lb-moves"><thead><tr><th>#</th><th>Frames</th><th>Swaps</th><th>Key now</th><th>Fit</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function update() {
    if (!$('limboAnswer')) return;
    const r = state.result && state.result.ok ? state.result : null;
    const answer = r && r.answer ? cap(r.answer) : '';

    $('limboDropIcon').textContent = state.busy ? '⏳' : '🗝️';
    $('limboAnswer').innerHTML = answer
      ? `<span class="lb-swatch" style="background:${LIMBO_SWATCH[r.answer]}; color:${LIMBO_SWATCH[r.answer]};"></span><span style="color:${LIMBO_SWATCH[r.answer]};">${esc(answer)}</span>`
      : '<span style="color:#64748b;">— — —</span>';
    $('limboStats').textContent = r
      ? `${SLOT_NAMES[r.start] || '?'} → ${SLOT_NAMES[r.end] || '?'} · ${r.moves.length} moves${r.unsureMoves ? ` · ${r.unsureMoves} unsure` : ''}`
      : '';

    const warns = [];
    if (state.error) warns.push(esc(state.error));
    if (r && !r.startSure) warns.push(`${r.detectedStart === null ? 'No glowing key found at the start' : 'The start glow is faint'} — tap the key that glowed on the board below.`);
    if (r && !r.colors) warns.push(`The GIF has no colour frame at the end — the answer is the slot: <b>${esc(SLOT_NAMES[r.end] || '?')}</b>.`);
    $('limboWarnings').innerHTML = warns.map(w => `<div class="lb-warn">⚠ ${w}</div>`).join('');

    $('limboBoard').innerHTML = r ? boardSvg(r) : '';
    $('limboThumbs').innerHTML = (state.thumbs.start ? `<figure><img src="${state.thumbs.start}" alt="start frame"><figcaption>start</figcaption></figure>` : '')
      + (state.thumbs.end ? `<figure><img src="${state.thumbs.end}" alt="last frame"><figcaption>end</figcaption></figure>` : '');
    $('limboMeta').textContent = state.meta;

    $('limboMovesTitle').textContent = r ? `Shuffle (${r.moves.length} moves)` : 'Shuffle';
    $('limboMoves').innerHTML = r ? movesTable(r)
      : state.result && !state.result.ok ? esc(state.result.reason) : 'Nothing yet — paste the Limbo GIF.';
  }

  window.handleLimboFile = function (input) {
    const f = input.files && input.files[0];
    if (f) loadFile(f);
    input.value = '';
  };

  window.pickLimboStart = function (k) {
    if (!state.gif) return;
    run(k);
    update();
  };

  window.copyLimboAnswer = function () {
    const r = state.result && state.result.ok ? state.result : null;
    const answer = r && r.answer ? cap(r.answer) : '';
    if (!answer) return;
    navigator.clipboard.writeText(answer).then(() => {
      const btn = $('limboCopyBtn');
      if (!btn) return;
      btn.textContent = '✓ Copied';
      setTimeout(() => { btn.textContent = '📋 Copy'; }, 1500);
    }).catch(() => {});
  };

  window.clearLimbo = function () {
    state.gif = null;
    state.result = null;
    state.error = '';
    state.thumbs = { start: '', end: '' };
    state.meta = '';
    update();
  };

  window.initLimboModule = function () {
    injectStyles();
    renderUI();
  };
})();
