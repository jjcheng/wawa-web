import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { BusinessAgentLifecycleButton } from "./business-agent-lifecycle-button";
import { loadBusinessAgentPhoneNumber } from "./load-phone-number";

export const metadata: Metadata = { title: "Business agent for phone number" };

export default async function PhoneNumberBusinessAgentPage({
  params,
}: PageProps<"/assets/phone-numbers/[phoneNumberId]/business-agent">) {
  const { phoneNumberId } = await params;
  const { phoneNumber, displayNumber } = await loadBusinessAgentPhoneNumber(phoneNumberId);

  return (
    <>
      <BackBar href="/assets/phone-numbers" />
      <BusinessAgentLifecycleButton
        phoneNumberId={phoneNumber.id}
        displayNumber={displayNumber}
        initialMetaAgentId={phoneNumber.meta_agent_id ?? ""}
        initialAgentRunning={phoneNumber.agent_running === true}
      />
    </>
  );
}