import type { Metadata } from "next";

import { AnalyticsShell } from "@/components/whatsapp/analytics-shell";
import { AnalyticsViewTabs } from "@/components/whatsapp/analytics-view-tabs";
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
  flattenTemplatePoints,
  flattenMessagePoints,
  formatCount,
  loadAnalytics,
  totalMessages,
} from "@/lib/analytics";
import { resolveAnalyticsContext } from "@/lib/analytics-context";
import { formatAnalyticsDate, templateAnalyticsStart } from "@/lib/analytics-range";
import { resolveAnalyticsView } from "@/lib/analytics-view";
import type {
  MessageAnalytics,
  PhoneNumberMessageAnalytics,
  TemplateAnalytics,
  TemplateListResponse,
} from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Usage" };

export default async function UsagePage({ searchParams }: PageProps<"/usage">) {
  const params = await searchParams;
  const context = await resolveAnalyticsContext(params);
  const view = resolveAnalyticsView(typeof params.view === "string" ? params.view : undefined);

  const [account, numbers] = context.selected
    ? await Promise.all([
        loadAnalytics<MessageAnalytics>("/v1/wa/business-accounts/usage", context.query),
        loadAnalytics<PhoneNumberMessageAnalytics[]>(
          "/v1/wa/phone-numbers/usage",
          context.query,
        ),
      ])
    : [
        { data: null, error: null },
        { data: null, error: null },
      ];

  const templateList = view === "template" && context.selected
    ? await loadAnalytics<TemplateListResponse>("/v1/wa/templates", {
        meta_waba_id: context.selected,
        limit: "10",
      })
    : { data: null, error: null };
  const templateIds = templateList.data?.items.map((template) => template.id) ?? [];
  const templateAnalytics = view === "template" && templateIds.length > 0
    ? await loadAnalytics<TemplateAnalytics[]>("/v1/wa/templates/usage", {
        meta_waba_id: context.selected,
        start: formatAnalyticsDate(templateAnalyticsStart(context.start, context.end)),
        end: formatAnalyticsDate(context.end),
        template_ids: templateIds,
      })
    : { data: null, error: null };

  const accountPoints = flattenMessagePoints(account.data);
  const numberRows = (numbers.data ?? []).map((entry) => {
    const points = flattenMessagePoints(entry.analytics);
    return {
      id: entry.id,
      label: entry.verified_name || entry.display_phone_number || entry.id,
      phoneNumber: entry.display_phone_number || "—",
      sent: totalMessages(points, "sent"),
      delivered: totalMessages(points, "delivered"),
      received: totalMessages(points, "received"),
    };
  });

  const summary = [
    { label: "Messages sent", value: totalMessages(accountPoints, "sent") },
    { label: "Messages delivered", value: totalMessages(accountPoints, "delivered") },
    { label: "Messages received", value: totalMessages(accountPoints, "received") },
  ];
  const templateNames = new Map(
    (templateList.data?.items ?? []).map((template) => [template.id, template.name || template.id]),
  );
  const templateRows = [...flattenTemplatePoints(templateAnalytics.data).reduce((rows, point) => {
    const row = rows.get(point.template_id) ?? {
      id: point.template_id,
      name: templateNames.get(point.template_id) || point.template_id,
      sent: 0,
      delivered: 0,
      read: 0,
    };
    row.sent += point.sent ?? 0;
    row.delivered += point.delivered ?? 0;
    row.read += point.read ?? 0;
    rows.set(point.template_id, row);
    return rows;
  }, new Map<string, { id: string; name: string; sent: number; delivered: number; read: number }>()).values()];

  return (
    <AnalyticsShell
      title="Usage"
      description="Message volume reported by Meta for your WhatsApp Business Accounts."
      wabas={context.wabas}
      wabaError={context.wabaError}
      selected={context.selected}
      rangeDays={context.rangeDays}
    >
      <AnalyticsViewTabs value={view} />

      {view === "template" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage by template</CardTitle>
            <CardDescription>Message delivery totals for each template.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {templateList.error || templateAnalytics.error ? (
              <p className="text-destructive text-sm">
                {templateList.error || templateAnalytics.error}
              </p>
            ) : templateRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Meta reported no template usage in the selected period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Read</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{formatCount(row.sent)}</TableCell>
                      <TableCell className="text-right">{formatCount(row.delivered)}</TableCell>
                      <TableCell className="text-right">{formatCount(row.read)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {view === "overall" && account.error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{account.error}</AlertDescription>
        </Alert>
      ) : null}

      {view === "overall" ? <div className="grid gap-4 sm:grid-cols-3">
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
            {formatDateTime(new Date(context.start * 1000))} –{" "}
            {formatDateTime(new Date(context.end * 1000))}
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
                  <TableHead className="text-right">Received</TableHead>
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
                    <TableCell className="text-right">
                      {formatCount(point.received ?? 0)}
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
          {numbers.error ? (
            <p className="text-destructive text-sm">{numbers.error}</p>
          ) : numberRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Meta reported no per-number usage in the selected period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numberRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>{row.phoneNumber}</TableCell>
                    <TableCell className="text-right">{formatCount(row.sent)}</TableCell>
                    <TableCell className="text-right">{formatCount(row.delivered)}</TableCell>
                    <TableCell className="text-right">{formatCount(row.received)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card> : null}
    </AnalyticsShell>
  );
}
