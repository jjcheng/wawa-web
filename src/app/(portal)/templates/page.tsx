import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteTemplateButton } from "@/components/whatsapp/delete-template-button";
import { TemplateStatusBadge } from "@/components/whatsapp/template-status-badge";
import { ViewTemplateButton } from "@/components/whatsapp/view-template-button";
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
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { BusinessAccount, BusinessPortfolio, Template, TemplateListResponse } from "@/lib/api/types";
import { metaManageTemplatesUrl } from "@/lib/meta-links";
import { toWabaOptions, type WabaOption } from "@/lib/waba-options";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

export const metadata: Metadata = { title: "Templates" };

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

export default async function TemplatesPage({ searchParams }: PageProps<"/templates">) {
  let wabas: WabaOption[] = [];
  let wabaError: string | null = null;
  let templates: Template[] = [];
  let loadError: string | null = null;
  let managerUrl: string | null = null;

  try {
    const [businessAccount, businessPortfolio] = await Promise.all([
      serverFetch<BusinessAccount>("/v1/wa/business-accounts"),
      serverFetch<BusinessPortfolio>("/v1/wa/business-portfolios"),
    ]);
    wabas = toWabaOptions(businessAccount ? [businessAccount] : []);
    managerUrl = metaManageTemplatesUrl({
      portfolioId: businessPortfolio?.meta_business_portfolio_id,
      accountId: businessAccount?.meta_waba_id,
    });
  } catch (error) {
    wabaError = error instanceof ApiError ? error.message : "Could not load your business accounts.";
  }

  const params = await searchParams;
  const requested = typeof params.meta_waba_id === "string" ? params.meta_waba_id : undefined;
  const selected =
    (requested && wabas.some((waba) => waba.metaWabaId === requested)
      ? requested
      : wabas[0]?.metaWabaId) ?? "";

  try {
    if (selected) {
      const response = await serverFetch<TemplateListResponse>("/v1/wa/templates", {
        query: { meta_waba_id: selected, limit: "100" },
      });
      templates = response?.items ?? [];
    }
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your message templates.";
  }

  return (
    <>
      <PageHeader
        title="Templates"
        description="WhatsApp message templates from your business account. Use WhatsApp Manager to create or modify templates."
        action={
          <div className="flex flex-wrap gap-2">
            {managerUrl ? (
              <Button asChild variant="outline" className={MEDIUM_BUTTON_HEIGHT}>
                <a href={managerUrl} target="_blank" rel="noreferrer">
                  WhatsApp Manager
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            ) : null}
            <Button asChild className={MEDIUM_BUTTON_HEIGHT}>
              <Link href="/templates/new">Create template</Link>
            </Button>
          </div>
        }
      />

      {wabaError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{wabaError}</AlertDescription>
        </Alert>
      ) : null}

      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {!loadError && templates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No templates yet</CardTitle>
            <CardDescription>
              Templates created in WhatsApp Manager will appear here once Meta has reviewed
              them.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {templates.length > 0 ? (
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
                      <TemplateStatusBadge
                        status={template.status}
                        reason={template.rejected_reason}
                      />
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
      ) : null}
    </>
  );
}
