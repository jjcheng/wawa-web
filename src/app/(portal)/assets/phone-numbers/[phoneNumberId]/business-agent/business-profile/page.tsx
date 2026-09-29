import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { loadBusinessAgentPhoneNumber } from "../load-phone-number";
import { BusinessProfileForm } from "./business-profile-form";

export const metadata: Metadata = { title: "Business profile" };

export default async function BusinessProfilePage({
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
      <PageHeader
        title="Business profile"
        description={`Policies, contact details, and what the business for ${displayNumber}.`}
      />
      <BusinessProfileForm phoneNumberId={phoneNumber.id} />
    </>
  );
}
