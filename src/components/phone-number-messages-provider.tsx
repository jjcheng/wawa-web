"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { User } from "@/lib/api/types";
import { subscribeToPhoneNumberMessages } from "@/lib/phone-number-realtime";
import { toast } from "@/lib/toast";

export type IncomingChatMessage = {
  customer_id: number;
  customer_name: string;
  notification_content: string;
};

/** Dispatched on `window` whenever a real-time phone-number message arrives, so the Chats list can update itself live when mounted. */
export const PHONE_NUMBER_MESSAGE_EVENT = "wawa:phone-number-message";

export function notifyIncomingChatMessage(message: IncomingChatMessage) {
  window.dispatchEvent(
    new CustomEvent<IncomingChatMessage>(PHONE_NUMBER_MESSAGE_EVENT, { detail: message }),
  );
}

function toIncomingChatMessage(data: unknown): IncomingChatMessage | null {
  let value = data;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const customerId = Number(record.customer_id ?? record.customerId);
  if (!Number.isFinite(customerId)) return null;
  const name = record.customer_name ?? record.customerName;
  const content = record.notification_content ?? record.notificationContent ?? record.content;
  return {
    customer_id: customerId,
    customer_name: typeof name === "string" ? name : "",
    notification_content: typeof content === "string" ? content : "",
  };
}

/**
 * Mounted once inside the authenticated portal layout; keeps one Ably connection per assigned
 * phone number open for the whole session (not just while on the Chats page), so incoming-message
 * toasts fire everywhere. Each toast links to that customer's chat.
 */
export function PhoneNumberMessagesProvider({ user }: { user: User }) {
  const router = useRouter();

  useEffect(() => {
    const phoneNumberIds = (user.assigned_phone_numbers ?? []).map((phoneNumber) =>
      String(phoneNumber.id),
    );
    if (phoneNumberIds.length === 0) return;

    const unsubscribe = subscribeToPhoneNumberMessages(phoneNumberIds, (_phoneNumberId, event) => {
      if (event.type !== "message") return;
      const incoming = toIncomingChatMessage(event.message);
      if (!incoming) {
        console.warn("Unrecognized realtime phone-number message payload:", event.message);
        return;
      }
      notifyIncomingChatMessage(incoming);
      toast.success(`New message from ${incoming.customer_name}`, {
        description: incoming.notification_content,
        action: {
          label: "View",
          onClick: () => router.push(`/chats/${incoming.customer_id}/chat?return_to=%2Fchats`),
        },
      });
    });

    // pagehide also fires on tab close, unlike React's unmount cleanup.
    window.addEventListener("pagehide", unsubscribe);

    return () => {
      window.removeEventListener("pagehide", unsubscribe);
      unsubscribe();
    };
  }, [user.id, router]);

  return null;
}
