"use client";

import { FileText } from "lucide-react";
import { useRef, useState } from "react";

import { LoadMoreButton } from "@/components/load-more-button";
import { MarkdownContent } from "@/components/markdown-content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { crawledPagesSchema, type CrawledPagesResponse } from "../website-data";
import { WebsiteAction } from "./website-action";

function statusColor(status: string) {
  return status.trim().toLowerCase() === "error"
    ? "text-destructive"
    : "text-muted-foreground";
}

export function CrawledPagesList({
  profileId,
  websiteId,
  initialResult,
}: {
  profileId: number;
  websiteId: number;
  initialResult: CrawledPagesResponse;
}) {
  const [result, setResult] = useState(initialResult);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<
    CrawledPagesResponse["records"][number] | null
  >(null);
  const loadingRef = useRef(false);

  async function loadMore() {
    if (loadingRef.current || result.cursor <= 0) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    try {
      const next = crawledPagesSchema.parse(
        await apiFetch<unknown>(`v1/ai-agent/websites/${websiteId}`, {
          query: { cursor: String(result.cursor), limit: "30" },
        }),
      );
      setResult((current) => ({
        ...next,
        records: [...current.records, ...next.records],
      }));
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Crawled pages</h1>
          <WebsiteAction profileId={profileId} websiteId={websiteId} status={result.status} />
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          View crawl progress and pages from this website.
        </p>
      </div>
      <div className="bg-card divide-border divide-y overflow-hidden rounded-lg border">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {result.finished} of {result.total} pages crawled
          </p>
          <span className={cn(statusColor(result.status), "text-sm")}>{result.status}</span>
        </div>
        {result.records.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center p-6 text-center">
            <p className="text-muted-foreground text-base">No crawled pages found.</p>
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {result.records.map((record, index) => (
              <li key={`${record.url}:${index}`}>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(record)}
                  className="hover:bg-accent/60 flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors"
                >
                  <span className="bg-accent flex size-10 shrink-0 items-center justify-center rounded-full">
                    <FileText aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate leading-5 font-medium">
                      {record.metadata.title || record.url}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm break-all">
                      {record.url}
                    </p>
                    <p className={cn(statusColor(record.status), "mt-1 text-sm sm:hidden")}>
                      {record.status}
                    </p>
                  </div>
                  <span
                    className={cn(
                      statusColor(record.status),
                      "hidden shrink-0 text-sm sm:inline",
                    )}
                  >
                    {record.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {result.cursor > 0 ? (
        <LoadMoreButton loading={isLoadingMore} onClick={loadMore} />
      ) : null}
      <Dialog
        open={selectedRecord !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRecord(null);
        }}
      >
        <DialogContent className="overflow-hidden sm:max-w-3xl">
          <DialogHeader className="min-w-0 pr-8">
            <DialogTitle className="break-words">
              {selectedRecord?.metadata.title || "Crawled page"}
            </DialogTitle>
            <DialogDescription className="break-all">{selectedRecord?.url}</DialogDescription>
          </DialogHeader>
          <div className="min-w-0 !overflow-y-auto">
            {selectedRecord?.markdown ? (
              <MarkdownContent content={selectedRecord.markdown} />
            ) : (
              <p className="text-muted-foreground text-sm">
                No Markdown content available for this page.
              </p>
            )}
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}
