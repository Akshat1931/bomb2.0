/**
 * api/admin.js — Admin Dashboard with Time-based Expirations & Detailed Timings
 */
const { getAllUsers, updateUser } = require('../lib/supabase');

function clean(str) {
  return (str || '').trim().replace(/^["']|["']$/g, '');
}

const DURATION_MAP = {
  approved_1d:  1 * 24 * 60 * 60 * 1000,
  approved_3d:  3 * 24 * 60 * 60 * 1000,
  approved_7d:  7 * 24 * 60 * 60 * 1000,
  approved_14d: 14 * 24 * 60 * 60 * 1000,
  approved_30d: 30 * 24 * 60 * 60 * 1000,
};

function formatCountdown(ms) {
  if (ms <= 0) return 'Expired';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function getStatusBadge(u) {
  const s = u.status || 'trial';

  if (s === 'approved') {
    return { label: '🛡️ Lifetime Pro', color: '#00e676', bg: 'rgba(0,230,118,0.12)' };
  }
  if (s === 'approved_7d') {
    return { label: '⏱️ Pro (7 Days)', color: '#00e5ff', bg: 'rgba(0,229,255,0.12)' };
  }
  if (s === 'approved_1d') {
    return { label: '⏱️ Pro (1 Day)', color: '#00e5ff', bg: 'rgba(0,229,255,0.12)' };
  }
  if (s === 'approved_30d') {
    return { label: '⏱️ Pro (30 Days)', color: '#00e5ff', bg: 'rgba(0,229,255,0.12)' };
  }
  if (s === 'trial') {
    return { label: '⚡ Free Trial', color: '#ffd875', bg: 'rgba(255,216,117,0.12)' };
  }
  if (s === 'pending') {
    return { label: '🔔 Pending Review', color: '#b388ff', bg: 'rgba(179,136,255,0.12)' };
  }
  if (s === 'expired') {
    return { label: '🔒 Expired / Timed Out', color: '#fb8c00', bg: 'rgba(251,140,0,0.12)' };
  }
  if (s === 'denied') {
    return { label: '❌ Denied', color: '#ef5350', bg: 'rgba(239,83,80,0.12)' };
  }
  return { label: s, color: '#90a4ae', bg: 'rgba(144,164,174,0.12)' };
}

function getExpiryInfo(u) {
  const s = u.status || 'trial';

  if (s === 'approved') {
    return `<span style="color:#00e676;font-weight:700;">✨ Never (Permanent)</span>`;
  }

  if (s.startsWith('approved_')) {
    const dur = DURATION_MAP[s] || 0;
    if (u.approved_at) {
      const appTime = new Date(u.approved_at).getTime();
      const expTime = appTime + dur;
      const remaining = expTime - Date.now();
      const expDate = new Date(expTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      if (remaining <= 0) {
        return `<span style="color:#fb8c00;font-weight:600;">🔒 Expired on ${expDate}</span>`;
      }
      return `<div>
        <span style="color:#00e5ff;font-weight:700;">⏳ ${formatCountdown(remaining)}</span>
        <div style="font-size:11px;color:#64748b;">Until ${expDate}</div>
      </div>`;
    }
  }

  if (s === 'trial') {
    const trialStart = u.trial_start ? new Date(u.trial_start).getTime() : Date.now();
    const remaining = Math.max(0, (30 * 60 * 1000) - (Date.now() - trialStart));
    if (remaining <= 0) {
      return `<span style="color:#fb8c00;font-weight:600;">🔒 30m Trial Finished</span>`;
    }
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `<span style="color:#ffd875;font-weight:700;">⏱️ ${mins}m ${secs < 10 ? '0' : ''}${secs}s left</span>`;
  }

  if (s === 'pending') {
    return `<span style="color:#b388ff;font-weight:600;">Waiting for Approval</span>`;
  }
  if (s === 'expired') {
    return `<span style="color:#fb8c00;font-weight:600;">Access Concluded</span>`;
  }
  if (s === 'denied') {
    return `<span style="color:#ef5350;font-weight:600;">Access Blocked</span>`;
  }

  return `<span style="color:#64748b;">—</span>`;
}

function userRow(u) {
  const badge = getStatusBadge(u);
  const expiry = getExpiryInfo(u);

  const trialStart = u.trial_start ? new Date(u.trial_start).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const approvedAt = u.approved_at ? new Date(u.approved_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const joinedAt   = u.created_at  ? new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const key = encodeURIComponent(clean(process.env.ADMIN_SECRET) || '');

  return `<tr>
    <td>
      <div style="display:flex;align-items:center;gap:12px;">
        ${u.avatar ? `<img src="https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png?size=36"
          style="width:36px;height:36px;border-radius:50%;border:1.5px solid #5865F2;" onerror="this.style.display='none'">` :
          `<div style="width:36px;height:36px;border-radius:50%;background:#5865F2;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">${(u.username||'U')[0].toUpperCase()}</div>`}
        <div>
          <div style="font-weight:700;color:#f1f5f9;font-size:14px;">${escHtml(u.username)}</div>
          <div style="font-size:11px;color:#64748b;font-family:monospace;">${u.discord_id}</div>
        </div>
      </div>
    </td>
    <td>
      <span style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;
        color:${badge.color};background:${badge.bg};border:1px solid ${badge.color}40;display:inline-block;white-space:nowrap;">
        ${badge.label}
      </span>
    </td>
    <td>
      ${expiry}
    </td>
    <td style="font-size:12px;color:#94a3b8;line-height:1.6;">
      <div><span style="color:#64748b;">Joined:</span> ${joinedAt}</div>
      <div><span style="color:#64748b;">Trial:</span> ${trialStart}</div>
      ${u.approved_at ? `<div><span style="color:#64748b;">Approved:</span> ${approvedAt}</div>` : ''}
    </td>
    <td>
      <form method="POST" style="margin:0;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        <input type="hidden" name="key" value="${key}">
        <input type="hidden" name="id" value="${u.discord_id}">
        <select name="action" class="action-select">
          <option value="approve_7d" selected>Approve (7 Days / 1 Wk)</option>
          <option value="approve_lifetime">Approve (Lifetime / No Expiry)</option>
          <option value="approve_30d">Approve (30 Days)</option>
          <option value="approve_1d">Approve (1 Day / 24h)</option>
          <option value="signout">🔒 Force Sign Out (Expire)</option>
          <option value="reset">🔄 Reset Trial (30 Mins)</option>
          <option value="deny">❌ Deny User</option>
        </select>
        <button type="submit" class="btn btn-apply">Apply</button>
      </form>
    </td>
  </tr>`;
}

function escHtml(s) {
  return String(s||'').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  // ── POST: handle actions ──
  if (req.method === 'POST') {
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
      return res.status(403).send('Forbidden — Invalid admin key');
    }

    const updates = {
      approve_7d:       { status: 'approved_7d', approved_at: new Date().toISOString() },
      approve_lifetime: { status: 'approved',    approved_at: new Date().toISOString() },
      approve_30d:      { status: 'approved_30d', approved_at: new Date().toISOString() },
      approve_1d:       { status: 'approved_1d',  approved_at: new Date().toISOString() },
      approve:          { status: 'approved',    approved_at: new Date().toISOString() },
      signout:          { status: 'expired' },
      deny:             { status: 'denied' },
      reset:            { status: 'trial', trial_start: new Date().toISOString(), approved_at: null },
    }[action];

    if (updates && id) await updateUser(id, updates);
    return res.redirect(302, `/admin?key=${encodeURIComponent(key)}&msg=${action}`);
  }

  // ── GET: render dashboard ──
  const key = req.query.key;
  if (!key || key !== clean(process.env.ADMIN_SECRET)) {
    res.status(403).send(`<!DOCTYPE html>
<html><head><title>Access Denied</title>
<style>body{background:#06060e;color:#ef9a9a;font-family:sans-serif;display:flex;
align-items:center;justify-content:center;min-height:100vh;margin:0;}
.b{text-align:center;background:#0d0d20;border:1px solid #3a1a1a;border-radius:16px;padding:40px;}
</style></head><body><div class="b"><h2>🔐 Wrong admin key</h2>
<p style="color:#546e7a;">Use: /admin?key=YOUR_ADMIN_SECRET</p></div></body></html>`);
    return;
  }

  const users = await getAllUsers().catch(() => []);
  const safeKey = encodeURIComponent(key);
  const msg = req.query.msg;

  const totalUsers  = users.length;
  const onTrial     = users.filter(u => u.status === 'trial').length;
  const pending     = users.filter(u => u.status === 'pending').length;
  const approved    = users.filter(u => u.status && u.status.startsWith('approved')).length;
  const expired     = users.filter(u => u.status === 'expired').length;
  const denied      = users.filter(u => u.status === 'denied').length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin Dashboard — Bomb Solver</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#050614;color:#cbd5e1;font-family:'Inter',system-ui,-apple-system,sans-serif;min-height:100vh;padding:28px;}
    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;}
    h1{color:#f8fafc;font-size:24px;font-weight:800;display:flex;align-items:center;gap:10px;}
    .sub{color:#64748b;font-size:13px;margin-top:4px;}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:28px;}
    .stat{background:#0d0e26;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px 20px;}
    .stat-n{font-size:30px;font-weight:900;color:#f8fafc;line-height:1.2;}
    .stat-l{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-top:4px;}
    .card{background:#0d0e26;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.4);}
    table{width:100%;border-collapse:collapse;text-align:left;}
    th{background:#080918;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;
       padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);}
    td{padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle;}
    tr:last-child td{border-bottom:none;}
    tr:hover td{background:rgba(255,255,255,0.015);}
    .action-select{
      background:#131538;border:1px solid rgba(255,255,255,0.15);color:#e2e8f0;
      padding:7px 10px;border-radius:8px;font-size:12px;outline:none;cursor:pointer;
    }
    .action-select:focus{border-color:#7c4dff;}
    .btn-apply{
      background:#5865F2;border:none;color:#fff;font-weight:700;font-size:12px;
      padding:7px 14px;border-radius:8px;cursor:pointer;transition:all .15s;
    }
    .btn-apply:hover{background:#4752c4;}
    .toast{padding:12px 18px;border-radius:10px;margin-bottom:24px;font-size:13px;font-weight:600;
           background:rgba(0,230,118,0.12);border:1px solid #00e676;color:#00e676;display:flex;align-items:center;gap:8px;}
    .empty{text-align:center;padding:50px;color:#475569;font-size:14px;}
    .contact-note{
      margin-top:24px;background:rgba(88,101,242,0.08);border:1px solid rgba(88,101,242,0.25);
      border-radius:12px;padding:16px 20px;font-size:13px;color:#cbd5e1;
      display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;
    }
    @media(max-width:800px){table{font-size:12px;}td,th{padding:10px 12px;}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>🛡️ Bomb Solver — Admin Control Portal</h1>
      <div class="sub">Manage user licenses, set auto-expiration durations, and monitor real-time timings</div>
    </div>
    <div>
      <a href="/" style="color:#818cf8;text-decoration:none;font-size:13px;font-weight:600;">← Back to Solver</a>
    </div>
  </div>

  ${msg ? `<div class="toast">✓ Action "${msg}" executed successfully</div>` : ''}

  <div class="stats">
    <div class="stat"><div class="stat-n">${totalUsers}</div><div class="stat-l">Total Users</div></div>
    <div class="stat"><div class="stat-n" style="color:#00e676">${approved}</div><div class="stat-l">Approved / Active</div></div>
    <div class="stat"><div class="stat-n" style="color:#ffd875">${onTrial}</div><div class="stat-l">On 30m Trial</div></div>
    <div class="stat"><div class="stat-n" style="color:#b388ff">${pending}</div><div class="stat-l">Pending Approval</div></div>
    <div class="stat"><div class="stat-n" style="color:#fb8c00">${expired}</div><div class="stat-l">Expired / Timed Out</div></div>
    <div class="stat"><div class="stat-n" style="color:#ef5350">${denied}</div><div class="stat-l">Denied</div></div>
  </div>

  <div class="card">
    <table>
      <thead><tr>
        <th>User</th>
        <th>Status</th>
        <th>Access Duration / Expiry</th>
        <th>Timestamps</th>
        <th>Manage License & Duration</th>
      </tr></thead>
      <tbody>
        ${users.length ? users.map(userRow).join('') : '<tr><td colspan="5" class="empty">No users have signed in yet</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="contact-note">
    <div>
      <strong>Support Contact configured for locked users:</strong> <code>consolidating_myself</code> on Discord
    </div>
    <div style="font-size:12px;color:#64748b;">
      Auto-expiration rules: 1 Day, 7 Days (1 Week), 30 Days, or Permanent Lifetime
    </div>
  </div>
</body>
</html>`;

  res.status(200).send(html);
};
