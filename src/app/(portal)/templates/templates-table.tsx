"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useNavigationProgress } from "@/components/nav/navigation-progress";
import { LoadMoreButton } from "@/components/load-more-button";
import { TableEmptyState } from "@/components/table-empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ViewTemplateButton } from "@/components/whatsapp/view-template-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { TEMPLATE_CATEGORIES } from "@/lib/api/schemas";
import type { Template, TemplateListResponse } from "@/lib/api/types";
import { WHATSAPP_LANGUAGES } from "@/lib/whatsapp-languages";

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
const QUALITY_SCORE_OPTIONS = ["ALL", "GREEN", "YELLOW", "RED", "UNKNOWN"];
const LANGUAGE_OPTIONS = [{ code: "ALL", label: "Language" }, ...WHATSAPP_LANGUAGES];

export function TemplatesTable({
  wabaId,
  limit,
  category,
  nameOrContent,
  status,
  qualityScore,
  language,
  initialTemplates,
  initialAfterCursor,
  isMaster,
}: {
  wabaId: string;
  limit: string;
  category: string;
  nameOrContent: string;
  status: string;
  qualityScore: string;
  language: string;
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
    params.set("category", value);
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("status", value);
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  function setQualityScore(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("quality_score", value);
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  function setLanguage(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("language", value);
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
          quality_score: qualityScore === "ALL" ? undefined : qualityScore,
          language: language === "ALL" ? undefined : language,
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
    <div className="space-y-4">
      <Card className="rounded-md py-0">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 my-auto box-content size-3.5 pl-1" />
                    <Input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          submitSearch();
                        }
                      }}
                      placeholder="Search"
                      aria-label="Search templates"
                      className="h-7 border-none pr-6 pl-6 font-medium shadow-none focus-visible:ring-0"
                    />
                    {searchInput ? (
                      <button
                        type="button"
                        onClick={clearSearch}
                        aria-label="Clear search"
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-1"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </TableHead>
                <TableHead>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger
                      className="h-7 border-none px-0 pl-1 font-medium shadow-none"
                      aria-label="Filter by category"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === "ALL" ? "Category" : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger
                      className="h-7 border-none px-0 pl-1 font-medium shadow-none"
                      aria-label="Filter by language"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger
                      className="h-7 border-none px-0 pl-1 font-medium shadow-none"
                      aria-label="Filter by status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === "ALL" ? "Status" : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead>
                  <Select value={qualityScore} onValueChange={setQualityScore}>
                    <SelectTrigger
                      className="h-7 border-none px-0 pl-1 font-medium shadow-none"
                      aria-label="Filter by quality"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_SCORE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === "ALL" ? "Quality" : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableEmptyState colSpan={6}>No templates match this filter.</TableEmptyState>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        <span className="min-w-0 break-all">{template.name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{template.category || "—"}</TableCell>
                    <TableCell>{template.language || "—"}</TableCell>
                    <TableCell>{template.status || "—"}</TableCell>
                    <TableCell>{template.quality_score?.score || "—"}</TableCell>
                    <TableCell className="text-right">
                      <ViewTemplateButton
                        template={template}
                        isMaster={isMaster}
                        onDeleted={() =>
                          setTemplates((currentTemplates) =>
                            currentTemplates.filter((currentTemplate) => currentTemplate.id !== template.id),
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
