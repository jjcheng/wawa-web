"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

import { useNavigationProgress } from "@/components/nav/navigation-progress";
import { NOTIFICATION_EVENT } from "@/components/notifications-realtime-provider";
import { LoadMoreButton } from "@/components/load-more-button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TableEmptyState } from "@/components/table-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { formatDateTime, resolveSiteUrl } from "@/lib/format";
import { incrementUnreadNotificationsCount } from "@/lib/unread-notifications-store";
import type { Notification, NotificationListResponse } from "@/lib/api/types";

const PAGE_SIZES = ["10", "25", "50", "100"];
const TYPE_OPTIONS = ["ALL", "SUCCESS", "INFO", "WARNING", "ERROR"];
const READ_OPTIONS = ["ALL", "true", "false"];
const TYPE_BADGE_CLASSNAME: Record<string, string> = {
  SUCCESS: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  INFO: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  WARNING: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  ERROR: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};

export function InboxShell({
  initialRows,
  initialNumberOfPages,
  pageSize,
  type,
  read,
}: {
  initialRows: Notification[];
  initialNumberOfPages: number;
  pageSize: string;
  type: string;
  read: string;
}) {
  const [rows, setRows] = useState(initialRows);
  const [currentPage, setCurrentPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(initialNumberOfPages);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startNavigationProgress } = useNavigationProgress();

  useEffect(() => {
    if (currentPage !== 1) return;
    function onNotification(event: Event) {
      const notification = (event as CustomEvent<Notification>).detail;
      if (type && type !== "ALL" && notification.type !== type) return;
      if (read === "true") return;
      setRows((currentRows) => [notification, ...currentRows.filter((row) => row.id !== notification.id)]);
    }
    window.addEventListener(NOTIFICATION_EVENT, onNotification);
    return () => window.removeEventListener(NOTIFICATION_EVENT, onNotification);
  }, [currentPage, type, read]);

  async function loadMore() {
    if (isLoadingMore || currentPage >= numberOfPages) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await apiFetch<NotificationListResponse>("v1/account/notifications", {
        query: { page: String(nextPage), page_size: pageSize, type, read },
      });
      setRows((currentRows) => [...currentRows, ...result.items]);
      setCurrentPage(nextPage);
      setNumberOfPages(result.number_of_pages ?? numberOfPages);
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function setFilter(field: "type" | "read", value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "ALL") params.delete(field);
    else params.set(field, value);
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  function setPageSize(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("page_size", value);
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  function resetFilters() {
    const params = new URLSearchParams(searchParams);
    params.delete("type");
    params.delete("read");
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox"
        description="Notifications from the system."
      />
      <Card className="rounded-md py-0">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>
                  <Select value={type || "ALL"} onValueChange={(value) => setFilter("type", value)}>
                    <SelectTrigger
                      className="h-7 border-none px-0 pl-1 font-medium shadow-none"
                      aria-label="Filter by type"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === "ALL" ? "Type" : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead>
                  <Select value={read || "ALL"} onValueChange={(value) => setFilter("read", value)}>
                    <SelectTrigger
                      className="h-7 border-none px-0 pl-1 font-medium shadow-none"
                      aria-label="Filter by read status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {READ_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === "ALL" ? "Status" : option === "true" ? "Read" : "Unread"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmptyState
                  colSpan={5}
                  action={
                    type || read ? (
                      <Button size="sm" variant="outline" onClick={resetFilters}>
                        Reset filters
                      </Button>
                    ) : undefined
                  }
                >
                  {type || read ? "No notifications match this filter." : "No notifications found."}
                </TableEmptyState>
              ) : (
                rows.map((notification) => (
                  <TableRow
                    key={notification.id}
                    className={notification.read ? "text-muted-foreground bg-muted/30" : undefined}
                  >
                    <TableCell>
                      <p className={notification.read ? "font-medium" : "font-semibold text-foreground"}>
                        {notification.title}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={TYPE_BADGE_CLASSNAME[notification.type]}>
                        {notification.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{notification.read ? "Read" : "Unread"}</TableCell>
                    <TableCell>{formatDateTime(notification.entry_date)}</TableCell>
                    <TableCell className="text-right">
                      <NotificationViewButton
                        notification={notification}
                        onRead={(id) =>
                          setRows((currentRows) =>
                            currentRows.map((row) => (row.id === id ? { ...row, read: true } : row)),
                          )
                        }
                        onDeleted={(id) =>
                          setRows((currentRows) => currentRows.filter((row) => row.id !== id))
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Notifications per page</span>
          <Select value={pageSize} onValueChange={setPageSize}>
            <SelectTrigger className="w-20" aria-label="Notifications per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentPage < numberOfPages ? (
          <LoadMoreButton loading={isLoadingMore} onClick={loadMore} withTopMargin={false} />
        ) : null}
      </div>
    </div>
  );
}

function NotificationViewButton({
  notification,
  onRead,
  onDeleted,
}: {
  notification: Notification;
  onRead: (id: number) => void;
  onDeleted: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && !notification.read) {
      onRead(notification.id);
      incrementUnreadNotificationsCount(-1);
      apiFetch("v1/account/notifications/status", {
        method: "PATCH",
        body: { ids: [notification.id], read: true },
      }).catch((error) => toast.error(toApiError(error).message));
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await apiFetch("v1/account/notifications", {
        method: "DELETE",
        body: { ids: [notification.id] },
      });
      setOpen(false);
      onDeleted(notification.id);
      if (!notification.read) incrementUnreadNotificationsCount(-1);
      toast.success("Notification deleted.");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{notification.title}</DialogTitle>
          <DialogDescription>{formatDateTime(notification.entry_date)}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto text-sm">
          <Badge variant="secondary" className={TYPE_BADGE_CLASSNAME[notification.type]}>
            {notification.type}
          </Badge>
          <p className="whitespace-pre-wrap">{notification.body}</p>
          {notification.url
            ? (() => {
                const resolvedUrl = resolveSiteUrl(notification.url);
                const isExternal = /^https:\/\//i.test(notification.url);
                return (
                  <a
                    href={resolvedUrl}
                    {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="text-primary block break-all underline underline-offset-2"
                  >
                    {resolvedUrl}
                  </a>
                );
              })()
            : null}
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            className="sm:mr-auto"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
