import type { Metadata } from "next";
import Link from "next/link";

import { CampaignStatusFilter } from "./campaign-status-filter";
import { CampaignNameFilter } from "./campaign-name-filter";
import { CampaignCancelButton } from "./campaign-cancel-button";
import { CampaignDeleteButton } from "./campaign-delete-button";
import { CampaignViewButton } from "./campaign-view-button";
import { NewCampaignButton } from "./new-campaign-button";
import { PageHeader } from "@/components/page-header";
import { TableEmptyState } from "@/components/table-empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Campaign, CampaignListResponse } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Campaigns" };

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

function CampaignTable({
  rows,
  status,
  name,
}: {
  rows: Campaign[];
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
                <CampaignNameFilter value={name} />
              </TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Send date</TableHead>
              <TableHead>
                <CampaignStatusFilter value={status} />
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmptyState colSpan={COLUMN_COUNT}>No campaigns yet.</TableEmptyState>
            ) : (
              rows.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    {campaign.recipient_count ?? campaign.customer_ids?.length ?? 0}
                  </TableCell>
                  <TableCell>{formatDateTime(campaign.send_date)}</TableCell>
                  <TableCell>{displayStatus(campaign.status)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <CampaignViewButton campaign={campaign} />
                      {campaign.status === "PENDING" ? (
                        <CampaignCancelButton campaignId={campaign.id} />
                      ) : campaign.status === "CANCELLED" ? (
                        <CampaignDeleteButton campaignId={campaign.id} />
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

export default async function CampaignsPage({ searchParams }: PageProps<"/campaigns">) {
  const params = await searchParams;
  const name = typeof params.name === "string" ? params.name : "";
  const requestedStatus = typeof params.status === "string" ? params.status : "ALL";
  const status = ["PENDING", "SENDING", "COMPLETED", "CANCELLED"].includes(requestedStatus)
    ? requestedStatus
    : "ALL";
  let campaigns: Campaign[] = [];
  try {
    const response = await serverFetch<CampaignListResponse>("/v1/campaigns", {
      query: {
        page: "1",
        page_size: "100",
        status: status === "ALL" ? undefined : status,
        name,
      },
    });
    campaigns = response.items;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }
  return (
    <>
      <PageHeader
        title="Campaigns"
        description={
          <>
            Broadcast template messages to your customers. Start new campaign in{" "}
            <Link href="/customers" className="text-primary hover:underline">
              Customers
            </Link>{" "}
            page.
          </>
        }
        action={<NewCampaignButton />}
      />

      <CampaignTable rows={campaigns} status={status} name={name} />
    </>
  );
}
