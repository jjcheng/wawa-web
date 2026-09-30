import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { BusinessAccount, Catalog } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { metaCommerceManagerUrl } from "@/lib/meta-links";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";
import { CatalogsNotice } from "./catalogs-notice";
import { CatalogsView } from "./catalogs-view";

export const metadata: Metadata = { title: "Catalogs" };

export default async function CatalogsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/chats");

  const { notice } = await searchParams;

  let catalogs: Catalog[] = [];
  let loadError: string | null = null;
  let managerUrl: string | null = null;

  try {
    const [businessAccount, catalogData] = await Promise.all([
      serverFetch<BusinessAccount>("/v1/wa/business-accounts").catch(() => null),
      serverFetch<Catalog[]>("/v1/wa/catalogs"),
    ]);

    catalogs = Array.isArray(catalogData) ? catalogData : [];
    managerUrl = metaCommerceManagerUrl({
      portfolioId: businessAccount?.meta_business_portfolio_id,
    });
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your product catalogs.";
  }

  return (
    <>
      <CatalogsNotice notice={notice} />
      {loadError ? (
        <>
          <CatalogsView catalogs={[]} />
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        </>
      ) : (
        <CatalogsView
          catalogs={catalogs}
          managerAction={
            managerUrl ? (
              <Button asChild variant="outline" className={MEDIUM_BUTTON_HEIGHT}>
                <a href={managerUrl} target="_blank" rel="noreferrer">
                  Commerce Manager
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            ) : undefined
          }
        />
      )}
    </>
  );
}
