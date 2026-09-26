"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BadgeCheck,
  CircleAlert,
  CircleCheck,
  FileText,
  Globe2,
  Info,
  ListChecks,
  MessageCircle,
  Megaphone,
  ShieldUser,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { LoadMoreButton } from "@/components/load-more-button";
import { RelativeTime } from "@/components/relative-time";
import { TemplatePreviewHtml } from "@/components/template-preview-html";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { resolveSiteUrl } from "@/lib/format";
import type { Notification, NotificationListResponse } from "@/lib/api/types";
import { toast } from "@/lib/toast";
import { incrementUnreadNotificationsCount } from "@/lib/unread-notifications-store";

const CATEGORY_OPTIONS = ["PENDING", "HANDS-OFF"] as const;
const TYPE_STYLES: Record<Notification["type"], string> = {
  SUCCESS: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  INFO: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  WARNING: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  ERROR: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
};
const NOTIFICATION_ICONS = {
  CUSTOMER: UserRound,
  BROADCAST: Megaphone,
  WEBSITE: Globe2,
  CHAT: MessageCircle,
  JOIN: ShieldUser,
  TEMPLATE: FileText,
  TODO: ListChecks,
  DONE: CircleCheck,
  ERROR: CircleAlert,
  SUCCESS: BadgeCheck,
  WARNING: TriangleAlert,
} satisfies Record<NonNullable<Notification["icon_type"]>, LucideIcon>;

export function TodosView({
  category,
  pageSize,
  initialNotifications,
  initialNumberOfPages,
}: {
  category: (typeof CATEGORY_OPTIONS)[number];
  pageSize: string;
  initialNotifications: Notification[];
  initialNumberOfPages: number;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [currentPage, setCurrentPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(initialNumberOfPages);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectCategory(nextCategory: string) {
    const params = new URLSearchParams(searchParams);
    params.set("category", nextCategory);
    router.push(`${pathname}?${params.toString()}`);
  }

  async function loadMore() {
    if (loading || currentPage >= numberOfPages) return;
    setLoading(true);
    try {
      const nextPage = currentPage + 1;
      const response = await apiFetch<NotificationListResponse>("v1/account/notifications", {
        query: {
          category,
          page: String(nextPage),
          page_size: pageSize,
        },
      });
      setNotifications((current) => [...current, ...(response.items ?? [])]);
      setCurrentPage(nextPage);
      setNumberOfPages(response.number_of_pages ?? numberOfPages);
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Tabs value={category} onValueChange={selectCategory}>
          <TabsList aria-label="Notification category">
            {CATEGORY_OPTIONS.map((option) => (
              <TabsTrigger key={option} value={option}>
                {option === "PENDING" ? "Pending" : "Hands-off"}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="About task categories"
            >
              <Info />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-64 flex-col items-start whitespace-normal">
            <p>Pending tasks: requires your manual actions.</p>
            <p>Hands-off tasks: handled by the system, for your information only.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="bg-card divide-border overflow-hidden divide-y rounded-lg border">
        {notifications.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center p-6 text-center">
            <p className="text-muted-foreground text-sm">
              {category === "PENDING" ? "No pending tasks." : "No hands-off tasks."}
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onDeleted={(id) => setNotifications((current) => current.filter((item) => item.id !== id))}
            />
          ))
        )}
      </div>

      {currentPage < numberOfPages ? (
        <LoadMoreButton loading={loading} onClick={() => void loadMore()} />
      ) : null}
    </div>
  );
}

function NotificationRow({
  notification,
  onDeleted,
}: {
  notification: Notification;
  onDeleted: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isRead, setIsRead] = useState(notification.read);
  const [isDeleting, setIsDeleting] = useState(false);
  const Icon = notification.icon_type ? NOTIFICATION_ICONS[notification.icon_type] : ListChecks;
  const notificationUrl = notification.url?.trim();
  const resolvedUrl = open && notificationUrl ? resolveSiteUrl(notificationUrl) : null;
  const isExternal = Boolean(notification.url && /^https:\/\//i.test(notification.url));

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen || isRead) return;

    setIsRead(true);
    incrementUnreadNotificationsCount(-1);
    apiFetch("v1/account/notifications/status", {
      method: "PATCH",
      body: { ids: [notification.id], read: true },
    }).catch((error) => toast.error(toApiError(error).message));
  }

  async function handleDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await apiFetch("v1/account/notifications", {
        method: "DELETE",
        body: { ids: [notification.id] },
      });
      onDeleted(notification.id);
      setOpen(false);
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <article className="hover:bg-accent/40 flex min-w-0 items-center gap-4 px-4 py-4 transition-colors">
        <div className="relative shrink-0">
          <div className={`flex size-12 items-center justify-center rounded-xl ${TYPE_STYLES[notification.type]}`}>
            <Icon aria-hidden="true" className="size-6" strokeWidth={2} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`break-words text-base font-medium ${isRead ? "text-muted-foreground" : "text-foreground"}`}>
            {notification.title}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {notification.added_at ? <RelativeTime value={notification.added_at} /> : "—"}
          </p>
        </div>
        <Button className="shrink-0" size="sm" variant="outline" onClick={() => handleOpenChange(true)}>
          View
        </Button>
      </article>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{notification.title}</DialogTitle>
            <DialogDescription>
              {notification.added_at ? <RelativeTime value={notification.added_at} /> : "Notification details"}
            </DialogDescription>
          </DialogHeader>
          <div className="!overflow-y-auto max-h-[60vh] min-h-0 flex-1">
            {notification.body ? (
              <TemplatePreviewHtml lightHtml={notification.body} />
            ) : (
              <p className="text-muted-foreground text-sm">No notification content.</p>
            )}
            {resolvedUrl ? (
              <a
                href={resolvedUrl}
                {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                className="text-primary mt-4 block break-all underline underline-offset-2"
              >
                {resolvedUrl}
              </a>
            ) : null}
          </div>
          <DialogFooter className="justify-between">
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}