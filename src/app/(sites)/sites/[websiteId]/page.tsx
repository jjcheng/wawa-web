import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorefrontShell } from "@/components/public-storefront-shell";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { CatalogSet, GenericProductListResponse, Product, Website } from "@/lib/api/types";
import {
  getPublicWebsiteHostname,
  getPublicWebsiteOrigin,
  loadPublicNavbarItems,
  loadPublicWebsite,
} from "@/lib/public-website";
import { serializeJsonLd } from "@/lib/public-seo";
import { PublicProductsBrowser } from "./products/public-products-browser";

type PageProps = {
  params: Promise<{ websiteId: string }>;
};

function productItems(response: GenericProductListResponse) {
  return Array.isArray(response) ? response : response.items ?? [];
}

function storeName(website: Website) {
  return website.business_name || website.catalog_name || "Our Store";
}

function storeDescription(website: Website) {
  return website.description || website.tagline || website.about || `Browse the latest products from ${storeName(website)}.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { websiteId } = await params;
  const website = await loadPublicWebsite();
  if (!website || String(website.id) !== websiteId) return { robots: { index: false, follow: false } };

  const origin = await getPublicWebsiteOrigin();
  const name = storeName(website);
  const description = storeDescription(website);
  const image = website.cover_image_url || website.profile_picture_url;

  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title: { absolute: name },
    description,
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title: name,
      description,
      url: "/",
      siteName: name,
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

export default async function PublicWebsitePage({
  params,
}: PageProps) {
  const { websiteId } = await params;
  const publicOrigin = await getPublicWebsiteOrigin();
  let website: Website | null;
  let sets: CatalogSet[] = [];
  let initialProducts: Product[] = [];
  let navbarItems = [];

  try {
    website = await loadPublicWebsite();
    if (!website || String(website.id) !== websiteId) notFound();
    navbarItems = await loadPublicNavbarItems();
    const hostname = await getPublicWebsiteHostname();
    const setsResponse = await serverFetch<CatalogSet[]>("/v1/public/sets", {
      forwardedHost: hostname,
      forwardedOrigin: publicOrigin,
    });
    sets = Array.isArray(setsResponse) ? setsResponse : [];

    const firstSetId = sets[0]?.id;
    if (firstSetId) {
      const productsResponse = await serverFetch<GenericProductListResponse>(
        "/v1/public/generic-products",
        {
          query: { set_id: firstSetId, page: "1", page_size: "100" },
          forwardedHost: hostname,
          forwardedOrigin: publicOrigin,
        },
      );
      initialProducts = productItems(productsResponse);
    }
  } catch (error) {
    if (error instanceof ApiError) notFound();
    throw error;
  }

  const address = website.address?.trim();
  const hasAboutContent = Boolean(website.about);
  const name = storeName(website);
  const description = storeDescription(website);
  const socialImage = website.cover_image_url || website.profile_picture_url;
  const latitude = Number(website.latitude);
  const longitude = Number(website.longitude);
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude) && latitude !== 0 && longitude !== 0;
  const mapUrl = hasLocation
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}&z=15&output=embed`
    : undefined;
  const storeStructuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    name,
    description,
    url: publicOrigin || undefined,
    image: socialImage || undefined,
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: address,
        }
      : undefined,
    geo: hasLocation
      ? {
          "@type": "GeoCoordinates",
          latitude,
          longitude,
        }
      : undefined,
  };

  return (
    <StorefrontShell website={website} navbarItems={navbarItems}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(storeStructuredData) }}
      />
      {website.cover_image_url ? (
        <section className="relative min-h-72 overflow-hidden bg-muted sm:min-h-96">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={website.cover_image_url}
            alt={`${name} cover`}
            className="absolute inset-0 size-full object-cover"
          />
          {website.tagline ? (
            <div className="relative flex min-h-72 items-end bg-black/35 sm:min-h-96">
              <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
                <p className="max-w-3xl break-words font-[family-name:var(--font-playfair-display)] text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  {website.tagline}
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        {hasAboutContent ? (
          <div className="max-w-3xl space-y-4 text-lg leading-8 text-muted-foreground">
            {website.about ? <p>{website.about}</p> : null}
          </div>
        ) : null}
        <h1 className={`text-3xl font-bold tracking-tight sm:text-4xl ${hasAboutContent ? "mt-12" : ""}`}>
          Our Products
        </h1>
        <div className="mt-8">
          <PublicProductsBrowser
            sets={sets}
            initialSetId={sets[0]?.id}
            initialProducts={initialProducts}
          />
        </div>
      </section>
      {website.description ? (
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
            <h2 className="text-2xl font-bold tracking-tight">About Us</h2>
            <p className="mt-5 max-w-3xl whitespace-pre-line text-lg leading-8 text-muted-foreground">
              {website.description}
            </p>
          </div>
        </section>
      ) : null}
      {mapUrl ? (
        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight">Locate Us</h2>
          <div className="mt-6 aspect-[16/9] max-h-[500px] w-full overflow-hidden">
            <iframe
              src={mapUrl}
              title="Business location"
              className="size-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          {address ? <p className="mt-5 whitespace-pre-line text-lg leading-8 text-muted-foreground">{address}</p> : null}
        </section>
      ) : null}
    </StorefrontShell>
  );
}
