/**
 * Build script — KTaNE Bomb Defusal Solver
 *
 * What it does:
 *  1. Reads solver.html
 *  2. For each local <script src="./..."> found:
 *       a. Reads the JS file
 *       b. Minifies with Terser
 *       c. Obfuscates with javascript-obfuscator
 *       d. Writes to dist/ with a content-hash filename (cache busting)
 *       e. Updates the src attribute in HTML
 *  3. Minifies the HTML (including any inline <script> blocks)
 *  4. Injects Vercel Analytics snippet before </head>
 *  5. Writes dist/index.html
 *
 * All original source files are untouched.
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const { minify: terserMinify }           = require('terser');
const JavaScriptObfuscator               = require('javascript-obfuscator');
const { minify: htmlMinify }             = require('html-minifier-terser');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// ── Vercel Analytics snippet (injected before </head>) ────────────────────
const ANALYTICS_SNIPPET = `
<script>
window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};
</script>
<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/_vercel/speed-insights/script.js"></script>`.trim();

// ── Trial / Access Gate (injected before </body>) ────────────────────────
// ⚙ CONFIG — change these values:
const TRIAL_MINUTES = 5;                           // trial duration
const CONTACT_TEXT  = 'DM me on Discord or Reddit'; // shown to locked users
const CONTACT_LINK  = 'https://discord.gg/';        // your Discord/link

const TRIAL_SNIPPET = `
<!-- TRIAL ACCESS GATE -->
<style>
#__bombGate{
  position:fixed;inset:0;z-index:2147483647;
  background:rgba(4,4,14,0.97);backdrop-filter:blur(14px);
  display:none;align-items:center;justify-content:center;
  font-family:'Inter',sans-serif;
}
#__bombGate .g-box{
  text-align:center;padding:48px 40px;
  background:#0d0d22;border:1px solid #1e1e40;
  border-radius:20px;max-width:420px;width:90%;
  box-shadow:0 0 60px rgba(124,77,255,0.15);
}
#__bombGate h2{color:#e8eaf6;font-size:26px;margin:0 0 10px;letter-spacing:-0.5px;}
#__bombGate .sub{color:#78909c;font-size:14px;line-height:1.7;margin:0 0 28px;}
#__bombGate .timer{font-size:13px;color:#546e7a;margin-bottom:24px;font-family:monospace;}
#__bombGate a.g-btn{
  display:inline-block;padding:14px 28px;
  background:linear-gradient(135deg,#7c4dff,#651fff);
  color:#fff;text-decoration:none;border-radius:10px;
  font:700 14px 'Inter',sans-serif;letter-spacing:0.3px;
  transition:opacity .2s;
}
#__bombGate a.g-btn:hover{opacity:0.85;}
#__bombGate .trial-bar{
  height:3px;background:#1e1e40;border-radius:3px;
  margin-bottom:28px;overflow:hidden;
}
#__bombGate .trial-fill{
  height:100%;background:linear-gradient(90deg,#7c4dff,#00e676);
  border-radius:3px;transition:width 1s linear;
}
</style>

<div id="__bombGate">
  <div class="g-box">
    <div style="font-size:48px;margin-bottom:16px;">🔒</div>
    <h2>Trial Ended</h2>
    <p class="sub">
      Your ${TRIAL_MINUTES}-minute free trial has expired.<br>
      Request full access from the owner to keep using the solver.
    </p>
    <div class="trial-bar"><div class="trial-fill" id="__bombFill" style="width:0%"></div></div>
    <a href="${CONTACT_LINK}" target="_blank" rel="noopener" class="g-btn">
      📩 Request Access
    </a>
    <p class="timer" id="__bombTimer">Trial expired</p>
  </div>
</div>

<script>
(function(){
  var TRIAL_MS=${TRIAL_MINUTES * 60 * 1000};
  var KEY='__bomb_t0';
  var GATE=document.getElementById('__bombGate');
  var FILL=document.getElementById('__bombFill');
  var TIMER=document.getElementById('__bombTimer');

  // Check for access cookie (set by /api/grant)
  function hasCookie(){
    return document.cookie.split(';').some(function(c){return c.trim().startsWith('__bomb_access=');});
  }
  if(hasCookie()) return; // Granted user — no trial

  // Init trial start
  if(!localStorage.getItem(KEY)) localStorage.setItem(KEY, Date.now().toString());

  function fmt(ms){
    var s=Math.max(0,Math.ceil(ms/1000));
    var m=Math.floor(s/60); s=s%60;
    return m+'m '+String(s).padStart(2,'0')+'s';
  }

  function tick(){
    if(hasCookie()){ GATE.style.display='none'; return; }
    var start=parseInt(localStorage.getItem(KEY)||'0',10);
    var elapsed=Date.now()-start;
    var remaining=TRIAL_MS-elapsed;
    var pct=Math.min(100,(elapsed/TRIAL_MS)*100);

    if(remaining<=0){
      // Locked
      GATE.style.display='flex';
      FILL.style.width='100%';
      TIMER.textContent='Trial expired — contact owner for access';
    } else if(remaining<60000){
      // Last minute warning — show timer overlay-ish banner (not yet full lock)
      TIMER.textContent='Trial ends in '+fmt(remaining);
      FILL.style.width=pct+'%';
    }
  }

  setInterval(tick,1000);
  tick();
})();
<\/script>
<!-- END TRIAL ACCESS GATE -->
`.trim();

// ── Terser options ────────────────────────────────────────────────────────
const TERSER_OPTS = {
  compress: {
    drop_console:   false,   // keep console.log (modules may use it for debugging)
    drop_debugger:  true,
    passes:         2,
    dead_code:      true,
    unused:         true,
  },
  mangle: {
    toplevel: false,         // don't rename top-level names (window.* globals)
    reserved: [],            // add any names you want preserved
  },
  format: {
    comments: false,
  },
};

// ── Obfuscator options ────────────────────────────────────────────────────
// Conservative settings: protect string literals & local identifiers
// without breaking cross-module window.* communication.
const OBFUSCATOR_OPTS = {
  compact:                       true,
  controlFlowFlattening:         false, // disabling keeps perf fast
  deadCodeInjection:             false,
  debugProtection:               false,
  disableConsoleOutput:          false,
  identifierNamesGenerator:      'hexadecimal',
  log:                           false,
  renameGlobals:                 false,  // MUST be false — modules share window.*
  renameProperties:              false,  // MUST be false — breaks DOM attr access
  rotateStringArray:             true,
  selfDefending:                 false,
  shuffleStringArray:            true,
  splitStrings:                  true,
  splitStringsChunkLength:       8,
  stringArray:                   true,
  stringArrayCallsTransform:     true,
  stringArrayEncoding:           ['base64'],
  stringArrayThreshold:          0.75,
  transformObjectKeys:           false,  // safer off for complex objects
  unicodeEscapeSequence:         false,
  target:                        'browser',
};

// ── HTML minifier options ─────────────────────────────────────────────────
const HTML_OPTS = {
  collapseWhitespace:            true,
  removeComments:                true,
  removeRedundantAttributes:     true,
  removeScriptTypeAttributes:    true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype:               true,
  minifyCSS:                     true,
  minifyJS:                      {        // terser options for inline scripts
    compress: { drop_debugger: true, passes: 2 },
    mangle:   { toplevel: false },
    format:   { comments: false },
  },
};

// ── Helper: content hash (8 chars) ───────────────────────────────────────
function hash(code) {
  return crypto.createHash('sha256').update(code).digest('hex').slice(0, 8);
}

// ── Main build ────────────────────────────────────────────────────────────
async function build() {
  console.log('\n🔨  Starting build...\n');

  // 1. Clean & create dist
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // 2. Read solver.html
  let html = fs.readFileSync(path.join(ROOT, 'solver.html'), 'utf8');

  // 3. Find all local <script src="./..."> references
  const scriptTagRe = /<script\s+src="\.\/([^"]+\.js)"\s*><\/script>/gi;
  const matches = [...html.matchAll(scriptTagRe)];
  console.log(`📦  Found ${matches.length} local module script(s):`);

  for (const m of matches) {
    const originalTag  = m[0];
    const relPath      = m[1];
    const srcFile      = path.join(ROOT, relPath);

    if (!fs.existsSync(srcFile)) {
      console.warn(`  ⚠  Not found, skipping: ${relPath}`);
      continue;
    }

    const rawCode = fs.readFileSync(srcFile, 'utf8');

    // a. Minify
    let minCode;
    try {
      const result = await terserMinify(rawCode, TERSER_OPTS);
      minCode = result.code;
    } catch (e) {
      console.error(`  ✗  Terser failed for ${relPath}:`, e.message);
      minCode = rawCode; // fallback: use raw
    }

    // b. Obfuscate
    let finalCode;
    try {
      finalCode = JavaScriptObfuscator.obfuscate(minCode, OBFUSCATOR_OPTS).getObfuscatedCode();
    } catch (e) {
      console.error(`  ✗  Obfuscator failed for ${relPath}:`, e.message);
      finalCode = minCode; // fallback: use minified only
    }

    // c. Write with hash
    const h        = hash(finalCode);
    const baseName = path.basename(relPath, '.js');
    const outName  = `${baseName}.${h}.js`;
    fs.writeFileSync(path.join(DIST, outName), finalCode, 'utf8');
    console.log(`  ✓  ${relPath}  →  ${outName}  (${(finalCode.length/1024).toFixed(1)} KB)`);

    // d. Update HTML reference (no sourcemap, hashed name)
    html = html.replace(originalTag, `<script src="./${outName}"></script>`);
  }

  // 4. Inject Vercel Analytics before </head>
  html = html.replace('</head>', `${ANALYTICS_SNIPPET}\n</head>`);

  // 4.5. Inject Trial Access Gate before </body>
  html = html.replace('</body>', `${TRIAL_SNIPPET}\n</body>`);

  // 5. Minify HTML (inline scripts/CSS included)
  let finalHtml;
  try {
    finalHtml = await htmlMinify(html, HTML_OPTS);
  } catch (e) {
    console.warn('  ⚠  HTML minifier error, using unminified HTML:', e.message);
    finalHtml = html;
  }

  // 6. Write dist/index.html
  const outHtml = path.join(DIST, 'index.html');
  fs.writeFileSync(outHtml, finalHtml, 'utf8');
  console.log(`\n✅  dist/index.html written  (${(finalHtml.length/1024).toFixed(1)} KB)\n`);

  // 7. Summary
  const distFiles = fs.readdirSync(DIST);
  const totalKB   = distFiles.reduce((sum, f) => {
    return sum + fs.statSync(path.join(DIST, f)).size;
  }, 0) / 1024;
  console.log(`📁  dist/  →  ${distFiles.length} file(s)  ·  ${totalKB.toFixed(1)} KB total`);
  console.log('🚀  Build complete!\n');
}

build().catch(err => { console.error('Build failed:', err); process.exit(1); });
