import type { Metadata } from "next";

import { PreviewPage } from "@/components/preview-page";
import { mockCustomers } from "@/lib/mock/crm";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <PreviewPage
      title="Customers"
      description="People who have messaged your WhatsApp Business numbers."
      columns={["Name", "Phone", "Tags", "Last contact"]}
      rows={mockCustomers}
    />
  );
}
