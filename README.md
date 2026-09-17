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
