"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_STATUS_OPTIONS = ["ALL", "PENDING", "SENDING", "COMPLETED", "CANCELLED"];

function displayStatus(status: string) {
  const labelMap: Record<string, string> = {
    rejected: "Rejected",
    accepted: "Accepted",
    sent: "Sent",
    delivered: "Delivered",
    read: "Read",
    failed: "Failed",
    unprocessed: "Unprocessed",
  };

  const normalized = status.trim();
  if (!normalized) return "—";
  const mapped = labelMap[normalized.toLowerCase()];
  if (mapped) return mapped;
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

export function BroadcastStatusFilter({
  value,
  options = DEFAULT_STATUS_OPTIONS,
}: {
  value: string;
  options?: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeValue = options.includes(value) ? value : "ALL";

  function setStatus(nextStatus: string) {
    const params = new URLSearchParams(searchParams);
    if (nextStatus === "ALL") params.delete("status");
    else params.set("status", nextStatus);
    router.push(`${pathname}?${params.toString()}`);
  }

  function optionLabel(option: string) {
    if (option === "ALL") return "Status";
    return displayStatus(option);
  }

  return (
    <Select value={safeValue} onValueChange={setStatus}>
      <SelectTrigger
        className="h-7 border-none px-0 pl-1 font-medium shadow-none"
        aria-label="Filter broadcasts by status"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {optionLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
