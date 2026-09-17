# ten psych tax

basic tax tracking app for psychologists. Need to keep paid invoices, and expenses for tax time.

Features:

- input paid invoices (cash basis) and categorized expenses, with original record upload
- graph income and expenses by fiscal year (Jul-Jun)
- generate yearly tax report for accountant: excel summary + original records, bundled as a zip
- list view of invoices and expenses
- single shared password login

Design spec:

- backend: express
- templates: nunjucks
- frontend: htmx
- storage: sqlite
- uploads: multer, saved to uploads/
- report: exceljs, zipped with original records
- deployment: single server, single container

Requirements:

- Node 22+ (system-packaged Node on older distros is often too old to build `better-sqlite3`; use the devcontainer or a version manager)

Environment variables (required, no defaults in production):

- `APP_PASSWORD` - shared login password
- `SESSION_SECRET` - session cookie signing secret
- `PORT` - default 3000
- `NODE_ENV` - `production` for a real deployment

Generate a `.env` with random `APP_PASSWORD`/`SESSION_SECRET`:

```bash
./scripts/create-env.sh          # writes .env, refuses to overwrite an existing one
./scripts/create-env.sh --force  # regenerate (invalidates current password/sessions)
```

Development:

```bash
npm install
./scripts/create-env.sh
npm run watch    # rebuild client bundle on change, separate terminal
npm start
```

Deployment (Docker):

```bash
./scripts/create-env.sh
docker compose up -d --build
```

`data/` (sqlite db) and `uploads/` (original records) persist in named Docker volumes, not host folders - back them up with:

```bash
docker run --rm -v ten-psych-tax_data:/data -v ten-psych-tax_uploads:/uploads -v "$(pwd)":/backup busybox \
  tar czf /backup/ten-psych-tax-backup.tar.gz -C / data uploads
```
