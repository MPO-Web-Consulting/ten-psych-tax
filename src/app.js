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

// Trusts X-Forwarded-* headers from an upstream reverse proxy -- needed for
// cookie.secure below (and req.ip/req.secure generally) to reflect reality
// when TLS is terminated in front of this app rather than by it. Opt-in and
// off by default: this deployment ships with no reverse proxy and no TLS of
// its own (see README), and blindly trusting these headers with nothing
// upstream to set them for real would let any client spoof them directly.
if (process.env.TRUST_PROXY) {
    app.set("trust proxy", 1);
}

nunjucks.configure(path.join(__dirname, "views"), {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV !== "production"
});
app.set("view engine", "njk");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Without maxAge the cookie (and its MemoryStore entry) lives until the
// process restarts -- that's the only thing that ever clears a session.
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

app.use(
    session({
        secret: process.env.SESSION_SECRET || "dev-secret-change-me",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            maxAge: SESSION_MAX_AGE_MS,
            // "auto": marks the cookie Secure only when the connection is
            // actually TLS (directly, or via the upstream proxy trusted
            // above) -- so this doesn't break the plain-HTTP deployment
            // this app ships with by default, but still locks the cookie
            // down for anyone who does put TLS in front of it.
            secure: "auto"
        }
    })
);

// Uploaded originals are tax records, not public assets: serve only to
// authenticated sessions rather than mounting them as static files.
app.use("/uploads", requireAuth, express.static(UPLOAD_DIR));

app.use("/", routes);

// Multer (bad file type, unrecognized content, oversized file) throws
// outside the normal route flow -- without this handler those requests
// fall through to Express's default handler and crash with a raw 500
// instead of a message the user can act on. The two message prefixes
// match the rejection errors middleware/upload.js's fileFilter and
// VerifiedDiskStorage throw.
const UPLOAD_REJECTION_PREFIXES = ["Unsupported file type", "Unrecognized or unsupported file content"];

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).send("Uploaded file is too large (10MB max).");
    }
    if (err && typeof err.message === "string" && UPLOAD_REJECTION_PREFIXES.some((p) => err.message.startsWith(p))) {
        return res.status(400).send(err.message);
    }
    next(err);
});

module.exports = app;
