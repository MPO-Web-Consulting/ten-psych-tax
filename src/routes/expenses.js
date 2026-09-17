const express = require("express");
const { upload } = require("../middleware/upload");
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
    if (!EXPENSE_CATEGORIES.includes(category)) {
        return res.status(400).render("expenses/form.njk", {
            expense: { description, category, amount_cents: parseCentsInput(amount), expense_date: expenseDate },
            categoryOptions,
            error: "Unknown category"
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
    const { description, category, amount, expenseDate } = req.body;
    if (category && !EXPENSE_CATEGORIES.includes(category)) {
        return res.status(400).render("expenses/form.njk", {
            expense: {
                id: req.params.id,
                description,
                category,
                amount_cents: amount ? parseCentsInput(amount) : undefined,
                expense_date: expenseDate
            },
            categoryOptions,
            error: "Unknown category"
        });
    }
    updateExpense(req.params.id, {
        description,
        category,
        amountCents: amount ? parseCentsInput(amount) : undefined,
        expenseDate,
        recordFilename: req.file ? req.file.filename : undefined
    });
    res.redirect("/expenses");
});

router.post("/expenses/:id/delete", (req, res) => {
    deleteExpense(req.params.id);
    if (req.headers["hx-request"]) return res.send("");
    res.redirect("/expenses");
});

module.exports = router;
