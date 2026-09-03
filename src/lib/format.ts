const TIME_ZONE = "Asia/Singapore";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
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

export function formatPhoneNumber(value?: string | null, countryCode?: string | null) {
  if (!value) return "—";
  if (value.startsWith("+")) return value;
  const normalizedCountryCode = countryCode?.replace(/^\+/, "").trim();
  return normalizedCountryCode ? `+${normalizedCountryCode} ${value}` : `+${value}`;
}
