import type { Metadata } from "next";

import { BroadcastRecipientsList } from "./broadcast-recipients-list";
import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type {
  Broadcast,
  BroadcastRecipient,
  BroadcastRecipientListResponse,
  BroadcastStatisticsResponse,
} from "@/lib/api/types";

export const metadata: Metadata = { title: "Broadcast recipients" };

export default async function BroadcastRecipientsPage({
  searchParams,
}: PageProps<"/assets/broadcasts/recipients">) {
  const params = await searchParams;
  const broadcastId = typeof params.broadcast_id === "string" ? params.broadcast_id : "";
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
      <BackBar href="/assets/broadcasts" />
      <PageHeader title={`Broadcast: ${broadcastName}`} description="Recipients and their status in this broadcast." />
      {statItems.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {statItems.map(([key, value]) => (
            <div
              key={key}
              className="border bg-muted/30 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
            >
              <span className="font-medium text-xs text-foreground">
                {(() => {
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
                  return labelMap[key] ?? key;
                })()}
              </span>
              <span className="text-foreground text-xs">{value}</span>
            </div>
          ))}
        </div>
      ) : null}
      <BroadcastRecipientsList
        recipients={recipients}
        broadcastId={broadcastId}
        status={status}
        statusOptions={recipientStatusOptions}
      />
    </>
  );
}
