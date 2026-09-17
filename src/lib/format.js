function formatCents(cents) {
    return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCentsInput(value) {
    const parsed = Math.round(parseFloat(value) * 100);
    return Number.isFinite(parsed) ? parsed : 0;
}

function humanize(slug) {
    return slug
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

module.exports = { formatCents, parseCentsInput, humanize };
