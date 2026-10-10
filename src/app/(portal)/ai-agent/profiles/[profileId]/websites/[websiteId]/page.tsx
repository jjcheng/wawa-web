import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { crawledPagesSchema, type CrawledPagesResponse } from "../website-data";
import { CrawledPagesList } from "./crawled-pages-list";

export const metadata: Metadata = { title: "Crawled pages" };

export default async function CrawledPagesPage({
  params,
}: {
  params: Promise<{ profileId: string; websiteId: string }>;
}) {
  if (!BUSINESS_AGENT_ENABLED) redirect("/chats");
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/chats");

  const { profileId, websiteId } = await params;
  const profile = Number(profileId);
  const website = Number(websiteId);
  if (
    !Number.isSafeInteger(profile) ||
    profile < 1 ||
    !Number.isSafeInteger(website) ||
    website < 1
  )
    notFound();

  let result: CrawledPagesResponse | null = null;
  let errorMessage: string | null = null;
  try {
    result = crawledPagesSchema.parse(
      await serverFetch<unknown>(`/v1/ai-agent/websites/${website}`, {
        query: { cursor: "0", limit: "30" },
      }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    if (!(error instanceof ApiError)) throw error;
    errorMessage = error.message;
  }

  return (
    <>
      <BackBar href={`/ai-agent/profiles/${profile}/websites`} />
      {errorMessage ? (
        <>
          <PageHeader
            title="Crawled pages"
            description="View crawl progress and pages from this website."
          />
          <div
            className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm"
            role="alert"
          >
            {errorMessage}
          </div>
        </>
      ) : result ? (
        <CrawledPagesList
          key={`${website}:${JSON.stringify(result)}`}
          websiteId={website}
          profileId={profile}
          initialResult={result}
        />
      ) : null}
    </>
  );
}
