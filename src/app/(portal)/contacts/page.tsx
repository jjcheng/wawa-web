import type { Metadata } from "next";

import { PreviewPage } from "@/components/preview-page";
import { mockContacts } from "@/lib/mock/crm";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsPage() {
  return (
    <PreviewPage
      title="Contacts"
      description="People who have messaged your WhatsApp Business numbers."
      columns={["Name", "Phone", "Tags", "Last contact"]}
      rows={mockContacts}
    />
  );
}
