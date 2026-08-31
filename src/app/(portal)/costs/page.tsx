import type { Metadata } from "next";

import { AnalyticsShell } from "@/components/whatsapp/analytics-shell";
import { AnalyticsViewTabs } from "@/components/whatsapp/analytics-view-tabs";
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
  flattenCostPoints,
  flattenTemplatePoints,
  formatCost,
  formatCount,
  loadAnalytics,
} from "@/lib/analytics";
import { resolveAnalyticsContext } from "@/lib/analytics-context";
import { resolveAnalyticsView } from "@/lib/analytics-view";
import {
  formatAnalyticsDate,
  templateAnalyticsStart,
  toCostGranularity,
} from "@/lib/analytics-range";
import type {
  ConversationAnalytics,
  ConversationAnalyticsDataPoint,
  PricingAnalytics,
  TemplateAnalytics,
  TemplateListResponse,
} from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Costs" };

function costLabel(point: ConversationAnalyticsDataPoint) {
  return (
    [point.conversation_category, point.conversation_type, point.conversation_direction]
      .filter(Boolean)
      .join(" · ") || "—"
  );
}

  export default async function CostsPage({ searchParams }: PageProps<"/costs">) {
  const params = await searchParams;
  const context = await resolveAnalyticsContext(params);
  const view = resolveAnalyticsView(typeof params.view === "string" ? params.view : undefined);

  const [costs, phoneCosts] = context.selected
    ? await Promise.all([
        loadAnalytics<ConversationAnalytics>("/v1/wa/business-accounts/costs", {
          ...context.query,
          granularity: toCostGranularity(context.granularity),
        }),
        loadAnalytics<PricingAnalytics>("/v1/wa/phone-numbers/costs", {
          ...context.query,
          granularity: toCostGranularity(context.granularity),
        }),
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
    ? await loadAnalytics<TemplateAnalytics[]>("/v1/wa/templates/costs", {
        meta_waba_id: context.selected,
        start: formatAnalyticsDate(templateAnalyticsStart(context.start, context.end)),
        end: formatAnalyticsDate(context.end),
        template_ids: templateIds,
      })
    : { data: null, error: null };

  const points = flattenCostPoints(costs.data);
  const currency = points.find((point) => point.currency)?.currency;
  const totalCost = points.reduce((sum, point) => sum + (point.cost ?? 0), 0);
  const totalConversations = points.reduce(
    (sum, point) => sum + (point.conversation_count ?? point.conversation ?? 0),
    0,
  );

  const summary = [
    { label: "Billable conversations", value: formatCount(totalConversations) },
    { label: "Total cost", value: formatCost(totalCost, currency) },
    { label: "Currency", value: currency || "—" },
  ];
  const phoneRows = [...(phoneCosts.data?.data ?? []).flatMap((entry) => entry.data_points ?? []).reduce((rows, point) => {
    const key = point.phone_number || "—";
    const row = rows.get(key) ?? { phoneNumber: key, cost: 0 };
    row.cost += point.cost ?? 0;
    rows.set(key, row);
    return rows;
  }, new Map<string, { phoneNumber: string; cost: number }>()).values()];
  const templateNames = new Map(
    (templateList.data?.items ?? []).map((template) => [template.id, template.name || template.id]),
  );
  const templateRows = [...flattenTemplatePoints(templateAnalytics.data).reduce((rows, point) => {
    const row = rows.get(point.template_id) ?? {
      id: point.template_id,
      name: templateNames.get(point.template_id) || point.template_id,
      costPerDelivered: 0,
      costPerUrlButtonClick: 0,
      total: 0,
    };
    for (const cost of point.cost ?? []) {
      if (cost.type === "cost_per_delivered") row.costPerDelivered += cost.value;
      if (cost.type === "cost_per_url_button_click") {
        row.costPerUrlButtonClick += cost.value;
      }
      if (cost.type === "amount_spent") row.total += cost.value;
    }
    rows.set(row.id, row);
    return rows;
  }, new Map<string, {
    id: string;
    name: string;
    costPerDelivered: number;
    costPerUrlButtonClick: number;
    total: number;
  }>()).values()];

  return (
    <AnalyticsShell
      title="Costs"
      description="Billable conversations and charges reported by Meta."
      wabas={context.wabas}
      wabaError={context.wabaError}
      selected={context.selected}
      rangeDays={context.rangeDays}
    >
      <AnalyticsViewTabs value={view} />

      {view === "template" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Costs by template</CardTitle>
            <CardDescription>Cost totals for each message template.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {templateList.error || templateAnalytics.error ? (
              <p className="text-destructive text-sm">
                {templateList.error || templateAnalytics.error}
              </p>
            ) : templateRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Meta reported no template costs in the selected period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead className="text-right">Cost per Delivered</TableHead>
                    <TableHead className="text-right">Cost per URL Button Click</TableHead>
                    <TableHead className="text-right">Amount Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">
                        {formatCost(row.costPerDelivered, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCost(row.costPerUrlButtonClick, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCost(row.total, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {view === "overall" ? <div className="grid gap-4 sm:grid-cols-3">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div> : null}

      {view === "overall" ? <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Conversation charges</CardTitle>
          <CardDescription>
            {formatDateTime(new Date(context.start * 1000))} –{" "}
            {formatDateTime(new Date(context.end * 1000))}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {costs.error ? (
            <p className="text-destructive text-sm">{costs.error}</p>
          ) : points.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Meta reported no billable conversations in the selected period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period start</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Conversations</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {points.map((point, index) => (
                  <TableRow key={`${point.start}-${point.end}-${index}`}>
                    <TableCell className="text-xs">
                      {formatDateTime(new Date(point.start * 1000))}
                    </TableCell>
                    <TableCell className="text-xs">{costLabel(point)}</TableCell>
                    <TableCell>{point.country || "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatCount(point.conversation_count ?? point.conversation ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCost(point.cost ?? 0, point.currency || currency)}
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
          <CardTitle className="text-base">Costs by phone number</CardTitle>
          <CardDescription>Totals for each number in this business account.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {phoneCosts.error ? (
            <p className="text-destructive text-sm">{phoneCosts.error}</p>
          ) : phoneRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Meta reported no phone-number costs in the selected period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone number</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phoneRows.map((row) => (
                  <TableRow key={row.phoneNumber}>
                    <TableCell className="font-medium">{row.phoneNumber}</TableCell>
                    <TableCell className="text-right">{formatCost(row.cost, currency)}</TableCell>
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
