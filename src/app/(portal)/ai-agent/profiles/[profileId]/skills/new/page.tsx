import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { SkillForm } from "./new-skill-form";

export const metadata: Metadata = { title: "Add skill" };

export default async function NewAgentSkillPage({
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

  return (
    <>
      <BackBar href={`/ai-agent/profiles/${id}/skills`} />
      <PageHeader
        title="Create skill"
        description="Tell this AI agent how to handle your customers."
      />
      <SkillForm profileId={id} />
    </>
  );
}
