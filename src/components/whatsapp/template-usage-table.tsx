"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
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
type TemplateUsageResponse = {
  total_sent?: number;
  total_delivered?: number;
  total_read?: number;
  total_clicked?: number;
  total_clicks?: number;
  data_points?: {
    start: number;
    end: number;
    sent?: number;
    delivered?: number;
    read?: number;
    clicked?: number;
    clicks?: number;
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

export function TemplateUsageTable({
  metaWabaId,
  start,
  end,
  granularity,
  initialTemplates,
  initialAfterCursor,
  initialHasMore,
}: {
  metaWabaId: string;
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
  const [detailPoints, setDetailPoints] = useState<NonNullable<TemplateUsageResponse["data_points"]>>([]);
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
      const response = await apiFetch<TemplateUsageResponse | TemplateUsageResponse[]>("/v1/wa/templates/usage", {
        query: {
          meta_waba_id: metaWabaId,
          start: usageStart,
          end: usageEnd,
          granularity,
          template_ids: templateId,
        },
      });
      const result = firstUsageResult(response);
      setError(null);
      setUsage((current) => new Map(current).set(templateId, {
        sent: result?.total_sent ?? 0,
        delivered: result?.total_delivered ?? 0,
        read: result?.total_read ?? 0,
        clicks: result?.total_clicked ?? result?.total_clicks ?? 0,
      }));
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
      const response = await apiFetch<TemplateUsageResponse | TemplateUsageResponse[]>("/v1/wa/templates/usage", {
        query: {
          meta_waba_id: metaWabaId,
          start: usageStart,
          end: usageEnd,
          granularity,
          template_ids: template.id,
        },
      });
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
          meta_waba_id: metaWabaId,
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
      setAfterCursor(response.additional_data?.next ? response.additional_data.after : undefined);
      setHasMore(Boolean(response.additional_data?.next));
    } catch (loadMoreError) {
      setError(toApiError(loadMoreError).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1">Sent {usageLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}</span>
            </TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1">Delivered {usageLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}</span>
            </TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1">Read {usageLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}</span>
            </TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1">Clicks {usageLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}</span>
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
              <TableCell className="text-right">{usage.get(template.id)?.sent.toLocaleString("en-US") ?? "-"}</TableCell>
              <TableCell className="text-right">{usage.get(template.id)?.delivered.toLocaleString("en-US") ?? "-"}</TableCell>
              <TableCell className="text-right">{usage.get(template.id)?.read.toLocaleString("en-US") ?? "-"}</TableCell>
              <TableCell className="text-right">{usage.get(template.id)?.clicks.toLocaleString("en-US") ?? "-"}</TableCell>
              <TableCell className="text-right">
                <Button type="button" variant="outline" size="sm" onClick={() => void viewUsage(template)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {hasMore ? (
        <div className="flex justify-end">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            Load more
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      ) : null}
      <Dialog open={selectedTemplate !== null} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent
          className="max-h-[90vh]"
          style={{ width: "60vw", maxWidth: "60vw" }}
        >
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name || selectedTemplate?.id || "Template"}</DialogTitle>
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
                  {detailPoints.map((point) => (
                    <TableRow key={`${point.start}-${point.end}`}>
                      <TableCell className="text-xs">{formatDateTime(new Date(point.start * 1000))}</TableCell>
                      <TableCell className="text-xs">{formatDateTime(new Date(point.end * 1000))}</TableCell>
                      <TableCell className="text-right">{(point.sent ?? 0).toLocaleString("en-US")}</TableCell>
                      <TableCell className="text-right">{(point.delivered ?? 0).toLocaleString("en-US")}</TableCell>
                      <TableCell className="text-right">{(point.read ?? 0).toLocaleString("en-US")}</TableCell>
                      <TableCell className="text-right">{(point.clicked ?? point.clicks ?? 0).toLocaleString("en-US")}</TableCell>
                    </TableRow>
                  ))}
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
