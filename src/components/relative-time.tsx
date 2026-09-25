"use client";

import { useEffect, useState } from "react";

import { formatRelativeTime } from "@/lib/format";

export function RelativeTime({ value }: { value: string | number | Date }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const update = () => setLabel(formatRelativeTime(value));
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [value]);

  return label;
}