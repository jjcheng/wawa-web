import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { serverFetch } from "@/lib/api/server-client";
import { loadBusinessAgentPhoneNumber } from "../../../load-phone-number";
import { ConnectorForm } from "../../connector-form";
import { getConnectorList, type ConnectorListResponse } from "../../connector-list";

export const metadata: Metadata = { title: "Edit connector" };

export default async function EditConnectorPage({
  params,
}: {
  params: Promise<{ phoneNumberId: string; connectorId: string }>;
}) {
  const { phoneNumberId, connectorId } = await params;
  const { phoneNumber, displayNumber } = await loadBusinessAgentPhoneNumber(phoneNumberId, {
    requireOnboarded: true,
  });
  if (!/^[\w-]+$/.test(connectorId)) notFound();

  const response = await serverFetch<ConnectorListResponse>(
    `/v1/wa/phone-numbers/${phoneNumber.id}/business-agent/connectors`,
  );
  const connectors = getConnectorList(response);
  const connector = connectors.find((item) => String(item.id) === connectorId);
  if (!connector || connector.id == null) notFound();

  return (
    <>
      <BackBar href={`/assets/phone-numbers/${phoneNumber.id}/business-agent/connectors`} />
      <PageHeader
        title="Edit connector"
        description={`Update the connection for ${displayNumber}.`}
      />
      <ConnectorForm
        key={connectorId}
        phoneNumberId={phoneNumber.id}
        connector={{ ...connector, id: connector.id }}
      />
    </>
  );
}
