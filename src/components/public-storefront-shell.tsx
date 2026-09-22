import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { PublicWhatsAppButton } from "@/components/public-whatsapp-button";
import type { Website } from "@/lib/api/types";

export function StorefrontShell({
  website,
  children,
}: {
  website: Website;
  children: ReactNode;
}) {
  const storeName = website.business_name || website.catalog_name || "Our Store";

  return (
    <main className="min-h-svh bg-background font-[family-name:var(--font-inter)] text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${storeName} home`}>
            {website.profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={website.profile_picture_url}
                alt=""
                className="size-10 shrink-0 rounded-full border bg-muted object-cover"
              />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {storeName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate text-lg font-bold tracking-tight">{storeName}</span>
          </Link>

          <ThemeToggle toggleOnly large />
        </div>
      </header>
      {children}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>{website.copyright_text || storeName}</span>
          {website.email ? <a className="hover:text-foreground" href={`mailto:${website.email}`}>{website.email}</a> : null}
        </div>
      </footer>
      <PublicWhatsAppButton storeName={storeName} />
    </main>
  );
}