function getRedirectUri() {
  let uri = (process.env.DISCORD_REDIRECT_URI || '').trim();
  if (!uri) uri = 'https://bomb2-0.vercel.app/api/auth/callback';
  if (!uri.includes('/api/auth/callback')) {
    uri = uri.replace(/\/+$/, '') + '/api/auth/callback';
  }
  return uri;
}

module.exports = function handler(req, res) {
  const params = new URLSearchParams({
    client_id:     process.env.DISCORD_CLIENT_ID,
    redirect_uri:  getRedirectUri(),
    response_type: 'code',
    scope:         'identify',
  });
  res.redirect(302, `https://discord.com/oauth2/authorize?${params}`);
};
