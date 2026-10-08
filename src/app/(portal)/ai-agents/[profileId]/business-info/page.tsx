import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { BusinessInfoForm, type BusinessInfoItem } from "./business-info-form";

export const metadata: Metadata = { title: "Business info" };

type AgentProfileWithBusinessInfo = {
  id: number;
  name: string;
  business_info?: BusinessInfoItem[] | null;
};

export default async function AgentBusinessInfoPage({
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

  let profile: AgentProfileWithBusinessInfo;
  try {
    profile = await serverFetch<AgentProfileWithBusinessInfo>(`/v1/ai-agent/profiles/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    if (!(error instanceof ApiError)) throw error;

    return (
      <>
        <BackBar href={`/ai-agent/profiles/${id}`} />
        <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm">
          {error.message}
        </div>
      </>
    );
  }

  return (
    <BusinessInfoForm
      profileId={id}
      profileName={profile.name}
      initialBusinessInfo={profile.business_info ?? []}
    />
  );
}
