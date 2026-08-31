"use client";

import { LogOut, Menu, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SidebarNav } from "@/components/nav/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api/client";
import { logoutAction } from "@/lib/auth/actions";
import type { BusinessAccount, BusinessPortfolio, User } from "@/lib/api/types";

function initials(user: User) {
  const source = user.name?.trim() || user.phone_number || "?";
  return source.slice(0, 2).toUpperCase();
}

type BusinessContext = {
  portfolioName: string | null;
  accountName: string | null;
};

const businessContextRequests = new Map<string, Promise<BusinessContext>>();

function businessContextStorageKey(user: User) {
  return `wawa.business-context.v2.${user.id}`;
}

function readBusinessContext(user: User): BusinessContext | null {
  try {
    const value = localStorage.getItem(businessContextStorageKey(user));
    if (!value) return null;

    const context = JSON.parse(value) as BusinessContext;
    if (typeof context.portfolioName !== "string" && context.portfolioName !== null) return null;
    if (typeof context.accountName !== "string" && context.accountName !== null) return null;
    return context;
  } catch {
    return null;
  }
}

function hasBusinessContextNames(context: BusinessContext) {
  return Boolean(context.portfolioName?.trim() && context.accountName?.trim());
}

export function Topbar({ user }: { user: User }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null);
  const logoutFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const cached = readBusinessContext(user);
    if (cached && hasBusinessContextNames(cached)) {
      const frame = requestAnimationFrame(() => setBusinessContext(cached));
      return () => cancelAnimationFrame(frame);
    }

    let active = true;
    const storageKey = businessContextStorageKey(user);
    const request =
      businessContextRequests.get(storageKey) ??
      Promise.all([
        apiFetch<BusinessPortfolio>("/v1/wa/business-portfolios"),
        apiFetch<BusinessAccount>("/v1/wa/business-accounts"),
      ]).then(([portfolio, account]) => ({
        portfolioName: portfolio.name ?? null,
        accountName: account.name ?? null,
      }));

    businessContextRequests.set(storageKey, request);
    void request
      .then((context) => {
        localStorage.setItem(storageKey, JSON.stringify(context));
        if (active) setBusinessContext(context);
      })
      .catch(() => {
        businessContextRequests.delete(storageKey);
      });

    return () => {
      active = false;
    };
  }, [user]);

  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {businessContext?.portfolioName || businessContext?.accountName ? (
        <div className="min-w-0 leading-tight">
          {businessContext.portfolioName ? (
            <p className="truncate text-sm font-medium">{businessContext.portfolioName}</p>
          ) : null}
          {businessContext.accountName ? (
            <p className="text-muted-foreground truncate text-xs">{businessContext.accountName}</p>
          ) : null}
        </div>
      ) : null}

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initials(user)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline">
                {user.name || user.phone_number}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user.name || "Account"}</p>
              <p className="text-muted-foreground text-xs">
                {user.email || user.phone_number}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile">
                <Settings className="size-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                const storageKey = businessContextStorageKey(user);
                localStorage.removeItem(storageKey);
                businessContextRequests.delete(storageKey);
                logoutFormRef.current?.requestSubmit();
              }}
            >
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <form ref={logoutFormRef} action={logoutAction} className="hidden" />
    </header>
  );
}
