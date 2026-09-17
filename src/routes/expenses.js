const express = require("express");
const { upload, deleteUploadedFile } = require("../middleware/upload");
const {
    EXPENSE_CATEGORIES,
    createExpense,
    getExpense,
    listExpenses,
    listFiscalYears,
    updateExpense,
    deleteExpense
} = require("../models/expense");
const { formatCents, parseCentsInput, humanize } = require("../lib/format");
const { fiscalYearFor } = require("../lib/fiscalYear");

const router = express.Router();

const categoryOptions = EXPENSE_CATEGORIES.map((value) => ({ value, label: humanize(value) }));

function decorate(expense) {
    return { ...expense, amountDisplay: formatCents(expense.amount_cents), categoryLabel: humanize(expense.category) };
}

router.get("/expenses", (req, res) => {
    const fiscalYears = listFiscalYears();
    const selectedYear = req.query.fiscalYear || fiscalYears[0] || null;
    const selectedCategory = req.query.category || null;
    const expenses = listExpenses({
        ...(selectedYear ? { fiscalYear: selectedYear } : {}),
        ...(selectedCategory ? { category: selectedCategory } : {})
    }).map(decorate);
    res.render("expenses/list.njk", { expenses, fiscalYears, selectedYear, selectedCategory, categoryOptions });
});

router.get("/expenses/new", (req, res) => {
    res.render("expenses/form.njk", { expense: null, categoryOptions });
});

router.post("/expenses", upload.single("record"), (req, res) => {
    const { description, category, amount, expenseDate } = req.body;
    const amountCents = parseCentsInput(amount);
    const fiscalYear = fiscalYearFor(expenseDate);

    const errors = [];
    if (!description || !description.trim()) errors.push("Description is required");
    if (!EXPENSE_CATEGORIES.includes(category)) errors.push("Unknown category");
    if (amountCents === null) errors.push("Enter a valid amount");
    if (fiscalYear === null) errors.push("Enter a valid date");

    if (errors.length) {
        if (req.file) deleteUploadedFile(req.file.filename);
        return res.status(400).render("expenses/form.njk", {
            expense: { description, category, amount_cents: amountCents, expense_date: expenseDate },
            categoryOptions,
            error: errors.join(", ")
        });
    }

    createExpense({
        description,
        category,
        amountCents,
        expenseDate,
        recordFilename: req.file ? req.file.filename : null
    });
    res.redirect("/expenses");
});

router.get("/expenses/:id/edit", (req, res) => {
    const expense = getExpense(req.params.id);
    if (!expense) return res.status(404).send("Expense not found");
    res.render("expenses/form.njk", { expense, categoryOptions });
});

router.post("/expenses/:id", upload.single("record"), (req, res) => {
    const existing = getExpense(req.params.id);
    if (!existing) {
        if (req.file) deleteUploadedFile(req.file.filename);
        return res.status(404).send("Expense not found");
    }

    const { description, category, amount, expenseDate } = req.body;
    const amountCents = amount !== undefined ? parseCentsInput(amount) : undefined;
    const fiscalYear = expenseDate !== undefined ? fiscalYearFor(expenseDate) : undefined;

    const errors = [];
    if (description !== undefined && !description.trim()) errors.push("Description is required");
    if (category !== undefined && !EXPENSE_CATEGORIES.includes(category)) errors.push("Unknown category");
    if (amount !== undefined && amountCents === null) errors.push("Enter a valid amount");
    if (expenseDate !== undefined && fiscalYear === null) errors.push("Enter a valid date");

    if (errors.length) {
        if (req.file) deleteUploadedFile(req.file.filename);
        return res.status(400).render("expenses/form.njk", {
            expense: {
                id: req.params.id,
                description,
                category,
                amount_cents: amountCents ?? existing.amount_cents,
                expense_date: expenseDate
            },
            categoryOptions,
            error: errors.join(", ")
        });
    }

    updateExpense(req.params.id, {
        description,
        category,
        amountCents,
        expenseDate,
        recordFilename: req.file ? req.file.filename : undefined
    });

    if (req.file && existing.record_filename) {
        deleteUploadedFile(existing.record_filename);
    }

    res.redirect("/expenses");
});

router.post("/expenses/:id/delete", (req, res) => {
    const deleted = deleteExpense(req.params.id);
    if (deleted && deleted.record_filename) {
        deleteUploadedFile(deleted.record_filename);
    }
    if (req.headers["hx-request"]) return res.send("");
    res.redirect("/expenses");
});

module.exports = router;
