const fs = require("fs");
const path = require("path");
const express = require("express");
const { upload, UPLOAD_DIR } = require("../middleware/upload");
const {
    createInvoice,
    getInvoice,
    listInvoices,
    listFiscalYears,
    updateInvoice,
    deleteInvoice
} = require("../models/invoice");
const { formatCents, parseCentsInput } = require("../lib/format");
const { fiscalYearFor } = require("../lib/fiscalYear");

const router = express.Router();

function decorate(invoice) {
    return { ...invoice, amountDisplay: formatCents(invoice.amount_cents) };
}

// Removes a saved upload that ended up with no DB row pointing at it
// (validation failed after multer already wrote the file, or the file was
// just replaced/the record deleted) so uploads/ doesn't accumulate orphans.
function removeUpload(filename) {
    if (!filename) return;
    fs.unlink(path.join(UPLOAD_DIR, filename), (err) => {
        if (err && err.code !== "ENOENT") console.error(`Failed to remove upload ${filename}:`, err);
    });
}

function validationError({ clientName, amountCents, fiscalYear }) {
    const errors = [];
    if (!clientName || !clientName.trim()) errors.push("a client name");
    if (amountCents === null) errors.push("a valid amount");
    if (!fiscalYear) errors.push("a valid date paid");
    return errors.length ? `Enter ${errors.join(", ")}.` : null;
}

router.get("/invoices", (req, res) => {
    const fiscalYears = listFiscalYears();
    const selectedYear = req.query.fiscalYear || fiscalYears[0] || null;
    const invoices = listInvoices(selectedYear ? { fiscalYear: selectedYear } : {}).map(decorate);
    res.render("invoices/list.njk", { invoices, fiscalYears, selectedYear });
});

router.get("/invoices/new", (req, res) => {
    res.render("invoices/form.njk", { invoice: null });
});

router.post("/invoices", upload.single("record"), (req, res) => {
    const { clientName, description, amount, paidDate } = req.body;
    const amountCents = parseCentsInput(amount);
    const fiscalYear = paidDate ? fiscalYearFor(paidDate) : null;

    const error = validationError({ clientName, amountCents, fiscalYear });
    if (error) {
        removeUpload(req.file && req.file.filename);
        return res.status(400).render("invoices/form.njk", {
            invoice: { client_name: clientName, description, amount_cents: amountCents, paid_date: paidDate },
            error
        });
    }

    createInvoice({
        clientName,
        description,
        amountCents,
        paidDate,
        recordFilename: req.file ? req.file.filename : null
    });
    res.redirect("/invoices");
});

router.get("/invoices/:id/edit", (req, res) => {
    const invoice = getInvoice(req.params.id);
    if (!invoice) return res.status(404).send("Invoice not found");
    res.render("invoices/form.njk", { invoice });
});

router.post("/invoices/:id", upload.single("record"), (req, res) => {
    const existing = getInvoice(req.params.id);
    if (!existing) {
        removeUpload(req.file && req.file.filename);
        return res.status(404).send("Invoice not found");
    }

    const { clientName, description, amount, paidDate } = req.body;
    const amountCents = parseCentsInput(amount);
    const fiscalYear = paidDate ? fiscalYearFor(paidDate) : null;

    const error = validationError({ clientName, amountCents, fiscalYear });
    if (error) {
        removeUpload(req.file && req.file.filename);
        return res.status(400).render("invoices/form.njk", {
            invoice: {
                id: existing.id,
                client_name: clientName,
                description,
                amount_cents: amountCents,
                paid_date: paidDate,
                record_filename: existing.record_filename
            },
            error
        });
    }

    const previousFile = existing.record_filename;
    updateInvoice(req.params.id, {
        clientName,
        description,
        amountCents,
        paidDate,
        recordFilename: req.file ? req.file.filename : undefined
    });
    if (req.file && previousFile) removeUpload(previousFile);

    res.redirect("/invoices");
});

router.post("/invoices/:id/delete", (req, res) => {
    const deleted = deleteInvoice(req.params.id);
    if (deleted) removeUpload(deleted.record_filename);
    if (req.headers["hx-request"]) return res.send("");
    res.redirect("/invoices");
});

module.exports = router;
