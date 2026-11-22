/**
 * Hangman Module Solver for Keep Talking and Nobody Explains
 *
 * Every letter guess draws a body part, right or wrong — so this picks the letter
 * that narrows the manual's word list down fastest (fewest guesses in the worst
 * case, then on average), and once one word is left, guess the whole word.
 *
 * Features:
 * 1. Screenshot reader: blanks, revealed letters and the stick figure. Comparing
 *    with the previous screenshot tells where the guessed letter went (or a miss).
 * 2. Letter shapes are learned from screenshots and remembered in this browser.
 * 3. Paste the bomb's manual anywhere on the tab to load its word list.
 * 4. Tap an outcome instead of pasting, and see the whole plan from here.
 */

(function () {
  'use strict';

  // ── src/modules/hangman/hangmanSolver.js ────────────────────────
  const { HANGMAN_DEFAULT_WORDS, parseHangmanWords, looksLikeHangmanList, positionsOf, candidates, outcomes, bestGuess, revealed } = (function () {
    // Hangman: the hidden word is one of the manual's words. Every letter guess, right or wrong, adds a
    // body part, so the best letter is the one that narrows the list down fastest, not the most likely
    // one. Once one word is left, guess the whole word (no body part needed).

    // The list from the 2026-11-22 game's manual
    const HANGMAN_DEFAULT_WORDS = `SPEAKING CRANKING STICKING SLASHING BATTERED
    FLASHING WOUNDING RUMBLING CREAKING CLICKING
    FREAKING MATTERED CLANKING FLICKING MUMBLING
    SMASHING BREAKING FUMBLING CRASHING SNEAKING
    PATTERED TATTERED BUMBLING TRICKING BLANKING`;

    /**
     * Manual text → the word list (upper case, no repeats). Text before a "Words" heading is skipped,
     * and only ALL-CAPS words count, so the manual's sentences and a pasted Discord name line drop out.
     */
    function parseHangmanWords(text) {
      let t = String(text || '');
      const head = t.match(/^\s*words\s*:?\s*$/im);
      if (head) t = t.slice(head.index + head[0].length);
      let words = t.match(/\b[A-Z]{3,}\b/g) || [];
      // a list typed in lower case: every word after the heading
      if (words.length < 5 && head) words = (t.match(/\b[a-zA-Z]{3,}\b/g) || []).map(w => w.toUpperCase());
      return [...new Set(words)];
    }

    /** Pasted text that is a Hangman manual / word list. */
    function looksLikeHangmanList(text) {
      const t = String(text || '');
      const words = parseHangmanWords(t);
      if (/hangman/i.test(t)) return words.length >= 5;
      // a bare list: 10+ capital words of one length (6+ letters, so a Password list of 5s is not taken)
      return words.length >= 10 && words.every(w => w.length === words[0].length) && words[0].length >= 6;
    }

    /** Positions (0-based) of `letter` in `word`. */
    const positionsOf = (word, letter) => {
      const out = [];
      for (let i = 0; i < word.length; i++) if (word[i] === letter) out.push(i);
      return out;
    };

    /** Words that agree with every guess so far: guesses = [{ letter, positions: [0-based] }]. */
    function candidates(words, guesses, length = null) {
      return words.filter(w => (length == null || w.length === length)
        && guesses.every(g => positionsOf(w, g.letter).join() === [...g.positions].sort((a, b) => a - b).join()));
    }

    /** What guessing `letter` can show: [{ positions, words }], "not in the word" last. */
    function outcomes(cands, letter) {
      const groups = new Map();
      for (const w of cands) {
        const k = positionsOf(w, letter).join();
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(w);
      }
      return [...groups.entries()]
        .map(([k, ws]) => ({ positions: k ? k.split(',').map(Number) : [], words: ws }))
        .sort((a, b) => (b.positions.length ? 1 : 0) - (a.positions.length ? 1 : 0) || b.words.length - a.words.length);
    }

    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    /**
     * Best next letter for the words still possible. Minimises the worst case (letters needed before
     * only one word is left), then the average. Exact search for up to 40 words; above that the letter
     * that leaves the smallest biggest group is taken.
     * Returns null when 0 or 1 words are left, else { letter, worst, average, groups: [{ positions, words }] }.
     */
    function bestGuess(cands, memo = new Map()) {
      if (cands.length <= 1) return null;
      const key = cands.join(',');
      if (memo.has(key)) return memo.get(key);

      const options = [];
      for (const L of LETTERS) {
        const groups = outcomes(cands, L);
        if (groups.length >= 2) options.push({ letter: L, groups });
      }
      if (!options.length) { memo.set(key, null); return null; } // words that can't be told apart

      let best = null;
      if (cands.length > 40) {
        // big list: biggest group first, then the sum of squares (how spread out the groups are)
        for (const o of options) {
          const big = Math.max(...o.groups.map(g => g.words.length));
          const sq = o.groups.reduce((a, g) => a + g.words.length ** 2, 0);
          if (!best || big < best.big || (big === best.big && sq < best.sq)) best = { ...o, big, sq };
        }
        const sub = best.groups.map(g => cost(g.words, memo));
        best = { letter: best.letter, groups: best.groups, worst: 1 + Math.max(...sub.map(r => r.worst)), total: sub.reduce((a, r, i) => a + r.total + best.groups[i].words.length, 0) };
      } else {
        for (const o of options) {
          let worst = 0, total = 0;
          for (const g of o.groups) {
            const r = cost(g.words, memo);
            worst = Math.max(worst, 1 + r.worst);
            total += g.words.length + r.total;
            if (best && worst > best.worst) break; // already worse
          }
          if (!best || worst < best.worst || (worst === best.worst && total < best.total)) best = { letter: o.letter, groups: o.groups, worst, total };
        }
      }
      const out = { letter: best.letter, worst: best.worst, average: best.total / cands.length, total: best.total, groups: best.groups };
      memo.set(key, out);
      return out;
    }

    /** Letters still needed for a set of words: worst case and the sum over the words. */
    function cost(words, memo) {
      const b = bestGuess(words, memo);
      return b ? { worst: b.worst, total: b.total } : { worst: 0, total: 0 };
    }

    /** A word board for display: '_' where unknown. */
    function revealed(length, guesses) {
      const out = Array(length).fill('_');
      for (const g of guesses) for (const p of g.positions) if (p < length) out[p] = g.letter;
      return out;
    }
    return { HANGMAN_DEFAULT_WORDS, parseHangmanWords, looksLikeHangmanList, positionsOf, candidates, outcomes, bestGuess, revealed };
  })();

  // ── src/modules/hangman/hangmanVision.js ────────────────────────
  const { GLYPH_W, GLYPH_H, glyphScore, encodeGlyph, decodeGlyph, SEED_GLYPHS, readHangman } = (function () {
    // Hangman screenshot reader: how many blanks, which ones show a letter (and that letter's shape),
    // and how much of the stick figure is drawn. The letters are not read like text: the app knows which
    // letter was just guessed, so the newly filled blanks are where that letter is. Shapes are kept so a
    // letter seen once is recognised by its shape after that.
    //
    // Picture: blanks are dark slate boxes (43,48,56) with a dim grey underscore; a revealed letter is
    // bright (green 72,255,106); the stick figure is white; the gallows is brown.

    const GLYPH_W = 12, GLYPH_H = 16;

    const isSlot = (r, g, b) => Math.abs(r - 43) <= 4 && Math.abs(g - 48) <= 4 && Math.abs(b - 56) <= 4;
    const isInk = (r, g, b) => Math.max(r, g, b) > 130;     // the underscore peaks around 87
    const isFigure = (r, g, b) => Math.min(r, g, b) > 200; // white stick figure

    /** Runs of `true` → [[start, end)] at least minLen long. */
    function runs(on, minLen) {
      const out = [];
      let s = -1;
      for (let i = 0; i <= on.length; i++) {
        const v = i < on.length && on[i];
        if (v && s < 0) s = i;
        if (!v && s >= 0) { if (i - s >= minLen) out.push([s, i]); s = -1; }
      }
      return out;
    }

    /** Ink inside a box → a GLYPH_W×GLYPH_H coverage grid, centred, padded to that 3:4 shape. */
    function glyphOf(data, W, x0, y0, x1, y1) {
      let gx0 = x1, gx1 = x0 - 1, gy0 = y1, gy1 = y0 - 1;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const p = (y * W + x) * 4;
          if (isInk(data[p], data[p + 1], data[p + 2])) {
            if (x < gx0) gx0 = x; if (x > gx1) gx1 = x; if (y < gy0) gy0 = y; if (y > gy1) gy1 = y;
          }
        }
      }
      if (gx1 < gx0) return null;
      let w = gx1 - gx0 + 1, h = gy1 - gy0 + 1;
      // pad to 3:4 so a narrow I is not stretched into a block
      const cx = (gx0 + gx1 + 1) / 2, cy = (gy0 + gy1 + 1) / 2;
      if (w / h < GLYPH_W / GLYPH_H) w = h * GLYPH_W / GLYPH_H; else h = w * GLYPH_H / GLYPH_W;
      const out = new Float32Array(GLYPH_W * GLYPH_H);
      const S = 3; // 3×3 samples per cell
      for (let gy = 0; gy < GLYPH_H; gy++) {
        for (let gx = 0; gx < GLYPH_W; gx++) {
          let n = 0;
          for (let sy = 0; sy < S; sy++) {
            for (let sx = 0; sx < S; sx++) {
              const x = Math.floor(cx - w / 2 + (gx + (sx + 0.5) / S) * w / GLYPH_W);
              const y = Math.floor(cy - h / 2 + (gy + (sy + 0.5) / S) * h / GLYPH_H);
              if (x < x0 || y < y0 || x >= x1 || y >= y1) continue;
              const p = (y * W + x) * 4;
              if (isInk(data[p], data[p + 1], data[p + 2])) n++;
            }
          }
          out[gy * GLYPH_W + gx] = n / (S * S);
        }
      }
      return out;
    }

    /** Shape similarity of two glyphs (correlation, −1…1). */
    function glyphScore(a, b) {
      if (!a || !b) return -1;
      let ma = 0, mb = 0;
      for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; }
      ma /= a.length; mb /= b.length;
      let d = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) {
        const x = a[i] - ma, y = b[i] - mb;
        d += x * y; na += x * x; nb += y * y;
      }
      return d / Math.sqrt(na * nb + 1e-9);
    }

    const encodeGlyph = g => Array.from(g, v => Math.round(v * 9)).join('');
    const decodeGlyph = s => Float32Array.from(String(s), c => Number(c) / 9);

    // Letter shapes seen in real screenshots (more are learned while playing and kept in the browser)
    const SEED_GLYPHS = {
      // 2026-11-22 screenshot, T in the 3rd of 9 blanks
      T: '133333333331799999999993999999999999953599995359000399993000000399993000000399993000000399993000000399993000000399993000000399993000000399993000000399993000000399971000000288600000000022000000'
    };

    /**
     * Read a Hangman screenshot.
     * → { ok, reason?, length, slots: [{ x0, x1, filled, glyph }], figure: { ink, headOnly } }
     */
    function readHangman(data, W, H) {
      const ix0 = Math.round(W * 0.08), ix1 = Math.round(W * 0.92);
      // the row of blanks: lower part of the picture, slot colour over ≥30% of the inner width
      let by0 = -1, by1 = -1;
      for (let y = Math.round(H * 0.55); y < Math.round(H * 0.95); y++) {
        let n = 0;
        for (let x = ix0; x < ix1; x++) {
          const p = (y * W + x) * 4;
          if (isSlot(data[p], data[p + 1], data[p + 2])) n++;
        }
        if (n > (ix1 - ix0) * 0.3) { if (by0 < 0) by0 = y; by1 = y; } else if (by0 >= 0 && y - by1 > 3) break;
      }
      if (by0 < 0) return { ok: false, reason: 'could not find the blanks' };
      const bh = by1 - by0 + 1;
      const col = new Array(W).fill(false);
      for (let x = ix0; x < ix1; x++) {
        let n = 0;
        for (let y = by0; y <= by1; y++) {
          const p = (y * W + x) * 4;
          if (isSlot(data[p], data[p + 1], data[p + 2])) n++;
        }
        col[x] = n > bh * 0.2;
      }
      const spans = runs(col, Math.max(6, Math.round(W * 0.03)));
      if (spans.length < 3) return { ok: false, reason: 'could not find the blanks' };

      const slots = spans.map(([x0, x1]) => {
        let ink = 0;
        for (let y = by0; y <= by1; y++) {
          for (let x = x0; x < x1; x++) {
            const p = (y * W + x) * 4;
            if (isInk(data[p], data[p + 1], data[p + 2])) ink++;
          }
        }
        const filled = ink > (x1 - x0) * bh * 0.04;
        return { x0, x1, filled, glyph: filled ? glyphOf(data, W, x0, by0, x1, by1 + 1) : null };
      });

      // stick figure: white ink between the title and the blanks
      let ink = 0, fx0 = W, fx1 = -1, fy0 = H, fy1 = -1;
      for (let y = Math.round(H * 0.15); y < by0 - 2; y++) {
        for (let x = ix0; x < ix1; x++) {
          const p = (y * W + x) * 4;
          if (isFigure(data[p], data[p + 1], data[p + 2])) {
            ink++;
            if (x < fx0) fx0 = x; if (x > fx1) fx1 = x; if (y < fy0) fy0 = y; if (y > fy1) fy1 = y;
          }
        }
      }
      const scale = (W * H) / (440 * 440);
      const figure = {
        ink: Math.round(ink / scale), // in 440×440 pixels, so pictures of other sizes compare
        headOnly: ink > 0 && (fy1 - fy0 + 1) <= (fx1 - fx0 + 1) * 1.25
      };
      return { ok: true, length: slots.length, slots, figure };
    }
    return { GLYPH_W, GLYPH_H, glyphScore, encodeGlyph, decodeGlyph, SEED_GLYPHS, readHangman };
  })();

  // ── src/modules/hangman/hangmanShot.js ──────────────────────────
  const { shapeBook, learnShapes, applyShot } = (function () {
    // Turning a new Hangman screenshot into guesses. Every screenshot comes after one more letter guess:
    // blanks that just filled in are where that letter is; nothing new but a bigger stick figure = it
    // missed. Which letter was guessed: a shape seen before, else the letter the app suggested (or the
    // one typed in), else the only letter the word list allows there — otherwise the user is asked.



    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const SAME_SHAPE = 0.9;   // two blanks show the same letter (same letter renders almost identically)
    const KNOWN_SHAPE = 0.93; // a blank shows a letter seen before (high, so E is never taken for a known F)
    const PART_INK = 30;      // a new body part adds well over this many white pixels (440×440)

    /** Saved shapes ({ letter: [encoded] }) + the built-in ones → { letter: [Float32Array] } */
    function shapeBook(saved) {
      const book = {};
      for (const [k, list] of Object.entries(SEED_GLYPHS)) book[k] = [decodeGlyph(list)];
      for (const [k, list] of Object.entries(saved || {})) {
        book[k] = (book[k] || []).concat((list || []).map(decodeGlyph));
      }
      return book;
    }

    /** Add newly identified shapes to the saved ones (at most 6 per letter). */
    function learnShapes(saved, learned) {
      const out = { ...(saved || {}) };
      for (const { letter, glyph } of learned) {
        if (!glyph) continue;
        out[letter] = [encodeGlyph(glyph), ...(out[letter] || [])].slice(0, 6);
      }
      return out;
    }

    function bestShape(glyph, book, skip) {
      let best = null, score = -1, second = -1;
      for (const [letter, list] of Object.entries(book)) {
        if (skip.has(letter)) continue;
        const s = Math.max(...list.map(g => glyphScore(glyph, g)));
        if (s > score) { second = score; score = s; best = letter; } else if (s > second) second = s;
      }
      return { letter: best, score, margin: score - second };
    }

    /**
     * state: { words, guesses: [{ letter, positions }], length: n|null, prev: { ink } | null,
     *          pending: letter the defuser was about to guess | null, book: shapeBook() }
     * shot:  readHangman() result
     * → { guesses, length, newBomb, events: [{ type: 'hit'|'miss'|'same'|'started', … }],
     *     unresolved: [{ positions, options, glyph }], learned: [{ letter, glyph }] }
     */
    function applyShot(state, shot) {
      const L = shot.length;
      const filled = shot.slots.map(s => s.filled);
      let guesses = state.guesses || [];
      const events = [], unresolved = [], learned = [];

      // a different bomb: other number of blanks, a letter we knew is gone, or a smaller stick figure
      const knownPos = guesses.flatMap(g => g.positions);
      const changed = state.length != null && (state.length !== L || knownPos.some(p => !filled[p])
        || (state.prev && shot.figure.ink + PART_INK < state.prev.ink));
      const newBomb = changed && (guesses.length > 0 || Boolean(state.prev));
      if (changed) guesses = [];
      const first = !state.prev || changed;

      const known = new Set(guesses.flatMap(g => g.positions));
      const fresh = filled.map((f, i) => (f && !known.has(i) ? i : -1)).filter(i => i >= 0);

      // blanks showing the same shape hold the same letter
      const groups = [];
      for (const i of fresh) {
        const g = shot.slots[i].glyph;
        const grp = groups.find(gr => glyphScore(gr.glyph, g) >= SAME_SHAPE);
        if (grp) grp.positions.push(i); else groups.push({ positions: [i], glyph: g });
      }

      let pendingUsed = false;
      for (const grp of groups) {
        const used = new Set(guesses.map(g => g.letter));
        const fits = X => !used.has(X) && candidates(state.words, [...guesses, { letter: X, positions: grp.positions }], L).length > 0;
        const listHasWords = candidates(state.words, guesses, L).length > 0;
        const shape = bestShape(grp.glyph, state.book || {}, used);
        let letter = null, how = '';
        const P = state.pending;
        if (shape.letter && shape.score >= KNOWN_SHAPE && shape.margin >= 0.08) {
          letter = shape.letter; how = 'shape';
        } else if (P && !pendingUsed && !used.has(P) && (!listHasWords || fits(P))) {
          const pShape = (state.book && state.book[P]) ? bestShape(grp.glyph, { [P]: state.book[P] }, new Set()).score : null;
          if (pShape === null || pShape >= 0.6) { letter = P; how = 'guess'; pendingUsed = true; }
        }
        if (!letter && listHasWords) {
          const options = [...LETTERS].filter(fits);
          if (options.length === 1) { letter = options[0]; how = 'list'; }
          else { unresolved.push({ positions: grp.positions, options, glyph: grp.glyph }); continue; }
        }
        if (!letter) { unresolved.push({ positions: grp.positions, options: [], glyph: grp.glyph }); continue; }
        guesses = [...guesses, { letter, positions: grp.positions.slice().sort((a, b) => a - b) }];
        learned.push({ letter, glyph: grp.glyph });
        events.push({ type: 'hit', letter, positions: grp.positions, how });
      }

      if (!groups.length) {
        const grew = state.prev && !changed && shot.figure.ink > state.prev.ink + PART_INK;
        if (grew) {
          const used = new Set(guesses.map(g => g.letter));
          const P = state.pending;
          if (P && !used.has(P)) {
            guesses = [...guesses, { letter: P, positions: [] }];
            events.push({ type: 'miss', letter: P });
          } else {
            unresolved.push({ positions: [], options: [], glyph: null }); // a miss, letter unknown
          }
        } else if (!first) {
          events.push({ type: 'same' });
        }
      }
      // the first picture of a bomb can come after guesses the app never saw: a missed letter leaves no
      // trace but a body part, so say so unless the drawing is just the head for one letter showing
      if (first && (changed || !(state.guesses || []).length) && shot.figure.ink > 0) {
        const shown = new Set(guesses.map(g => g.letter)).size;
        if (!(shot.figure.headOnly && shown === 1)) events.push({ type: 'started' });
      }
      return { guesses, length: L, newBomb, events, unresolved, learned };
    }
    return { shapeBook, learnShapes, applyShot };
  })();

  // ── UI ──────────────────────────────────────────────────────────
  const WORDS_KEY = 'ktane_hangman_words';   // this bomb's word list (text)
  const SHAPES_KEY = 'ktane_hangman_shapes'; // letter shapes learned from screenshots (JSON)

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* private mode */ } }
  };

  const state = {
    wordText: store.get(WORDS_KEY) || HANGMAN_DEFAULT_WORDS,
    shapes: (() => { try { return JSON.parse(store.get(SHAPES_KEY) || '{}'); } catch (e) { return {}; } })(),
    length: null,       // number of blanks picked / read from a screenshot
    prevShot: null,     // { ink } of the last screenshot
    shotNote: { text: '', ok: null },
    unresolved: [],     // blanks whose letter couldn't be told: [{ positions, options, glyph }]
    guesses: [],        // [{ letter, positions: [0-based] }]
    typed: '',          // a letter the defuser guessed instead of the suggested one
    memo: new Map(),
    memoFor: null
  };
  window.hangmanModuleState = state;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const posText = (ps, sep = ' & ') => ps.map(p => p + 1).join(sep);

  function imageToData(img, maxDim = 2400) {
    const sc = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const W = Math.round(img.naturalWidth * sc), H = Math.round(img.naturalHeight * sc);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    return g.getImageData(0, 0, W, H);
  }

  function setWordText(t) {
    state.wordText = t;
    store.set(WORDS_KEY, t === HANGMAN_DEFAULT_WORDS ? '' : t);
  }
  function saveShapes(learned) {
    state.shapes = learnShapes(state.shapes, learned);
    store.set(SHAPES_KEY, JSON.stringify(state.shapes));
  }

  /** Everything that follows from the word list + guesses so far. */
  function derive() {
    const words = parseHangmanWords(state.wordText);
    if (state.memoFor !== state.wordText) { state.memo = new Map(); state.memoFor = state.wordText; }
    const lengths = [...new Set(words.map(w => w.length))].sort((a, b) => a - b);
    const len = state.length != null ? state.length : (lengths.length === 1 ? lengths[0] : null);
    const cands = len == null ? [] : candidates(words, state.guesses, len);
    const next = bestGuess(cands, state.memo);
    const used = new Set(state.guesses.map(g => g.letter));
    const typedLetter = /^[A-Z]$/.test(state.typed) && !used.has(state.typed) ? state.typed : '';

    let answer = '', label = 'Guess this letter', problem = '';
    if (len == null) problem = "Drop the defuser's screenshot (or pick the number of blanks).";
    else if (!lengths.includes(len)) problem = `This word has ${len} letters, but the word list has no ${len}-letter words — paste this bomb's Hangman manual (Ctrl+V anywhere on this tab).`;
    else if (!cands.length) problem = 'No word in the list fits these guesses — undo the last one and check where the letter appeared, or check the word list.';
    else if (cands.length === 1) { answer = cands[0]; label = 'Guess the word'; }
    else if (next) answer = next.letter;
    else problem = `These words can't be told apart by any letter: ${cands.join(', ')}.`;
    return { words, lengths, len, cands, next, used, typedLetter, answer, label, problem };
  }

  function injectStyles() {
    if ($('hangmanStyles')) return;
    const style = document.createElement('style');
    style.id = 'hangmanStyles';
    style.textContent = `
    .hg-shell { max-width: 1040px; margin: 0 auto 30px; background: #0d0f22; border: 1.5px solid #202448; border-radius: 18px; padding: 24px; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
    .hg-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #1c2042; }
    .hg-title { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; color: #ffd875; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .hg-pill { font-size: 13px; font-weight: 600; color: #94a3b8; background: #181b36; padding: 3px 10px; border-radius: 99px; border: 1px solid #282d58; }
    .hg-layout { display: grid; grid-template-columns: 360px 1fr; gap: 24px; align-items: start; }
    @media (max-width: 860px) { .hg-layout { grid-template-columns: 1fr; } }
    .hg-card { background: #070814; border: 1px solid #1c2042; border-radius: 14px; padding: 16px; }
    .hg-card-title { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #ffd875; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.8px; }
    .hg-dropzone { border: 2px dashed #343864; border-radius: 12px; padding: 22px 14px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.015); transition: all 0.2s; margin-bottom: 14px; }
    .hg-dropzone:hover, .hg-dropzone.dragover { border-color: #ffd875; background: rgba(255,216,117,0.06); }
    .hg-btn { background: #181b36; border: 1px solid #2d3366; color: #cbd5e1; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .hg-btn:hover { border-color: #ffd875; color: #ffd875; }
    .hg-btn.sm { padding: 4px 10px; font-size: 12px; }
    .hg-status { font-size: 13px; color: #94a3b8; background: #0a0c1c; border: 1px solid #1c2042; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; line-height: 1.5; }
    .hg-status.ok { color: #4ade80; border-color: rgba(34,197,94,0.4); }
    .hg-warn { background: rgba(255,95,87,0.08); border: 1px solid rgba(255,95,87,0.4); color: #ff9b94; border-radius: 10px; padding: 10px 12px; font-size: 13px; margin-bottom: 12px; line-height: 1.5; }
    .hg-ask { background: rgba(255,216,117,0.06); border: 1px solid rgba(245,197,66,0.45); border-radius: 10px; padding: 10px 12px; font-size: 13px; margin-bottom: 12px; color: #ffd875; }
    .hg-ask-opts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center; }
    .hg-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 12px; font-size: 13px; }
    .hg-q { font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 0.8px; text-transform: uppercase; margin-right: 4px; }
    .hg-dim { font-size: 12px; color: #8892b0; line-height: 1.5; }
    .hg-chip { background: #12152e; border: 1px solid #2d3366; color: #e2e8f0; border-radius: 6px; padding: 3px 9px; font: 700 13px 'Outfit', sans-serif; cursor: pointer; }
    button.hg-chip:hover, .hg-chip.on { border-color: #ffd875; color: #ffd875; }
    .hg-chip.hit { border-color: rgba(34,197,94,0.6); color: #4ade80; cursor: default; }
    .hg-chip.miss { border-color: rgba(255,95,87,0.55); color: #ff9b94; cursor: default; }
    .hg-typed { width: 44px; text-align: center; text-transform: uppercase; background: #0a0a18; border: 1px solid #2d3366; border-radius: 6px; color: #fff; padding: 4px; font: 800 15px 'Outfit', sans-serif; }
    .hg-board { display: inline-flex; gap: 5px; flex-wrap: wrap; }
    .hg-slot { width: 30px; height: 36px; border-bottom: 3px solid #475569; display: inline-flex; align-items: flex-end; justify-content: center; font: 900 22px 'Outfit', sans-serif; color: #fff; padding-bottom: 2px; }
    .hg-slot.mark { color: #ffd875; border-bottom-color: #f5c542; }
    @media (max-width: 480px) { .hg-slot { width: 24px; font-size: 19px; } }
    .hg-board.small { gap: 2px; flex-wrap: nowrap; }
    .hg-board.small .hg-slot { width: 13px; height: 18px; font-size: 12px; border-bottom-width: 2px; }
    .hg-banner { background: linear-gradient(135deg, rgba(255,216,117,0.10) 0%, rgba(245,197,66,0.04) 100%); border: 2px solid #f5c542; border-radius: 14px; padding: 16px 20px; margin-bottom: 18px; box-shadow: 0 0 25px rgba(245,197,66,0.12); }
    .hg-banner-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .hg-banner-lbl { font-size: 12px; font-weight: 800; color: #ffd875; letter-spacing: 1px; text-transform: uppercase; }
    .hg-answer { font-family: 'Outfit', sans-serif; font-size: 40px; font-weight: 900; color: #fff; margin-top: 2px; letter-spacing: 2px; }
    .hg-stats { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .hg-copy { background: #2a2410; border-color: #f5c542; color: #ffd875; font-weight: 800; }
    .hg-outcomes { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; margin: 8px 0 14px; }
    .hg-outcome { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; text-align: left; background: #0a0c1c; border: 1.5px solid #232a58; border-radius: 10px; padding: 8px 10px; cursor: pointer; color: #e2e8f0; font-family: inherit; }
    .hg-outcome:hover { border-color: #ffd875; }
    .hg-outcome.hit .hg-oh { color: #4ade80; }
    .hg-outcome.miss .hg-oh { color: #ff9b94; }
    .hg-oh { font: 800 13px 'Outfit', sans-serif; }
    .hg-ow { font-size: 11px; color: #8892b0; }
    .hg-details { background: #070814; border: 1px solid #1c2042; border-radius: 12px; padding: 10px 14px; margin-top: 12px; }
    .hg-details summary { color: #ffd875; font-weight: 700; font-size: 13px; cursor: pointer; outline: none; }
    .hg-details textarea { width: 100%; margin-top: 10px; background: #0a0a18; border: 1px solid #2d3366; border-radius: 8px; color: #e2e8f0; font: 12px/1.5 ui-monospace, monospace; padding: 8px; resize: vertical; }
    .hg-node { font-size: 13px; }
    .hg-node ul { margin: 4px 0 6px; padding-left: 18px; border-left: 1px dashed #2d3366; list-style: none; }
    .hg-node li { margin: 3px 0; }
    .hg-node b { color: #ffd875; }
    .hg-when { color: #94a3b8; }
    .hg-leaf b { color: #4ade80; }
    .hg-leaf.warn { color: #ff9b94; }
    `;
    document.head.appendChild(style);
  }

  function renderUI() {
    const section = $('hangmanSection');
    if (!section) return;
    section.innerHTML = `
      <div class="hg-shell">
        <div class="hg-head">
          <div class="hg-title"><span>🪢</span> Hangman Solver <span class="hg-pill">Fewest guesses · manual word list</span></div>
          <div style="display:flex; gap:10px;">
            <button class="hg-btn" type="button" onclick="window.clearHangman()">Reset</button>
          </div>
        </div>

        <div class="hg-layout">
          <div class="hg-card">
            <div class="hg-card-title">Upload / Paste Screenshot</div>
            <div id="hangmanDropzone" class="hg-dropzone" onclick="document.getElementById('hangmanFileInput').click()">
              <input type="file" id="hangmanFileInput" accept="image/*" style="display:none;" onchange="window.handleHangmanFile(this)">
              <div style="font-size:32px; margin-bottom:8px;">🪢</div>
              <div style="font-weight:700; font-size:14px; color:#fff; margin-bottom:4px;">Click to Upload the Hangman Screenshot</div>
              <div style="font-size:12px; color:#94a3b8;">after each guess · or press <kbd style="background:#1e2246; padding:2px 6px; border-radius:4px; color:#ffd875;">Ctrl+V</kbd> anywhere · new letters show where it is, nothing new = a miss</div>
            </div>
            <div id="hmShotNote"></div>
            <div id="hmAsk"></div>
            <div id="hmLengths"></div>
            <div id="hmNow"></div>
            <div class="hg-row" id="hmGuessed"></div>
            <div class="hg-row">
              <label class="hg-q" for="hmTyped">Defuser guessed a different letter? Type it first:</label>
              <input id="hmTyped" class="hg-typed" type="text" maxlength="1" placeholder="A" autocomplete="off">
              <span id="hmTypedNote" class="hg-dim"></span>
            </div>
            <div id="hmTypedOutcomes"></div>
            <div class="hg-dim" id="hmListInfo"></div>
            <details class="hg-details">
              <summary>📖 Hangman word list</summary>
              <textarea id="hmWordText" rows="5" spellcheck="false"></textarea>
              <button type="button" class="hg-btn sm" style="margin-top:8px;" onclick="window.restoreHangmanWords()">🔄 Restore built-in list</button>
            </details>
          </div>

          <div>
            <div class="hg-banner">
              <div class="hg-banner-row">
                <div>
                  <div class="hg-banner-lbl" id="hmLabel">Guess this letter</div>
                  <div id="hmAnswer" class="hg-answer"><span style="color:#64748b;">— — —</span></div>
                  <div id="hmStats" class="hg-stats"></div>
                </div>
                <button id="hmCopyBtn" class="hg-btn hg-copy" type="button" onclick="window.copyHangmanAnswer()">📋 Copy</button>
              </div>
            </div>
            <div id="hmProblem"></div>
            <div id="hmNext"></div>
            <div id="hmWords" class="hg-dim"></div>
            <details class="hg-details" id="hmPlanBox">
              <summary>The whole plan from here</summary>
              <div class="hg-dim" style="margin:8px 0;">Each letter guess costs a body part whether it's right or wrong, so the letter chosen is the one that leaves the fewest guesses in the worst case (then on average) — not the most common letter. When one word is left, guess the whole word.</div>
              <div id="hmPlan"></div>
            </details>
          </div>
        </div>
      </div>
    `;
    const typed = $('hmTyped');
    typed.addEventListener('input', () => {
      typed.value = typed.value.toUpperCase().replace(/[^A-Z]/g, '');
      state.typed = typed.value;
      update();
    });
    const ta = $('hmWordText');
    ta.value = state.wordText;
    ta.addEventListener('input', () => { setWordText(ta.value); update(); });
    $('hmPlanBox').addEventListener('toggle', update);
    setupInputs();
    update();
  }

  function setupInputs() {
    const dz = $('hangmanDropzone');
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
          const f = [...(e.dataTransfer?.files || [])].find(x => x.type.startsWith('image/'));
          if (f) loadFile(f);
        }
      });
    }
    // Ctrl+V on this tab: the manual's word list as text, or a screenshot (Discord links go via dragdrop-helper.js)
    // document + bubble phase, like the other modules: the build's access gate (window, capture) runs first
    document.addEventListener('paste', (e) => {
      if (!$('hangmanSection')?.classList.contains('active')) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'file'))) return;
      const t = e.clipboardData && e.clipboardData.getData('text');
      if (t && looksLikeHangmanList(t)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setWordText(t.trim()); // guesses so far are facts about this word, so they stay
        $('hmWordText').value = state.wordText;
        state.shotNote = { text: `Hangman word list: ${parseHangmanWords(t).length} words ✓`, ok: true };
        update();
        return;
      }
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

  function loadFile(file) {
    const img = new Image();
    img.onload = () => { handleImage(img); URL.revokeObjectURL(img.src); };
    img.onerror = () => { state.shotNote = { text: 'Could not open that file as an image.', ok: false }; update(); };
    img.src = URL.createObjectURL(file);
  }

  // A screenshot after each guess: what changed tells where the guessed letter is (or that it missed)
  function handleImage(img) {
    let shot;
    try {
      const d = imageToData(img);
      shot = readHangman(d.data, d.width, d.height);
    } catch (e) {
      state.shotNote = { text: `Could not read that image (${e.message || e}).`, ok: false };
      update();
      return;
    }
    if (!shot.ok) {
      state.shotNote = { text: `${shot.reason} — is this the Hangman screenshot?`, ok: false };
      update();
      return;
    }
    const d = derive();
    const pending = d.typedLetter || (d.next && d.next.letter) || null;
    const r = applyShot({ words: d.words, guesses: state.guesses, length: d.len, prev: state.prevShot, pending, book: shapeBook(state.shapes) }, shot);
    state.guesses = r.guesses;
    state.length = r.length;
    state.prevShot = { ink: shot.figure.ink };
    state.unresolved = r.unresolved;
    state.typed = '';
    $('hmTyped').value = '';
    if (r.learned.length) saveShapes(r.learned);
    const said = [];
    if (r.newBomb) said.push('new bomb');
    said.push(`${r.length} blanks`);
    for (const e of r.events) {
      if (e.type === 'hit') said.push(`${e.letter} at ${posText(e.positions)}${e.how === 'guess' ? ' (the letter you guessed)' : e.how === 'shape' ? ' (known shape)' : e.how === 'list' ? ' (only letter that fits)' : ''}`);
      if (e.type === 'miss') said.push(`no ${e.letter} — a body part was added`);
      if (e.type === 'same') said.push('nothing new since the last screenshot');
    }
    if (r.unresolved.length) said.push('a letter needs naming below');
    const started = r.events.some(e => e.type === 'started');
    state.shotNote = {
      text: said.join(' · ') + (started ? ' · the stick figure was already started: if letters were guessed before and missed, add them (“No X”).' : ''),
      ok: !r.unresolved.length && !started
    };
    update();
  }

  const boardHtml = (letters, mark = [], small = false) =>
    `<span class="hg-board ${small ? 'small' : ''}">${letters.map((ch, i) =>
      `<span class="hg-slot ${mark.includes(i) ? 'mark' : ''}">${ch === '_' ? '' : esc(ch)}</span>`).join('')}</span>`;

  // one button per thing a guess can show
  function outcomeButtons(letter, groups, len) {
    return `<div class="hg-outcomes">${groups.map(o => {
      const head = o.positions.length ? `${letter} at ${posText(o.positions)}` : `No ${letter}`;
      const words = o.words.length === 1 ? `→ ${o.words[0]}` : o.words.length <= 3 ? o.words.join(', ') : `${o.words.length} words`;
      return `<button type="button" class="hg-outcome ${o.positions.length ? 'hit' : 'miss'}" onclick="window.recordHangman('${letter}', '${o.positions.join(',')}')">
        <span class="hg-oh">${esc(head)}</span>
        ${boardHtml(revealed(len, [...state.guesses, { letter, positions: o.positions }]), o.positions, true)}
        <span class="hg-ow">${esc(words)}</span>
      </button>`;
    }).join('')}</div>`;
  }

  /** The whole plan from here: which letter to guess, and what to do for each thing it can show. */
  function planHtml(cands) {
    const g = bestGuess(cands, state.memo);
    if (!g) {
      return cands.length === 1
        ? `<span class="hg-leaf">→ guess the word <b>${esc(cands[0])}</b></span>`
        : `<span class="hg-leaf warn">${cands.length ? `can't tell apart: ${esc(cands.join(', '))}` : 'no word fits'}</span>`;
    }
    return `<div class="hg-node"><div>Guess <b>${g.letter}</b> <span class="hg-dim">(${cands.length} words · worst ${g.worst})</span></div><ul>${
      g.groups.map(o => `<li><span class="hg-when">${o.positions.length ? `${g.letter} at ${posText(o.positions)}` : `no ${g.letter}`}:</span> ${
        o.words.length === 1 ? `<span class="hg-leaf">→ <b>${esc(o.words[0])}</b></span>` : planHtml(o.words)}</li>`).join('')
    }</ul></div>`;
  }

  function update() {
    if (!$('hmAnswer')) return;
    const d = derive();
    const { words, lengths, len, cands, next, used, typedLetter } = d;

    $('hmShotNote').innerHTML = state.shotNote.text
      ? `<div class="${state.shotNote.ok === false ? 'hg-warn' : `hg-status ${state.shotNote.ok ? 'ok' : ''}`}">${esc(state.shotNote.text)}</div>` : '';

    $('hmAsk').innerHTML = state.unresolved.map((u, k) => `<div class="hg-ask">${u.positions.length
      ? `Which letter is in blank ${posText(u.positions)}?`
      : 'The stick figure grew but no letter showed — which letter missed?'}
      <span class="hg-ask-opts">${u.options.slice(0, 10).map(o => `<button type="button" class="hg-chip" onclick="window.resolveHangman(${k}, '${o}')">${o}</button>`).join('')}
      <input class="hg-typed" type="text" maxlength="1" placeholder="?" aria-label="letter" oninput="window.resolveHangman(${k}, this.value.toUpperCase().replace(/[^A-Z]/g, ''))"></span></div>`).join('');

    $('hmLengths').innerHTML = lengths.length > 1 && state.length == null
      ? `<div class="hg-row"><span class="hg-q">Blanks:</span>${lengths.map(n => `<button type="button" class="hg-chip ${len === n ? 'on' : ''}" onclick="window.setHangmanLength(${n})">${n}</button>`).join('')}</div>`
      : '';
    $('hmNow').innerHTML = len != null ? `<div class="hg-row">${boardHtml(revealed(len, state.guesses))}</div>` : '';

    const gs = state.guesses;
    $('hmGuessed').innerHTML = `<span class="hg-q">Guessed (${gs.length} part${gs.length === 1 ? '' : 's'} drawn):</span>`
      + (gs.length ? gs.map(g => `<span class="hg-chip ${g.positions.length ? 'hit' : 'miss'}">${g.letter}${g.positions.length ? ` ${posText(g.positions, '&')}` : ' ✗'}</span>`).join('') : '<span class="hg-dim">none yet</span>')
      + (gs.length ? ' <button type="button" class="hg-btn sm" onclick="window.undoHangman()">↶ Undo</button>' : '');

    $('hmTypedNote').textContent = state.typed && used.has(state.typed) ? 'already guessed' : '';
    $('hmTypedOutcomes').innerHTML = typedLetter && len != null && cands.length
      ? `<div class="hg-dim">Now drop the screenshot — or tap what ${typedLetter} showed:</div>${outcomeButtons(typedLetter, outcomes(cands, typedLetter), len)}`
      : '';
    $('hmListInfo').innerHTML = `Word list: <b>${words.length} words</b>${state.wordText === HANGMAN_DEFAULT_WORDS ? ' (built in, from the 22 Nov manual)' : ' (pasted)'} · paste a new manual anywhere on this tab to replace it`;

    $('hmLabel').textContent = d.label;
    $('hmAnswer').innerHTML = d.answer ? esc(d.answer) : '<span style="color:#64748b;">— — —</span>';
    $('hmStats').textContent = len == null ? '' : cands.length === 1 ? 'only word left'
      : next ? `${cands.length} words left · at most ${next.worst} more letter${next.worst === 1 ? '' : 's'}` : '';
    $('hmProblem').innerHTML = d.problem ? `<div class="hg-warn">⚠ ${esc(d.problem)}</div>` : '';
    $('hmNext').innerHTML = next && cands.length > 1
      ? `<div class="hg-dim">Guess <b style="color:#ffd875;">${next.letter}</b>, then drop the new screenshot — or tap what the blanks showed:</div>${outcomeButtons(next.letter, next.groups, len)}`
      : '';
    $('hmWords').textContent = cands.length > 1 && cands.length <= 30 ? `Still possible: ${cands.join(' · ')}` : '';

    const box = $('hmPlanBox');
    box.style.display = len != null && cands.length ? '' : 'none';
    $('hmPlan').innerHTML = box.open && len != null && cands.length ? planHtml(cands) : '';
  }

  window.handleHangmanFile = function (input) {
    const f = input.files && input.files[0];
    if (f) loadFile(f);
    input.value = '';
  };

  window.recordHangman = function (letter, positions) {
    state.guesses = [...state.guesses, { letter, positions: positions ? positions.split(',').map(Number) : [] }];
    state.typed = '';
    if ($('hmTyped')) $('hmTyped').value = '';
    update();
  };

  // name a letter the screenshot showed (or the letter that missed)
  window.resolveHangman = function (k, letter) {
    const u = state.unresolved[k];
    if (!u || !letter) return;
    if (u.glyph) saveShapes([{ letter, glyph: u.glyph }]);
    state.unresolved = state.unresolved.filter((_, j) => j !== k);
    window.recordHangman(letter, u.positions.join(','));
  };

  window.setHangmanLength = function (n) {
    state.length = n;
    state.guesses = [];
    update();
  };

  window.undoHangman = function () {
    state.guesses = state.guesses.slice(0, -1);
    update();
  };

  window.restoreHangmanWords = function () {
    setWordText(HANGMAN_DEFAULT_WORDS);
    $('hmWordText').value = state.wordText;
    update();
  };

  window.copyHangmanAnswer = function () {
    const { answer } = derive();
    if (!answer) return;
    navigator.clipboard.writeText(answer).then(() => {
      const btn = $('hmCopyBtn');
      if (!btn) return;
      btn.textContent = '✓ Copied';
      setTimeout(() => { btn.textContent = '📋 Copy'; }, 1500);
    }).catch(() => {});
  };

  window.clearHangman = function () {
    state.guesses = [];
    state.typed = '';
    state.length = null;
    state.prevShot = null;
    state.unresolved = [];
    state.shotNote = { text: '', ok: null };
    if ($('hmTyped')) $('hmTyped').value = '';
    update();
  };

  window.initHangmanModule = function () {
    injectStyles();
    renderUI();
  };
})();
