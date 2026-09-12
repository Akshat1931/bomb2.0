/**
 * api/auth/callback.js — Discord OAuth callback
 * 1. Exchanges `code` for Discord access token
 * 2. Fetches Discord user info
 * 3. Creates/updates user in Supabase
 * 4. Sets session cookie
 * 5. Redirects to app
 */
const { sign, secureCookieFlags } = require('../../lib/session');
const { loginUser }               = require('../../lib/supabase');

function clean(str) {
  return (str || '').trim().replace(/^["']|["']$/g, '');
}

function getRedirectUri() {
  let uri = clean(process.env.DISCORD_REDIRECT_URI);
  if (!uri) uri = 'https://bomb2-0.vercel.app/api/auth/callback';
  if (!uri.includes('/api/auth/callback')) {
    uri = uri.replace(/\/+$/, '') + '/api/auth/callback';
  }
  return uri;
}

module.exports = async function handler(req, res) {
  const { code } = req.query;

  if (!code) return res.redirect(302, '/?auth_error=no_code');

  try {
    // 1. Exchange code → access token
    const clientId = clean(process.env.DISCORD_CLIENT_ID);
    const clientSecret = clean(process.env.DISCORD_CLIENT_SECRET);

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':   'BombDefusalSolver (https://bomb2-0.vercel.app, 2.0.0)',
      },
      body:    new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  getRedirectUri(),
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      const detail = tokenData.error === 'invalid_client'
        ? 'Discord Client Secret in Vercel does not match'
        : (tokenData.error_description || tokenData.error || 'token_exchange_failed');
      return res.redirect(302, `/?auth_error=token&detail=${encodeURIComponent(detail)}`);
    }

    // 2. Get Discord user info
    const userRes  = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent':    'BombDefusalSolver (https://bomb2-0.vercel.app, 2.0.0)',
      },
    });
    const du = await userRes.json();

    if (!userRes.ok || !du.id) {
      console.error('Discord user fetch failed:', du);
      const detail = du.message || 'failed_to_fetch_user';
      return res.redirect(302, `/?auth_error=user&detail=${encodeURIComponent(detail)}`);
    }

    // 3. Upsert in Supabase (smart: preserves status/trial for returning users)
    await loginUser({ discord_id: du.id, username: du.username, avatar: du.avatar });

    // 4. Set session cookie (30 days)
    const session = sign({ discord_id: du.id, username: du.username });
    res.setHeader('Set-Cookie',
      `__bomb_session=${session}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax; Secure`
    );

    res.redirect(302, '/');
  } catch (err) {
    console.error('Auth callback error:', err);
    return res.redirect(302, `/?auth_error=server&detail=${encodeURIComponent(err.message || String(err))}`);
  }
};
