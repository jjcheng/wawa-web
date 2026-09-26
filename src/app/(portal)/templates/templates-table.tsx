"use client";

import { useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useNavigationProgress } from "@/components/nav/navigation-progress";
import { LoadMoreButton } from "@/components/load-more-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ViewTemplateButton } from "@/components/whatsapp/view-template-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { TEMPLATE_CATEGORIES } from "@/lib/api/schemas";
import type { Template, TemplateListResponse } from "@/lib/api/types";

const PAGE_SIZES = ["10", "25", "50", "100"];
const CATEGORY_OPTIONS = ["ALL", ...TEMPLATE_CATEGORIES];
const STATUS_OPTIONS = [
  "ALL",
  "APPROVED",
  "PENDING",
  "REJECTED",
  "PAUSED",
  "DISABLED",
  "IN_APPEAL",
  "PENDING_DELETION",
];
export function TemplatesTable({
  wabaId,
  limit,
  category,
  nameOrContent,
  status,
  initialTemplates,
  initialAfterCursor,
  isMaster,
}: {
  wabaId: string;
  limit: string;
  category: string;
  nameOrContent: string;
  status: string;
  initialTemplates: Template[];
  initialAfterCursor?: string;
  isMaster: boolean;
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [afterCursor, setAfterCursor] = useState(initialAfterCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(nameOrContent);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startNavigationProgress } = useNavigationProgress();

  function submitSearch() {
    const params = new URLSearchParams(searchParams);
    if (searchInput) {
      params.set("name_or_content", searchInput);
    } else {
      params.delete("name_or_content");
    }
    const nextRoute = `${pathname}?${params}`;
    if (nextRoute === `${pathname}?${searchParams}`) return;
    startNavigationProgress(nextRoute);
    router.replace(nextRoute, { scroll: false });
  }

  function clearSearch() {
    setSearchInput("");
    const params = new URLSearchParams(searchParams);
    params.delete("name_or_content");
    const nextRoute = `${pathname}?${params}`;
    if (nextRoute === `${pathname}?${searchParams}`) return;
    startNavigationProgress(nextRoute);
    router.replace(nextRoute, { scroll: false });
  }

  function setPageSize(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("limit", value);
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  function setCategory(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "ALL") params.delete("category");
    else params.set("category", value);
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "ALL") params.delete("status");
    else params.set("status", value);
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  function resetFilters() {
    setSearchInput("");
    const params = new URLSearchParams(searchParams);
    params.delete("name_or_content");
    params.delete("category");
    params.delete("status");
    params.delete("quality_score");
    params.delete("language");
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<TemplateListResponse>("v1/wa/templates", {
        query: {
          waba_id: wabaId,
          limit,
          category: category === "ALL" ? undefined : category,
          name_or_content: nameOrContent || undefined,
          status: status === "ALL" ? undefined : status,
          after: afterCursor,
        },
      });
      const additionalData = response.additional_data as
        | { after?: string; next?: string }
        | undefined;
      setTemplates((current) => [...current, ...(response.items ?? [])]);
      setAfterCursor(additionalData?.next ? additionalData.after : undefined);
    } catch (loadMoreError) {
      setError(toApiError(loadMoreError).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-card divide-border overflow-hidden divide-y rounded-lg border">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="relative min-w-0 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2 my-auto size-4" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitSearch();
                }
              }}
              placeholder="Search templates"
              aria-label="Search templates"
              className="h-8 border-none bg-transparent pr-7 pl-8 shadow-none focus-visible:ring-0"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1.5">
                <Filter className="size-3.5" />
                Filter
                {category !== "ALL" || status !== "ALL" ? (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    {(category !== "ALL" ? 1 : 0) + (status !== "ALL" ? 1 : 0)}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-3 p-3" align="end">
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-medium">Category</p>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-8 w-full" aria-label="Filter by category">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === "ALL" ? "All categories" : option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-medium">Status</p>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 w-full" aria-label="Filter by status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === "ALL" ? "All statuses" : option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {templates.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-muted-foreground text-sm">
              {category !== "ALL" || nameOrContent || status !== "ALL" ? "No templates match these filters." : "No templates found."}
            </p>
            {category !== "ALL" || nameOrContent || status !== "ALL" ? (
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : null}
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="hover:bg-accent/60 flex min-w-0 items-center gap-3 px-4 py-3 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="break-all font-medium">{template.name || "Unnamed template"}</p>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span>{template.category || "No category"}</span>
                  <span>{template.language || "No language"}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                {template.status ? <Badge variant="secondary">{template.status}</Badge> : null}
                <span className="text-muted-foreground text-xs">
                  Quality {template.quality_score?.score || "—"}
                </span>
              </div>
              <ViewTemplateButton
                template={template}
                isMaster={isMaster}
                onDeleted={() =>
                  setTemplates((currentTemplates) =>
                    currentTemplates.filter((currentTemplate) => currentTemplate.id !== template.id),
                  )
                }
              />
            </div>
          ))
        )}
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Templates per page</span>
          <Select value={limit} onValueChange={setPageSize}>
            <SelectTrigger className="w-20" aria-label="Templates per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {afterCursor ? (
          <LoadMoreButton loading={loading} onClick={loadMore} withTopMargin={false} />
        ) : null}
      </div>
    </div>
  );
}
