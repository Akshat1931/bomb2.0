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

module.exports = function handler(req, res) {
  const params = new URLSearchParams({
    client_id:     clean(process.env.DISCORD_CLIENT_ID),
    redirect_uri:  getRedirectUri(),
    response_type: 'code',
    scope:         'identify',
  });
  res.redirect(302, `https://discord.com/oauth2/authorize?${params}`);
};
