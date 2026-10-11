"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function BackBar({
  href,
  children = "Back",
  actions,
  history = false,
  inline = false,
  showBack = true,
}: {
  href: string;
  children?: ReactNode;
  actions?: ReactNode;
  history?: boolean;
  inline?: boolean;
  showBack?: boolean;
}) {
  const router = useRouter();

  return (
    <>
      <div className={inline
        ? `mb-2 flex shrink-0 items-center gap-2 ${showBack ? "justify-between" : "justify-end"}`
        : "fixed top-14 right-[var(--ai-panel-width,0px)] left-0 z-20 flex h-12 items-center justify-between px-4 pt-1 pb-1 sm:px-5 lg:left-56 xl:left-64"}>
        {showBack ? history ? (
          <Button type="button" variant="ghost" className="bg-muted dark:bg-muted/90" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
            {children}
          </Button>
        ) : (
          <Button asChild variant="ghost" className="bg-muted dark:bg-muted/90">
            <Link href={href}>
              <ArrowLeft className="size-4" />
              {children}
            </Link>
          </Button>
        ) : null}
        {actions}
      </div>
      {!inline ? <div className="mb-2 h-7" /> : null}
    </>
  );
}
