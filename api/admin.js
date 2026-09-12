/**
 * api/admin.js — Admin panel
 *
 * GET  /api/admin?key=ADMIN_SECRET           → show HTML dashboard
 * POST /api/admin?key=...&action=approve&id= → approve user
 * POST /api/admin?key=...&action=deny&id=    → deny user
 * POST /api/admin?key=...&action=reset&id=   → reset to trial
 */
const { getAllUsers, updateUser } = require('../lib/supabase');

const STATUS_BADGE = {
  trial:    { color: '#ffd875', bg: 'rgba(255,216,117,0.12)', label: '⏱ Trial'    },
  pending:  { color: '#7c4dff', bg: 'rgba(124,77,255,0.12)', label: '🔔 Pending'  },
  approved: { color: '#00e676', bg: 'rgba(0,230,118,0.12)',  label: '✅ Approved' },
  denied:   { color: '#e53935', bg: 'rgba(229,57,53,0.12)',  label: '❌ Denied'   },
  expired:  { color: '#fb8c00', bg: 'rgba(251,140,0,0.12)',  label: '🔒 Expired'  },
};

function clean(str) {
  return (str || '').trim().replace(/^["']|["']$/g, '');
}

function authGuard(req, res) {
  const key = req.query.key;
  if (!key || key !== clean(process.env.ADMIN_SECRET)) {
    res.status(403).send(`<!DOCTYPE html>
<html><head><title>Access Denied</title>
<style>body{background:#06060e;color:#ef9a9a;font-family:sans-serif;display:flex;
align-items:center;justify-content:center;min-height:100vh;margin:0;}
.b{text-align:center;background:#0d0d20;border:1px solid #3a1a1a;border-radius:16px;padding:40px;}
</style></head><body><div class="b"><h2>🔐 Wrong admin key</h2>
<p style="color:#546e7a;">Add ?key=YOUR_ADMIN_SECRET to the URL</p></div></body></html>`);
    return false;
  }
  return true;
}

function userRow(u) {
  const b  = STATUS_BADGE[u.status] || STATUS_BADGE.trial;
  const ts = u.trial_start ? new Date(u.trial_start).toLocaleString() : '—';
  const ca = u.created_at  ? new Date(u.created_at).toLocaleDateString() : '—';
  const key = encodeURIComponent(process.env.ADMIN_SECRET || '');

  return `<tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px;">
        ${u.avatar ? `<img src="https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png?size=32"
          style="width:32px;height:32px;border-radius:50%;" onerror="this.style.display='none'">` : ''}
        <div>
          <div style="font-weight:700;color:#e8eaf6;">${escHtml(u.username)}</div>
          <div style="font-size:11px;color:#546e7a;">${u.discord_id}</div>
        </div>
      </div>
    </td>
    <td><span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;
      color:${b.color};background:${b.bg};border:1px solid ${b.color}40;">${b.label}</span></td>
    <td style="font-size:12px;color:#546e7a;">${ts}</td>
    <td style="font-size:12px;color:#546e7a;">${ca}</td>
    <td>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${u.status !== 'approved' ? `<form method="POST" style="margin:0;">
          <input type="hidden" name="key" value="${key}">
          <input type="hidden" name="action" value="approve">
          <input type="hidden" name="id" value="${u.discord_id}">
          <button type="submit" class="btn btn-approve">✅ Approve</button>
        </form>` : ''}
        ${u.status !== 'denied' ? `<form method="POST" style="margin:0;">
          <input type="hidden" name="key" value="${key}">
          <input type="hidden" name="action" value="deny">
          <input type="hidden" name="id" value="${u.discord_id}">
          <button type="submit" class="btn btn-deny">❌ Deny</button>
        </form>` : ''}
        <form method="POST" style="margin:0;">
          <input type="hidden" name="key" value="${key}">
          <input type="hidden" name="action" value="reset">
          <input type="hidden" name="id" value="${u.discord_id}">
          <button type="submit" class="btn btn-reset">🔄 Reset</button>
        </form>
      </div>
    </td>
  </tr>`;
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  // ── POST: approve / deny / reset ──
  if (req.method === 'POST') {
    // Parse body manually (Vercel doesn't auto-parse for non-JSON)
    let body = '';
    await new Promise(resolve => {
      req.on('data', chunk => body += chunk);
      req.on('end', resolve);
    });
    const params = new URLSearchParams(body);
    const key    = params.get('key');
    const action = params.get('action');
    const id     = params.get('id');

    if (!key || key !== clean(process.env.ADMIN_SECRET)) {
      return res.status(403).send('Forbidden');
    }

    const updates = {
      approve: { status: 'approved', approved_at: new Date().toISOString() },
      deny:    { status: 'denied' },
      reset:   { status: 'trial', trial_start: new Date().toISOString(), approved_at: null },
    }[action];

    if (updates && id) await updateUser(id, updates);
    return res.redirect(302, `/api/admin?key=${encodeURIComponent(key)}&msg=${action}`);
  }

  // ── GET: render dashboard ──
  if (!authGuard(req, res)) return;

  const users   = await getAllUsers().catch(() => []);
  const key     = encodeURIComponent(req.query.key);
  const msg     = req.query.msg;
  const pending = users.filter(u => u.status === 'pending').length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin — Bomb Solver</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#06060e;color:#b0bec5;font-family:'Inter',system-ui,sans-serif;min-height:100vh;padding:24px;}
    h1{color:#e8eaf6;font-size:22px;margin-bottom:4px;}
    .sub{color:#37474f;font-size:13px;margin-bottom:24px;}
    .stats{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;}
    .stat{background:#0d0d20;border:1px solid #1e1e38;border-radius:10px;padding:14px 20px;min-width:120px;}
    .stat-n{font-size:28px;font-weight:900;color:#e8eaf6;}
    .stat-l{font-size:11px;color:#546e7a;text-transform:uppercase;letter-spacing:1px;}
    .card{background:#0d0d20;border:1px solid #1e1e38;border-radius:12px;overflow:hidden;}
    table{width:100%;border-collapse:collapse;}
    th{background:#0a0a18;color:#546e7a;font-size:11px;text-transform:uppercase;letter-spacing:1px;
       padding:12px 16px;text-align:left;border-bottom:1px solid #1e1e38;}
    td{padding:14px 16px;border-bottom:1px solid #0d0d1f;vertical-align:middle;}
    tr:last-child td{border-bottom:none;}
    tr:hover td{background:rgba(255,255,255,0.02);}
    .btn{padding:5px 12px;border:1px solid transparent;border-radius:6px;font-size:12px;
         cursor:pointer;font-family:inherit;transition:opacity .15s;}
    .btn:hover{opacity:0.8;}
    .btn-approve{background:rgba(0,230,118,0.1);border-color:#00e676;color:#00e676;}
    .btn-deny{background:rgba(229,57,53,0.1);border-color:#e53935;color:#ef9a9a;}
    .btn-reset{background:rgba(255,255,255,0.04);border-color:#37474f;color:#78909c;}
    .toast{padding:10px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;
           background:rgba(0,230,118,0.1);border:1px solid #00e676;color:#00e676;}
    .empty{text-align:center;padding:40px;color:#37474f;font-size:14px;}
    @media(max-width:600px){table{font-size:12px;}td,th{padding:10px 8px;}}
  </style>
</head>
<body>
  <h1>🛡️ Bomb Solver — Admin</h1>
  <div class="sub">Manage user access · <a href="/" style="color:#7c4dff;">Back to site</a></div>

  ${msg ? `<div class="toast">✓ Action "${msg}" completed successfully</div>` : ''}

  <div class="stats">
    <div class="stat"><div class="stat-n">${users.length}</div><div class="stat-l">Total Users</div></div>
    <div class="stat"><div class="stat-n" style="color:#ffd875">${users.filter(u=>u.status==='trial').length}</div><div class="stat-l">On Trial</div></div>
    <div class="stat"><div class="stat-n" style="color:#7c4dff">${pending}</div><div class="stat-l">Pending</div></div>
    <div class="stat"><div class="stat-n" style="color:#00e676">${users.filter(u=>u.status==='approved').length}</div><div class="stat-l">Approved</div></div>
    <div class="stat"><div class="stat-n" style="color:#e53935">${users.filter(u=>u.status==='denied').length}</div><div class="stat-l">Denied</div></div>
  </div>

  <div class="card">
    <table>
      <thead><tr>
        <th>User</th><th>Status</th><th>Trial Started</th><th>Joined</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${users.length ? users.map(userRow).join('') : '<tr><td colspan="5" class="empty">No users yet</td></tr>'}
      </tbody>
    </table>
  </div>
  <p style="margin-top:16px;font-size:11px;color:#263238;">
    Admin URL: /api/admin?key=${key} — bookmark this page
  </p>
</body>
</html>`;

  res.status(200).send(html);
};
