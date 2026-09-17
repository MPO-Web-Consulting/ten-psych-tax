# 🧾 ten psych tax

Basic tax tracking app for psychologists. Keeps paid invoices and expenses organized for tax time.

## ✨ Features

| | |
| --- | --- |
| 💵 | Input paid invoices (cash basis) and categorized expenses, with original record upload |
| 📊 | Graph income and expenses by fiscal year (Jul–Jun) |
| 📦 | Generate yearly tax report for accountant: excel summary + original records, bundled as a zip |
| 📋 | List view of invoices and expenses |
| 🔒 | Single shared password login |

## 🏗️ Design spec

| Layer | Choice |
| --- | --- |
| Backend | Express |
| Templates | Nunjucks |
| Frontend | htmx |
| Storage | SQLite |
| Uploads | Multer, saved to `uploads/` |
| Report | ExcelJS, zipped with original records |
| Deployment | Single server, single container |

## ✅ Requirements

- **Node 22+** — system-packaged Node on older distros is often too old to build `better-sqlite3`; use the devcontainer or a version manager

## ⚙️ Environment variables

Required in production, no defaults:

| Variable | Purpose |
| --- | --- |
| `APP_PASSWORD` | Shared login password |
| `SESSION_SECRET` | Session cookie signing secret |
| `PORT` | Server port (default `3000`) |
| `NODE_ENV` | Set to `production` for a real deployment |

Optional:

| Variable | Purpose |
| --- | --- |
| `TRUST_PROXY` | Set (to any non-empty value) only if this app sits behind a reverse proxy that terminates TLS for it. Without it, the session cookie is never marked `Secure`, which is correct for the plain-HTTP single-container deployment below; with it, the cookie is marked `Secure` whenever the connection is actually HTTPS. Don't set this unless there's a real proxy in front — it makes the app trust `X-Forwarded-*` headers, which a client could otherwise spoof directly. |

Generate a `.env` with random `APP_PASSWORD`/`SESSION_SECRET`:

```bash
./scripts/create-env.sh          # writes .env, refuses to overwrite an existing one
./scripts/create-env.sh --force  # regenerate (invalidates current password/sessions)
```

## 🚀 Development

```bash
npm install
./scripts/create-env.sh
npm start
```

## 🐳 Deployment (Docker)

```bash
./scripts/create-env.sh
docker compose up -d --build
```

> [!NOTE]
> `data/` (sqlite db) and `uploads/` (original records) persist in named Docker volumes, not host folders — back them up with:

```bash
docker run --rm -v ten-psych-tax_data:/data -v ten-psych-tax_uploads:/uploads -v "$(pwd)":/backup busybox \
  tar czf /backup/ten-psych-tax-backup.tar.gz -C / data uploads
```
