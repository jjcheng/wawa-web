"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = ["ALL", "PENDING", "SENDING", "COMPLETED", "CANCELLED"];

function displayStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function CampaignStatusFilter({ value }: { value: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function setStatus(nextStatus: string) {
    const params = new URLSearchParams(searchParams);
    if (nextStatus === "ALL") params.delete("status");
    else params.set("status", nextStatus);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={value} onValueChange={setStatus}>
      <SelectTrigger
        className="h-7 border-none px-0 pl-1 font-medium shadow-none"
        aria-label="Filter campaigns by status"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {option === "ALL" ? "Status" : displayStatus(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
