import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { loadBusinessAgentPhoneNumber } from "../load-phone-number";
import { SkillsList } from "./skills-list";

export const metadata: Metadata = { title: "Agent skills" };

export default async function SkillsPage({
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
      <SkillsList
        phoneNumberId={phoneNumber.id}
        description={`Tasks the business agent for ${displayNumber} can handle for your customers.`}
      />
    </>
  );
}
