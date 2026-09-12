/** api/auth/discord.js — Redirect user to Discord OAuth */
module.exports = function handler(req, res) {
  const params = new URLSearchParams({
    client_id:     process.env.DISCORD_CLIENT_ID,
    redirect_uri:  process.env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope:         'identify',
  });
  res.redirect(302, `https://discord.com/oauth2/authorize?${params}`);
};
