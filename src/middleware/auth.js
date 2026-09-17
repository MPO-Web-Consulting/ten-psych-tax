const crypto = require("crypto");

// Single shared password, set via env. Timing-safe compare to avoid leaking
// the password length/content through response-time differences.
function verifyPassword(candidate) {
    const expected = process.env.APP_PASSWORD;
    if (!expected || typeof candidate !== "string") return false;

    const expectedBuf = Buffer.from(expected);
    const candidateBuf = Buffer.from(candidate);
    if (expectedBuf.length !== candidateBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, candidateBuf);
}

function login(req, password) {
    if (!verifyPassword(password)) return false;
    req.session.authenticated = true;
    return true;
}

function logout(req) {
    req.session.authenticated = false;
}

function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) return next();
    return res.redirect("/login");
}

module.exports = { verifyPassword, login, logout, requireAuth };
