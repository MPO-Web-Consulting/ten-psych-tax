const crypto = require("crypto");

// Single shared password, set via env. Timing-safe compare to avoid leaking
// the password length/content through response-time differences. Hashing
// both sides to a fixed-length digest first means timingSafeEqual always
// compares equal-length buffers -- comparing the raw candidate/expected
// buffers directly would need a length check before that call, and a
// length mismatch short-circuiting early would itself leak the expected
// password's length through response time.
function verifyPassword(candidate) {
    const expected = process.env.APP_PASSWORD;
    if (!expected || typeof candidate !== "string") return false;

    const expectedHash = crypto.createHash("sha256").update(expected).digest();
    const candidateHash = crypto.createHash("sha256").update(candidate).digest();
    return crypto.timingSafeEqual(expectedHash, candidateHash);
}

function login(req, password) {
    if (!verifyPassword(password)) return false;
    req.session.authenticated = true;
    return true;
}

function logout(req, callback) {
    req.session.destroy(callback);
}

function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) return next();
    return res.redirect("/login");
}

module.exports = { verifyPassword, login, logout, requireAuth };
