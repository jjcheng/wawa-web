import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { serverEnv } from "@/lib/env.server";
import { requireUser } from "@/lib/auth/session";
import { WebsiteSetupForm } from "./website-setup-form";

export const metadata: Metadata = { title: "Create website" };

export default async function CreateWebsitePage({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}) {
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/dashboard");

  const { catalogId } = await params;
  let catalogName = "";
  let loadError: string | null = null;

  try {
    const catalog = await serverFetch<{ id: string; name?: string }>(
      `/v1/wa/catalogs/${encodeURIComponent(catalogId)}`,
    );
    catalogName = catalog.name || "";
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Could not load this catalog.";
  }

  return (
    <>
      <BackBar href={`/catalogs/${encodeURIComponent(catalogId)}/products`} />
      <PageHeader
        title="Create website"
        description="Set up a website for this product catalog."
      />

      {loadError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : (
        <Card className="max-w-xl rounded-md">
          <CardHeader>
            <CardTitle className="text-base">Website details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <WebsiteSetupForm
              catalogId={catalogId}
              catalogName={catalogName}
              domain={serverEnv.COMMERCE_WEBSITE_DOMAIN}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}