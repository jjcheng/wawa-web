import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StorefrontShell } from "@/components/public-storefront-shell";
import { loadPublicWebsite } from "@/lib/public-website";

export const metadata: Metadata = { title: "Website" };

export default async function PublicWebsitePage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  const website = await loadPublicWebsite();
  if (!website || String(website.id) !== websiteId) notFound();

  return (
    <StorefrontShell website={website}>
      <section className="border-b bg-muted/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="max-w-2xl space-y-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Curated for you</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {website.catalog_name || "Welcome to our store"}
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              {website.description || "Browse our collection and discover something you will love."}
            </p>
            <Link href="/products" className="inline-flex rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90">
              Shop products
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Discover the collection</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Simple shopping, clear choices.</h2>
          </div>
          <Link href="/about" className="text-sm font-semibold underline underline-offset-4">
            Learn about us
          </Link>
        </div>
      </section>
    </StorefrontShell>
  );
}
