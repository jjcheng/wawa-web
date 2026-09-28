"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { useRouter } from "next/navigation";

import { LocalDateTime } from "@/components/local-date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BroadcastCancelButton } from "./broadcast-cancel-button";
import { BroadcastDeleteButton } from "./broadcast-delete-button";
import { BroadcastNameFilter } from "./broadcast-name-filter";
import { BroadcastStatusFilter } from "./broadcast-status-filter";
import { BroadcastViewButton } from "./broadcast-view-button";
import type { Broadcast } from "@/lib/api/types";

function displayStatus(status: string) {
  const labelMap: Record<string, string> = {
    rejected: "Rejected",
    accepted: "Accepted",
    sent: "Sent",
    delivered: "Delivered",
    read: "Read",
    failed: "Failed",
  };
  const normalized = status.trim();
  if (!normalized) return "—";
  return labelMap[normalized.toLowerCase()] ?? normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

export function BroadcastsList({ rows, status }: { rows: Broadcast[]; status: string }) {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((broadcast) => (broadcast.name ?? "").toLowerCase().includes(query));
  }, [rows, search]);

  function resetFilters() {
    setSearch("");
    if (status !== "ALL") router.push("/assets/broadcasts");
  }

  return (
    <div className="bg-card divide-border overflow-hidden divide-y rounded-lg border">
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="min-w-0 flex-1">
          <BroadcastNameFilter value={search} onChange={setSearch} />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1.5">
              <Filter className="size-3.5" />
              Filter
              {status !== "ALL" ? (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">1</Badge>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 space-y-2 p-3">
            <p className="text-muted-foreground text-xs font-medium">Status</p>
            <BroadcastStatusFilter value={status} popoverStyle />
          </PopoverContent>
        </Popover>
      </div>
      {filteredRows.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-muted-foreground text-base">
            {search || status !== "ALL" ? "No broadcasts found." : "No broadcasts found."}
          </p>
          {search || status !== "ALL" ? (
            <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
          ) : null}
        </div>
      ) : (
        filteredRows.map((broadcast) => {
          const recipientCount = broadcast.recipient_count ?? broadcast.customer_ids?.length ?? 0;
          return (
            <div
              key={broadcast.id}
              className="hover:bg-accent/60 flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 transition-colors sm:flex-nowrap"
            >
              <div className="min-w-0 flex-1 sm:w-1/3 sm:flex-none">
                <p className="break-words font-medium">{broadcast.name || "Unnamed broadcast"}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  <LocalDateTime value={broadcast.send_date} />
                </p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-sm">{recipientCount} recipients</span>
                  <Badge variant="secondary">{displayStatus(broadcast.status)}</Badge>
                </div>
                <BroadcastViewButton broadcast={broadcast} />
                {broadcast.status === "PENDING" ? (
                  <BroadcastCancelButton broadcastId={broadcast.id} />
                ) : broadcast.status === "CANCELLED" ? (
                  <BroadcastDeleteButton broadcastId={broadcast.id} />
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}