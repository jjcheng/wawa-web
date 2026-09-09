"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
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
import type { PhoneNumber, PhoneNumberMessageAnalytics } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

type PhoneNumberListResponse = {
  items: PhoneNumber[];
  number_of_pages?: number;
  next_page_offset?: unknown;
};

type PhoneNumberUsage = {
  sent: number;
  delivered: number;
};

type PhoneNumberRow = PhoneNumber & {
  usage?: PhoneNumberUsage;
};

type UsageBreakdown = {
  start: number;
  end: number;
  sent: number;
  delivered: number;
};

function usageTotals(response: PhoneNumberMessageAnalytics | PhoneNumberMessageAnalytics[]) {
  const entries = Array.isArray(response) ? response : [response];
  return entries.reduce(
    (totals, entry) => {
      for (const point of usageDataPoints(entry)) {
        totals.sent += point.sent ?? 0;
        totals.delivered += point.delivered ?? 0;
      }
      return totals;
    },
    { sent: 0, delivered: 0 },
  );
}

function usageDataPoints(entry: PhoneNumberMessageAnalytics) {
  return entry.data_points ?? entry.analytics?.data_points ?? [];
}

export function PhoneNumberListTable({
  initialPhoneNumbers,
  initialHasMore,
  start,
  end,
  granularity,
}: {
  initialPhoneNumbers: PhoneNumber[];
  initialHasMore: boolean;
  start: number;
  end: number;
  granularity: string;
}) {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberRow[]>(initialPhoneNumbers);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usageRequestsRef = useRef(new Set<string>());
  const activeUsageRequestsRef = useRef(0);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<PhoneNumberRow | null>(null);
  const [usageBreakdown, setUsageBreakdown] = useState<UsageBreakdown[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  function usageEntries(response: PhoneNumberMessageAnalytics | PhoneNumberMessageAnalytics[]) {
    return Array.isArray(response) ? response : [response];
  }

  async function requestUsage(phoneNumber: PhoneNumberRow) {
    if (!phoneNumber.wa_id) return null;
    const response = await apiFetch<PhoneNumberMessageAnalytics | PhoneNumberMessageAnalytics[]>("/v1/wa/phone-numbers/usage", {
      query: {
        wa_ids: phoneNumber.wa_id,
        start: String(start),
        end: String(end),
        granularity,
      },
    });
    return response;
  }

  async function loadUsage(phoneNumber: PhoneNumberRow) {
    if (!phoneNumber.wa_id) return;
    const requestKey = `${phoneNumber.wa_id}:${start}:${end}:${granularity}`;
    if (usageRequestsRef.current.has(requestKey)) return;
    usageRequestsRef.current.add(requestKey);
    activeUsageRequestsRef.current += 1;
    setUsageLoading(true);
    try {
      const response = await requestUsage(phoneNumber);
      if (!response) return;
      const usage = usageTotals(response);
      setError(null);
      setPhoneNumbers((current) =>
        current.map((item) => (item.id === phoneNumber.id ? { ...item, usage } : item)),
      );
    } catch (usageError) {
      usageRequestsRef.current.delete(requestKey);
      setError(toApiError(usageError).message);
    } finally {
      activeUsageRequestsRef.current -= 1;
      if (activeUsageRequestsRef.current === 0) setUsageLoading(false);
    }
  }

  async function viewUsage(phoneNumber: PhoneNumberRow) {
    setSelectedPhoneNumber(phoneNumber);
    setUsageBreakdown([]);
    setDetailLoading(true);
    try {
      const response = await requestUsage(phoneNumber);
      if (!response) return;
      const entries = usageEntries(response);
      const breakdown = entries.flatMap((item) =>
        usageDataPoints(item).map((point) => ({
          start: point.start,
          end: point.end,
          sent: point.sent ?? 0,
          delivered: point.delivered ?? 0,
        })),
      );
      setUsageBreakdown(breakdown);
    } catch (usageError) {
      setError(toApiError(usageError).message);
    } finally {
      setDetailLoading(false);
    }
  }

  const loadInitialUsage = useEffectEvent(async (phoneNumbersToLoad: PhoneNumber[]) => {
    for (const phoneNumber of phoneNumbersToLoad) {
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
      const response = await apiFetch<PhoneNumberListResponse>("/v1/wa/user-phone-numbers", {
        query: { page: String(page + 1), page_size: "10" },
      });
      const items = response.items ?? [];
      setError(null);
      setPhoneNumbers((current) => [...current, ...items]);
      for (const phoneNumber of items) {
        await loadUsage(phoneNumber);
      }
      setPage((current) => current + 1);
      setHasMore(
        response.number_of_pages !== undefined
          ? page + 1 < response.number_of_pages
          : response.next_page_offset !== undefined && response.next_page_offset !== null || items.length === 10,
      );
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
            <TableHead>Name</TableHead>
            <TableHead>Number</TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1">Sent {usageLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}</span>
            </TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1">Delivered {usageLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}</span>
            </TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {phoneNumbers.map((phoneNumber) => (
            <TableRow key={phoneNumber.id}>
              <TableCell className="font-medium">
                {phoneNumber.name || phoneNumber.phone_number || phoneNumber.meta_phone_number_id || "-"}
              </TableCell>
              <TableCell>{phoneNumber.phone_number || "-"}</TableCell>
              <TableCell className="text-right">
                {phoneNumber.usage ? phoneNumber.usage.sent.toLocaleString("en-US") : "-"}
              </TableCell>
              <TableCell className="text-right">
                {phoneNumber.usage ? phoneNumber.usage.delivered.toLocaleString("en-US") : "-"}
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" variant="outline" size="sm" onClick={() => void viewUsage(phoneNumber)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {hasMore ? (
        <LoadMoreButton loading={loading} onClick={loadMore} withTopMargin={false} />
      ) : null}
      <Dialog open={selectedPhoneNumber !== null} onOpenChange={(open) => !open && setSelectedPhoneNumber(null)}>
        <DialogContent
          className="max-h-[90vh]"
          style={{ width: "60vw", maxWidth: "60vw" }}
        >
          <DialogHeader>
            <DialogTitle>
              {selectedPhoneNumber?.name || selectedPhoneNumber?.phone_number || "Phone number"}
            </DialogTitle>
            <DialogDescription>{selectedPhoneNumber?.phone_number || "Phone number"}</DialogDescription>
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
                  {usageBreakdown.length === 0 ? (
                    <TableEmptyState colSpan={4}>No results.</TableEmptyState>
                  ) : usageBreakdown.map((point) => (
                    <TableRow key={`${point.start}-${point.end}`}>
                      <TableCell className="text-xs">{formatDateTime(new Date(point.start * 1000))}</TableCell>
                      <TableCell className="text-xs">{formatDateTime(new Date(point.end * 1000))}</TableCell>
                      <TableCell className="text-right">{point.sent.toLocaleString("en-US")}</TableCell>
                      <TableCell className="text-right">{point.delivered.toLocaleString("en-US")}</TableCell>
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
