"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useNavigationProgress } from "@/components/nav/navigation-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteTemplateButton } from "@/components/whatsapp/delete-template-button";
import { TemplateStatusBadge } from "@/components/whatsapp/template-status-badge";
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
import type { Template, TemplateListResponse } from "@/lib/api/types";

const PAGE_SIZES = ["10", "25", "50", "100"];

function qualityVariant(score?: string) {
  switch (score?.toUpperCase()) {
    case "GREEN":
      return "default" as const;
    case "RED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export function TemplatesTable({
  metaWabaId,
  limit,
  initialTemplates,
  initialAfterCursor,
}: {
  metaWabaId: string;
  limit: string;
  initialTemplates: Template[];
  initialAfterCursor?: string;
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [afterCursor, setAfterCursor] = useState(initialAfterCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startNavigationProgress } = useNavigationProgress();

  function setPageSize(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("limit", value);
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<TemplateListResponse>("v1/wa/templates", {
        query: { meta_waba_id: metaWabaId, limit, after: afterCursor },
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
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name || "—"}</TableCell>
                  <TableCell>{template.category || "—"}</TableCell>
                  <TableCell>{template.language || "—"}</TableCell>
                  <TableCell>
                    <TemplateStatusBadge status={template.status} reason={template.rejected_reason} />
                  </TableCell>
                  <TableCell>
                    {template.quality_score?.score ? (
                      <Badge variant={qualityVariant(template.quality_score.score)}>
                        {template.quality_score.score}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ViewTemplateButton template={template} />
                      <DeleteTemplateButton
                        id={template.id}
                        metaWabaId={template.meta_waba_id ?? ""}
                        name={template.name ?? ""}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            Load more
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" />}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
