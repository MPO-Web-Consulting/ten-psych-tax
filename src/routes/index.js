const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use((req, res, next) => {
    res.locals.authenticated = !!(req.session && req.session.authenticated);
    next();
});

router.use(require("./auth"));
router.use(requireAuth);
router.use(require("./dashboard"));
router.use(require("./invoices"));
router.use(require("./expenses"));
router.use(require("./reports"));

module.exports = router;
