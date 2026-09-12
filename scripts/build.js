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

// ── Trial / Discord Auth Gate (injected before </body>) ───────────────────
const TRIAL_SNIPPET = `
<!-- DISCORD AUTH & ACCESS GATE -->
<style>
#__bombGate {
  position: fixed; inset: 0; z-index: 2147483647;
  background: rgba(4, 5, 14, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #e2e8f0;
  padding: 16px;
  box-sizing: border-box;
}
#__bombGate.is-hidden { display: none !important; }
#__bombGate .g-card {
  position: relative;
  background: linear-gradient(180deg, #0d0e24 0%, #080918 100%);
  border: 1px solid rgba(124, 77, 255, 0.25);
  border-radius: 20px;
  width: 100%; max-width: 440px;
  padding: 40px 32px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 50px rgba(124, 77, 255, 0.12);
  box-sizing: border-box;
}
#__bombGate .g-logo {
  width: 64px; height: 64px;
  margin: 0 auto 20px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 18px;
  background: rgba(88, 101, 242, 0.12);
  border: 1px solid rgba(88, 101, 242, 0.35);
  box-shadow: 0 0 25px rgba(88, 101, 242, 0.25);
}
#__bombGate .g-title {
  font-size: 24px; font-weight: 800;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
  color: #ffffff;
}
#__bombGate .g-desc {
  font-size: 14px; line-height: 1.6;
  color: #94a3b8;
  margin: 0 0 24px;
}
#__bombGate .g-user {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;
}
#__bombGate .g-avatar {
  width: 42px; height: 42px; border-radius: 50%;
  border: 2px solid #5865F2;
  background: #1e1e38;
}
#__bombGate .g-uinfo { text-align: left; }
#__bombGate .g-uname { font-weight: 700; font-size: 15px; color: #f1f5f9; }
#__bombGate .g-ustatus {
  display: inline-block; font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 20px; margin-top: 3px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.tag-trial { background: rgba(255, 216, 117, 0.15); color: #ffd875; border: 1px solid rgba(255, 216, 117, 0.3); }
.tag-pending { background: rgba(124, 77, 255, 0.15); color: #b388ff; border: 1px solid rgba(124, 77, 255, 0.3); }
.tag-expired { background: rgba(251, 140, 0, 0.15); color: #ffb74d; border: 1px solid rgba(251, 140, 0, 0.3); }
.tag-denied { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
.tag-approved { background: rgba(0, 230, 118, 0.15); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.3); }

#__bombGate .btn-discord {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 14px 20px;
  background: #5865F2; color: #fff;
  border: none; border-radius: 12px;
  font-size: 15px; font-weight: 700;
  text-decoration: none; cursor: pointer;
  box-shadow: 0 4px 20px rgba(88, 101, 242, 0.4);
  transition: all 0.2s ease;
  box-sizing: border-box;
}
#__bombGate .btn-discord:hover {
  background: #4752c4;
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(88, 101, 242, 0.5);
}
#__bombGate .btn-action {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 12px 20px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px; color: #cbd5e1;
  font-size: 14px; font-weight: 600;
  text-decoration: none; cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;
}
#__bombGate .btn-action:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
#__bombGate .g-note {
  font-size: 12px; color: #64748b; margin-top: 18px; line-height: 1.5;
}
#__bombGate .g-err {
  background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444;
  color: #fca5a5; font-size: 12px; border-radius: 8px;
  padding: 8px 12px; margin-bottom: 16px;
}

/* Floating Status HUD */
#__bombHud {
  position: fixed; top: 16px; right: 16px; z-index: 9999999;
  display: none; align-items: center; gap: 10px;
  background: rgba(13, 14, 34, 0.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 40px; padding: 6px 14px 6px 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #e2e8f0; font-size: 12px; font-weight: 600;
}
#__bombHud.is-visible { display: flex !important; }
#__bombHud .hud-avatar {
  width: 26px; height: 26px; border-radius: 50%;
  border: 1.5px solid #5865F2; background: #1e1e38;
}
#__bombHud .hud-timer {
  font-family: monospace; font-size: 13px; font-weight: 700;
  color: #ffd875; background: rgba(255, 216, 117, 0.12);
  padding: 3px 8px; border-radius: 6px;
  border: 1px solid rgba(255, 216, 117, 0.25);
}
#__bombHud .hud-approved {
  font-size: 11px; font-weight: 700;
  color: #00e676; background: rgba(0, 230, 118, 0.12);
  padding: 3px 8px; border-radius: 6px;
  border: 1px solid rgba(0, 230, 118, 0.25);
}
#__bombHud .hud-logout {
  color: #64748b; text-decoration: none; font-size: 11px; margin-left: 4px;
  transition: color 0.15s;
}
#__bombHud .hud-logout:hover { color: #f87171; }
</style>

<div id="__bombGate" class="is-hidden">
  <div class="g-card" id="__bombCard">
    <!-- Rendered dynamically -->
  </div>
</div>

<div id="__bombHud">
  <img id="__hudAvatar" class="hud-avatar" src="" alt="Avatar" />
  <span id="__hudName"></span>
  <span id="__hudBadge"></span>
  <a href="/api/auth/logout" class="hud-logout" title="Log out">Sign out</a>
</div>

<script>
(function(){
  var GATE = document.getElementById('__bombGate');
  var CARD = document.getElementById('__bombCard');
  var HUD  = document.getElementById('__bombHud');
  var HUD_AVATAR = document.getElementById('__hudAvatar');
  var HUD_NAME   = document.getElementById('__hudName');
  var HUD_BADGE  = document.getElementById('__hudBadge');

  var currentStatus = null;
  var timerInterval = null;
  var trialEndEpoch = null;

  var DISCORD_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>';

  function fmtTime(ms) {
    var totalSec = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function getAvatarUrl(user) {
    if (user && user.avatar && user.discord_id) {
      return 'https://cdn.discordapp.com/avatars/' + user.discord_id + '/' + user.avatar + '.png?size=64';
    }
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%235865F2"><circle cx="12" cy="12" r="12"/></svg>';
  }

  function renderGuest() {
    HUD.classList.remove('is-visible');
    GATE.classList.remove('is-hidden');
    var params = new URLSearchParams(window.location.search);
    var err = params.get('auth_error');
    var detail = params.get('detail');
    var errMsg = err ? ('⚠️ Login issue: ' + (detail ? detail : err) + '. Please try again.') : '';
    CARD.innerHTML = [
      errMsg ? '<div class="g-err">' + errMsg + '</div>' : '',
      '<div class="g-logo">' + DISCORD_SVG + '</div>',
      '<h2 class="g-title">Authentication Required</h2>',
      '<p class="g-desc">Sign in with your Discord account to access the Bomb Defusal Solver. New accounts automatically receive a <strong>5-minute free trial</strong>.</p>',
      '<a href="/api/auth/discord" class="btn-discord">' + DISCORD_SVG + ' Continue with Discord</a>',
      '<p class="g-note">🔒 Fast & secure OAuth2. We only read your public Discord ID & username.</p>'
    ].join('');
  }

  function renderExpired(data) {
    clearInterval(timerInterval);
    HUD.classList.remove('is-visible');
    GATE.classList.remove('is-hidden');
    CARD.innerHTML = [
      '<div class="g-logo" style="background:rgba(251,140,0,0.15);border-color:rgba(251,140,0,0.4);color:#fb8c00;">' +
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' +
      '</div>',
      '<h2 class="g-title">Trial Ended</h2>',
      '<p class="g-desc">Your 5-minute complimentary trial has completed.<br>Your access request has been sent to the administrator.</p>',
      '<div class="g-user">',
        '<img class="g-avatar" src="' + getAvatarUrl(data) + '" />',
        '<div class="g-uinfo">',
          '<div class="g-uname">' + (data.username || 'User') + '</div>',
          '<span class="g-ustatus tag-pending">Pending Approval</span>',
        '</div>',
      '</div>',
      '<div style="display:flex;flex-direction:column;gap:10px;">',
        '<button id="__bombRefreshBtn" class="btn-action" style="border-color:#7c4dff;color:#b388ff;">🔄 Check Approval Status</button>',
        '<a href="/api/auth/logout" class="btn-action">Sign out</a>',
      '</div>',
      '<p class="g-note">Contact the site admin to approve your account.</p>'
    ].join('');

    var refreshBtn = document.getElementById('__bombRefreshBtn');
    if (refreshBtn) {
      refreshBtn.onclick = function() {
        refreshBtn.textContent = 'Checking...';
        refreshBtn.disabled = true;
        checkAuthStatus();
      };
    }
  }

  function renderDenied(data) {
    clearInterval(timerInterval);
    HUD.classList.remove('is-visible');
    GATE.classList.remove('is-hidden');
    CARD.innerHTML = [
      '<div class="g-logo" style="background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.4);color:#f87171;">' +
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>' +
      '</div>',
      '<h2 class="g-title">Access Denied</h2>',
      '<p class="g-desc">Your access request has been rejected by the administrator.</p>',
      '<div class="g-user">',
        '<img class="g-avatar" src="' + getAvatarUrl(data) + '" />',
        '<div class="g-uinfo">',
          '<div class="g-uname">' + (data.username || 'User') + '</div>',
          '<span class="g-ustatus tag-denied">Denied</span>',
        '</div>',
      '</div>',
      '<a href="/api/auth/logout" class="btn-action">Sign out</a>'
    ].join('');
  }

  function renderApproved(data) {
    clearInterval(timerInterval);
    GATE.classList.add('is-hidden');
    HUD.classList.add('is-visible');
    HUD_AVATAR.src = getAvatarUrl(data);
    HUD_NAME.textContent = data.username || 'Approved';
    HUD_BADGE.className = 'hud-approved';
    HUD_BADGE.textContent = 'PRO ACCESS';
  }

  function renderTrial(data) {
    GATE.classList.add('is-hidden');
    HUD.classList.add('is-visible');
    HUD_AVATAR.src = getAvatarUrl(data);
    HUD_NAME.textContent = data.username || 'Trial';
    HUD_BADGE.className = 'hud-timer';

    trialEndEpoch = Date.now() + data.remaining_ms;

    function updateTick() {
      var remaining = trialEndEpoch - Date.now();
      if (remaining <= 0) {
        clearInterval(timerInterval);
        HUD_BADGE.textContent = '0:00';
        renderExpired(data);
        // Inform server that trial expired
        checkAuthStatus();
        return;
      }
      HUD_BADGE.textContent = fmtTime(remaining);
    }

    clearInterval(timerInterval);
    updateTick();
    timerInterval = setInterval(updateTick, 1000);
  }

  function checkAuthStatus() {
    fetch('/api/auth/status')
      .then(function(res){ return res.json(); })
      .then(function(data){
        currentStatus = data;
        if (data.status === 'approved') {
          renderApproved(data);
        } else if (data.status === 'trial') {
          if (data.remaining_ms > 0) {
            renderTrial(data);
          } else {
            renderExpired(data);
          }
        } else if (data.status === 'expired' || data.status === 'pending') {
          renderExpired(data);
        } else if (data.status === 'denied') {
          renderDenied(data);
        } else {
          renderGuest();
        }
      })
      .catch(function(err){
        console.error('Auth check error:', err);
        // Fallback to guest screen on network error
        renderGuest();
      });
  }

  // Initial check
  checkAuthStatus();

  // Periodic check every 45 seconds to sync approval status if approved by admin in background
  setInterval(function(){
    if (currentStatus && (currentStatus.status === 'expired' || currentStatus.status === 'pending' || currentStatus.status === 'trial')) {
      checkAuthStatus();
    }
  }, 45000);
})();
<\/script>
<!-- END DISCORD AUTH & ACCESS GATE -->
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
