import type { Metadata } from "next";
import { Link2 } from "lucide-react";
import Link from "next/link";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Tools" };

export default async function ToolsPage() {
  await requireUser();

  return (
    <>
      <BackBar href="/assets" />
      <PageHeader title="Tools" description="Useful tools in conducting business." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/tools/whatsapp-link-generator" className="min-w-0">
          <Card className="h-full rounded-full transition-colors hover:bg-accent/60">
            <CardContent className="flex min-w-0 items-center gap-3 px-4">
              <span className="bg-accent flex size-10 shrink-0 items-center justify-center rounded-full">
                <Link2 className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">WhatsApp link generator</span>
                <span className="text-muted-foreground block text-sm">
                  Automatically rotate phone numbers with click statistics.
                </span>
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}