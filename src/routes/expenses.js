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

const router = express.Router();

const categoryOptions = EXPENSE_CATEGORIES.map((value) => ({ value, label: humanize(value) }));

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

function isValidAmount(raw) {
    return typeof raw === "string" && AMOUNT_PATTERN.test(raw.trim());
}

function isValidDate(raw) {
    return typeof raw === "string" && DATE_PATTERN.test(raw) && !Number.isNaN(Date.parse(raw));
}

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
    const errors = [];
    if (!description || !description.trim()) errors.push("Description is required");
    if (!EXPENSE_CATEGORIES.includes(category)) errors.push("Unknown category");
    if (!isValidAmount(amount)) errors.push("Enter a valid amount");
    if (!isValidDate(expenseDate)) errors.push("Enter a valid date");

    if (errors.length) {
        if (req.file) deleteUploadedFile(req.file.filename);
        return res.status(400).render("expenses/form.njk", {
            expense: {
                description,
                category,
                amount_cents: isValidAmount(amount) ? parseCentsInput(amount) : undefined,
                expense_date: expenseDate
            },
            categoryOptions,
            error: errors.join(", ")
        });
    }

    createExpense({
        description,
        category,
        amountCents: parseCentsInput(amount),
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
    const errors = [];
    if (description !== undefined && !description.trim()) errors.push("Description is required");
    if (category !== undefined && !EXPENSE_CATEGORIES.includes(category)) errors.push("Unknown category");
    if (amount !== undefined && !isValidAmount(amount)) errors.push("Enter a valid amount");
    if (expenseDate !== undefined && !isValidDate(expenseDate)) errors.push("Enter a valid date");

    if (errors.length) {
        if (req.file) deleteUploadedFile(req.file.filename);
        return res.status(400).render("expenses/form.njk", {
            expense: {
                id: req.params.id,
                description,
                category,
                amount_cents: amount && isValidAmount(amount) ? parseCentsInput(amount) : existing.amount_cents,
                expense_date: expenseDate
            },
            categoryOptions,
            error: errors.join(", ")
        });
    }

    updateExpense(req.params.id, {
        description,
        category,
        amountCents: amount ? parseCentsInput(amount) : undefined,
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
