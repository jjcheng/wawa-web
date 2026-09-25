import type { Metadata } from "next";
import Link from "next/link";

import { LocalDateTime } from "@/components/local-date-time";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Broadcast, BroadcastListResponse } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "TO-DOs" };

export default async function TodosPage() {
  await requireUser();

  let pendingBroadcasts: Broadcast[] = [];
  let loadError: string | null = null;
  try {
    const response = await serverFetch<BroadcastListResponse>("/v1/broadcasts", {
      query: { page: "1", page_size: "100", status: "PENDING" },
    });
    pendingBroadcasts = response.items ?? [];
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Could not load your to-dos.";
  }

  return (
    <>
      <PageHeader title="TO-DOs" description="Tasks that need your attention." />
      {loadError ? (
        <p className="text-destructive text-sm">{loadError}</p>
      ) : pendingBroadcasts.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center text-center">
          <p className="text-muted-foreground text-sm">No pending tasks</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pendingBroadcasts.map((broadcast) => (
            <Card key={broadcast.id} size="sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2">
                <CardDescription>Pending broadcast</CardDescription>
                <Button asChild size="sm" variant="outline">
                  <Link href="/broadcasts">View</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-2">
                <div>
                  <p className="truncate text-2xl font-semibold">{broadcast.name}</p>
                  <p className="text-muted-foreground text-sm">
                    <LocalDateTime value={broadcast.send_date} />
                  </p>
                </div>
                <p className="text-muted-foreground text-sm">
                  {broadcast.recipient_count ?? broadcast.customer_ids?.length ?? 0} recipients
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
