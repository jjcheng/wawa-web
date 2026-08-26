import type { Metadata } from "next";

import { PreviewPage } from "@/components/preview-page";
import { mockCampaigns } from "@/lib/mock/crm";

export const metadata: Metadata = { title: "Campaigns" };

export default function CampaignsPage() {
  return (
    <PreviewPage
      title="Campaigns"
      description="Broadcast template messages to segments of your contacts."
      columns={["Name", "Audience", "Status", "Sent", "Open rate"]}
      rows={mockCampaigns}
    />
  );
}
