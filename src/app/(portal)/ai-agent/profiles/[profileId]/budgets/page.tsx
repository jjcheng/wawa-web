import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { formatBudget } from "./budget-format";
import { BudgetsForm, type Budgets } from "./budgets-form";

export const metadata: Metadata = { title: "Budgets" };

type AgentProfileWithBudgets = Budgets & {
  name: string;
};

export default async function AgentBudgetsPage({
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

  let profile: AgentProfileWithBudgets;
  try {
    profile = await serverFetch<AgentProfileWithBudgets>(`/v1/ai-agent/profiles/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    if (!(error instanceof ApiError)) throw error;

    return (
      <>
        <BackBar href={`/ai-agent/profiles/${id}`} />
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
        title="Budgets"
        description={`Usage budgets for ${profile.name || "this agent profile"}. All usage are calculated in USD for now.`}
      />
      <BudgetsForm
        profileId={id}
        initialBudgets={{
          budget_daily: profile.budget_daily,
          budget_7_days: profile.budget_7_days,
          budget_30_days: profile.budget_30_days,
        }}
        initialValues={{
          budget_daily: formatBudget(profile.budget_daily),
          budget_7_days: formatBudget(profile.budget_7_days),
          budget_30_days: formatBudget(profile.budget_30_days),
        }}
      />
    </>
  );
}
