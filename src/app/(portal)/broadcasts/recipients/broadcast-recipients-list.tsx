"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { useRouter } from "next/navigation";

import { LocalDateTime } from "@/components/local-date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BroadcastNameFilter } from "../broadcast-name-filter";
import { BroadcastStatusFilter } from "../broadcast-status-filter";
import type { BroadcastRecipient } from "@/lib/api/types";

function displayRecipientStatus(status: unknown) {
  const raw = String(status || "").trim();
  if (!raw) return "Unprocessed";
  const labelMap: Record<string, string> = {
    rejected: "Rejected",
    accepted: "Accepted",
    sent: "Sent",
    delivered: "Delivered",
    read: "Read",
    failed: "Failed",
    unprocessed: "Unprocessed",
    unknown: "Unprocessed",
  };
  return labelMap[raw.toLowerCase()] ?? raw.charAt(0) + raw.slice(1).toLowerCase();
}

export function BroadcastRecipientsList({
  recipients,
  broadcastId,
  status,
  statusOptions,
}: {
  recipients: BroadcastRecipient[];
  broadcastId: string;
  status: string;
  statusOptions: string[];
}) {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const filteredRecipients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return recipients;
    return recipients.filter((recipient) => (recipient.customer_name ?? "").toLowerCase().includes(query));
  }, [recipients, search]);

  function resetFilters() {
    setSearch("");
    if (status !== "ALL") router.push(`/broadcasts/recipients?broadcast_id=${encodeURIComponent(broadcastId)}`);
  }

  return (
    <div className="bg-card divide-border overflow-hidden divide-y rounded-lg border">
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="min-w-0 flex-1">
          <BroadcastNameFilter
            value={search}
            onChange={setSearch}
            placeholder="Search customers"
            clearLabel="Clear customer search"
          />
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
            <BroadcastStatusFilter value={status} options={statusOptions} popoverStyle />
          </PopoverContent>
        </Popover>
      </div>
      {filteredRecipients.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-muted-foreground text-sm">
            {search || status !== "ALL" ? "No recipients match these filters." : "No recipients found."}
          </p>
          {search || status !== "ALL" ? (
            <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
          ) : null}
        </div>
      ) : (
        filteredRecipients.map((recipient) => {
          const messageStatus = recipient.message?.status ?? recipient.status;
          const messageAttempts = recipient.message?.attempts ?? recipient.attempts;
          const messageError = recipient.message?.error_message ?? recipient.last_error;
          const nextAttemptAt = recipient.message?.next_attempt_at ?? recipient.next_attempt_at;

          return (
            <div
              key={recipient.id}
              className="hover:bg-accent/60 flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 transition-colors sm:flex-nowrap"
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="truncate font-medium">{recipient.customer_name || "Unnamed recipient"}</p>
                  <Badge variant="secondary" className="shrink-0 sm:hidden">
                    {displayRecipientStatus(messageStatus)}
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span>Attempts: {messageAttempts ?? 0}</span>
                  <span className="inline-flex items-center gap-1">
                    <span>Next attempt:</span>
                    {typeof nextAttemptAt === "string" ? (
                      <LocalDateTime value={nextAttemptAt} />
                    ) : nextAttemptAt?.Valid ? (
                      <LocalDateTime value={nextAttemptAt.Time} />
                    ) : "—"}
                  </span>
                </div>
                {messageError ? (
                  <p className="text-destructive mt-1 break-words text-sm">
                    <span className="font-medium">Last error:</span> {messageError}
                  </p>
                ) : null}
              </div>
              <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                {displayRecipientStatus(messageStatus)}
              </Badge>
            </div>
          );
        })
      )}
    </div>
  );
}