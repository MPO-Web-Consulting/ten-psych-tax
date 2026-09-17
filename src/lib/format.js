function formatCents(cents) {
    return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parses a plain decimal dollar string (e.g. "1250.50") into integer cents.
// Returns null for anything that isn't a non-negative number with at most 2
// decimal places -- silently truncating "1,250.50" to $1.00, or "abc" to
// $0.00, is worse than rejecting it for a tax record.
function parseCentsInput(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
    const cents = Math.round(parseFloat(trimmed) * 100);
    // Reject anything past safe integer range rather than let it silently
    // fall back to a SQLite REAL (amount_cents is defined as an INTEGER).
    return Number.isSafeInteger(cents) ? cents : null;
}

function humanize(slug) {
    return slug
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

module.exports = { formatCents, parseCentsInput, humanize };
