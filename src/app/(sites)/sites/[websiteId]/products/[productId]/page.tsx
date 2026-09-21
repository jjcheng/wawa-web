import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StorefrontShell } from "@/components/public-storefront-shell";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Product } from "@/lib/api/types";
import {
  getPublicWebsiteHostname,
  getPublicWebsiteOrigin,
  loadPublicWebsite,
} from "@/lib/public-website";

export const metadata: Metadata = { title: "Product" };

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

export default async function PublicProductDetailPage({
  params,
}: {
  params: Promise<{ websiteId: string; productId: string }>;
}) {
  const { websiteId, productId } = await params;
  const website = await loadPublicWebsite();
  if (!website || String(website.id) !== websiteId) notFound();

  let product: Product;
  try {
    product = await serverFetch<Product>(`/v1/public/products/${encodeURIComponent(productId)}`, {
      forwardedHost: await getPublicWebsiteHostname(),
      forwardedOrigin: await getPublicWebsiteOrigin(),
    });
  } catch (error) {
    if (error instanceof ApiError) notFound();
    notFound();
  }

  const productName = product.name || product.title || "Product";
  const images = [product.image_url, ...(product.additional_image_urls ?? [])].filter(
    (image): image is string => Boolean(image),
  );

  return (
    <StorefrontShell website={website}>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <Link href="/products" className="text-sm font-semibold underline underline-offset-4">Back to products</Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="grid gap-4 sm:grid-cols-2">
            {images.length > 0 ? images.map((image, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={image} src={image} alt={index === 0 ? productName : ""} className="aspect-square w-full rounded-lg border bg-muted object-cover" />
            )) : <div className="bg-muted aspect-square rounded-lg" />}
          </div>
          <div className="self-start lg:sticky lg:top-24">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${availabilityClassName(product.availability)}`}>
                {availabilityLabel(product.availability)}
              </span>
              {product.condition ? <span className="text-sm capitalize text-muted-foreground">{product.condition}</span> : null}
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight">{productName}</h1>
            <p className="mt-5 text-2xl font-semibold">
              {product.sale_price ?? product.price ?? "Price unavailable"}
              {product.currency ? ` ${product.currency}` : ""}
            </p>
            {product.description ? <p className="mt-6 whitespace-pre-line leading-7 text-muted-foreground">{product.description}</p> : null}
            {typeof product.url === "string" && product.url ? (
              <a href={product.url} target="_blank" rel="noreferrer" className="mt-8 inline-flex rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Visit retailer
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </StorefrontShell>
  );
}