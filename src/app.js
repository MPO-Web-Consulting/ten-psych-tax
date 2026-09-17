const path = require("path");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const nunjucks = require("nunjucks");

const { requireAuth } = require("./middleware/auth");
const { UPLOAD_DIR } = require("./middleware/upload");
const routes = require("./routes");

// README documents this as required with "no defaults in production" --
// silently falling back to a hardcoded secret would let anyone forge a
// valid session cookie for a deployment that forgot to set it.
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production (see README).");
}

const app = express();

nunjucks.configure(path.join(__dirname, "views"), {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV !== "production"
});
app.set("view engine", "njk");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "dev-secret-change-me",
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true, sameSite: "lax" }
    })
);

// Uploaded originals are tax records, not public assets: serve only to
// authenticated sessions rather than mounting them as static files.
app.use("/uploads", requireAuth, express.static(UPLOAD_DIR));

app.use("/", routes);

// Multer (bad file type, oversized file) throws outside the normal
// route flow -- without this handler those requests fall through to
// Express's default handler and crash with a raw 500 instead of a
// message the user can act on.
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).send("Uploaded file is too large (10MB max).");
    }
    if (err && typeof err.message === "string" && err.message.startsWith("Unsupported file type")) {
        return res.status(400).send(err.message);
    }
    next(err);
});

module.exports = app;
