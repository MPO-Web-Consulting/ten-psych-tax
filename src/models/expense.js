const db = require("../db");
const { fiscalYearFor } = require("../lib/fiscalYear");

// Deductibility categories a psychologist sole trader commonly claims.
const EXPENSE_CATEGORIES = [
    "professional_development",
    "supervision",
    "professional_insurance",
    "professional_memberships",
    "home_office",
    "equipment",
    "software_subscriptions",
    "travel",
    "other"
];

function createExpense({ description, category, amountCents, expenseDate, recordFilename }) {
    if (!EXPENSE_CATEGORIES.includes(category)) {
        throw new Error(`Unknown expense category: ${category}`);
    }
    const fiscalYear = fiscalYearFor(expenseDate);
    const result = db
        .prepare(
            `INSERT INTO expenses (description, category, amount_cents, expense_date, fiscal_year, record_filename)
             VALUES (@description, @category, @amountCents, @expenseDate, @fiscalYear, @recordFilename)`
        )
        .run({ description, category, amountCents, expenseDate, fiscalYear, recordFilename: recordFilename || null });
    return getExpense(result.lastInsertRowid);
}

function getExpense(id) {
    return db.prepare("SELECT * FROM expenses WHERE id = ?").get(id);
}

function listExpenses({ fiscalYear, category } = {}) {
    const clauses = [];
    const params = {};
    if (fiscalYear) {
        clauses.push("fiscal_year = @fiscalYear");
        params.fiscalYear = fiscalYear;
    }
    if (category) {
        clauses.push("category = @category");
        params.category = category;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return db.prepare(`SELECT * FROM expenses ${where} ORDER BY expense_date DESC`).all(params);
}

function listFiscalYears() {
    return db
        .prepare("SELECT DISTINCT fiscal_year FROM expenses ORDER BY fiscal_year DESC")
        .all()
        .map((row) => row.fiscal_year);
}

function updateExpense(id, { description, category, amountCents, expenseDate, recordFilename }) {
    const existing = getExpense(id);
    if (!existing) return null;
    if (category && !EXPENSE_CATEGORIES.includes(category)) {
        throw new Error(`Unknown expense category: ${category}`);
    }

    const nextExpenseDate = expenseDate || existing.expense_date;
    const fiscalYear = fiscalYearFor(nextExpenseDate);

    db.prepare(
        `UPDATE expenses SET
            description = @description,
            category = @category,
            amount_cents = @amountCents,
            expense_date = @expenseDate,
            fiscal_year = @fiscalYear,
            record_filename = @recordFilename,
            updated_at = datetime('now')
         WHERE id = @id`
    ).run({
        id,
        description: description ?? existing.description,
        category: category ?? existing.category,
        amountCents: amountCents ?? existing.amount_cents,
        expenseDate: nextExpenseDate,
        fiscalYear,
        recordFilename: recordFilename ?? existing.record_filename
    });

    return getExpense(id);
}

function deleteExpense(id) {
    const existing = getExpense(id);
    if (!existing) return null;
    db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
    return existing;
}

module.exports = {
    EXPENSE_CATEGORIES,
    createExpense,
    getExpense,
    listExpenses,
    listFiscalYears,
    updateExpense,
    deleteExpense
};
