"use client";

import { Bot, LayoutGrid, ListChecks, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isMainRoute } from "@/components/nav/main-routes";
import type { User } from "@/lib/api/types";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { useUnreadNotificationsCount } from "@/lib/unread-notifications-store";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/ai-agent", label: "AI", icon: Bot },
  { href: "/assets", label: "Assets", icon: LayoutGrid },
] as const;

export function BottomTabBar({ userType }: { userType: User["type"] }) {
  const pathname = usePathname();
  const unreadNotificationsCount = useUnreadNotificationsCount();

  if (!isMainRoute(pathname)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
      <nav
        aria-label="Primary"
        className="glass-surface-float glass-surface-float-subtle flex w-full max-w-md items-stretch justify-around gap-1 rounded-full p-1.5"
      >
        {TABS.filter(
          (tab) =>
            (tab.href !== "/ai-agent" || (BUSINESS_AGENT_ENABLED && userType === "MASTER")),
        ).map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-16 flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground",
              )}
            >
              <span className="relative">
                <tab.icon
                  className={cn(
                    "size-6 transition-colors",
                    active ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                {tab.href === "/tasks" && unreadNotificationsCount > 0 ? (
                  <span className="absolute -top-1 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                    {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                  </span>
                ) : null}
              </span>
              <span className="relative">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
