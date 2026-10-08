import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { SkillsList, type AgentSkill } from "./skills-list";
import { AddSkillButton } from "./add-skill-button";

export const metadata: Metadata = { title: "Skills" };

export default async function AgentSkillsPage({
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

  let skills: AgentSkill[] = [];
  let errorMessage: string | null = null;
  try {
    const response = await serverFetch<AgentSkill[] | null>(
      `/v1/ai-agent/profiles/${id}/skills`,
    );
    if (response != null) {
      if (!Array.isArray(response)) {
        throw new Error("Unexpected response while loading agent skills.");
      }
      skills = response;
    }
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    if (!(error instanceof ApiError)) throw error;
    errorMessage = error.message;
  }

  return (
    <>
      <BackBar href={`/ai-agent/profiles/${id}`} />
      <PageHeader
        title="Skills"
        description="Tell this AI agent how to handle your customers."
        action={<AddSkillButton profileId={id} />}
      />
      {errorMessage ? (
        <div
          className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : (
        <SkillsList skills={skills} profileId={id} />
      )}
    </>
  );
}
