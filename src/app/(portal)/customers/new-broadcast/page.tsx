import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { BusinessAccount, TemplateListResponse } from "@/lib/api/types";
import { NewBroadcastContent } from "./new-broadcast-content";

export const metadata: Metadata = { title: "New broadcast" };

export default async function NewBroadcastPage({
  searchParams,
}: PageProps<"/customers/new-broadcast">) {
  const params = await searchParams;
  const broadcastId = typeof params.id === "string" ? params.id : undefined;
  let templates: TemplateListResponse["items"] = [];
  try {
    const businessAccount = await serverFetch<BusinessAccount>("/v1/wa/business-accounts");
    const wabaId = businessAccount?.waba_id;
    if (wabaId) {
      const templateResponse = await serverFetch<TemplateListResponse>("/v1/wa/templates", {
        query: { waba_id: wabaId, limit: "100", status: "APPROVED" },
      });
      templates = templateResponse.items;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }

  return (
    <>
      <BackBar href="/customers" />

      <PageHeader
        title={broadcastId ? "Edit broadcast" : "New broadcast"}
        description="Broadcasts are a preview and are not yet backed by the API."
      />

      <Card>
        <CardContent>
          <NewBroadcastContent broadcastId={broadcastId} templates={templates} />
        </CardContent>
      </Card>
    </>
  );
}
