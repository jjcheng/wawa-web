import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { loadBusinessAgentPhoneNumber } from "../load-phone-number";
import { TestChat } from "./test-chat";

export const metadata: Metadata = { title: "Test" };

export default async function TestPage({
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
      <TestChat phoneNumberId={phoneNumber.id} displayNumber={displayNumber} />
    </>
  );
}
