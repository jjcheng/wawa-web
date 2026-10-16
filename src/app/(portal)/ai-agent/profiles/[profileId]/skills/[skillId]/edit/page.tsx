import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import type { AgentSkill } from "../../skills-list";
import { SkillForm } from "../../new/new-skill-form";

export const metadata: Metadata = { title: "Edit skill" };

export default async function EditAgentSkillPage({
  params,
}: {
  params: Promise<{ profileId: string; skillId: string }>;
}) {
  if (!BUSINESS_AGENT_ENABLED) redirect("/chats");
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/chats");

  const { profileId, skillId } = await params;
  const id = Number(profileId);
  const skillNumber = Number(skillId);
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    !Number.isSafeInteger(skillNumber) ||
    skillNumber < 1
  ) {
    notFound();
  }

  const response = await serverFetch<AgentSkill[] | null>(
    `/v1/ai-agent/profiles/${id}/skills`,
  );
  if (response != null && !Array.isArray(response)) {
    throw new Error("Unexpected response while loading agent skills.");
  }
  const skill = response?.find((item) => item.id === skillNumber);
  if (!skill) notFound();

  return (
    <>
      <BackBar href={`/ai-agent/profiles/${id}/skills`} />
      <PageHeader
        title="Edit skill"
        description="Update how this AI agent handles your customers."
      />
      <SkillForm key={skill.id} profileId={id} skill={skill} />
    </>
  );
}
