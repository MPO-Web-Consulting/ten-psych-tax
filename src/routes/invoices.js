const express = require("express");
const { upload } = require("../middleware/upload");
const {
    createInvoice,
    getInvoice,
    listInvoices,
    listFiscalYears,
    updateInvoice,
    deleteInvoice
} = require("../models/invoice");
const { formatCents, parseCentsInput } = require("../lib/format");

const router = express.Router();

function decorate(invoice) {
    return { ...invoice, amountDisplay: formatCents(invoice.amount_cents) };
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
    createInvoice({
        clientName,
        description,
        amountCents: parseCentsInput(amount),
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
    const { clientName, description, amount, paidDate } = req.body;
    updateInvoice(req.params.id, {
        clientName,
        description,
        amountCents: amount ? parseCentsInput(amount) : undefined,
        paidDate,
        recordFilename: req.file ? req.file.filename : undefined
    });
    res.redirect("/invoices");
});

router.post("/invoices/:id/delete", (req, res) => {
    deleteInvoice(req.params.id);
    if (req.headers["hx-request"]) return res.send("");
    res.redirect("/invoices");
});

module.exports = router;
