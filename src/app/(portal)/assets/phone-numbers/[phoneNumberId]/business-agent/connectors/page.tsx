import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { loadBusinessAgentPhoneNumber } from "../load-phone-number";
import { ConnectorsList } from "./connectors-list";

export const metadata: Metadata = { title: "Connectors" };

export default async function ConnectorsPage({
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
      <ConnectorsList
        phoneNumberId={phoneNumber.id}
        description={`Connectors configured for ${displayNumber}.`}
      />
    </>
  );
}
