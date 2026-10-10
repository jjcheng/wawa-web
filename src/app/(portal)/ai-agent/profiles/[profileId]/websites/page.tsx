import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { agentWebsitesSchema, type AgentWebsite } from "./website-data";
import { WebsitesList } from "./websites-list";
import { AddWebsiteButton } from "./add-website-button";

export const metadata: Metadata = { title: "Websites" };

export default async function AgentWebsitesPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  if (!BUSINESS_AGENT_ENABLED) redirect("/chats");
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/chats");

  const { profileId } = await params;
  const id = Number(profileId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  let websites: AgentWebsite[] = [];
  let errorMessage: string | null = null;
  try {
    websites = agentWebsitesSchema.parse(
      await serverFetch<unknown>(`/v1/ai-agent/profiles/${id}/websites`),
    );
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    if (!(error instanceof ApiError)) throw error;
    errorMessage = error.message;
  }

  return (
    <>
      <BackBar href={`/ai-agent/profiles/${id}`} />
      <PageHeader
        title="Websites"
        description="Web pages this AI agent can reference."
        action={<AddWebsiteButton profileId={id} />}
      />
      {errorMessage ? (
        <div
          className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : (
        <WebsitesList websites={websites} profileId={id} />
      )}
    </>
  );
}
