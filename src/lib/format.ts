const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function toDate(value: string | number | Date) {
  // Numeric timestamps from the API are epoch seconds (WhatsApp-style), not milliseconds.
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value?: string | number | Date | null) {
  if (!value) return "—";
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : "—";
}

export function formatDate(value?: string | number | Date | null) {
  if (!value) return "—";
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "—";
}

export function formatRelativeTime(
  value?: string | number | Date | null,
  now: string | Date | number = Date.now(),
) {
  if (!value) return "—";
  const date = toDate(value);
  const nowDate = typeof now === "number" ? new Date(now) : toDate(now);
  if (!date || !nowDate) return "—";

  const seconds = Math.round((date.getTime() - nowDate.getTime()) / 1000);
  const absoluteSeconds = Math.abs(seconds);
  if (absoluteSeconds < 10) return "just now";
  if (absoluteSeconds < 60) return relativeTimeFormatter.format(seconds, "second");

  const minutes = Math.round(seconds / 60);
  if (absoluteSeconds < 60 * 60) return relativeTimeFormatter.format(minutes, "minute");

  const hours = Math.round(seconds / (60 * 60));
  if (absoluteSeconds < 24 * 60 * 60) return relativeTimeFormatter.format(hours, "hour");

  const days = Math.round(seconds / (24 * 60 * 60));
  if (absoluteSeconds < 7 * 24 * 60 * 60) return relativeTimeFormatter.format(days, "day");

  const weeks = Math.round(seconds / (7 * 24 * 60 * 60));
  if (absoluteSeconds < 30 * 24 * 60 * 60) return relativeTimeFormatter.format(weeks, "week");

  const months = Math.round(seconds / (30 * 24 * 60 * 60));
  if (absoluteSeconds < 365 * 24 * 60 * 60) return relativeTimeFormatter.format(months, "month");

  const years = Math.round(seconds / (365 * 24 * 60 * 60));
  return relativeTimeFormatter.format(years, "year");
}

/** Resolves a possibly-relative URL from the API against the current site origin. */
export function resolveSiteUrl(url: string) {
  return /^https:\/\//i.test(url) ? url : new URL(url, window.location.origin).toString();
}

export function formatPhoneNumber(value?: string | null, countryCode?: string | null) {
  if (!value) return "—";
  if (value.startsWith("+")) return value;
  const normalizedCountryCode = countryCode?.replace(/^\+/, "").trim();
  return normalizedCountryCode ? `+${normalizedCountryCode} ${value}` : `+${value}`;
}
