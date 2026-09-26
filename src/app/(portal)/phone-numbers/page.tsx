import type { Metadata } from "next";

import { PhoneNumberList } from "./phone-number-list";
import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { EmbeddedSignupButton } from "@/components/whatsapp/embedded-signup-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { PhoneNumber, PhoneNumberListResponse } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Phone numbers" };

export default async function PhoneNumbersPage({ searchParams }: PageProps<"/phone-numbers">) {
  const params = await searchParams;
  const user = await requireUser();

  let phoneNumbers: PhoneNumber[] = [];
  const requestedStatus = typeof params.status === "string" ? params.status : "ALL";
  const status =
    requestedStatus === "CONNECTED" || requestedStatus === "DISCONNECTED"
      ? requestedStatus
      : "ALL";
  const isMaster = user.type === "MASTER";
  let loadError: string | null = null;
  try {
    phoneNumbers =
      (
        await serverFetch<PhoneNumberListResponse>("/v1/wa/phone-numbers", {
          query: { page: "1", page_size: "10", status: status === "ALL" ? undefined : status },
        })
      ).items ?? [];
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your WhatsApp numbers.";
  }

  return (
    <>
      <BackBar href="/assets" />
      <PageHeader
        title="Phone numbers"
        description={
          user.type === "MASTER"
            ? "All phone numbers under your WhatsApp Business Account."
            : "Your registered WhatsApp business number."
        }
        action={user.type === "MASTER" ? <EmbeddedSignupButton /> : undefined}
      />

      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {!loadError ? (
        <PhoneNumberList phoneNumbers={phoneNumbers} status={status} isMaster={isMaster} />
      ) : null}
    </>
  );
}
