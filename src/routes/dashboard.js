const express = require("express");
const { listInvoices } = require("../models/invoice");
const { listExpenses } = require("../models/expense");
const { formatCents, humanize } = require("../lib/format");

const router = express.Router();

router.get("/", (req, res) => {
    const allInvoices = listInvoices();
    const allExpenses = listExpenses();

    const fiscalYears = Array.from(
        new Set([...allInvoices.map((i) => i.fiscal_year), ...allExpenses.map((e) => e.fiscal_year)])
    ).sort();

    const selectedYear = req.query.fiscalYear || fiscalYears[fiscalYears.length - 1] || null;

    const trend = fiscalYears.map((year) => ({
        fiscalYear: year,
        incomeCents: allInvoices.filter((i) => i.fiscal_year === year).reduce((sum, i) => sum + i.amount_cents, 0),
        expenseCents: allExpenses.filter((e) => e.fiscal_year === year).reduce((sum, e) => sum + e.amount_cents, 0)
    }));

    const yearInvoices = selectedYear ? allInvoices.filter((i) => i.fiscal_year === selectedYear) : [];
    const yearExpenses = selectedYear ? allExpenses.filter((e) => e.fiscal_year === selectedYear) : [];

    const totalIncomeCents = yearInvoices.reduce((sum, i) => sum + i.amount_cents, 0);
    const totalExpenseCents = yearExpenses.reduce((sum, e) => sum + e.amount_cents, 0);

    const byCategory = {};
    for (const expense of yearExpenses) {
        byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount_cents;
    }
    const categoryBreakdown = Object.entries(byCategory)
        .map(([category, cents]) => ({ category: humanize(category), cents }))
        .sort((a, b) => b.cents - a.cents);

    res.render("dashboard.njk", {
        fiscalYears: fiscalYears.slice().reverse(),
        selectedYear,
        totalIncome: formatCents(totalIncomeCents),
        totalExpense: formatCents(totalExpenseCents),
        net: formatCents(totalIncomeCents - totalExpenseCents),
        trendData: JSON.stringify(trend),
        categoryData: JSON.stringify(categoryBreakdown)
    });
});

module.exports = router;
