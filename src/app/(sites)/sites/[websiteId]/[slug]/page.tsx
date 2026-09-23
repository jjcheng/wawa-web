import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorefrontShell } from "@/components/public-storefront-shell";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { PublicWebsitePage } from "@/lib/api/types";
import { stripScriptTags, withLazyImages } from "@/lib/html";
import { serializeJsonLd } from "@/lib/public-seo";
import {
  getPublicWebsiteHostname,
  getPublicWebsiteOrigin,
  loadPublicNavbarItems,
  loadPublicWebsite,
} from "@/lib/public-website";
import { ProductBackButton } from "../products/[productId]/product-back-button";
import { ProductWhatsAppButton } from "../products/[productId]/product-whatsapp-button";
import { PublicPageContent } from "./public-page-content";

type PublicPageProps = {
  params: Promise<{ websiteId: string; slug: string }>;
};

async function loadPageBySlug(slug: string) {
  return serverFetch<PublicWebsitePage>("/v1/public/page", {
    query: { slug },
    forwardedHost: await getPublicWebsiteHostname(),
    forwardedOrigin: await getPublicWebsiteOrigin(),
  });
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  const { websiteId, slug } = await params;
  const website = await loadPublicWebsite();
  if (!website || String(website.id) !== websiteId) return { robots: { index: false, follow: false } };

  try {
    const page = await loadPageBySlug(slug);
    const title = page.title || website.business_name || website.catalog_name || "Page";
    const description = page.description || website.description || "";
    const origin = await getPublicWebsiteOrigin();
    const image = website.cover_image_url || website.profile_picture_url;
    return {
      metadataBase: origin ? new URL(origin) : undefined,
      title: { absolute: title },
      description,
      alternates: { canonical: `/${slug}` },
      robots: { index: true, follow: true },
      openGraph: {
        type: "website",
        title,
        description,
        url: `/${slug}`,
        siteName: website.business_name || website.catalog_name || "Our Store",
        images: image ? [{ url: image, alt: title }] : undefined,
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return { robots: { index: false, follow: false } };
  }
}

export default async function PublicWebsiteSlugPage({ params }: PublicPageProps) {
  const { websiteId, slug } = await params;
  const website = await loadPublicWebsite();
  if (!website || String(website.id) !== websiteId) notFound();

  let page: PublicWebsitePage;
  try {
    page = await loadPageBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError) notFound();
    throw error;
  }
  const navbarItems = await loadPublicNavbarItems();
  const publicOrigin = await getPublicWebsiteOrigin();
  const title = page.title || "Page";
  const description = page.description || website.description || "";
  const pageStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: publicOrigin ? new URL(`/${slug}`, publicOrigin).toString() : `/${slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: website.business_name || website.catalog_name || "Our Store",
      url: publicOrigin || undefined,
    },
  };

  return (
    <StorefrontShell website={website} navbarItems={navbarItems}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(pageStructuredData) }}
      />
      <article className="mx-auto max-w-6xl px-5 pb-10 pt-3 sm:px-8 sm:pb-14 sm:pt-4">
        <div className="sticky top-[4.5rem] z-40 -mx-5 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <ProductBackButton />
            <ProductWhatsAppButton />
          </div>
        </div>
        <div className="mt-8 max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
          {page.description ? <p className="mt-6 whitespace-pre-line text-lg leading-7 text-muted-foreground">{page.description}</p> : null}
        {page.content ? (
          <PublicPageContent html={withLazyImages(stripScriptTags(page.content))} />
        ) : null}
        </div>
      </article>
    </StorefrontShell>
  );
}