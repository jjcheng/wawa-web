"use client";

import { useSyncExternalStore } from "react";

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

function subscribe() {
  return () => {};
}

function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

function toDate(value: string | number | Date) {
  const date = typeof value === "number" ? new Date(value) : typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function LocalDateTime({
  value,
  fallback = "—",
  className,
}: {
  value?: string | number | Date | null;
  fallback?: string;
  className?: string;
}) {
  const hydrated = useHydrated();
  if (!value) return fallback;

  const date = toDate(value);
  if (!date) return fallback;

  const formatter = new Intl.DateTimeFormat("en-US", {
    ...dateTimeOptions,
    timeZone: hydrated ? undefined : "UTC",
  });

  return (
    <time dateTime={date.toISOString()} className={className}>
      {formatter.format(date)}
    </time>
  );
}
