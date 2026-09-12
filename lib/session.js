/**
 * lib/session.js — lightweight session token (no extra packages)
 * Signs and verifies session cookies using HMAC-SHA256.
 */
const crypto = require('crypto');

function clean(str) {
  return (str || '').trim().replace(/^["']|["']$/g, '');
}

function getSecret() {
  return clean(process.env.SESSION_SECRET) || 'dev-secret-change-me';
}

function sign(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  if (expected !== sig) return null;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()); }
  catch { return null; }
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(
    raw.split(';')
       .map(c => c.trim())
       .filter(Boolean)
       .map(c => { const i = c.indexOf('='); return [c.slice(0,i), c.slice(i+1)]; })
  );
}

function secureCookieFlags() {
  return process.env.VERCEL ? '; Secure' : '';
}

module.exports = { sign, verify, parseCookies, secureCookieFlags };
