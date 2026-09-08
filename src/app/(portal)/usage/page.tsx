import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AnalyticsShell } from "@/components/whatsapp/analytics-shell";
import { AnalyticsViewTabs } from "@/components/whatsapp/analytics-view-tabs";
import { PhoneNumberListTable } from "@/components/whatsapp/phone-number-list-table";
import { TemplateUsageTable } from "@/components/whatsapp/template-usage-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flattenMessagePoints,
  formatCount,
  loadAnalytics,
} from "@/lib/analytics";
import { resolveAnalyticsContext } from "@/lib/analytics-context";
import { resolveAnalyticsView } from "@/lib/analytics-view";
import type {
  MessageAnalytics,
  PhoneNumber,
  TemplateListResponse,
} from "@/lib/api/types";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Usage" };

type PhoneNumberListResponse = {
  items: PhoneNumber[];
  number_of_pages?: number;
  next_page_offset?: unknown;
};

export default async function UsagePage({ searchParams }: PageProps<"/usage">) {
  const params = await searchParams;
  const view = resolveAnalyticsView(typeof params.view === "string" ? params.view : undefined);
  if (view === "template" && params.range === "365") {
    const normalizedParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") normalizedParams.set(key, value);
    }
    normalizedParams.set("range", "30");
    normalizedParams.set("granularity", "DAY");
    redirect(`/usage?${normalizedParams.toString()}`);
  }
  const context = await resolveAnalyticsContext(params);

  const account = view === "overall" && context.selected
    ? await loadAnalytics<MessageAnalytics>("/v1/wa/business-accounts/usage", context.query)
    : { data: null, error: null };
  const phoneNumbers = view === "phone" && context.selected
    ? await loadAnalytics<PhoneNumberListResponse>("/v1/wa/user-phone-numbers", {
        page: "1",
        page_size: "10",
      })
    : { data: null, error: null };

  const templateList = view === "template" && context.selected
    ? await loadAnalytics<TemplateListResponse>("/v1/wa/templates", {
        meta_waba_id: context.selected,
        limit: "10",
      })
    : { data: null, error: null };

  const accountPoints = flattenMessagePoints(account.data);

  const summary = [
    { label: "Messages sent", value: account.data?.total_sent ?? 0 },
    { label: "Messages delivered", value: account.data?.total_delivered ?? 0 },
  ];
  return (
    <AnalyticsShell
      title="Usage"
      description="Message volume reported by Meta for your WhatsApp Business Accounts."
      wabaError={context.wabaError}
      selected={context.selected}
      rangeDays={context.rangeDays}
      granularity={context.granularity}
      maxRangeDays={view === "template" ? 90 : undefined}
    >
      <AnalyticsViewTabs value={view} />

      {view === "template" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage by template</CardTitle>
            <CardDescription>Message delivery totals for each template.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {templateList.error ? (
              <p className="text-destructive text-sm">
                {templateList.error}
              </p>
            ) : !templateList.data || templateList.data.items.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Meta reported no template usage in the selected period.
              </p>
            ) : (
              <TemplateUsageTable
                key={`${context.start}-${context.end}-${context.granularity}`}
                metaWabaId={context.selected}
                start={context.start}
                end={context.end}
                granularity={context.granularity}
                initialTemplates={templateList.data.items}
                initialAfterCursor={(templateList.data?.additional_data as { after?: string; next?: string } | undefined)?.next
                  ? (templateList.data?.additional_data as { after?: string }).after
                  : undefined}
                initialHasMore={
                  Boolean((templateList.data?.additional_data as { next?: string } | undefined)?.next)
                }
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {view === "overall" && account.error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{account.error}</AlertDescription>
        </Alert>
      ) : null}

      {view === "overall" ? <div className="grid gap-4 sm:grid-cols-2">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCount(item.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div> : null}

      {view === "overall" ? <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">By period</CardTitle>
          <CardDescription>
            {formatDate(new Date(context.start * 1000))} –{" "}
            {formatDate(new Date(context.end * 1000))}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {accountPoints.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Meta reported no message usage for this account in the selected period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period start</TableHead>
                  <TableHead>Period end</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountPoints.map((point) => (
                  <TableRow key={`${point.start}-${point.end}`}>
                    <TableCell className="text-xs">
                      {formatDateTime(new Date(point.start * 1000))}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDateTime(new Date(point.end * 1000))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCount(point.sent ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCount(point.delivered ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card> : null}

      {view === "phone" ? <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">By phone number</CardTitle>
          <CardDescription>Totals for each number in this business account.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {phoneNumbers.error ? (
            <p className="text-destructive text-sm">{phoneNumbers.error}</p>
          ) : !phoneNumbers.data || phoneNumbers.data.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No WhatsApp phone numbers are available.
            </p>
          ) : (
            <PhoneNumberListTable
              key={`${context.start}-${context.end}-${context.granularity}`}
              initialPhoneNumbers={phoneNumbers.data.items}
              start={context.start}
              end={context.end}
              granularity={context.granularity}
              initialHasMore={
                phoneNumbers.data.number_of_pages !== undefined
                  ? phoneNumbers.data.number_of_pages > 1
                  : phoneNumbers.data.next_page_offset !== undefined && phoneNumbers.data.next_page_offset !== null ||
                    phoneNumbers.data.items.length === 10
              }
            />
          )}
        </CardContent>
      </Card> : null}
    </AnalyticsShell>
  );
}
