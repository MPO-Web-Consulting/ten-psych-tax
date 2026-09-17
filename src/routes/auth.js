const express = require("express");
const { login, logout } = require("../middleware/auth");

const router = express.Router();

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 5 * 60 * 1000;

// In-memory, per-IP -- fine for a single shared password on a single
// container. Keyed by req.ip, which is the direct socket address unless
// TRUST_PROXY is opted into (see app.js); if that's ever turned on without
// a real proxy in front, req.ip becomes spoofable via X-Forwarded-For.
const loginAttempts = new Map();

function isLockedOut(ip) {
    const entry = loginAttempts.get(ip);
    return !!(entry && entry.lockedUntil && entry.lockedUntil > Date.now());
}

function recordFailure(ip) {
    const now = Date.now();
    const entry = loginAttempts.get(ip);
    if (!entry || now - entry.firstAttemptAt > LOGIN_WINDOW_MS) {
        loginAttempts.set(ip, { count: 1, firstAttemptAt: now, lockedUntil: null });
        return;
    }
    entry.count += 1;
    if (entry.count >= LOGIN_MAX_ATTEMPTS) {
        entry.lockedUntil = now + LOGIN_LOCKOUT_MS;
    }
}

function recordSuccess(ip) {
    loginAttempts.delete(ip);
}

router.get("/login", (req, res) => {
    if (req.session && req.session.authenticated) return res.redirect("/");
    res.render("login.njk");
});

router.post("/login", (req, res) => {
    if (isLockedOut(req.ip)) {
        return res.status(429).render("login.njk", { error: "Too many attempts. Try again in a few minutes." });
    }

    const ok = login(req, req.body.password);
    if (!ok) {
        recordFailure(req.ip);
        return res.status(401).render("login.njk", { error: "Incorrect password" });
    }
    recordSuccess(req.ip);
    res.redirect("/");
});

router.post("/logout", (req, res) => {
    logout(req, (err) => {
        if (err) console.error("Session destroy failed during logout:", err);
        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
});

module.exports = router;
