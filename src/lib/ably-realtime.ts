"use client";

import Ably from "ably";

import { apiFetch } from "@/lib/api/client";
import type { ConversationRealtimeProvider } from "@/lib/realtime";

type AblyTokenRequest = {
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
      const notifyError = (error: Error) => {
        if (!disposed) onError?.(error);
      };

      const client = new Ably.Realtime({
        authCallback: async (_tokenParams, callback) => {
          try {
            const token = await apiFetch<AblyTokenRequest>("/v1/wa/messages/realtime-token", {
              method: "POST",
              body: {
                phone_number_id: stream.phoneNumberId,
                customer_wa_id: stream.customerWAId,
                customer_meta_user_id: stream.customerMetaUserId,
              },
            });
            callback(null, token);
          } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error("Could not authenticate realtime messaging.");
            notifyError(normalizedError);
            callback(normalizedError.message, null);
          }
        },
      });
      const channel = client.channels.get(
        `chat:${stream.phoneNumberId}:${stream.customerWAId || stream.customerMetaUserId}`,
      );
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

      return () => {
        disposed = true;
        channel.unsubscribe("message");
        channel.unsubscribe("status");
        client.close();
      };
    },
  };
}