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
  const storeName = website.catalog_name || "Our Store";

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
            <span className="truncate text-lg font-semibold tracking-tight">{storeName}</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-3">
            <nav className="flex items-center gap-1" aria-label="Storefront navigation">
              <Link href="/about" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                About
              </Link>
              <Link href="/products" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                Products
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>{storeName}</span>
          {website.email ? <a className="hover:text-foreground" href={`mailto:${website.email}`}>{website.email}</a> : null}
        </div>
      </footer>
      <PublicWhatsAppButton storeName={storeName} />
    </main>
  );
}