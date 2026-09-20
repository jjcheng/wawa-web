import type { Metadata } from "next";
import Link from "next/link";

import { BroadcastNameFilter } from "../broadcast-name-filter";
import { BroadcastStatusFilter } from "../broadcast-status-filter";
import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { TableEmptyState } from "@/components/table-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type {
  Broadcast,
  BroadcastRecipient,
  BroadcastRecipientListResponse,
  BroadcastStatisticsResponse,
} from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Broadcast recipients" };

export default async function BroadcastRecipientsPage({
  searchParams,
}: PageProps<"/broadcasts/recipients">) {
  const params = await searchParams;
  const broadcastId = typeof params.broadcast_id === "string" ? params.broadcast_id : "";
  const name = typeof params.name === "string" ? params.name : "";
  const recipientStatusOptions = [
    "ALL",
    "REJECTED",
    "ACCEPTED",
    "SENT",
    "DELIVERED",
    "READ",
    "FAILED",
    "UNPROCESSED",
  ];
  const requestedStatus = typeof params.status === "string" ? params.status : "ALL";
  const status = recipientStatusOptions.includes(requestedStatus) ? requestedStatus : "ALL";
  let recipients: BroadcastRecipient[] = [];
  let recipientStats: Record<string, number> = {};
  let broadcastName = "Broadcast recipients";

  if (broadcastId) {
    try {
      const broadcast = await serverFetch<Broadcast>(`/v1/broadcasts/${broadcastId}`);
      broadcastName = broadcast.name || broadcastName;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    }
  }

  try {
    if (broadcastId) {
      const response = await serverFetch<BroadcastRecipientListResponse>("/v1/broadcasts/recipients", {
        query: {
          broadcast_id: broadcastId,
          page: "1",
          page_size: "100",
          name,
          status: status === "ALL" ? undefined : status,
        },
      });
      recipients = response.items;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }

  if (broadcastId) {
    try {
      const statistics = await serverFetch<BroadcastStatisticsResponse>(
        `/v1/broadcasts/${broadcastId}/statistics`,
      );
      recipientStats = Object.fromEntries(
        Object.entries(statistics).map(([key, value]) => [key.toLowerCase(), Number(value) || 0]),
      );
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    }
  }

  const statItems = Object.entries(recipientStats)
    .filter(([, value]) => value > 0)
    .sort(([left], [right]) => left.localeCompare(right));

  return (
    <>
      <BackBar href="/broadcasts" />
      <PageHeader title={`Broadcast: ${broadcastName}`} description="Customers included in this broadcast." />
      {statItems.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {statItems.map(([key, value]) => (
            <div
              key={key}
              className="border bg-muted/30 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
            >
              <span className="font-medium text-foreground">
                {(() => {
                  const labelMap: Record<string, string> = {
                    rejected: "Rejected",
                    accepted: "Accepted",
                    sent: "Sent",
                    delivered: "Delivered",
                    read: "Read",
                    failed: "Failed",
                    unprocessed: "Unprocessed",
                  };
                  return labelMap[key] ?? key;
                })()}
              </span>
              <span className="text-foreground text-xs">{value}</span>
            </div>
          ))}
        </div>
      ) : null}
      <Card className="rounded-md py-0">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><BroadcastNameFilter value={name} /></TableHead>
                <TableHead>
                  <BroadcastStatusFilter
                    value={status}
                    options={recipientStatusOptions}
                  />
                </TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Next Attempt</TableHead>
                <TableHead>Last Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.length === 0 ? (
                <TableEmptyState
                  colSpan={5}
                  action={
                    name || status !== "ALL" ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/broadcasts/recipients?broadcast_id=${broadcastId}`}>Reset filters</Link>
                      </Button>
                    ) : undefined
                  }
                >
                  {name || status !== "ALL" ? "No recipients match this filter." : "No recipients found."}
                </TableEmptyState>
              ) : (
                recipients.map((recipient) => {
                  const messageStatus = recipient.message?.status ?? recipient.status;
                  const messageAttempts = recipient.message?.attempts ?? recipient.attempts;
                  const messageError = recipient.message?.error_message ?? recipient.last_error;
                  const nextAttemptAt = recipient.message?.next_attempt_at ?? recipient.next_attempt_at;

                  return (
                    <TableRow key={recipient.id}>
                      <TableCell className="font-medium">{recipient.customer_name || "—"}</TableCell>
                      <TableCell>
                      {(() => {
                        const labelMap: Record<string, string> = {
                          rejected: "Rejected",
                          accepted: "Accepted",
                          sent: "Sent",
                          delivered: "Delivered",
                          read: "Read",
                          failed: "Failed",
                          unprocessed: "Unprocessed",
                        };
                        const raw = String(messageStatus || "").trim();
                        if (!raw) return "—";
                        const mapped = labelMap[raw.toLowerCase()];
                        return mapped ?? raw.charAt(0) + raw.slice(1).toLowerCase();
                      })()}
                    </TableCell>
                      <TableCell>{messageAttempts ?? 0}</TableCell>
                      <TableCell>
                        {typeof nextAttemptAt === "string"
                          ? formatDateTime(nextAttemptAt)
                          : nextAttemptAt?.Valid
                            ? formatDateTime(nextAttemptAt.Time)
                            : "—"}
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-pre-wrap break-words">
                        {messageError || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
