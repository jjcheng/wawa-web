import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { BusinessAccount, TemplateListResponse } from "@/lib/api/types";
import { NewCampaignContent } from "./new-campaign-content";

export const metadata: Metadata = { title: "New campaign" };

export default async function NewCampaignPage({
  searchParams,
}: PageProps<"/customers/new-campaign">) {
  const params = await searchParams;
  const campaignId = typeof params.id === "string" ? params.id : undefined;
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
        title={campaignId ? "Edit campaign" : "New campaign"}
        description="Campaigns are a preview and are not yet backed by the API."
      />

      <Card>
        <CardContent>
          <NewCampaignContent campaignId={campaignId} templates={templates} />
        </CardContent>
      </Card>
    </>
  );
}
