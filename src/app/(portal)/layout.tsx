import type { Metadata } from "next";

import { AiWorkerPanel } from "@/components/ai-worker/ai-worker-panel";
import { AiWorkerPanelProvider } from "@/components/ai-worker/ai-worker-panel-context";
import { BottomTabBar } from "@/components/nav/bottom-tab-bar";
import { NavigationProgressProvider } from "@/components/nav/navigation-progress";
import { PortalMain } from "@/components/nav/portal-main";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { Topbar } from "@/components/nav/topbar";
import { NotificationsRealtimeProvider } from "@/components/notifications-realtime-provider";
import { PhoneNumberMessagesProvider } from "@/components/phone-number-messages-provider";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: {
    default: "WAWAGO Portal",
    template: "%s · WAWAGO Portal",
  },
  description: "Authenticated WAWAGO portal for WhatsApp CRM, broadcasts, contacts, templates, catalogs, and website management.",
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <NavigationProgressProvider>
      <NotificationsRealtimeProvider user={user} />
      <PhoneNumberMessagesProvider user={user} />
      <AiWorkerPanelProvider>
        <div className="flex min-h-svh">
          <aside className="glass-surface hidden w-56 shrink-0 shadow-[12px_0_28px_-24px_var(--glass-shadow)] lg:block xl:w-64">
            <div className="sticky top-0">
              <SidebarNav user={user} />
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar user={user} />
            <PortalMain>{children}</PortalMain>
          </div>
          <AiWorkerPanel />
        </div>
        <BottomTabBar />
      </AiWorkerPanelProvider>
    </NavigationProgressProvider>
  );
}
