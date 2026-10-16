import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { AddFaqButton } from "./add-faq-button";
import { FaqsList, type AgentFaq } from "./faqs-list";

export const metadata: Metadata = { title: "FAQs" };

export default async function AgentFaqsPage({
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

  let faqs: AgentFaq[] = [];
  let errorMessage: string | null = null;
  try {
    const response = await serverFetch<AgentFaq[] | null>(`/v1/ai-agent/profiles/${id}/faqs`);
    if (response != null) {
      if (!Array.isArray(response)) {
        throw new Error("Unexpected response while loading agent FAQs.");
      }
      faqs = response;
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
        title="FAQs"
        description="Frequently asked questions this AI agent can answer."
        action={<AddFaqButton profileId={id} />}
      />
      {errorMessage ? (
        <div
          className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : (
        <FaqsList faqs={faqs} profileId={id} />
      )}
    </>
  );
}
