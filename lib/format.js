/** Money is stored as integer cents everywhere to avoid float rounding drift. */
export function formatCurrency(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

/** Parses a dollars-and-cents form input ("1450.5") into integer cents, or null if blank/invalid. */
export function dollarsToCents(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Inverse of dollarsToCents, for populating a dollar-amount input's defaultValue. */
export function centsToDollarsInputValue(cents) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function formatDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(date));
}

export function formatTime(date) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(date));
}

/**
 * Parses a `datetime-local` input value ("YYYY-MM-DDTHH:mm") as a UTC wall-
 * clock instant rather than the server's local timezone — matching how
 * date-only fields are already stored (UTC midnight) and displayed
 * (`timeZone: "UTC"`). Without this, `new Date(value)` interprets the
 * string in the server's local timezone, which round-trips wrong whenever
 * the server isn't UTC.
 */
export function parseLocalDateTime(value) {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart || "00:00").split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

/** Inverse of parseLocalDateTime, for populating a `datetime-local` input's defaultValue. */
export function dateTimeInputValue(date) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
