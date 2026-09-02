import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EditCampaignForm } from "./edit-campaign-form";

export const metadata: Metadata = { title: "New campaign" };

export default async function NewCampaignPage({ searchParams }: PageProps<"/campaigns/new">) {
  const params = await searchParams;
  const campaignId = typeof params.id === "string" ? params.id : undefined;

  return (
    <>
      <Button asChild variant="ghost" className="-mt-2 -ml-2 mb-2">
        <Link href="/campaigns">
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
          <EditCampaignForm campaignId={campaignId} />
        </CardContent>
      </Card>
    </>
  );
}
