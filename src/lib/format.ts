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

function toDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : "—";
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "—";
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
