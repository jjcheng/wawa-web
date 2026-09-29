import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { BusinessAgentSettings } from "./business-agent-settings";
import { BusinessAgentInfoButton } from "../phone-numbers/[phoneNumberId]/business-agent/business-agent-info-button";

export const metadata: Metadata = { title: "Business agent" };

export default async function BusinessAgentPage() {
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/dashboard");

  return (
    <>
      <BackBar href="/assets" />
      <PageHeader
        title="Business agent"
        titleAction={<BusinessAgentInfoButton />}
        description="Settings apply to business agents of all phone numbers."
      />
      <BusinessAgentSettings />
    </>
  );
}