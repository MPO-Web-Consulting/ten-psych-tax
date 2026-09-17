// Fiscal year runs Jul 1 - Jun 30, labeled by its starting calendar year (e.g. "2025-26").
function fiscalYearFor(dateStr) {
    const date = new Date(dateStr);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // 1-12
    const startYear = month >= 7 ? year : year - 1;
    const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
    return `${startYear}-${endYearShort}`;
}

module.exports = { fiscalYearFor };
