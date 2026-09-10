import type { Metadata } from "next";

import { CampaignNameFilter } from "../campaign-name-filter";
import { CampaignStatusFilter } from "../campaign-status-filter";
import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { TableEmptyState } from "@/components/table-empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { CampaignRecipient, CampaignRecipientListResponse } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Campaign recipients" };

export default async function CampaignRecipientsPage({
  searchParams,
}: PageProps<"/campaigns/recipients">) {
  const params = await searchParams;
  const campaignId = typeof params.campaign_id === "string" ? params.campaign_id : "";
  const name = typeof params.name === "string" ? params.name : "";
  const status = typeof params.status === "string" ? params.status : "ALL";
  let recipients: CampaignRecipient[] = [];

  try {
    if (campaignId) {
      const response = await serverFetch<CampaignRecipientListResponse>("/v1/campaigns/recipients", {
        query: {
          campaign_id: campaignId,
          page: "1",
          page_size: "100",
          name,
          status: status === "ALL" ? undefined : status,
        },
      });
      recipients = response.items;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }

  return (
    <>
      <BackBar href="/campaigns" />
      <PageHeader title="Campaign recipients" description="Customers included in this campaign." />
      <Card className="rounded-md py-0">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><CampaignNameFilter value={name} /></TableHead>
                <TableHead>Phone</TableHead>
                <TableHead><CampaignStatusFilter value={status} /></TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Next Attempt</TableHead>
                <TableHead>Last Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.length === 0 ? (
                <TableEmptyState colSpan={6}>No recipients found.</TableEmptyState>
              ) : (
                recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">{recipient.customer_name || "—"}</TableCell>
                    <TableCell>{recipient.customer_wa_id || "—"}</TableCell>
                    <TableCell>{recipient.status || "—"}</TableCell>
                    <TableCell>{recipient.attempts}</TableCell>
                    <TableCell>
                      {typeof recipient.next_attempt_at === "string"
                        ? formatDateTime(recipient.next_attempt_at)
                        : recipient.next_attempt_at?.Valid
                          ? formatDateTime(recipient.next_attempt_at.Time)
                          : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-pre-wrap break-words">
                      {recipient.last_error || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
