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

export function PhoneNumberStatusFilter({ value }: { value: string }) {
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
        className="h-7 border-none px-0 pl-1 font-medium shadow-none"
        aria-label="Filter phone numbers by status"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((status) => (
          <SelectItem key={status} value={status}>
            {status === "ALL" ? "Status" : displayStatus(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
