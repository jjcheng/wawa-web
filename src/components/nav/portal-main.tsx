"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { MAIN_ROUTES } from "@/components/nav/main-routes";
import { cn } from "@/lib/utils";

export function PortalMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showTabBar = MAIN_ROUTES.includes(pathname);

  return (
    <main
      className={cn(
        "flex-1 px-4 pt-4 sm:px-6 sm:pt-6 lg:pb-6",
        showTabBar ? "pb-[calc(var(--tab-bar-height)+1rem)]" : "pb-4 sm:pb-6",
      )}
    >
      {children}
    </main>
  );
}
