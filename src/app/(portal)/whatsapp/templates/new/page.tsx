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
import type { PhoneNumber } from "@/lib/api/types";
import { CreateTemplateForm, type WabaOption } from "./create-template-form";

export const metadata: Metadata = { title: "Create template" };

function toWabaOptions(phoneNumbers: PhoneNumber[]): WabaOption[] {
  const byId = new Map<string, WabaOption>();
  for (const phoneNumber of phoneNumbers) {
    const metaWabaId = phoneNumber.meta_waba_id;
    if (!metaWabaId || byId.has(metaWabaId)) continue;
    byId.set(metaWabaId, {
      metaWabaId,
      name: phoneNumber.business_account?.name || metaWabaId,
    });
  }
  return [...byId.values()];
}

export default async function CreateTemplatePage() {
  let wabas: WabaOption[] = [];
  let loadError: string | null = null;
  try {
    const phoneNumbers = (await serverFetch<PhoneNumber[]>("/wa/v1/user-phone-numbers")) ?? [];
    wabas = toWabaOptions(phoneNumbers);
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
