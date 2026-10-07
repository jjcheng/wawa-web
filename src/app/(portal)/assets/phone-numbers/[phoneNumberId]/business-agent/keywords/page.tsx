import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { loadBusinessAgentPhoneNumber } from "../load-phone-number";
import { KeywordsList } from "./keywords-list";

export const metadata: Metadata = { title: "Keywords" };

export default async function KeywordsPage({
  params,
}: PageProps<"/assets/phone-numbers/[phoneNumberId]/business-agent/keywords">) {
  const { phoneNumberId } = await params;
  const { phoneNumber, displayNumber } = await loadBusinessAgentPhoneNumber(phoneNumberId, {
    requireOnboarded: true,
  });

  return (
    <>
      <BackBar href={`/assets/phone-numbers/${phoneNumber.id}/business-agent`} />
      <KeywordsList
        phoneNumberId={phoneNumber.id}
        description={`Send notification when a message contains certain keywords for ${displayNumber}.`}
      />
    </>
  );
}
