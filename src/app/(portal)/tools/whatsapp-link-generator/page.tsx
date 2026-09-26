import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "WhatsApp link generator" };

export default async function WhatsAppLinkGeneratorPage() {
  await requireUser();

  return (
    <>
      <BackBar href="/tools" />
      <PageHeader
        title="WhatsApp link generator"
        description="Automatically rotate phone numbers with click statistics."
      />
      <p className="text-muted-foreground text-sm">Work in progress</p>
    </>
  );
}