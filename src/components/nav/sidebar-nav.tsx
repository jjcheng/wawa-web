"use client";

import {
  BarChart3,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Megaphone,
  Phone,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Communication",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/campaigns", label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    label: "Assets",
    items: [
      { href: "/whatsapp/numbers", label: "Phone Numbers", icon: Phone },
      { href: "/whatsapp/templates", label: "Message Templates", icon: FileText },
      { href: "/workflows", label: "Workflows", icon: Workflow },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/analytics/usage", label: "Usage & Costs", icon: CircleDollarSign },
      { href: "/analytics/delivery", label: "Delivery Reports", icon: BarChart3 },
    ],
  },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-6 p-4">
      <Brand className="px-2" />
      {SECTIONS.map((section) => (
        <div key={section.label} className="space-y-1">
          <p className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
            {section.label}
          </p>
          {section.items.map((item) => {
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
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
