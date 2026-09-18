"use client";

import { useMemo, useState } from "react";
import { Search, ShoppingBag, Store } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ProductImageStack } from "@/components/product-image-stack";
import type { CatalogSet, Product } from "@/lib/api/types";

const ALL_TAB = "__all__";

function formatMoney(value: string | number | null | undefined, currency?: string) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(numeric)) return String(value);
  const formatted = new Intl.NumberFormat(undefined, {
    style: currency ? "currency" : "decimal",
    currency: currency || undefined,
    maximumFractionDigits: 2,
  }).format(numeric);
  return formatted;
}

function ProductCard({ product }: { product: Product }) {
  const name = product.name || product.title || "Unnamed product";
  const salePrice = formatMoney(product.sale_price, product.currency);
  const price = formatMoney(product.price, product.currency);
  const outOfStock = product.availability && product.availability !== "in stock";

  return (
    <Card className="overflow-hidden rounded-2xl border-none py-0 shadow-sm">
      <CardContent className="p-0">
        <div className="relative aspect-square w-full bg-muted">
          {product.image_url ? (
            <ProductImageStack product={product} className="size-full" imageClassName="" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ShoppingBag className="size-8" />
            </div>
          )}
          {outOfStock ? (
            <span className="absolute top-1.5 left-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Out of stock
            </span>
          ) : null}
        </div>
        <div className="space-y-1 p-2.5">
          <p className="line-clamp-2 text-xs leading-tight font-medium">{name}</p>
          <div className="flex items-center gap-1.5">
            {salePrice ? (
              <>
                <span className="text-sm font-semibold">{salePrice}</span>
                {price ? (
                  <span className="text-[11px] text-muted-foreground line-through">{price}</span>
                ) : null}
              </>
            ) : price ? (
              <span className="text-sm font-semibold">{price}</span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function WebsitePreview({
  catalogName,
  sets,
  allProducts,
  productsBySet,
}: {
  catalogName: string;
  sets: CatalogSet[];
  allProducts: Product[];
  productsBySet: Record<string, Product[]>;
}) {
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB);

  const visibleProducts = useMemo(() => {
    if (activeTab === ALL_TAB) return allProducts;
    return productsBySet[activeTab] ?? [];
  }, [activeTab, allProducts, productsBySet]);

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[380px] overflow-hidden rounded-[2rem] border bg-background shadow-xl">
        {/* Storefront header */}
        <div className="bg-primary px-4 pt-5 pb-4 text-primary-foreground">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary-foreground/15">
              <Store className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{catalogName}</p>
              <p className="text-[11px] text-primary-foreground/80">
                {allProducts.length} product{allProducts.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-2">
            <Search className="size-3.5 shrink-0 text-primary-foreground/80" />
            <span className="truncate text-xs text-primary-foreground/80">Search products</span>
          </div>
        </div>

        {/* Category tabs */}
        {sets.length > 0 ? (
          <div
            className="flex flex-nowrap gap-2 overflow-x-auto border-b bg-background px-3 py-2.5"
            role="tablist"
            aria-label="Categories"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === ALL_TAB}
              onClick={() => setActiveTab(ALL_TAB)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === ALL_TAB
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              All
            </button>
            {sets.map((set) => (
              <button
                key={set.id}
                type="button"
                role="tab"
                aria-selected={activeTab === set.id}
                onClick={() => setActiveTab(set.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === set.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {set.name || set.id}
              </button>
            ))}
          </div>
        ) : null}

        {/* Product grid */}
        <div className="max-h-[calc(100vh-22rem)] overflow-y-auto bg-background p-3">
          {visibleProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <ShoppingBag className="size-8" />
              <p className="text-sm">No products in this category yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {visibleProducts.map((product, index) => (
                <ProductCard key={product.id ?? index} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
