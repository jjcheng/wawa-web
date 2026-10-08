import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import type { AgentProfile } from "../profile-form";
import { AgentProfileDetail } from "./profile-detail";

export const metadata: Metadata = { title: "Agent profile" };

export default async function AgentProfilePage({
  params,
}: PageProps<"/ai-agent/profiles/[profileId]">) {
  if (!BUSINESS_AGENT_ENABLED) redirect("/chats");
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/chats");

  const { profileId } = await params;
  const id = Number(profileId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  let profile: AgentProfile;
  try {
    profile = await serverFetch<AgentProfile>(`/v1/ai-agent/profiles/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    if (!(error instanceof ApiError)) throw error;

    return (
      <>
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error.message}
        </div>
      </>
    );
  }

  return (
    <AgentProfileDetail profile={profile} />
  );
}
