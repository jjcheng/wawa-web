"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadMoreButton } from "@/components/load-more-button";
import { LocalDateTime } from "@/components/local-date-time";
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
import { formatPhoneNumber } from "@/lib/format";
import type {
  MessageAnalytics,
  MessageAnalyticsDataPoint,
  PhoneNumber,
} from "@/lib/api/types";

type PhoneNumberListResponse = {
  items: PhoneNumber[];
  number_of_pages?: number;
  next_page_offset?: unknown;
};

type PhoneUsage = { sent: number; delivered: number };

export function PhoneNumberListTable({
  start,
  end,
  granularity,
  initialPhoneNumbers,
  initialHasMore,
}: {
  start?: number;
  end?: number;
  granularity?: string;
  initialPhoneNumbers: PhoneNumber[];
  initialHasMore: boolean;
}) {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>(initialPhoneNumbers);
  const [usage, setUsage] = useState<Map<number, PhoneUsage>>(new Map());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<PhoneNumber | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPoints, setDetailPoints] = useState<MessageAnalyticsDataPoint[]>([]);
  const usageRequestsRef = useRef(new Set<string>());
  const activeUsageRequestsRef = useRef(0);

  async function loadUsage(phoneNumber: PhoneNumber) {
    if (!start || !end || !granularity) return;
    const phoneId = phoneNumber.id;
    const requestKey = `${phoneId}:${start}:${end}:${granularity}`;
    if (usageRequestsRef.current.has(requestKey)) return;
    usageRequestsRef.current.add(requestKey);
    activeUsageRequestsRef.current += 1;
    setUsageLoading(true);
    try {
      const response = await apiFetch<MessageAnalytics>(`/v1/wa/phone-numbers/${phoneId}/usage`, {
        query: {
          start: String(start),
          end: String(end),
          granularity,
        },
      });
      setError(null);
      setUsage((current) =>
        new Map(current).set(phoneId, {
          sent: response.total_sent ?? 0,
          delivered: response.total_delivered ?? 0,
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

  async function viewUsage(phoneNumber: PhoneNumber) {
    setSelectedPhoneNumber(phoneNumber);
    setDetailPoints([]);
    setDetailLoading(true);
    try {
      const response = await apiFetch<MessageAnalytics>(`/v1/wa/phone-numbers/${phoneNumber.id}/usage`, {
        query: {
          start: String(start),
          end: String(end),
          granularity,
        },
      });
      setDetailPoints(response.data_points ?? []);
    } catch (usageError) {
      setError(toApiError(usageError).message);
    } finally {
      setDetailLoading(false);
    }
  }

  const loadInitialUsage = useEffectEvent(async (numbersToLoad: PhoneNumber[]) => {
    for (const phoneNumber of numbersToLoad) {
      await loadUsage(phoneNumber);
    }
  });

  useEffect(() => {
    queueMicrotask(() => void loadInitialUsage(initialPhoneNumbers));
  }, [initialPhoneNumbers, start, end, granularity]);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<PhoneNumberListResponse>("/v1/wa/phone-numbers", {
        query: { page: String(page + 1), page_size: "10" },
      });
      const items = response.items ?? [];
      setError(null);
      setPhoneNumbers((current) => [...current, ...items]);
      setPage((current) => current + 1);
      setHasMore(
        response.number_of_pages !== undefined
          ? page + 1 < response.number_of_pages
          : (response.next_page_offset !== undefined && response.next_page_offset !== null) ||
              items.length === 10,
      );
      for (const phoneNumber of items) {
        await loadUsage(phoneNumber);
      }
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
                <TableHead>Name</TableHead>
                <TableHead>Number</TableHead>
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
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phoneNumbers.map((phoneNumber) => (
                <TableRow key={phoneNumber.id}>
                  <TableCell className="font-medium">
                    {phoneNumber.name ||
                      phoneNumber.display_phone_number ||
                      phoneNumber.meta_phone_number_id ||
                      "-"}
                  </TableCell>
                  <TableCell>
                    {formatPhoneNumber(
                      phoneNumber.display_phone_number || phoneNumber.phone_number,
                    ) || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {usage.get(phoneNumber.id)?.sent.toLocaleString("en-US") ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {usage.get(phoneNumber.id)?.delivered.toLocaleString("en-US") ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void viewUsage(phoneNumber)}
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
        open={selectedPhoneNumber !== null}
        onOpenChange={(open) => !open && setSelectedPhoneNumber(null)}
      >
        <DialogContent className="max-h-[90vh]" style={{ width: "60vw", maxWidth: "60vw" }}>
          <DialogHeader>
            <DialogTitle>
              {selectedPhoneNumber?.name ||
                selectedPhoneNumber?.display_phone_number ||
                selectedPhoneNumber?.phone_number ||
                "Phone Number"}
            </DialogTitle>
            <DialogDescription>
              {formatPhoneNumber(
                selectedPhoneNumber?.display_phone_number || selectedPhoneNumber?.phone_number,
              ) || "Phone number usage breakdown"}
            </DialogDescription>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailPoints.length === 0 ? (
                    <TableEmptyState colSpan={4}>No record found.</TableEmptyState>
                  ) : (
                    detailPoints.map((point) => (
                      <TableRow key={`${point.start}-${point.end}`}>
                        <TableCell className="text-xs font-medium">
                          <LocalDateTime value={point.start * 1000} />
                        </TableCell>
                        <TableCell className="text-xs">
                          <LocalDateTime value={point.end * 1000} />
                        </TableCell>
                        <TableCell className="text-right">
                          {(point.sent ?? 0).toLocaleString("en-US")}
                        </TableCell>
                        <TableCell className="text-right">
                          {(point.delivered ?? 0).toLocaleString("en-US")}
                        </TableCell>
                      </TableRow>
                    ))
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
