import { NavigationProgressProvider } from "@/components/nav/navigation-progress";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { Topbar } from "@/components/nav/topbar";
import { requireUser } from "@/lib/auth/session";

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <NavigationProgressProvider>
      <div className="flex min-h-svh">
        <aside className="bg-sidebar hidden w-64 shrink-0 border-r lg:block">
          <div className="sticky top-0">
            <SidebarNav user={user} />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={user} />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </NavigationProgressProvider>
  );
}
