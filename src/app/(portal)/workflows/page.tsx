import type { Metadata } from "next";

import { PreviewPage } from "@/components/preview-page";
import { mockWorkflows } from "@/lib/mock/crm";

export const metadata: Metadata = { title: "Workflows" };

export default function WorkflowsPage() {
  return (
    <PreviewPage
      title="Workflows"
      description="Automations that send templates in response to customer activity."
      columns={["Name", "Trigger", "Steps", "Status", "Last run"]}
      rows={mockWorkflows}
    />
  );
}
