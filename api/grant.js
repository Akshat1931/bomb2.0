/**
 * /api/grant.js — Vercel Serverless Function
 *
 * Validates an access token and sets a permanent access cookie.
 *
 * Usage:
 *   Admin generates any random string (e.g. openssl rand -hex 16)
 *   Adds it to Vercel env var: VALID_TOKENS=abc123,def456,...
 *   Shares the URL with the user:
 *     https://yoursite.com/api/grant?t=abc123
 *
 *   User visits that URL → cookie set → full access, no trial.
 *
 * To revoke: remove the token from VALID_TOKENS env var in Vercel dashboard.
 */

export default function handler(req, res) {
  const token = req.query.t;

  // Read comma-separated valid tokens from env
  const validTokens = (process.env.VALID_TOKENS || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  // Reject if no token or token not in the list
  if (!token || !validTokens.includes(token)) {
    res.status(403).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Access Denied</title>
  <style>
    body{background:#06060e;color:#ef9a9a;font-family:'Inter',sans-serif;
         display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
    .box{text-align:center;padding:40px;background:#0d0d20;border:1px solid #3a1a1a;
         border-radius:16px;max-width:400px;}
    h2{color:#e57373;font-size:24px;margin-bottom:12px;}
    p{color:#78909c;font-size:14px;line-height:1.6;}
  </style>
</head>
<body>
  <div class="box">
    <h2>🔒 Invalid Access Token</h2>
    <p>This link is invalid or has already been revoked.<br>
       Ask the site owner for a new access link.</p>
  </div>
</body>
</html>`);
    return;
  }

  // Valid — set access cookie (1 year, readable by JS intentionally)
  res.setHeader('Set-Cookie', [
    `__bomb_access=${token}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  ]);

  // Redirect to home
  res.writeHead(302, { Location: '/' });
  res.end();
}
