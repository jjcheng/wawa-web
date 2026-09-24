import type { MetadataRoute } from "next";

import { loadPublicWebsite, getPublicWebsiteOrigin } from "@/lib/public-website";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const website = await loadPublicWebsite();
  const origin = await getPublicWebsiteOrigin();

  if (!website || !origin) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${origin}/sitemap.xml`,
  };
}