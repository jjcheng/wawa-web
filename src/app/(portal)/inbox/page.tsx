import type { Metadata } from "next";

import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { NotificationListResponse } from "@/lib/api/types";
import { InboxShell } from "./inbox-shell";

export const metadata: Metadata = { title: "Inbox" };
const PAGE_SIZES = ["10", "25", "50", "100"];
const TYPES = ["SUCCESS", "INFO", "WARNING", "ERROR"];

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const params = await searchParams;
  const requestedPageSize = typeof params.page_size === "string" ? params.page_size : "25";
  const pageSize = PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : "25";
  const requestedType = typeof params.type === "string" ? params.type : "";
  const type = TYPES.includes(requestedType) ? requestedType : "";
  const requestedRead = typeof params.read === "string" ? params.read : "";
  const read = requestedRead === "true" || requestedRead === "false" ? requestedRead : "";

  const notifications = await serverFetch<NotificationListResponse>("/v1/account/notifications", {
    query: { page: "1", page_size: pageSize, type, read },
  }).catch((error) => {
    if (error instanceof ApiError) return { items: [], number_of_pages: 0 };
    throw error;
  });

  return (
    <InboxShell
      initialRows={notifications.items}
      initialNumberOfPages={notifications.number_of_pages ?? 1}
      pageSize={pageSize}
      type={type}
      read={read}
    />
  );
}
