"use client";

import { PackageOpen, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { LoadMoreButton } from "@/components/load-more-button";
import { ProductImageStack } from "@/components/product-image-stack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { CatalogSet, Product, ProductListResponse } from "@/lib/api/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProductsTable({
  catalogId,
  limit,
  sets,
  initialProducts,
  initialAfterCursor,
}: {
  catalogId: string;
  limit: string;
  sets: CatalogSet[];
  initialProducts: Product[];
  initialAfterCursor?: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [afterCursor, setAfterCursor] = useState(initialAfterCursor);
  const [selectedSetId, setSelectedSetId] = useState(sets[0]?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      (product.name || product.title || "").toLowerCase().includes(query),
    );
  }, [products, search]);

  function setPageSize(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("limit", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  async function selectSet(setId: string) {
    setSelectedSetId(setId);
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<ProductListResponse>(
        `v1/wa/product-sets/${encodeURIComponent(setId)}/products`,
        { query: { limit } },
      );
      const additionalData = response.additional_data as
        | { after?: string; next?: string }
        | undefined;
      setProducts(response.items ?? []);
      setAfterCursor(additionalData?.next ? additionalData.after : undefined);
    } catch (selectError) {
      setError(toApiError(selectError).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!afterCursor) return;
    setLoading(true);
    setError(null);
    try {
      const productsPath = selectedSetId
        ? `v1/wa/product-sets/${encodeURIComponent(selectedSetId)}/products`
        : `v1/wa/catalogs/${encodeURIComponent(catalogId)}/products`;
      const response = await apiFetch<ProductListResponse>(productsPath, {
        query: { after: afterCursor, limit },
      });
      const additionalData = response.additional_data as
        | { after?: string; next?: string }
        | undefined;
      setProducts((current) => [...current, ...(response.items ?? [])]);
      setAfterCursor(additionalData?.next ? additionalData.after : undefined);
    } catch (loadMoreError) {
      setError(toApiError(loadMoreError).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {sets.length > 0 ? (
        <div
          className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1"
          aria-label="Catalog sets"
          role="list"
        >
          {sets.map((set) => (
            <Button
              key={set.id}
              type="button"
              variant={selectedSetId === set.id ? "default" : "outline"}
              size="sm"
              onClick={() => void selectSet(set.id)}
              disabled={loading}
            >
              {set.name || set.id}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="bg-card divide-border overflow-hidden divide-y rounded-lg border">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2 my-auto size-4"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="h-8 border-none bg-transparent pr-7 pl-8 shadow-none focus-visible:ring-0"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        {filteredProducts.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-muted-foreground text-sm">
              {search ? "No products match your search." : "No products found."}
            </p>
            {search ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : null}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id ?? `${product.name ?? "product"}-${product.category ?? ""}`}
              className="hover:bg-accent/60 flex min-w-0 items-center gap-3 px-4 py-3 transition-colors sm:gap-4"
            >
              <span className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md sm:size-16 lg:size-20">
                {product.image_url ? (
                  <ProductImageStack product={product} className="size-12 sm:size-16 lg:size-20" />
                ) : (
                  <PackageOpen className="text-muted-foreground size-5 sm:size-6 lg:size-7" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">
                  {product.name || product.title || "Unnamed product"}
                </p>
                {product.description ? (
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                    {product.description}
                  </p>
                ) : null}
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs sm:hidden">
                  <span>{product.condition || "Condition unavailable"}</span>
                  <span>{product.availability || "Availability unknown"}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                {product.sale_price !== undefined &&
                product.sale_price !== null &&
                String(product.sale_price).trim() !== "" ? (
                  <>
                    {product.price !== undefined && product.price !== null ? (
                      <span className="text-muted-foreground text-xs line-through">
                        {product.price}
                      </span>
                    ) : null}
                    <span className="font-medium">{product.sale_price}</span>
                  </>
                ) : product.price !== undefined && product.price !== null ? (
                  <span className="font-medium">{product.price}</span>
                ) : (
                  <span className="font-medium">Price unavailable</span>
                )}
                <div className="text-muted-foreground hidden gap-2 text-xs sm:flex">
                  <span>{product.condition || "Condition unavailable"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{product.availability || "Availability unknown"}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Products per page</span>
          <Select value={limit} onValueChange={setPageSize}>
            <SelectTrigger className="h-8 w-18" aria-label="Products per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["10", "25", "50", "100"].map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {afterCursor && !search ? (
          <LoadMoreButton loading={loading} onClick={loadMore} withTopMargin={false} />
        ) : null}
      </div>
    </div>
  );
}
