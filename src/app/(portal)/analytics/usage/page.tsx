import type { Metadata } from "next";

import { PreviewPage } from "@/components/preview-page";
import { mockUsage } from "@/lib/mock/crm";

export const metadata: Metadata = { title: "Usage & Costs" };

export default function UsagePage() {
  return (
    <PreviewPage
      title="Usage & Costs"
      description="Conversation volume and Meta charges by billing month."
      columns={[
        "Month",
        "Marketing conversations",
        "Utility conversations",
        "Service conversations",
        "Cost",
      ]}
      rows={mockUsage}
    />
  );
}
