"use client";

import Ably from "ably";

import { apiFetch } from "@/lib/api/client";
import type { ConversationRealtimeProvider } from "@/lib/realtime";

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

export function createAblyConversationProvider<TMessage, TStatus = unknown>(): ConversationRealtimeProvider<TMessage, TStatus> {
  return {
    subscribe(stream, onEvent, onError) {
      let disposed = false;
      let client: Ably.Realtime | null = null;
      let channel: Ably.RealtimeChannel | null = null;
      const notifyError = (error: Error) => {
        if (!disposed) onError?.(error);
      };

      async function start() {
        try {
          const initialToken = await apiFetch<AblyTokenRequest>("/v1/wa/messages/chat-token", {
            method: "POST",
            query: { customer_id: stream.customerId },
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
                const token = await apiFetch<AblyTokenRequest>("/v1/wa/messages/chat-token", {
                  method: "POST",
                  query: { customer_id: stream.customerId },
                });
                callback(null, token);
              } catch (error) {
                const normalizedError = error instanceof Error ? error : new Error("Could not authenticate realtime messaging.");
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
            .subscribe("message", (event) => {
              if (!disposed) onEvent({ type: "message", message: event.data as TMessage });
            })
            .catch((error) => notifyError(error instanceof Error ? error : new Error("Realtime subscription failed.")));
          void channel
            .subscribe("status", (event) => {
              if (!disposed) onEvent({ type: "status", status: event.data as TStatus });
            })
            .catch((error) => notifyError(error instanceof Error ? error : new Error("Realtime subscription failed.")));
        } catch (error) {
          notifyError(error instanceof Error ? error : new Error("Could not authenticate realtime messaging."));
        }
      }

      void start();

      return () => {
        disposed = true;
        channel?.unsubscribe("message");
        channel?.unsubscribe("status");
        client?.close();
      };
    },
  };
}