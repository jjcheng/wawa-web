import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type {
  CatalogSet,
  CatalogSetListResponse,
  Product,
  ProductListResponse,
} from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { WebsitePreview } from "./website-preview";

export const metadata: Metadata = { title: { absolute: "Website preview" } };

export default async function CatalogWebsitePreviewPage({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}) {
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/dashboard");

  const { catalogId } = await params;
  let catalogName = "";
  let sets: CatalogSet[] = [];
  let allProducts: Product[] = [];
  const productsBySet: Record<string, Product[]> = {};
  let loadError: string | null = null;

  try {
    const [catalog, setsResponse, productsResponse] = await Promise.all([
      serverFetch<{ id: string; name?: string }>(
        `/v1/wa/catalogs/${encodeURIComponent(catalogId)}`,
      ),
      serverFetch<CatalogSetListResponse>(
        `/v1/wa/catalogs/${encodeURIComponent(catalogId)}/sets`,
        { query: { limit: "100" } },
      ),
      serverFetch<ProductListResponse>(
        `/v1/wa/catalogs/${encodeURIComponent(catalogId)}/products`,
        { query: { limit: "100" } },
      ),
    ]);
    catalogName = catalog.name || "";
    sets = Array.isArray(setsResponse.items) ? setsResponse.items : [];
    allProducts = Array.isArray(productsResponse.items) ? productsResponse.items : [];

    const setProductLists = await Promise.all(
      sets.map((set) =>
        serverFetch<ProductListResponse>(
          `/v1/wa/product-sets/${encodeURIComponent(set.id)}/products`,
          { query: { limit: "100" } },
        ).catch(() => ({ items: [] }) as ProductListResponse),
      ),
    );
    sets.forEach((set, index) => {
      productsBySet[set.id] = Array.isArray(setProductLists[index]?.items)
        ? setProductLists[index].items
        : [];
    });
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Could not load products for this catalog.";
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href={`/catalogs/${encodeURIComponent(catalogId)}/products`}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" />
          Back to admin
        </Link>
      </div>

      <div className="px-4 pb-12 sm:px-6">
        {loadError ? (
          <div className="mx-auto max-w-[380px] rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {loadError}
          </div>
        ) : (
          <WebsitePreview
            catalogName={catalogName || "Our Store"}
            sets={sets}
            allProducts={allProducts}
            productsBySet={productsBySet}
          />
        )}
      </div>
    </div>
  );
}
