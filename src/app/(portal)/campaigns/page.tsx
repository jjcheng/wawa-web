import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockCampaigns } from "@/lib/mock/crm";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

export const metadata: Metadata = { title: "Campaigns" };

const COLUMNS = ["Name", "Audience", "Status", "Sent", "Open rate"];
// Mock split until ad-hoc/scheduled broadcasts are backed by the API.
const adHocCampaigns = mockCampaigns.filter((_, index) => index % 2 === 0);
const scheduledCampaigns = mockCampaigns.filter((_, index) => index % 2 === 1);

function CampaignTable({ rows }: { rows: Record<string, string>[] }) {
  return (
    <Card>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              {COLUMNS.map((column) => (
                <th key={column} className="px-2 py-2 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b last:border-0">
                {COLUMNS.map((column) => (
                  <td key={column} className="px-2 py-2">
                    {row[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function CampaignsPage() {
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Broadcast template messages to segments of your contacts."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className={MEDIUM_BUTTON_HEIGHT}>
              <Link href="/campaigns/new">New Campaign</Link>
            </Button>
          </div>
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
