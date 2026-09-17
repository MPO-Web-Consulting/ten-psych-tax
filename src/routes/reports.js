const express = require("express");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const archiver = require("archiver");

const { listFiscalYears: invoiceFiscalYears, listInvoices } = require("../models/invoice");
const { listFiscalYears: expenseFiscalYears, listExpenses } = require("../models/expense");
const { UPLOAD_DIR } = require("../middleware/upload");
const { humanize } = require("../lib/format");

const router = express.Router();

router.get("/reports", (req, res) => {
    const fiscalYears = Array.from(new Set([...invoiceFiscalYears(), ...expenseFiscalYears()])).sort().reverse();
    res.render("reports/index.njk", { fiscalYears });
});

// Matches the "YYYY-YY" shape fiscalYearFor() produces (e.g. "2025-26").
// The route param used to be interpolated straight into the zip's
// Content-Disposition header -- a value with a quote or CR/LF in it could
// corrupt the header or crash the request with an uncaught 500.
const FISCAL_YEAR_PATTERN = /^\d{4}-\d{2}$/;

router.get("/reports/:fiscalYear/download", async (req, res) => {
    const { fiscalYear } = req.params;
    if (!FISCAL_YEAR_PATTERN.test(fiscalYear)) {
        return res.status(404).send("Unknown fiscal year");
    }

    const invoices = listInvoices({ fiscalYear });
    const expenses = listExpenses({ fiscalYear });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ten Psych Tax";
    workbook.created = new Date();

    const incomeSheet = workbook.addWorksheet("Income");
    incomeSheet.columns = [
        { header: "Date Paid", key: "paid_date", width: 14 },
        { header: "Client", key: "client_name", width: 28 },
        { header: "Description", key: "description", width: 36 },
        { header: "Amount", key: "amount", width: 14 },
        { header: "Record", key: "record_filename", width: 24 }
    ];
    let incomeTotal = 0;
    for (const invoice of invoices) {
        incomeTotal += invoice.amount_cents;
        incomeSheet.addRow({
            paid_date: invoice.paid_date,
            client_name: invoice.client_name,
            description: invoice.description || "",
            amount: invoice.amount_cents / 100,
            record_filename: invoice.record_filename || ""
        });
    }
    incomeSheet.getColumn("amount").numFmt = "#,##0.00";
    incomeSheet.addRow({});
    incomeSheet.addRow({ description: "Total", amount: incomeTotal / 100 });

    const expenseSheet = workbook.addWorksheet("Expenses");
    expenseSheet.columns = [
        { header: "Date", key: "expense_date", width: 14 },
        { header: "Category", key: "category", width: 24 },
        { header: "Description", key: "description", width: 36 },
        { header: "Amount", key: "amount", width: 14 },
        { header: "Record", key: "record_filename", width: 24 }
    ];
    let expenseTotal = 0;
    for (const expense of expenses) {
        expenseTotal += expense.amount_cents;
        expenseSheet.addRow({
            expense_date: expense.expense_date,
            category: humanize(expense.category),
            description: expense.description || "",
            amount: expense.amount_cents / 100,
            record_filename: expense.record_filename || ""
        });
    }
    expenseSheet.getColumn("amount").numFmt = "#,##0.00";
    expenseSheet.addRow({});
    expenseSheet.addRow({ description: "Total", amount: expenseTotal / 100 });

    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
        { header: "", key: "label", width: 24 },
        { header: "", key: "value", width: 18 }
    ];
    summarySheet.addRow({ label: "Fiscal Year", value: fiscalYear });
    summarySheet.addRow({ label: "Total Income", value: incomeTotal / 100 });
    summarySheet.addRow({ label: "Total Expenses", value: expenseTotal / 100 });
    summarySheet.addRow({ label: "Net", value: (incomeTotal - expenseTotal) / 100 });

    const workbookBuffer = await workbook.xlsx.writeBuffer();

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="tax-report-${fiscalYear}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
        console.error("Report zip generation failed:", err);
        res.destroy(err);
    });
    archive.pipe(res);

    archive.append(workbookBuffer, { name: `tax-report-${fiscalYear}.xlsx` });

    const recordsWithFiles = [...invoices, ...expenses].filter((record) => record.record_filename);
    for (const record of recordsWithFiles) {
        const filePath = path.join(UPLOAD_DIR, record.record_filename);
        if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: `records/${record.record_filename}` });
        }
    }

    await archive.finalize();
});

module.exports = router;
