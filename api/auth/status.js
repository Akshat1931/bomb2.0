/**
 * api/auth/status.js — returns current user's access status
 *
 * Response JSON:
 *   { status: 'guest' }                          — not logged in
 *   { status: 'trial', remaining_ms: N, username, discord_id }
 *   { status: 'expired', username, discord_id }
 *   { status: 'approved', username, discord_id }
 *   { status: 'denied', username, discord_id }
 */
const { verify, parseCookies } = require('../../lib/session');
const { getUser }              = require('../../lib/supabase');

const TRIAL_MS = 5 * 60 * 1000; // 5 minutes — change here to adjust trial length

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const cookies = parseCookies(req);
  const validTokens = (process.env.VALID_TOKENS || '').split(',').map(t => t.trim()).filter(Boolean);
  if (cookies.__bomb_access && validTokens.includes(cookies.__bomb_access)) {
    return res.status(200).json({
      status: 'approved',
      username: 'Token Access',
      discord_id: 'token',
      avatar: null
    });
  }

  const session = verify(cookies.__bomb_session);

  if (!session) {
    return res.status(200).json({ status: 'guest' });
  }

  try {
    const user = await getUser(session.discord_id);
    if (!user) return res.status(200).json({ status: 'guest' });

    if (user.status === 'approved') {
      return res.status(200).json({
        status: 'approved',
        username: user.username,
        discord_id: user.discord_id,
        avatar: user.avatar,
      });
    }

    if (user.status === 'denied') {
      return res.status(200).json({
        status: 'denied',
        username: user.username,
        discord_id: user.discord_id,
        avatar: user.avatar,
      });
    }

    if (user.status === 'pending' || user.status === 'expired') {
      return res.status(200).json({
        status: 'expired',
        username: user.username,
        discord_id: user.discord_id,
        avatar: user.avatar,
      });
    }

    // trial or pending: check time elapsed
    const trialStart   = new Date(user.trial_start).getTime();
    const elapsed      = Date.now() - trialStart;
    const remaining_ms = Math.max(0, TRIAL_MS - elapsed);

    if (remaining_ms === 0 && user.status === 'trial') {
      // Auto-advance to 'pending' so admin sees them in the request queue
      const { updateUser } = require('../../lib/supabase');
      await updateUser(user.discord_id, { status: 'pending' });
      return res.status(200).json({
        status:     'expired',
        username:   user.username,
        discord_id: user.discord_id,
      });
    }

    return res.status(200).json({
      status:       remaining_ms > 0 ? 'trial' : 'expired',
      remaining_ms: remaining_ms,
      username:     user.username,
      discord_id:   user.discord_id,
      avatar:       user.avatar,
    });
  } catch (err) {
    console.error('Status check error:', err);
    return res.status(500).json({ status: 'guest' });
  }
};
