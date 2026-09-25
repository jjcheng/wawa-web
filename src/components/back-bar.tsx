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
}: {
  href: string;
  children?: ReactNode;
  actions?: ReactNode;
  history?: boolean;
}) {
  const router = useRouter();

  return (
    <>
      <div className="fixed top-14 right-0 left-0 z-20 flex h-12 items-center justify-between px-2 pt-1 pb-1 lg:left-52 xl:left-60 sm:px-4">
        {history ? (
          <Button type="button" variant="ghost" className="bg-muted" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
            {children}
          </Button>
        ) : (
          <Button asChild variant="ghost" className="bg-muted">
            <Link href={href}>
              <ArrowLeft className="size-4" />
              {children}
            </Link>
          </Button>
        )}
        {actions}
      </div>
      <div className="mb-2 h-7" />
    </>
  );
}
