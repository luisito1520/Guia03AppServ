const { randomBytes, timingSafeEqual } = require('node:crypto');

const COOKIE_NAME = 'itm_csrf';

function issueCsrfToken(res) {
  const token = randomBytes(32).toString('hex');
  res.cookie(COOKIE_NAME, token, {
    httpOnly: false,
    maxAge: 15 * 60 * 1000,
    path: '/',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
  return token;
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';
  const prefix = `${name}=`;
  const item = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item ? item.slice(prefix.length) : '';
}

function hasValidCsrfToken(req) {
  const submitted = req.body && req.body.csrf_token;
  const cookie = getCookie(req, COOKIE_NAME);
  if (
    typeof submitted !== 'string'
    || !/^[a-f0-9]{64}$/.test(submitted)
    || !/^[a-f0-9]{64}$/.test(cookie)
  ) {
    return false;
  }

  return timingSafeEqual(Buffer.from(submitted), Buffer.from(cookie));
}

module.exports = { hasValidCsrfToken, issueCsrfToken };
