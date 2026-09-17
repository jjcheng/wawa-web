"use client";

import { LoadMoreButton } from "@/components/load-more-button";
import { TableEmptyState } from "@/components/table-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { CatalogSet, Product, ProductListResponse } from "@/lib/api/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    <div className="space-y-4">
      {sets.length > 0 ? (
        <div className="flex max-w-full flex-wrap gap-2" aria-label="Catalog sets" role="list">
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
      <Card className="rounded-md py-0">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Image</TableHead>
                <TableHead>Name</TableHead>
                  <TableHead>Condition</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Availability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableEmptyState colSpan={5}>No products found.</TableEmptyState>
              ) : (
                products.map((product) => (
                  <TableRow
                    key={product.id ?? `${product.name ?? "product"}-${product.category ?? ""}`}
                  >
                    <TableCell>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name || product.title || "Product"}
                          loading="lazy"
                          className="size-15 rounded-md object-cover"
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="min-w-56">
                      <div className="font-medium">
                        {product.name || product.title || "Unnamed product"}
                      </div>
                      {product.description ? (
                        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {product.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{product.condition || "—"}</TableCell>
                    <TableCell>
                      {product.sale_price !== undefined &&
                      product.sale_price !== null &&
                      String(product.sale_price).trim() !== "" ? (
                        <div>
                          <div className="font-medium">{product.sale_price}</div>
                          {product.price !== undefined && product.price !== null ? (
                            <div className="text-sm text-muted-foreground line-through">
                              {product.price}
                            </div>
                          ) : null}
                        </div>
                      ) : product.price !== undefined && product.price !== null ? (
                        `${product.price}`
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{product.availability || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Products per page</span>
          <Select value={limit} onValueChange={setPageSize}>
            <SelectTrigger className="w-20" aria-label="Products per page">
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

        {afterCursor ? (
          <LoadMoreButton loading={loading} onClick={loadMore} withTopMargin={false} />
        ) : null}
      </div>
    </div>
  );
}
