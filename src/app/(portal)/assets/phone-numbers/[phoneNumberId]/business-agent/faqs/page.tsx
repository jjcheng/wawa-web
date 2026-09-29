import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { loadBusinessAgentPhoneNumber } from "../load-phone-number";
import { FaqsForm } from "./faqs-form";

export const metadata: Metadata = { title: "FAQs" };

export default async function FaqsPage({
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
      <FaqsForm
        phoneNumberId={phoneNumber.id}
        description={`Frequently asked questions and the answers to train AI model for ${displayNumber}.`}
      />
    </>
  );
}
