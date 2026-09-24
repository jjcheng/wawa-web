import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteTemplateButton } from "@/components/whatsapp/delete-template-button";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { BusinessAccount, Template } from "@/lib/api/types";
import { metaManageTemplatesUrl } from "@/lib/meta-links";
import { toWabaOptions, type WabaOption } from "@/lib/waba-options";
import { CreateTemplateForm } from "./create-template-form";
import { TemplateJsonLoader } from "./template-json-loader";

export const metadata: Metadata = { title: "Create template" };

export default async function CreateTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  let waba: WabaOption | null = null;
  let editTemplate: Template | undefined;
  let managerUrl: string | null = null;
  let loadError: string | null = null;
  const editParam = (await searchParams).edit;
  const editId = Array.isArray(editParam) ? editParam[0] : editParam;
  try {
    const businessAccount = await serverFetch<BusinessAccount>("/v1/wa/business-accounts");
    waba = toWabaOptions(businessAccount ? [businessAccount] : [])[0] ?? null;
    managerUrl = metaManageTemplatesUrl({
      portfolioId: businessAccount?.meta_business_portfolio_id,
      accountId: businessAccount?.waba_id,
    });
    if (editId) {
      const response = await serverFetch<Template>(`/v1/wa/templates/${encodeURIComponent(editId)}`);
      console.log("[TemplateEdit] GET /v1/wa/templates/:id response", {
        id: editId,
        response,
      });
      if (!response || typeof response !== "object" || !response.id) {
        throw new ApiError("Template details were empty or incomplete.", 502);
      }
      editTemplate = response;
    }
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your business accounts.";
  }

  return (
    <>
      <BackBar href="/templates" actions={<TemplateJsonLoader />} />

      <PageHeader
        title={editTemplate ? "Edit template" : "Create template"}
        description={
          <>
            For complete template creation, use{" "}
            {managerUrl ? (
              <a
                href={managerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-foreground font-semibold underline underline-offset-2"
              >
                WhatsApp Manager
              </a>
            ) : (
              "WhatsApp Manager"
            )}. Use this page only to create simple templates.
          </>
        }
      />

      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {waba && !loadError ? (
        <>
          <Card>
            <CardContent>
              <CreateTemplateForm waba={waba} initialTemplate={editTemplate} />
            </CardContent>
          </Card>
          {editTemplate ? (
            <div className="pt-5">
              <DeleteTemplateButton
                id={editTemplate.id}
                wabaId={editTemplate.waba_id ?? waba.wabaId}
                name={editTemplate.name ?? ""}
                label="Delete template"
                triggerVariant="destructive"
                redirectTo="/templates"
              />
            </div>
          ) : null}
        </>
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
