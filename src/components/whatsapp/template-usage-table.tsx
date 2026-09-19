"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadMoreButton } from "@/components/load-more-button";
import { TableEmptyState } from "@/components/table-empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { formatAnalyticsDate } from "@/lib/analytics-range";
import { formatDateTime } from "@/lib/format";
import type { Template } from "@/lib/api/types";

type TemplateListResponse = {
  items: Template[];
  additional_data?: { after?: string; next?: string };
};

type TemplateUsage = { sent: number; delivered: number; read: number; clicks: number };
type TemplateClickDetail = {
  button_content?: string;
  count?: number;
  type?: string;
  [key: string]: unknown;
};
type TemplateUsageResponse = {
  total_sent?: number;
  total_delivered?: number;
  total_read?: number;
  total_clicked?: number | TemplateClickDetail[];
  total_clicks?: number | TemplateClickDetail[];
  data_points?: {
    start: number;
    end: number;
    sent?: number;
    delivered?: number;
    read?: number;
    clicked?: number | TemplateClickDetail[];
    clicks?: number | TemplateClickDetail[];
  }[];
  data?: TemplateUsageResponse | TemplateUsageResponse[];
  items?: TemplateUsageResponse[];
};

function firstUsageResult(response: TemplateUsageResponse | TemplateUsageResponse[]) {
  if (Array.isArray(response)) return response[0];
  if (response.data) return firstUsageResult(response.data);
  if (response.items?.length) return response.items[0];
  return response;
}

function parseClicks(value: unknown): number {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => {
      if (typeof item === "number") return sum + item;
      if (typeof item === "object" && item !== null && "count" in item) {
        const countVal = (item as TemplateClickDetail).count;
        return sum + (typeof countVal === "number" ? countVal : 0);
      }
      return sum;
    }, 0);
  }
  return 0;
}

export function TemplateUsageTable({
  wabaId,
  start,
  end,
  granularity,
  initialTemplates,
  initialAfterCursor,
  initialHasMore,
}: {
  wabaId: string;
  start: number;
  end: number;
  granularity: string;
  initialTemplates: Template[];
  initialAfterCursor?: string;
  initialHasMore: boolean;
}) {
  const usageStart = formatAnalyticsDate(start);
  const usageEnd = formatAnalyticsDate(end);
  const [templates, setTemplates] = useState(initialTemplates);
  const [usage, setUsage] = useState<Map<string, TemplateUsage>>(new Map());
  const [afterCursor, setAfterCursor] = useState(initialAfterCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPoints, setDetailPoints] = useState<
    NonNullable<TemplateUsageResponse["data_points"]>
  >([]);
  const usageRequestsRef = useRef(new Set<string>());
  const activeUsageRequestsRef = useRef(0);

  async function loadUsage(template: Template) {
    const templateId = template.id;
    const requestKey = `${templateId}:${start}:${end}:${granularity}`;
    if (usageRequestsRef.current.has(requestKey)) return;
    usageRequestsRef.current.add(requestKey);
    activeUsageRequestsRef.current += 1;
    setUsageLoading(true);
    try {
      const response = await apiFetch<TemplateUsageResponse | TemplateUsageResponse[]>(
        "/v1/wa/templates/usage",
        {
          query: {
            waba_id: wabaId,
            start: usageStart,
            end: usageEnd,
            granularity,
            template_ids: templateId,
          },
        },
      );
      const result = firstUsageResult(response);
      setError(null);
      setUsage((current) =>
        new Map(current).set(templateId, {
          sent: result?.total_sent ?? 0,
          delivered: result?.total_delivered ?? 0,
          read: result?.total_read ?? 0,
          clicks: parseClicks(result?.total_clicked ?? result?.total_clicks),
        }),
      );
    } catch (usageError) {
      usageRequestsRef.current.delete(requestKey);
      setError(toApiError(usageError).message);
    } finally {
      activeUsageRequestsRef.current -= 1;
      if (activeUsageRequestsRef.current === 0) setUsageLoading(false);
    }
  }

  async function viewUsage(template: Template) {
    setSelectedTemplate(template);
    setDetailPoints([]);
    setDetailLoading(true);
    try {
      const response = await apiFetch<TemplateUsageResponse | TemplateUsageResponse[]>(
        "/v1/wa/templates/usage",
        {
          query: {
            waba_id: wabaId,
            start: usageStart,
            end: usageEnd,
            granularity,
            template_ids: template.id,
          },
        },
      );
      const result = firstUsageResult(response);
      setDetailPoints(result?.data_points ?? []);
    } catch (usageError) {
      setError(toApiError(usageError).message);
    } finally {
      setDetailLoading(false);
    }
  }

  const loadInitialUsage = useEffectEvent(async (templatesToLoad: Template[]) => {
    for (const template of templatesToLoad) {
      await loadUsage(template);
    }
  });

  useEffect(() => {
    queueMicrotask(() => void loadInitialUsage(initialTemplates));
  }, [initialTemplates, start, end, granularity]);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<TemplateListResponse>("/v1/wa/templates", {
        query: {
          waba_id: wabaId,
          limit: "10",
          after: afterCursor,
        },
      });
      const nextTemplates = response.items ?? [];
      setError(null);
      setTemplates((current) => [...current, ...nextTemplates]);
      for (const template of nextTemplates) {
        await loadUsage(template);
      }
      setAfterCursor(
        response.additional_data?.next ? response.additional_data.after : undefined,
      );
      setHasMore(Boolean(response.additional_data?.next));
    } catch (loadMoreError) {
      setError(toApiError(loadMoreError).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-md py-0">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1">
                    Sent {usageLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  </span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1">
                    Delivered{" "}
                    {usageLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  </span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1">
                    Read {usageLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  </span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1">
                    Clicks{" "}
                    {usageLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  </span>
                </TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name || template.id}</TableCell>
                  <TableCell>{template.category || "-"}</TableCell>
                  <TableCell>{template.status || "-"}</TableCell>
                  <TableCell className="text-right">
                    {usage.get(template.id)?.sent.toLocaleString("en-US") ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {usage.get(template.id)?.delivered.toLocaleString("en-US") ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {usage.get(template.id)?.read.toLocaleString("en-US") ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {usage.get(template.id)?.clicks.toLocaleString("en-US") ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void viewUsage(template)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {hasMore ? (
        <LoadMoreButton loading={loading} onClick={loadMore} withTopMargin={false} />
      ) : null}
      <Dialog
        open={selectedTemplate !== null}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
      >
        <DialogContent className="max-h-[90vh]" style={{ width: "60vw", maxWidth: "60vw" }}>
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate?.name || selectedTemplate?.id || "Template"}
            </DialogTitle>
            <DialogDescription>Template usage breakdown</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin" aria-label="Loading usage" />
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period start</TableHead>
                    <TableHead>Period end</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Read</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailPoints.length === 0 ? (
                    <TableEmptyState colSpan={6}>No record found.</TableEmptyState>
                  ) : (
                    detailPoints.map((point) => {
                      const clickValue = point.clicked ?? point.clicks;
                      const clickArray = Array.isArray(clickValue) ? clickValue : null;
                      const totalClicks = parseClicks(clickValue);

                      return (
                        <TableRow key={`${point.start}-${point.end}`}>
                          <TableCell className="text-xs font-medium">
                            {formatDateTime(new Date(point.start * 1000))}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDateTime(new Date(point.end * 1000))}
                          </TableCell>
                          <TableCell className="text-right">
                            {(point.sent ?? 0).toLocaleString("en-US")}
                          </TableCell>
                          <TableCell className="text-right">
                            {(point.delivered ?? 0).toLocaleString("en-US")}
                          </TableCell>
                          <TableCell className="text-right">
                            {(point.read ?? 0).toLocaleString("en-US")}
                          </TableCell>
                          <TableCell className="text-right">
                            {clickArray && clickArray.length > 0 ? (
                              <div className="flex flex-col items-end gap-1">
                                {clickArray.map((detail, index) => {
                                  if (typeof detail === "object" && detail !== null) {
                                    const label =
                                      detail.button_content ||
                                      detail.type ||
                                      `Button ${index + 1}`;
                                    const count =
                                      typeof detail.count === "number" ? detail.count : 0;
                                    return (
                                      <span key={index} className="text-sm">
                                        {label}: {count.toLocaleString("en-US")}
                                      </span>
                                    );
                                  }
                                  return (
                                    <span key={index} className="text-sm">
                                      Item {index + 1}: {String(detail)}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-sm">
                                {totalClicks.toLocaleString("en-US")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}
