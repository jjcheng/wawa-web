"use client";

import { useSyncExternalStore } from "react";

/** Customer ids with unread chat messages, shared by the side menu and bottom tab bar Chats dot. */
const unreadCustomerIds = new Set<number>();
const touchedCustomerIds = new Set<number>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setChatUnread(customerId: number, unread: boolean) {
  touchedCustomerIds.add(customerId);
  if (unread === unreadCustomerIds.has(customerId)) return;
  if (unread) unreadCustomerIds.add(customerId);
  else unreadCustomerIds.delete(customerId);
  emit();
}

export function removeUnreadChats(customerIds: number[]) {
  for (const id of customerIds) setChatUnread(id, false);
}

/** Starts tracking which customers change while the initial unread list is being fetched. */
export function beginUnreadChatsSeed() {
  touchedCustomerIds.clear();
}

/** Applies fetched unread state without overwriting customers updated after the seed began. */
export function seedUnreadChats(customers: { id: number; unread: boolean }[]) {
  let changed = false;
  for (const { id, unread } of customers) {
    if (touchedCustomerIds.has(id) || unread === unreadCustomerIds.has(id)) continue;
    if (unread) unreadCustomerIds.add(id);
    else unreadCustomerIds.delete(id);
    changed = true;
  }
  if (changed) emit();
}

export function useHasUnreadChats() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => unreadCustomerIds.size > 0,
    () => false,
  );
}
