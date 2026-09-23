"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { CatalogSet, GenericProductListResponse, Product } from "@/lib/api/types";
import { getPublicProductPath } from "@/lib/public-seo";

function productItems(response: GenericProductListResponse) {
  return Array.isArray(response) ? response : response.items ?? [];
}

function hasSalePrice(product: Product) {
  return product.sale_price !== undefined && product.sale_price !== null && String(product.sale_price).trim() !== "";
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
  const productGridRef = useRef<HTMLDivElement>(null);

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
      requestAnimationFrame(() => {
        productGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
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
        <div className="sticky top-[4.5rem] z-30 -mx-2 bg-background/95 px-2 py-3 backdrop-blur">
          <div
            className="flex max-w-full gap-3 overflow-x-auto"
            aria-label="Product categories"
            role="tablist"
          >
            {sets.map((set) => (
              <Button
                key={set.id}
                type="button"
                role="tab"
                aria-selected={selectedSetId === set.id}
                size="lg"
                variant={selectedSetId === set.id ? "default" : "outline"}
                className="rounded-full px-3 text-xs font-semibold uppercase tracking-wide"
                disabled={loading}
                onClick={() => void selectSet(set.id)}
              >
                {set.name || set.id}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {loading ? <p className="text-muted-foreground text-sm">Loading products...</p> : null}
      {!loading && products.length === 0 ? (
        <p className="text-muted-foreground">No products found.</p>
      ) : (
        <div ref={productGridRef} className="scroll-mt-40 columns-1 gap-5 sm:columns-2 lg:columns-3">
          {products.map((product) => (
            <article key={product.id} className="group mb-8 break-inside-avoid">
              <Link href={getPublicProductPath(product)} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <div className="relative overflow-hidden rounded-lg bg-muted">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt=""
                      className="h-auto max-h-[300px] w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-square" />
                  )}
                  <div className="absolute inset-x-3 bottom-3 rounded-md bg-background/75 p-3 text-foreground shadow-lg backdrop-blur-md">
                    <h2 className="text-sm font-bold leading-tight">{product.name || product.title || "Unnamed product"}</h2>
                    <div className="mt-1 flex items-baseline gap-2 text-sm font-bold">
                      {hasSalePrice(product) ? (
                        <span className="text-muted-foreground text-xs font-semibold line-through">
                          {product.price ?? "Price unavailable"}
                        </span>
                      ) : null}
                      <span>
                        {hasSalePrice(product) ? product.sale_price : product.price ?? "Price unavailable"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
