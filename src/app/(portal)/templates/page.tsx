import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { BusinessAccount, BusinessPortfolio, Template, TemplateListResponse } from "@/lib/api/types";
import { metaManageTemplatesUrl } from "@/lib/meta-links";
import { toWabaOptions, type WabaOption } from "@/lib/waba-options";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";
import { TemplatesTable } from "./templates-table";

export const metadata: Metadata = { title: "Templates" };

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
  const limit = typeof params.limit === "string" ? params.limit : "10";
  let afterCursor: string | undefined;

  try {
    if (selected) {
      const response = await serverFetch<TemplateListResponse>("/v1/wa/templates", {
        query: { meta_waba_id: selected, limit },
      });
      templates = response?.items ?? [];
      const additionalData = response?.additional_data as
        | { after?: string; next?: string }
        | undefined;
      // next is Meta's paging URL; empty means there's no more to load.
      afterCursor = additionalData?.next ? additionalData.after : undefined;
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
              <Link href="/templates/new">Create Template</Link>
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
        <TemplatesTable
          metaWabaId={selected}
          limit={limit}
          initialTemplates={templates}
          initialAfterCursor={afterCursor}
        />
      ) : null}
    </>
  );
}
