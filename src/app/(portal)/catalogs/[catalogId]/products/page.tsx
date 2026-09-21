import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type {
  CatalogSet,
  CatalogSetListResponse,
  Product,
  ProductListResponse,
  Website,
} from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductsTable } from "./products-table";

export const metadata: Metadata = { title: "Catalog products" };

export default async function CatalogProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ catalogId: string }>;
  searchParams: Promise<{ limit?: string }>;
}) {
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/dashboard");

  const { catalogId } = await params;
  const { limit: requestedLimit } = await searchParams;
  const limit = ["10", "25", "50", "100"].includes(requestedLimit ?? "")
    ? requestedLimit!
    : "25";
  let catalogName = "";
  let sets: CatalogSet[] = [];
  let products: Product[] = [];
  let website: Website | null = null;
  let afterCursor: string | undefined;
  let loadError: string | null = null;

  try {
    const catalog = await serverFetch<{ id: string; name?: string }>(
      `/v1/wa/catalogs/${encodeURIComponent(catalogId)}`,
    );
    catalogName = catalog.name || "";

    const [setsResponse, productsResponse, websiteResponse] = await Promise.all([
      serverFetch<CatalogSetListResponse>(
        `/v1/wa/catalogs/${encodeURIComponent(catalogId)}/sets`,
        { query: { limit: "100" } },
      ),
      serverFetch<ProductListResponse>(
        `/v1/wa/catalogs/${encodeURIComponent(catalogId)}/products`,
        { query: { limit } },
      ),
      serverFetch<Website | null>("/v1/commerce/websites/by-meta-catalog-id", {
        query: { meta_catalog_id: catalogId },
      }).catch(() => null),
    ]);
    sets = Array.isArray(setsResponse.items) ? setsResponse.items : [];
    const response = productsResponse;
    products = Array.isArray(response.items) ? response.items : [];
    website = websiteResponse;
    const additionalData = response.additional_data as
      | { after?: string; next?: string }
      | undefined;
    afterCursor = additionalData?.next ? additionalData.after : undefined;
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Could not load products for this catalog.";
  }

  return (
    <>
      <BackBar href="/catalogs" />
      <PageHeader
        title="Products"
        description={catalogName ? `Products in ${catalogName}.` : "Products in this catalog."}
        action={
          <div className="flex flex-col items-end gap-1">
            <Button asChild className="mb-1">
              <Link
                href={website
                  ? `/websites/${encodeURIComponent(String(website.id))}`
                  : `/catalogs/${encodeURIComponent(catalogId)}/products/website/setup`}
              >
                {website ? "View website" : "Create website"}
              </Link>
            </Button>
            {website?.url ? (
              <a
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground max-w-56 truncate text-xs hover:underline"
              >
                {website.url}
              </a>
            ) : null}
          </div>
        }
      />

      {loadError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {!loadError ? (
        <>
          <ProductsTable
            catalogId={catalogId}
            limit={limit}
            sets={sets}
            initialProducts={products}
            initialAfterCursor={afterCursor}
          />
        </>
      ) : null}
    </>
  );
}
