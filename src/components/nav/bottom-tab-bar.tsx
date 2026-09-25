"use client";

import { LayoutGrid, ListChecks, MessageCircle, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MAIN_ROUTES } from "@/components/nav/main-routes";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/todos", label: "TO-DOs", icon: ListChecks },
  { href: "/catalogs", label: "Catalogs", icon: Store },
  { href: "/assets", label: "Assets", icon: LayoutGrid },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  if (!MAIN_ROUTES.includes(pathname)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
      <nav
        aria-label="Primary"
        className="glass-surface-float flex w-full max-w-md items-stretch justify-around gap-1 rounded-full p-1.5"
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="relative flex min-w-16 flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[11px] font-medium transition-colors"
            >
              {active ? (
                <span className="bg-primary/12 absolute inset-0 rounded-full shadow-[inset_0_1px_0_0_var(--glass-highlight)]" />
              ) : null}
              <tab.icon
                className={cn(
                  "relative size-6 transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className={cn("relative", active ? "text-primary" : "text-muted-foreground")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
