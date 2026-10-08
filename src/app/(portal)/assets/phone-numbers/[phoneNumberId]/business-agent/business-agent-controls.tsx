"use client";

import { BusinessAgentSections as SharedBusinessAgentSections } from "@/components/business-agent-sections";

export function BusinessAgentSections({ phoneNumberId }: { phoneNumberId: number }) {
  return (
    <SharedBusinessAgentSections
      basePath={`/assets/phone-numbers/${phoneNumberId}/business-agent`}
    />
  );
}
