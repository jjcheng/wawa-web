import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BackBar({
  href,
  children = "Back",
  actions,
}: {
  href: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <>
      <div className="fixed top-14 right-0 left-0 z-20 flex h-12 items-center justify-between bg-background px-2 pt-1 pb-1 lg:left-64 sm:px-4">
        <Button asChild variant="ghost">
          <Link href={href}>
            <ArrowLeft className="size-4" />
            {children}
          </Link>
        </Button>
        {actions}
      </div>
      <div className="mb-2 h-7" />
    </>
  );
}
