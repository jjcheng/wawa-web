import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { TableEmptyState } from "@/components/table-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

export const metadata: Metadata = { title: "Campaigns" };

const COLUMNS = ["Name", "Audience", "Status", "Sent", "Open rate"];

function CampaignTable({ rows }: { rows: Record<string, string>[] }) {
  return (
    <Card>
      <CardContent className="overflow-x-auto">
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
              rows.map((row, index) => (
                <TableRow key={index}>
                  {COLUMNS.map((column) => (
                    <TableCell key={column}>{row[column]}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
              <Link href="/customers/new-campaign">New Campaign</Link>
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
          <CampaignTable rows={[]} />
        </TabsContent>
        <TabsContent value="scheduled">
          <CampaignTable rows={[]} />
        </TabsContent>
      </Tabs>
    </>
  );
}
