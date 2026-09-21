import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
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
import { ProductsTable } from "@/app/(portal)/catalogs/[catalogId]/products/products-table";

export const metadata: Metadata = { title: "Catalog products" };

export default async function WebsiteCatalogProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<{ limit?: string }>;
}) {
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/dashboard");

  const { websiteId } = await params;
  const { limit: requestedLimit } = await searchParams;
  const limit = ["10", "25", "50", "100"].includes(requestedLimit ?? "")
    ? requestedLimit!
    : "25";
  let website: Website | null = null;
  let catalogName = "";
  let sets: CatalogSet[] = [];
  let products: Product[] = [];
  let afterCursor: string | undefined;
  let loadError: string | null = null;

  try {
    website = await serverFetch<Website>(
      `/v1/commerce/websites/${encodeURIComponent(websiteId)}`,
    );
    const catalogId = String(website.meta_catalog_id);
    const [catalog, setsResponse, productsResponse] = await Promise.all([
      serverFetch<{ id: string; name?: string }>(`/v1/wa/catalogs/${encodeURIComponent(catalogId)}`),
      serverFetch<CatalogSetListResponse>(`/v1/wa/catalogs/${encodeURIComponent(catalogId)}/sets`, {
        query: { limit: "100" },
      }),
      serverFetch<ProductListResponse>(`/v1/wa/catalogs/${encodeURIComponent(catalogId)}/products`, {
        query: { limit },
      }),
    ]);
    catalogName = catalog.name || website.catalog_name || "";
    sets = Array.isArray(setsResponse.items) ? setsResponse.items : [];
    products = Array.isArray(productsResponse.items) ? productsResponse.items : [];
    const additionalData = productsResponse.additional_data as
      | { after?: string; next?: string }
      | undefined;
    afterCursor = additionalData?.next ? additionalData.after : undefined;
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Could not load products for this website.";
  }

  return (
    <>
      <BackBar href={`/websites/${encodeURIComponent(websiteId)}`} history />
      <PageHeader
        title="Products"
        description={catalogName ? `Products in ${catalogName}.` : "Products in this catalog."}
      />
      {loadError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : (
        <ProductsTable
          catalogId={String(website?.meta_catalog_id ?? "")}
          limit={limit}
          sets={sets}
          initialProducts={products}
          initialAfterCursor={afterCursor}
        />
      )}
    </>
  );
}