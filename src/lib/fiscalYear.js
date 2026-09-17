// Fiscal year runs Jul 1 - Jun 30, labeled by its starting calendar year (e.g. "2025-26").
// Returns null for anything that isn't a real YYYY-MM-DD calendar date --
// a bad date used to silently produce fiscal_year "NaN-NaN", which then
// became the default selected year in the dashboard/list (it sorts last),
// hiding the user's real records behind an empty view.
function fiscalYearFor(dateStr) {
    if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

    const [year, month, day] = dateStr.split("-").map(Number);
    // Round-trip through Date.UTC to reject calendar overflow (e.g. "2025-02-30",
    // which Date would otherwise silently roll over to March 2nd).
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return null;
    }

    const startYear = month >= 7 ? year : year - 1;
    const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
    return `${startYear}-${endYearShort}`;
}

module.exports = { fiscalYearFor };
