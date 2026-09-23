"use client";

import { Menu } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { PublicNavbarItem } from "@/lib/api/types";

export function PublicStorefrontNavigation({
  items,
  desktop = true,
  mobile = true,
}: {
  items: PublicNavbarItem[];
  desktop?: boolean;
  mobile?: boolean;
}) {
  const navigationItems = items.filter(
    (item): item is PublicNavbarItem & { title: string; slug: string } =>
      Boolean(item.title?.trim() && item.slug?.trim()),
  );
  if (navigationItems.length === 0) return null;

  return (
    <>
      {desktop ? (
        <nav className="hidden h-9 items-center gap-5 lg:flex" aria-label="Storefront navigation">
          {navigationItems.map((item) => (
            <Link key={item.slug} href={`/${item.slug.replace(/^\/+/, "")}`} className="max-w-40 truncate text-sm font-medium hover:underline">
              {item.title}
            </Link>
          ))}
        </nav>
      ) : null}
      {mobile ? <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="bg-background/85 p-0 backdrop-blur-xl">
          <nav className="flex flex-col pt-14 p-3" aria-label="Storefront navigation">
            {navigationItems.map((item) => (
              <SheetClose key={item.slug} asChild>
                <Link href={`/${item.slug.replace(/^\/+/, "")}`} className="rounded-md px-3 py-3 text-base font-medium hover:bg-muted">
                  {item.title}
                </Link>
              </SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet> : null}
    </>
  );
}
