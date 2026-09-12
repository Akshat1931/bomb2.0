const { getAllUsers } = require('../../lib/supabase');
const { parseCookies, verify } = require('../../lib/session');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  let supabaseOk = false;
  let supabaseErr = null;
  let userCount = -1;

  try {
    const users = await getAllUsers();
    supabaseOk = Array.isArray(users);
    userCount = Array.isArray(users) ? users.length : -1;
    if (!supabaseOk) supabaseErr = users;
  } catch (e) {
    supabaseErr = e.message;
  }

  const cookies = parseCookies(req);
  const session = verify(cookies.__bomb_session);

  res.status(200).json({
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      SUPABASE_SERVICE_KEY_PREVIEW: (process.env.SUPABASE_SERVICE_KEY || '').slice(0, 9) + '...' + (process.env.SUPABASE_SERVICE_KEY || '').slice(-4),
      DISCORD_CLIENT_ID: !!process.env.DISCORD_CLIENT_ID,
      DISCORD_CLIENT_SECRET: !!process.env.DISCORD_CLIENT_SECRET,
      DISCORD_REDIRECT_URI: !!process.env.DISCORD_REDIRECT_URI,
      ADMIN_SECRET: !!process.env.ADMIN_SECRET,
      ADMIN_SECRET_PREVIEW: (process.env.ADMIN_SECRET || '').slice(0, 3) + '...',
      SESSION_SECRET: !!process.env.SESSION_SECRET,
    },
    cookie: {
      has_cookie_header: !!req.headers.cookie,
      raw_cookie: req.headers.cookie || null,
      parsed_session_present: !!cookies.__bomb_session,
      session_valid: !!session,
      session_data: session || null,
    },
    supabase: {
      connected: supabaseOk,
      error: supabaseErr,
      user_count: userCount,
    }
  });
};
