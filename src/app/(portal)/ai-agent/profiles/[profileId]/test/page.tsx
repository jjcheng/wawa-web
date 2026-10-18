import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import type { AgentProfile } from "../../profile-form";
import { ProfileTestChat, type ProfileMessage } from "./test-chat";

export const metadata: Metadata = { title: "Test" };

export default async function AgentProfileTestPage({
  params,
}: PageProps<"/ai-agent/profiles/[profileId]/test">) {
  if (!BUSINESS_AGENT_ENABLED) redirect("/chats");
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/chats");

  const { profileId } = await params;
  const id = Number(profileId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  let profile: AgentProfile;
  let messages: ProfileMessage[] = [];
  let error: string | null = null;
  try {
    profile = await serverFetch<AgentProfile>(`/v1/ai-agent/profiles/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.statusCode === 404) notFound();
    throw e;
  }
  try {
    messages =
      (await serverFetch<ProfileMessage[] | null>(`/v1/ai-agent/profiles/${id}/messages`)) ??
      [];
  } catch (e) {
    if (e instanceof ApiError && e.statusCode === 404) notFound();
    if (!(e instanceof ApiError)) throw e;
    error = e.message;
  }

  return (
    <>
      <BackBar href={`/ai-agent/profiles/${id}`} />
      {error ? (
        <div className="border-destructive/40 bg-destructive/5 text-destructive mb-4 rounded-md border p-3 text-sm">
          {error}
        </div>
      ) : null}
      <ProfileTestChat
        profileId={id}
        name={profile.name || "AI agent"}
        initialMessages={messages}
      />
    </>
  );
}
