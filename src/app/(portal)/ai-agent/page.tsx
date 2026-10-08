import type { Metadata } from "next";
import { BookOpen, Bot, FlaskConical, Handshake, ListChecks } from "lucide-react";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import type { AgentProfile } from "./profiles/profile-form";
import { AgentProfilesList } from "./profiles/profiles-list";
import { CreateAgentProfileButton } from "./create-agent-profile-button";

export const metadata: Metadata = { title: "AI agent" };

const AI_AGENT_BENEFITS = [
  {
    icon: BookOpen,
    title: "Knowledge",
    text: "Teach the agent your business info, FAQs, files, and websites.",
  },
  {
    icon: ListChecks,
    title: "Instructions",
    text: "Define how agent responds to your customers.",
  },
  {
    icon: Handshake,
    title: "Handover & Followup",
    text: "Hand over to a human and follow up when customers go quiet.",
  },
  { icon: FlaskConical, title: "Test", text: "Try the agent before your customers do." },
];

export default async function AiAgentPage() {
  if (!BUSINESS_AGENT_ENABLED) redirect("/chats");
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/chats");

  let profiles: AgentProfile[];
  try {
    const response = await serverFetch<AgentProfile[] | null>("/v1/ai-agent/profiles");
    if (response == null) {
      profiles = [];
    } else if (Array.isArray(response)) {
      profiles = response;
    } else {
      throw new Error("Unexpected response while loading agent profiles.");
    }
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Could not load agent profiles.";
    return (
      <>
        <PageHeader
          title="AI agent profiles"
          description="Manage different agent profiles for different phone numbers."
        />
        <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm">
          {message}
        </div>
      </>
    );
  }

  if (profiles.length > 0) return <AgentProfilesList initialProfiles={profiles} />;

  return (
    <>
      <PageHeader
        title="AI agent"
        description="Configure your AI agent profile to get started."
      />
      <section className="bg-card mt-5 rounded-xl border p-6 text-center sm:p-8">
        <span className="bg-accent mx-auto flex size-12 items-center justify-center rounded-full">
          <Bot className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Get started with AI agent</h2>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
          Let AI handle your customer enquiries while you take a rest.
        </p>
        <ul className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
          {AI_AGENT_BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3 rounded-lg border p-3">
              <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block text-sm font-medium">{title}</span>
                <span className="text-muted-foreground block text-sm">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <CreateAgentProfileButton />
      </section>
    </>
  );
}
