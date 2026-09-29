import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { loadBusinessAgentPhoneNumber } from "../load-phone-number";
import { WebsitesList } from "./websites-list";

export const metadata: Metadata = { title: "Websites" };

export default async function WebsitesPage({
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
      <WebsitesList
        phoneNumberId={phoneNumber.id}
        description={`Web pages the business agent for ${displayNumber} can reference.`}
      />
    </>
  );
}
