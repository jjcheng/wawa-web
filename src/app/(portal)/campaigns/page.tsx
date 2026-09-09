import type { Metadata } from "next";
import Link from "next/link";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Campaigns" };

const COLUMNS = ["Name", "Audience", "Status", "Sent", "Open rate"];

function CampaignTable({ rows }: { rows: Campaign[] }) {
  return (
    <Card className="rounded-md py-0">
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmptyState colSpan={COLUMNS.length}>No campaigns yet.</TableEmptyState>
            ) : (
              rows.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    <div>{campaign.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {campaign.send_date ? `Scheduled ${formatDateTime(campaign.send_date)}` : "Send now"}
                    </div>
                  </TableCell>
                  <TableCell>{campaign.customer_ids.length}</TableCell>
                  <TableCell>{campaign.status}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default async function CampaignsPage() {
  let campaigns: Campaign[] = [];
  try {
    const response = await serverFetch<CampaignListResponse>("/v1/campaigns", {
      query: { page: "1", page_size: "100" },
    });
    campaigns = response.items;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }
  const adHocCampaigns = campaigns.filter((campaign) => !campaign.send_date);
  const scheduledCampaigns = campaigns.filter((campaign) => Boolean(campaign.send_date));

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
      />

      <Tabs defaultValue="ad-hoc">
        <TabsList className="mb-4">
          <TabsTrigger className="cursor-pointer" value="ad-hoc">
            Ad-Hoc Campaigns
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="scheduled">
            Scheduled Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ad-hoc">
          <CampaignTable rows={adHocCampaigns} />
        </TabsContent>
        <TabsContent value="scheduled">
          <CampaignTable rows={scheduledCampaigns} />
        </TabsContent>
      </Tabs>
    </>
  );
}
