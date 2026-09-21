import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorefrontShell } from "@/components/public-storefront-shell";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import {
  getPublicWebsiteHostname,
  getPublicWebsiteOrigin,
  loadPublicWebsite,
} from "@/lib/public-website";
import type {
  CatalogSet,
  GenericProductListResponse,
  Product,
  Website,
} from "@/lib/api/types";
import { PublicProductsBrowser } from "./public-products-browser";

export const metadata: Metadata = { title: "Products" };

function productItems(response: GenericProductListResponse) {
  return Array.isArray(response) ? response : response.items ?? [];
}

export default async function PublicWebsiteProductsPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  let website: Website | null;
  let sets: CatalogSet[] = [];
  let initialProducts: Product[] = [];

  try {
    website = await loadPublicWebsite();
    if (!website || String(website.id) !== websiteId) notFound();
    const hostname = await getPublicWebsiteHostname();
    const origin = await getPublicWebsiteOrigin();
    const setsResponse = await serverFetch<CatalogSet[]>("/v1/public/sets", {
      forwardedHost: hostname,
      forwardedOrigin: origin,
    });
    sets = Array.isArray(setsResponse) ? setsResponse : [];

    const firstSetId = sets[0]?.id;
    if (firstSetId) {
      const productsResponse = await serverFetch<GenericProductListResponse>(
        "/v1/public/generic-products",
        {
          query: { set_id: firstSetId, page: "1", page_size: "100" },
          forwardedHost: hostname,
          forwardedOrigin: origin,
        },
      );
      initialProducts = productItems(productsResponse);
    }
  } catch (error) {
    if (error instanceof ApiError) notFound();
    notFound();
  }

  return (
    <StorefrontShell website={website}>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Shop</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Products</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Browse the latest products and check availability before you choose.</p>
        <div className="mt-8">
          <PublicProductsBrowser
            sets={sets}
            initialSetId={sets[0]?.id}
            initialProducts={initialProducts}
          />
        </div>
      </section>
    </StorefrontShell>
  );
}
