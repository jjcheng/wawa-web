"use client";

import { useSyncExternalStore } from "react";

/** Tiny external store so the unread count stays in sync across every SidebarNav instance (desktop + mobile sheet). */
let unreadCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setUnreadNotificationsCount(count: number) {
  unreadCount = Math.max(0, count);
  emit();
}

export function incrementUnreadNotificationsCount(delta = 1) {
  unreadCount = Math.max(0, unreadCount + delta);
  emit();
}

export function useUnreadNotificationsCount() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => unreadCount,
    () => 0,
  );
}
