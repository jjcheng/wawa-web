import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { loadBusinessAgentPhoneNumber } from "../load-phone-number";

export const metadata: Metadata = { title: "Tools" };

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ phoneNumberId: string }>;
}) {
  const { phoneNumberId } = await params;
  const { phoneNumber, displayNumber } = await loadBusinessAgentPhoneNumber(phoneNumberId, {
    requireOnboarded: true,
  });

  return (
    <>
      <BackBar href={`/assets/phone-numbers/${phoneNumber.id}/business-agent`} />
      <PageHeader title="Tools" description={`Tools for the business agent of ${displayNumber}.`} />
      <p className="text-muted-foreground mt-5 text-sm">Coming soon.</p>
    </>
  );
}