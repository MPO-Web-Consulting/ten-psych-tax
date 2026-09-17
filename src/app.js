const path = require("path");
const express = require("express");
const session = require("express-session");
const nunjucks = require("nunjucks");

const { requireAuth } = require("./middleware/auth");
const { UPLOAD_DIR } = require("./middleware/upload");
const routes = require("./routes");

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

module.exports = app;
