"use client";

import Ably from "ably";

import { apiFetch } from "@/lib/api/client";
import type { Notification } from "@/lib/api/types";

type AblyTokenRequest = {
  channel_name: string;
  ttl: number;
  capability: string;
  clientId: string;
  timestamp: number;
  keyName: string;
  nonce: string;
  mac: string;
};

export type NotificationsRealtimeEvent =
  | { type: "notification"; notification: Notification }
  | { type: "connection"; state: string };

/** Opens a single account-level Ably connection for real-time notifications; call the returned cleanup to close it. */
export function subscribeToNotifications(
  onEvent: (event: NotificationsRealtimeEvent) => void,
  onError?: (error: Error) => void,
): () => void {
  let disposed = false;
  let client: Ably.Realtime | null = null;
  let channel: Ably.RealtimeChannel | null = null;
  const notifyError = (error: Error) => {
    if (!disposed) onError?.(error);
  };

  async function start() {
    try {
      const initialToken = await apiFetch<AblyTokenRequest>("/v1/account/notifications/token", {
        method: "POST",
      });
      if (disposed) return;

      let useInitialToken = true;
      client = new Ably.Realtime({
        authCallback: async (_tokenParams, callback) => {
          try {
            if (useInitialToken) {
              useInitialToken = false;
              callback(null, initialToken);
              return;
            }
            const token = await apiFetch<AblyTokenRequest>("/v1/account/notifications/token", {
              method: "POST",
            });
            callback(null, token);
          } catch (error) {
            const normalizedError =
              error instanceof Error ? error : new Error("Could not authenticate realtime notifications.");
            notifyError(normalizedError);
            callback(normalizedError.message, null);
          }
        },
      });
      channel = client.channels.get(initialToken.channel_name);
      client.connection.on((stateChange) => {
        if (!disposed) onEvent({ type: "connection", state: stateChange.current });
      });
      void channel
        .subscribe("notification", (event) => {
          if (!disposed) onEvent({ type: "notification", notification: event.data as Notification });
        })
        .catch((error) =>
          notifyError(error instanceof Error ? error : new Error("Realtime subscription failed.")),
        );
    } catch (error) {
      notifyError(error instanceof Error ? error : new Error("Could not authenticate realtime notifications."));
    }
  }

  void start();

  return () => {
    disposed = true;
    channel?.unsubscribe("notification");
    client?.close();
  };
}
