import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { loadBusinessAgentPhoneNumber } from "../load-phone-number";
import { UiSkillsList } from "./ui-skills-list";

export const metadata: Metadata = { title: "Agent UI skills" };

export default async function UiSkillsPage({
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
      <UiSkillsList
        phoneNumberId={phoneNumber.id}
        description={`Buttons and lists the business agent for ${displayNumber} can send in replies.`}
      />
    </>
  );
}
