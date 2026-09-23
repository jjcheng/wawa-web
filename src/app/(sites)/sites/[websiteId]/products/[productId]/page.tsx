import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorefrontShell } from "@/components/public-storefront-shell";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Product } from "@/lib/api/types";
import {
  getPublicWebsiteHostname,
  getPublicWebsiteOrigin,
  loadPublicNavbarItems,
  loadPublicWebsite,
} from "@/lib/public-website";
import { getProductName, getPublicProductPath, serializeJsonLd } from "@/lib/public-seo";
import { ProductBackButton } from "./product-back-button";
import { ProductImageGallery } from "./product-image-gallery";
import { ProductWhatsAppButton } from "./product-whatsapp-button";

type ProductPageProps = {
  params: Promise<{ websiteId: string; productId: string }>;
};

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

function storeName(website: { business_name?: string; catalog_name: string }) {
  return website.business_name || website.catalog_name || "Our Store";
}

function productDescription(product: Product, website: { description?: string; catalog_name: string; business_name?: string }) {
  return product.description || website.description || `${getProductName(product)} from ${storeName(website)}.`;
}

function hasSalePrice(product: Product) {
  return product.sale_price !== undefined && product.sale_price !== null && String(product.sale_price).trim() !== "";
}

function productPrice(product: Product) {
  const value = hasSalePrice(product) ? product.sale_price : product.price;
  return value === null || value === undefined || String(value).trim() === "" ? undefined : String(value);
}

function schemaAvailability(availability?: string) {
  const normalized = availability?.toLowerCase().replaceAll("_", " ");
  if (normalized?.includes("in stock") || normalized?.includes("available")) return "https://schema.org/InStock";
  if (normalized?.includes("out of stock") || normalized?.includes("unavailable")) return "https://schema.org/OutOfStock";
  return undefined;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { websiteId, productId } = await params;
  const website = await loadPublicWebsite();
  if (!website || String(website.id) !== websiteId) return { robots: { index: false, follow: false } };

  let product: Product;
  try {
    product = await serverFetch<Product>(`/v1/public/products/${encodeURIComponent(productId)}`, {
      forwardedHost: await getPublicWebsiteHostname(),
      forwardedOrigin: await getPublicWebsiteOrigin(),
    });
  } catch {
    return { robots: { index: false, follow: false } };
  }

  const origin = await getPublicWebsiteOrigin();
  const name = getProductName(product);
  const description = productDescription(product, website);
  const image = product.image_url || product.additional_image_urls?.find(Boolean);
  const path = getPublicProductPath(product);

  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title: { absolute: `${name} | ${storeName(website)}` },
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title: name,
      description,
      url: path,
      siteName: storeName(website),
      images: image ? [{ url: image, alt: name }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicProductDetailPage({
  params,
}: ProductPageProps) {
  const { websiteId, productId } = await params;
  const website = await loadPublicWebsite();
  if (!website || String(website.id) !== websiteId) notFound();
  const navbarItems = await loadPublicNavbarItems();

  let product: Product;
  try {
    product = await serverFetch<Product>(`/v1/public/products/${encodeURIComponent(productId)}`, {
      forwardedHost: await getPublicWebsiteHostname(),
      forwardedOrigin: await getPublicWebsiteOrigin(),
    });
  } catch (error) {
    if (error instanceof ApiError) notFound();
    throw error;
  }

  const productName = getProductName(product);
  const images = [product.image_url, ...(product.additional_image_urls ?? [])].filter(
    (image): image is string => Boolean(image),
  );
  const publicOrigin = await getPublicWebsiteOrigin();
  const path = getPublicProductPath(product);
  const price = productPrice(product);
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    description: productDescription(product, website),
    image: images.length > 0 ? images : undefined,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: storeName(website),
    },
    url: publicOrigin ? new URL(path, publicOrigin).toString() : path,
    offers: price && product.currency
      ? {
          "@type": "Offer",
          price,
          priceCurrency: product.currency,
          availability: schemaAvailability(product.availability),
          url: publicOrigin ? new URL(path, publicOrigin).toString() : path,
        }
      : undefined,
  };

  return (
    <StorefrontShell website={website} navbarItems={navbarItems}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productStructuredData) }}
      />
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-3 sm:px-8 sm:pb-14 sm:pt-4">
        <div className="sticky top-[4.5rem] z-40 -mx-5 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <ProductBackButton />
            <ProductWhatsAppButton />
          </div>
        </div>
        <div className="mt-2 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <ProductImageGallery images={images} productName={productName} />
          <div className="self-start lg:sticky lg:top-24">
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${availabilityClassName(product.availability)}`}>
                {availabilityLabel(product.availability)}
              </span>
              {product.condition ? <span className="text-xs capitalize text-muted-foreground">{product.condition}</span> : null}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{productName}</h1>
            <div className="mt-5 flex items-baseline gap-3">
              {hasSalePrice(product) && product.price !== undefined && product.price !== null ? (
                <span className="text-muted-foreground text-base font-semibold line-through">{product.price}</span>
              ) : null}
              <p className="text-base font-semibold">
                {hasSalePrice(product) ? product.sale_price : product.price ?? "Price unavailable"}
              </p>
            </div>
            {product.description ? <p className="mt-6 whitespace-pre-line leading-7 text-muted-foreground text-base">{product.description}</p> : null}
          </div>
        </div>
      </section>
    </StorefrontShell>
  );
}