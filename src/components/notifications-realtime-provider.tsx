"use client";

import { useEffect } from "react";

import { apiFetch } from "@/lib/api/client";
import { subscribeToNotifications } from "@/lib/notifications-realtime";
import { toast } from "@/lib/toast";
import {
  incrementUnreadNotificationsCount,
  setUnreadNotificationsCount,
} from "@/lib/unread-notifications-store";
import type { Notification, User } from "@/lib/api/types";

/** Dispatched on `window` whenever a real-time notification arrives, so any mounted list can refresh itself. */
export const NOTIFICATION_EVENT = "wawa:notification";

export function notifyNewNotification(notification: Notification) {
  window.dispatchEvent(new CustomEvent<Notification>(NOTIFICATION_EVENT, { detail: notification }));
}

/** Mounted once inside the authenticated portal layout; keeps a single Ably connection open for the session. */
export function NotificationsRealtimeProvider({ user }: { user: User }) {
  useEffect(() => {
    void apiFetch<number>("v1/account/notifications/unread-count").then(setUnreadNotificationsCount).catch(() => {});

    const unsubscribe = subscribeToNotifications((event) => {
      if (event.type !== "notification") return;
      const { notification } = event;
      notifyNewNotification(notification);
      if (!notification.read) incrementUnreadNotificationsCount(1);
      const toastFn =
        notification.type === "ERROR"
          ? toast.error
          : notification.type === "WARNING"
            ? toast.warning
            : notification.type === "SUCCESS"
              ? toast.success
              : toast.info;
      toastFn(notification.title, { description: notification.body });
    });

    // pagehide also fires on tab close, unlike React's unmount cleanup.
    window.addEventListener("pagehide", unsubscribe);

    return () => {
      window.removeEventListener("pagehide", unsubscribe);
      unsubscribe();
    };
  }, [user.id]);

  return null;
}
