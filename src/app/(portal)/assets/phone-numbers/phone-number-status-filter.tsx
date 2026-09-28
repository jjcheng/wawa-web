"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = ["ALL", "CONNECTED", "DISCONNECTED"];

function displayStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function PhoneNumberStatusFilter({
  value,
  popoverStyle = false,
}: {
  value: string;
  popoverStyle?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function setStatus(status: string) {
    const params = new URLSearchParams(searchParams);
    if (status === "ALL") params.delete("status");
    else params.set("status", status);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={value} onValueChange={setStatus}>
      <SelectTrigger
        className={popoverStyle
          ? "h-8 w-full"
          : "h-8 w-36 shrink-0 justify-between border-none px-2 font-medium shadow-none"}
        aria-label="Filter phone numbers by status"
      >
        <SelectValue placeholder={popoverStyle ? "All statuses" : undefined} />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((status) => (
          <SelectItem key={status} value={status}>
            {status === "ALL"
              ? popoverStyle
                ? "All statuses"
                : "Status"
              : displayStatus(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
