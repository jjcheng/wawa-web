import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { NotificationListResponse } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { TodosView } from "../todos/todos-view";

export const metadata: Metadata = { title: "Tasks" };

const CATEGORIES = ["PENDING", "HANDS-OFF"] as const;
const PAGE_SIZE = "25";

export default async function TasksPage({
  searchParams,
}: PageProps<"/tasks">) {
  await requireUser();
  const params = await searchParams;
  const requestedCategory = typeof params.category === "string" ? params.category : "PENDING";
  const category = CATEGORIES.includes(requestedCategory as (typeof CATEGORIES)[number])
    ? requestedCategory as (typeof CATEGORIES)[number]
    : "PENDING";

  let notifications: NotificationListResponse = { items: [], number_of_pages: 1 };
  let loadError: string | null = null;
  try {
    notifications = await serverFetch<NotificationListResponse>("/v1/account/notifications", {
      query: {
        category,
        page: "1",
        page_size: PAGE_SIZE,
      },
    });
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Could not load tasks.";
  }

  return (
    <>
      <PageHeader title="Tasks" description="Tasks that need your attention." />
      {loadError ? (
        <p className="text-destructive text-sm">{loadError}</p>
      ) : (
        <TodosView
          key={category}
          category={category}
          pageSize={PAGE_SIZE}
          initialNotifications={notifications.items ?? []}
          initialNumberOfPages={notifications.number_of_pages ?? 1}
        />
      )}
    </>
  );
}