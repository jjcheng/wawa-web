import type { MetadataRoute } from "next";

import { loadPublicNavbarItems, loadPublicWebsite, getPublicWebsiteOrigin } from "@/lib/public-website";

function pageUrl(origin: string, slug?: string) {
  const normalizedSlug = slug?.replace(/^\/+/, "").trim();
  return normalizedSlug ? new URL(`/${normalizedSlug}`, origin).toString() : origin;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const website = await loadPublicWebsite();
  const origin = await getPublicWebsiteOrigin();

  if (!website || !origin) return [];

  const navbarItems = await loadPublicNavbarItems();
  const navigationEntries = navbarItems
    .filter((item) => item.title?.trim() && item.slug?.trim())
    .map((item) => ({
      url: pageUrl(origin, item.slug),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [
    {
      url: origin,
      changeFrequency: "daily",
      priority: 1,
    },
    ...navigationEntries,
  ];
}