import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { TEMPLATE_CATEGORIES } from "@/lib/api/schemas";
import type { BusinessAccount, Template, TemplateListResponse } from "@/lib/api/types";
import { metaManageTemplatesUrl } from "@/lib/meta-links";
import { toWabaOptions, type WabaOption } from "@/lib/waba-options";
import { WHATSAPP_LANGUAGE_CODES } from "@/lib/whatsapp-languages";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";
import { TemplatesTable } from "./templates-table";

export const metadata: Metadata = { title: "Templates" };

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

export default async function TemplatesPage({ searchParams }: PageProps<"/templates">) {
  let wabas: WabaOption[] = [];
  let wabaError: string | null = null;
  let templates: Template[] = [];
  let loadError: string | null = null;
  let managerUrl: string | null = null;

  try {
    const businessAccount = await serverFetch<BusinessAccount>("/v1/wa/business-accounts");
    wabas = toWabaOptions(businessAccount ? [businessAccount] : []);
    managerUrl = metaManageTemplatesUrl({
      portfolioId: businessAccount?.meta_business_portfolio_id,
      accountId: businessAccount?.waba_id,
    });
  } catch (error) {
    wabaError = error instanceof ApiError ? error.message : "Could not load your business accounts.";
  }

  const params = await searchParams;
  const requested = typeof params.waba_id === "string" ? params.waba_id : undefined;
  const selected =
    (requested && wabas.some((waba) => waba.wabaId === requested)
      ? requested
      : wabas[0]?.wabaId) ?? "";
  const limit = typeof params.limit === "string" ? params.limit : "10";
  const requestedCategory = typeof params.category === "string" ? params.category : undefined;
  const category =
    requestedCategory && (TEMPLATE_CATEGORIES as readonly string[]).includes(requestedCategory)
      ? requestedCategory
      : "ALL";
  const nameOrContent =
    typeof params.name_or_content === "string" ? params.name_or_content : "";
  const requestedStatus = typeof params.status === "string" ? params.status : undefined;
  const status = requestedStatus && STATUS_OPTIONS.includes(requestedStatus) ? requestedStatus : "ALL";
  const requestedQualityScore =
    typeof params.quality_score === "string" ? params.quality_score : undefined;
  const qualityScore =
    requestedQualityScore && QUALITY_SCORE_OPTIONS.includes(requestedQualityScore)
      ? requestedQualityScore
      : "ALL";
  const requestedLanguage = typeof params.language === "string" ? params.language : undefined;
  const language =
    requestedLanguage && (WHATSAPP_LANGUAGE_CODES as readonly string[]).includes(requestedLanguage)
      ? requestedLanguage
      : "ALL";
  let afterCursor: string | undefined;

  try {
    if (selected) {
      const response = await serverFetch<TemplateListResponse>("/v1/wa/templates", {
        query: {
          waba_id: selected,
          limit,
          category: category === "ALL" ? undefined : category,
          name_or_content: nameOrContent || undefined,
          status: status === "ALL" ? undefined : status,
          quality_score: qualityScore === "ALL" ? undefined : qualityScore,
          language: language === "ALL" ? undefined : language,
        },
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
        description="WhatsApp message templates from your business account. Use WhatsApp Manager to create or edit."
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

      {!loadError && selected ? (
        <TemplatesTable
          key={`${limit}-${category}-${nameOrContent}-${status}-${qualityScore}-${language}`}
          wabaId={selected}
          limit={limit}
          category={category}
          nameOrContent={nameOrContent}
          status={status}
          qualityScore={qualityScore}
          language={language}
          initialTemplates={templates}
          initialAfterCursor={afterCursor}
        />
      ) : null}
    </>
  );
}
