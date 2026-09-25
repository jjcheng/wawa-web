"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/password", label: "Password" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  const tabs = TABS;

  return (
    <div className="mb-4 inline-flex w-fit items-center rounded-lg bg-muted p-[3px]">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
