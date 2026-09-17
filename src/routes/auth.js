const express = require("express");
const { login, logout } = require("../middleware/auth");

const router = express.Router();

router.get("/login", (req, res) => {
    if (req.session && req.session.authenticated) return res.redirect("/");
    res.render("login.njk");
});

router.post("/login", (req, res) => {
    const ok = login(req, req.body.password);
    if (!ok) {
        return res.status(401).render("login.njk", { error: "Incorrect password" });
    }
    res.redirect("/");
});

router.post("/logout", (req, res) => {
    logout(req);
    res.redirect("/login");
});

module.exports = router;
