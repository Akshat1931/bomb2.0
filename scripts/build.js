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
