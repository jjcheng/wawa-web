import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { BusinessAccount, BusinessPortfolio } from "@/lib/api/types";
import { metaManageTemplatesUrl } from "@/lib/meta-links";
import { toWabaOptions, type WabaOption } from "@/lib/waba-options";
import { CreateTemplateForm } from "./create-template-form";

export const metadata: Metadata = { title: "Create template" };

export default async function CreateTemplatePage() {
  let waba: WabaOption | null = null;
  let managerUrl: string | null = null;
  let loadError: string | null = null;
  try {
    const [businessAccount, businessPortfolio] = await Promise.all([
      serverFetch<BusinessAccount>("/v1/wa/business-accounts"),
      serverFetch<BusinessPortfolio>("/v1/wa/business-portfolios"),
    ]);
    waba = toWabaOptions(businessAccount ? [businessAccount] : [])[0] ?? null;
    managerUrl = metaManageTemplatesUrl({
      portfolioId: businessPortfolio?.meta_business_portfolio_id,
      accountId: businessAccount?.meta_waba_id,
    });
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your business accounts.";
  }

  return (
    <>
      <Button asChild variant="ghost" className="-mt-2 -ml-2 mb-2">
        <Link href="/templates">
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </Button>

      <PageHeader
        title="Create template"
        description={
          <>
            For complete template creation features, use{" "}
            {managerUrl ? (
              <a
                href={managerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-foreground inline-flex items-center gap-1 font-semibold underline underline-offset-2"
              >
                WhatsApp Manager
                <ExternalLink className="size-3.5" />
              </a>
            ) : (
              "WhatsApp Manager"
            )}
            , this is recommended by Meta. This page is only suitable to create a simple
            template with no variable.
          </>
        }
      />

      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {waba && !loadError ? (
        <Card>
          <CardContent>
            <CreateTemplateForm waba={waba} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Connect a WhatsApp Business number before creating templates.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
