import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorefrontShell } from "@/components/public-storefront-shell";
import { loadPublicWebsite } from "@/lib/public-website";

export const metadata: Metadata = { title: "About" };

export default async function PublicWebsiteAboutPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  const website = await loadPublicWebsite();
  if (!website || String(website.id) !== websiteId) notFound();

  const storeName = website.catalog_name || "Our Store";

  return (
    <StorefrontShell website={website}>
      <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">About {storeName}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Made for everyday discovery.</h1>
        <div className="mt-8 space-y-6 text-lg leading-8 text-muted-foreground">
          <p>{website.about || website.description || `Learn more about ${storeName} and our collection.`}</p>
          {website.description && website.description !== website.about ? <p>{website.description}</p> : null}
        </div>
        {(website.address || website.email) ? (
          <section className="mt-12 border-t pt-8">
            <h2 className="text-lg font-semibold">Get in touch</h2>
            <div className="mt-4 space-y-2 text-muted-foreground">
              {website.address ? <p>{website.address}</p> : null}
              {website.email ? <a className="block hover:text-foreground hover:underline" href={`mailto:${website.email}`}>{website.email}</a> : null}
            </div>
          </section>
        ) : null}
      </section>
    </StorefrontShell>
  );
}