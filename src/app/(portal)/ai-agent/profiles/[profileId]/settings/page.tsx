import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { OtherSettingsForm } from "./other-settings-form";

export const metadata: Metadata = { title: "Other settings" };

type AgentProfileWithSettings = {
  name: string;
  handover_message?: string | null;
  never_say_phrases?: string[] | null;
};

export default async function AgentOtherSettingsPage({
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

  let profile: AgentProfileWithSettings;
  try {
    profile = await serverFetch<AgentProfileWithSettings>(`/v1/ai-agent/profiles/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    if (!(error instanceof ApiError)) throw error;
    return (
      <>
        <BackBar href={`/ai-agent/profiles/${id}`} />
        <PageHeader title="Other settings" />
        <div
          className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm"
          role="alert"
        >
          {error.message}
        </div>
      </>
    );
  }

  return (
    <>
      <BackBar href={`/ai-agent/profiles/${id}`} />
      <PageHeader
        title="Other settings"
        description={`Other configurations for ${profile.name || "this agent profile"}.`}
      />
      <OtherSettingsForm
        profileId={id}
        initialHandoverMessage={profile.handover_message ?? ""}
        initialNeverSayPhrases={profile.never_say_phrases ?? []}
      />
    </>
  );
}
