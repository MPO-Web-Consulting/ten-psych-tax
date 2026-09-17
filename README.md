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
