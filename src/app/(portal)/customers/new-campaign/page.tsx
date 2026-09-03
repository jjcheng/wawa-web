import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { BusinessAccount, Customer, TemplateListResponse } from "@/lib/api/types";
import { EditCampaignForm } from "../../campaigns/new/edit-campaign-form";

export const metadata: Metadata = { title: "New campaign" };

export default async function NewCampaignPage({
  searchParams,
}: PageProps<"/customers/new-campaign">) {
  const params = await searchParams;
  const campaignId = typeof params.id === "string" ? params.id : undefined;
  const customerIds =
    typeof params.customer_ids === "string"
      ? params.customer_ids.split(",").filter(Boolean)
      : [];
  let customers: Customer[] = [];
  let templates: TemplateListResponse["items"] = [];
  try {
    const [customerResponse, businessAccount] = await Promise.all([
      serverFetch<{ items: Customer[] }>("/v1/customers", {
        query: { page: "1", page_size: "100" },
      }),
      serverFetch<BusinessAccount>("/v1/wa/business-accounts"),
    ]);
    customers = customerResponse.items.filter((customer) =>
      customerIds.includes(String(customer.id)),
    );
    if (businessAccount?.meta_waba_id) {
      const templateResponse = await serverFetch<TemplateListResponse>("/v1/wa/templates", {
        query: { meta_waba_id: businessAccount.meta_waba_id, limit: "100" },
      });
      templates = templateResponse.items;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }

  return (
    <>
      <Button asChild variant="ghost" className="-mt-2 mb-2 -ml-2">
        <Link href="/customers">
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </Button>

      <PageHeader
        title={campaignId ? "Edit campaign" : "New campaign"}
        description="Campaigns are a preview and are not yet backed by the API."
      />

      <Card>
        <CardContent>
          <EditCampaignForm
            campaignId={campaignId}
            customers={customers}
            templates={templates}
          />
        </CardContent>
      </Card>
    </>
  );
}
