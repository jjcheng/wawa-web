"use client";

import { Circle, Search, Store, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import type { Catalog } from "@/lib/api/types";

function initials(catalog: Catalog) {
  return (catalog.name || "?").slice(0, 2).toUpperCase();
}

function productCountLabel(catalog: Catalog) {
  return catalog.product_count !== undefined
    ? `${catalog.product_count.toLocaleString()} products`
    : "0 product";
}

export function CatalogsView({
  catalogs,
  managerAction,
}: {
  catalogs: Catalog[];
  managerAction?: React.ReactNode;
}) {
  const [name, setName] = useState("");

  const filtered = useMemo(() => {
    const query = name.trim().toLowerCase();
    return catalogs.filter((catalog) =>
      (catalog.name ?? "").toLowerCase().includes(query),
    );
  }, [catalogs, name]);

  const hasFilters = Boolean(name);

  return (
    <>
      <PageHeader
        title="Catalogs"
        description="Product catalogs owned by your Meta business portfolio, upload or edit in Meta Commerce Manager."
        action={managerAction}
      />
      <div className="bg-card divide-border overflow-hidden divide-y rounded-lg border">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2 my-auto size-4"
            />
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Search catalogs"
              aria-label="Search catalogs"
              className="h-8 border-none bg-transparent pr-7 pl-8 shadow-none focus-visible:ring-0"
            />
            {name ? (
              <button
                type="button"
                onClick={() => setName("")}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
            <Store className="text-muted-foreground size-8" />
            <p className="text-muted-foreground text-base">No product catalogs found.</p>
            {hasFilters ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setName("")}
              >
                Reset filters
              </Button>
            ) : null}
          </div>
        ) : (
          filtered.map((catalog) => (
            <Link
              key={catalog.id}
              href={`/catalogs/${encodeURIComponent(catalog.id)}/products`}
              className="hover:bg-accent/60 flex items-center gap-3 px-4 py-3 transition-colors"
            >
              <span className="bg-accent flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                {initials(catalog)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{catalog.name || "Unnamed catalog"}</p>
                <p className="text-muted-foreground mb-1 flex min-w-0 items-center gap-2 text-sm capitalize">
                  <span className="truncate">
                    {catalog.vertical ? catalog.vertical.replaceAll("_", " ") : "No category"}
                  </span>
                  <span className="shrink-0 text-sm sm:hidden">{productCountLabel(catalog)}</span>
                </p>
                {catalog.website_url ? (
                  <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 truncate text-sm sm:hidden">
                    <Circle
                      aria-hidden="true"
                      className={`size-2 shrink-0 fill-current ${catalog.website_status === "ACTIVE" ? "text-green-600" : "text-muted-foreground"}`}
                    />
                    <span className="truncate">{catalog.website_url}</span>
                  </p>
                ) : null}
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-1 text-right sm:flex">
                {catalog.website_url ? (
                  <span
                    className="text-muted-foreground flex max-w-[28rem] min-w-0 items-center gap-1.5 text-sm"
                    title={catalog.website_url}
                  >
                    <Circle
                      aria-hidden="true"
                      className={`size-2 shrink-0 fill-current ${catalog.website_status === "ACTIVE" ? "text-green-600" : "text-muted-foreground"}`}
                    />
                    <span className="truncate">{catalog.website_url}</span>
                  </span>
                ) : null}
                <p className="text-muted-foreground text-sm">
                  {productCountLabel(catalog)}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
