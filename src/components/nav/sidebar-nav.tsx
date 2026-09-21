"use client";

import {
  FileText,
  Gauge,
  Globe2,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Phone,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Brand } from "@/components/brand";
import type { User } from "@/lib/api/types";
import { useUnreadNotificationsCount } from "@/lib/unread-notifications-store";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/inbox", label: "Inbox", icon: Inbox },
    ],
  },
  {
    label: "MESSAGING",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/broadcasts", label: "Broadcasts", icon: Megaphone },
    ],
  },
  {
    label: "Assets",
    items: [
      { href: "/phone-numbers", label: "Phone Numbers", icon: Phone },
      { href: "/templates", label: "Templates", icon: FileText },
      { href: "/catalogs", label: "Catalogs", icon: Store },
      { href: "/websites", label: "Websites", icon: Globe2 },
    ],
  },
  {
    label: "Analytics",
    items: [{ href: "/usage", label: "Usage", icon: Gauge }],
  },
];

export function SidebarNav({ onNavigate, user }: { onNavigate?: () => void; user: User }) {
  const pathname = usePathname();
  const unreadNotificationsCount = useUnreadNotificationsCount();

  return (
    <nav className="flex h-full flex-col gap-5 p-3">
      <Brand className="px-2" />
      {SECTIONS.filter((section) => user.type === "MASTER" || section.label !== "Analytics").map((section) => (
        <div key={section.label} className="space-y-1">
          <p className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
            {section.label}
          </p>
          {section.items
            .filter(
              (item) =>
                (!["/catalogs", "/websites"].includes(item.href) || user.type === "MASTER"),
            )
            .map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                  {item.href === "/inbox" && unreadNotificationsCount > 0 ? (
                    <span className="bg-primary text-primary-foreground ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium">
                      {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
        </div>
      ))}
    </nav>
  );
}
