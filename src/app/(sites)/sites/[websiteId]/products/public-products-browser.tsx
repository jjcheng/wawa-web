"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { CatalogSet, GenericProductListResponse, Product } from "@/lib/api/types";

function productItems(response: GenericProductListResponse) {
  return Array.isArray(response) ? response : response.items ?? [];
}

function availabilityLabel(availability?: string) {
  return availability ? availability.replaceAll("_", " ").toLowerCase() : "Availability unavailable";
}

function availabilityClassName(availability?: string) {
  const normalized = availability?.toLowerCase().replaceAll("_", " ");
  if (normalized?.includes("in stock") || normalized?.includes("available")) {
    return "bg-emerald-600 text-white";
  }
  if (normalized?.includes("out of stock") || normalized?.includes("unavailable")) {
    return "bg-muted text-muted-foreground";
  }
  return "bg-amber-500 text-amber-950";
}

export function PublicProductsBrowser({
  sets,
  initialSetId,
  initialProducts,
}: {
  sets: CatalogSet[];
  initialSetId?: string;
  initialProducts: Product[];
}) {
  const [selectedSetId, setSelectedSetId] = useState(initialSetId);
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectSet(setId: string) {
    setSelectedSetId(setId);
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<GenericProductListResponse>(
        "v1/public/generic-products",
        { query: { set_id: setId, page: "1", page_size: "100" } },
      );
      setProducts(productItems(response));
    } catch (requestError) {
      setError(toApiError(requestError).message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {sets.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Product categories" role="list">
          {sets.map((set) => (
            <Button
              key={set.id}
              type="button"
              role="listitem"
              size="sm"
              variant={selectedSetId === set.id ? "default" : "outline"}
              disabled={loading}
              onClick={() => void selectSet(set.id)}
            >
              {set.name || set.id}
            </Button>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {loading ? <p className="text-muted-foreground text-sm">Loading products...</p> : null}
      {!loading && products.length === 0 ? (
        <p className="text-muted-foreground">No products found.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
              <Link href={`/products/${encodeURIComponent(product.id)}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt="" className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                ) : (
                  <div className="bg-muted aspect-square" />
                )}
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold">{product.name || product.title || "Unnamed product"}</h2>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${availabilityClassName(product.availability)}`}>
                      {availabilityLabel(product.availability)}
                    </span>
                  </div>
                  {product.description ? (
                    <p className="text-muted-foreground line-clamp-3 text-sm">{product.description}</p>
                  ) : null}
                  <p className="text-lg font-semibold">
                    {product.sale_price ?? product.price ?? "Price unavailable"}
                    {product.currency ? ` ${product.currency}` : ""}
                  </p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
