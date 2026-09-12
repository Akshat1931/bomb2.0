/** api/auth/logout.js — clear session cookie and redirect */
const { secureCookieFlags } = require('../../lib/session');

module.exports = function handler(req, res) {
  res.setHeader('Set-Cookie',
    `__bomb_session=; Path=/; Max-Age=0; SameSite=Lax${secureCookieFlags()}`
  );
  res.redirect(302, '/');
};
