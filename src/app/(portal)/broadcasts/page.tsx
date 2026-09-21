import type { Metadata } from "next";
import Link from "next/link";

import { BroadcastStatusFilter } from "./broadcast-status-filter";
import { BroadcastNameFilter } from "./broadcast-name-filter";
import { BroadcastCancelButton } from "./broadcast-cancel-button";
import { BroadcastDeleteButton } from "./broadcast-delete-button";
import { BroadcastViewButton } from "./broadcast-view-button";
import { NewBroadcastButton } from "./new-broadcast-button";
import { PageHeader } from "@/components/page-header";
import { TableEmptyState } from "@/components/table-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Broadcast, BroadcastListResponse } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Broadcasts" };

const COLUMN_COUNT = 5;

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
  const mapped = labelMap[normalized.toLowerCase()];
  if (mapped) return mapped;
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

function BroadcastTable({
  rows,
  status,
  name,
}: {
  rows: Broadcast[];
  status: string;
  name: string;
}) {
  return (
    <Card className="rounded-md py-0">
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <BroadcastNameFilter value={name} />
              </TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Send date</TableHead>
              <TableHead>
                <BroadcastStatusFilter value={status} />
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmptyState
                colSpan={COLUMN_COUNT}
                action={
                  name || status !== "ALL" ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/broadcasts">Reset filters</Link>
                    </Button>
                  ) : undefined
                }
              >
                {name || status !== "ALL" ? "No broadcasts match this filter." : "No broadcasts yet."}
              </TableEmptyState>
            ) : (
              rows.map((broadcast) => (
                <TableRow key={broadcast.id}>
                  <TableCell className="font-medium">{broadcast.name}</TableCell>
                  <TableCell>
                    {broadcast.recipient_count ?? broadcast.customer_ids?.length ?? 0}
                  </TableCell>
                  <TableCell>{formatDateTime(broadcast.send_date)}</TableCell>
                  <TableCell>{displayStatus(broadcast.status)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <BroadcastViewButton broadcast={broadcast} />
                      {broadcast.status === "PENDING" ? (
                        <BroadcastCancelButton broadcastId={broadcast.id} />
                      ) : broadcast.status === "CANCELLED" ? (
                        <BroadcastDeleteButton broadcastId={broadcast.id} />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default async function BroadcastsPage({ searchParams }: PageProps<"/broadcasts">) {
  const params = await searchParams;
  const name = typeof params.name === "string" ? params.name : "";
  const requestedStatus = typeof params.status === "string" ? params.status : "ALL";
  const status = ["PENDING", "SENDING", "COMPLETED", "CANCELLED"].includes(requestedStatus)
    ? requestedStatus
    : "ALL";
  let broadcasts: Broadcast[] = [];
  try {
    const response = await serverFetch<BroadcastListResponse>("/v1/broadcasts", {
      query: {
        page: "1",
        page_size: "100",
        status: status === "ALL" ? undefined : status,
        name,
      },
    });
    broadcasts = response.items;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }
  return (
    <>
      <PageHeader
        title="Broadcasts"
        description={
          <>
            Broadcast template messages to your customers. Start new broadcast in{" "}
            <Link href="/customers" className="text-primary hover:underline">
              Customers
            </Link>{" "}
            page.
          </>
        }
        action={<NewBroadcastButton />}
      />

      <BroadcastTable rows={broadcasts} status={status} name={name} />
    </>
  );
}
