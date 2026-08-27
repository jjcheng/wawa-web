import type { Metadata } from "next";

import { PreviewPage } from "@/components/preview-page";
import { mockDeliveryReports } from "@/lib/mock/crm";

export const metadata: Metadata = { title: "Delivery Reports" };

export default function DeliveryReportsPage() {
  return (
    <PreviewPage
      title="Delivery Reports"
      description="Sent, delivered, read and failed counts per message template."
      columns={["Template", "Sent", "Delivered", "Read", "Failed"]}
      rows={mockDeliveryReports}
    />
  );
}
