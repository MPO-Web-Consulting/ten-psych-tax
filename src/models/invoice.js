const db = require("../db");
const { fiscalYearFor } = require("../lib/fiscalYear");

function createInvoice({ clientName, description, amountCents, paidDate, recordFilename }) {
    const fiscalYear = fiscalYearFor(paidDate);
    const result = db
        .prepare(
            `INSERT INTO invoices (client_name, description, amount_cents, paid_date, fiscal_year, record_filename)
             VALUES (@clientName, @description, @amountCents, @paidDate, @fiscalYear, @recordFilename)`
        )
        .run({ clientName, description: description || null, amountCents, paidDate, fiscalYear, recordFilename: recordFilename || null });
    return getInvoice(result.lastInsertRowid);
}

function getInvoice(id) {
    return db.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
}

function listInvoices({ fiscalYear } = {}) {
    if (fiscalYear) {
        return db
            .prepare("SELECT * FROM invoices WHERE fiscal_year = ? ORDER BY paid_date DESC")
            .all(fiscalYear);
    }
    return db.prepare("SELECT * FROM invoices ORDER BY paid_date DESC").all();
}

function listFiscalYears() {
    return db
        .prepare("SELECT DISTINCT fiscal_year FROM invoices ORDER BY fiscal_year DESC")
        .all()
        .map((row) => row.fiscal_year);
}

function updateInvoice(id, { clientName, description, amountCents, paidDate, recordFilename }) {
    const existing = getInvoice(id);
    if (!existing) return null;

    const nextPaidDate = paidDate || existing.paid_date;
    const fiscalYear = fiscalYearFor(nextPaidDate);

    db.prepare(
        `UPDATE invoices SET
            client_name = @clientName,
            description = @description,
            amount_cents = @amountCents,
            paid_date = @paidDate,
            fiscal_year = @fiscalYear,
            record_filename = @recordFilename,
            updated_at = datetime('now')
         WHERE id = @id`
    ).run({
        id,
        clientName: clientName ?? existing.client_name,
        description: description ?? existing.description,
        amountCents: amountCents ?? existing.amount_cents,
        paidDate: nextPaidDate,
        fiscalYear,
        recordFilename: recordFilename ?? existing.record_filename
    });

    return getInvoice(id);
}

function deleteInvoice(id) {
    const existing = getInvoice(id);
    if (!existing) return null;
    db.prepare("DELETE FROM invoices WHERE id = ?").run(id);
    return existing;
}

module.exports = {
    createInvoice,
    getInvoice,
    listInvoices,
    listFiscalYears,
    updateInvoice,
    deleteInvoice
};
