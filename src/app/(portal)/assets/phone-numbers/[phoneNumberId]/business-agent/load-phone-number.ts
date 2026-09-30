import { redirect } from "next/navigation";

import { serverFetch } from "@/lib/api/server-client";
import type { PhoneNumber } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";

export async function loadBusinessAgentPhoneNumber(
  phoneNumberId: string,
  { requireOnboarded = false }: { requireOnboarded?: boolean } = {},
) {
  if (!BUSINESS_AGENT_ENABLED) redirect("/chats");

  const user = await requireUser();
  if (!/^\d+$/.test(phoneNumberId)) redirect("/assets/phone-numbers");

  const phoneNumberIdValue = Number(phoneNumberId);
  const isAssigned = user.assigned_phone_numbers?.some(
    (phoneNumber) => Number(phoneNumber.id) === phoneNumberIdValue,
  ) ?? false;
  if (user.type !== "MASTER" && !isAssigned) redirect("/chats");

  const phoneNumber = await serverFetch<PhoneNumber>(
    `/v1/wa/phone-numbers/${phoneNumberIdValue}/local`,
  );
  if (requireOnboarded && !phoneNumber.meta_agent_id) {
    redirect(`/assets/phone-numbers/${phoneNumberIdValue}/business-agent`);
  }

  return {
    phoneNumber,
    displayNumber: phoneNumber.display_phone_number || phoneNumber.phone_number || "—",
  };
}
