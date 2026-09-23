import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { serverFetch } from "@/lib/api/server-client";
import type { Website, WebsitePage } from "@/lib/api/types";
import { WebsitePageForm } from "../new/website-page-form";

export const metadata: Metadata = { title: "Edit page" };

export default async function EditWebsitePage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string; pageId: string }>;
  searchParams: Promise<{ return_to?: string }>;
}) {
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/dashboard");

  const { websiteId, pageId } = await params;
  const { return_to: returnTo } = await searchParams;
  const [website, page] = await Promise.all([
    serverFetch<Website>(`/v1/commerce/websites/${encodeURIComponent(websiteId)}`),
    serverFetch<WebsitePage>(`/v1/commerce/pages/${encodeURIComponent(pageId)}`),
  ]);
  const safeReturnTo = returnTo?.startsWith(`/websites/${websiteId}`)
    ? returnTo
    : `/websites/${websiteId}?tab=pages`;

  return (
    <>
      <BackBar href={safeReturnTo} />
      <PageHeader title="Edit page" description="Add/Edit a page for your website." />
      <Card className="max-w-2xl rounded-md">
        <CardContent className="space-y-5">
          <WebsitePageForm websiteId={websiteId} websiteUrl={website.url} page={page} returnTo={safeReturnTo} />
        </CardContent>
      </Card>
    </>
  );
}