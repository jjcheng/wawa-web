"use client";

import { useEffect, useState } from "react";

import { formatRelativeTime } from "@/lib/format";

export function RelativeTime({ value }: { value: string | number | Date }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(formatRelativeTime(value));
  }, [value]);

  return label;
}