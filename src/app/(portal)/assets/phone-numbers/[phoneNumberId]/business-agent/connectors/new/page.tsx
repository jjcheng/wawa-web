import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { loadBusinessAgentPhoneNumber } from "../../load-phone-number";
import { ConnectorForm } from "../connector-form";

export const metadata: Metadata = { title: "Add connector" };

export default async function NewConnectorPage({
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
      <BackBar href={`/assets/phone-numbers/${phoneNumber.id}/business-agent/connectors`} />
      <PageHeader
        title="Add connector"
        description={`Configure a connection for ${displayNumber}.`}
      />
      <ConnectorForm phoneNumberId={phoneNumber.id} />
    </>
  );
}
