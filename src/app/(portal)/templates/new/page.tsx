import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { BusinessAccount } from "@/lib/api/types";
import { toWabaOptions, type WabaOption } from "@/lib/waba-options";
import { CreateTemplateForm } from "./create-template-form";

export const metadata: Metadata = { title: "Create template" };

export default async function CreateTemplatePage() {
  let wabas: WabaOption[] = [];
  let loadError: string | null = null;
  try {
    const businessAccounts =
      (await serverFetch<BusinessAccount[]>("/v1/wa/business-accounts")) ?? [];
    wabas = toWabaOptions(businessAccounts);
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your business accounts.";
  }

  return (
    <>
      <PageHeader
        title="Create template"
        description="Submit a new message template to Meta for review."
      />

      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template details</CardTitle>
          <CardDescription>
            Meta reviews every template. Approval usually takes a few minutes but can take
            longer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wabas.length === 0 && !loadError ? (
            <p className="text-muted-foreground text-sm">
              Connect a WhatsApp Business number before creating templates.
            </p>
          ) : (
            <CreateTemplateForm wabas={wabas} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
