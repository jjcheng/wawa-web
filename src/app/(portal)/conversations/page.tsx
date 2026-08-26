import type { Metadata } from "next";

import { PreviewPage } from "@/components/preview-page";
import { mockConversations } from "@/lib/mock/crm";

export const metadata: Metadata = { title: "Conversations" };

export default function ConversationsPage() {
  return (
    <PreviewPage
      title="Conversations"
      description="Shared inbox for every WhatsApp thread across your team."
      columns={["Contact", "Channel", "Status", "Assignee", "Updated"]}
      rows={mockConversations}
    />
  );
}
