import type { Metadata } from "next";

import { BroadcastsList } from "./broadcasts-list";
import { NewBroadcastButton } from "./new-broadcast-button";
import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Broadcast, BroadcastListResponse } from "@/lib/api/types";

export const metadata: Metadata = { title: "Broadcasts" };

export default async function BroadcastsPage({ searchParams }: PageProps<"/broadcasts">) {
  const params = await searchParams;
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
      },
    });
    broadcasts = response.items;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }
  return (
    <>
      <BackBar href="/assets" />
      <PageHeader
        title="Broadcasts"
        description="Upcoming or past broadcasts to your customers."
        action={<NewBroadcastButton />}
      />

      <BroadcastsList rows={broadcasts} status={status} />
    </>
  );
}
