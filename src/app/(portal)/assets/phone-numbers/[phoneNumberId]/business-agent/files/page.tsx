import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { loadBusinessAgentPhoneNumber } from "../load-phone-number";
import { FilesList } from "./files-list";

export const metadata: Metadata = { title: "Files" };

export default async function FilesPage({
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
      <FilesList
        phoneNumberId={phoneNumber.id}
        description={`Documents the business agent for ${displayNumber} can learn from.`}
      />
    </>
  );
}
