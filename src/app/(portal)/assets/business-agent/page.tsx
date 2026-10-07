import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { BusinessAgentSettings } from "./business-agent-settings";
import { BusinessAgentInfoButton } from "../phone-numbers/[phoneNumberId]/business-agent/business-agent-info-button";

export const metadata: Metadata = { title: "Business agent" };

export default async function BusinessAgentPage() {
  if (!BUSINESS_AGENT_ENABLED) redirect("/chats");
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/chats");

  return (
    <>
      <BackBar href="/assets" />
      <PageHeader
        title="Business agent settings"
        titleAction={<BusinessAgentInfoButton />}
        description="Business agent settings for business account. To manage each phone number, go to Phone numbers page."
      />
      <BusinessAgentSettings />
    </>
  );
}