"use client";

import Ably from "ably";

import { apiFetch } from "@/lib/api/client";

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

export type PhoneNumberMessageEvent =
  | { type: "message"; message: unknown }
  | { type: "connection"; state: string };

const INITIAL_RETRY_DELAY_MS = 2_000;
const MAX_RETRY_DELAY_MS = 30_000;

function subscribeToOne(
  phoneNumberId: string,
  onEvent: (phoneNumberId: string, event: PhoneNumberMessageEvent) => void,
  onError?: (phoneNumberId: string, error: Error) => void,
): () => void {
  let disposed = false;
  let client: Ably.Realtime | null = null;
  let channel: Ably.RealtimeChannel | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = INITIAL_RETRY_DELAY_MS;
  const notifyError = (error: Error) => {
    if (!disposed) onError?.(phoneNumberId, error);
  };

  function teardownClient() {
    channel?.unsubscribe("message");
    channel = null;
    client?.close();
    client = null;
  }

  // The initial token request or the Ably connection itself can fail (network blip, expired
  // auth, upstream error); retry with backoff instead of silently giving up on this channel.
  function scheduleRetry() {
    if (disposed || retryTimer) return;
    const delay = retryDelay;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      teardownClient();
      void start();
    }, delay);
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
  }

  async function start() {
    try {
      const initialToken = await apiFetch<AblyTokenRequest>(
        `/v1/account/phone-numbers/${phoneNumberId}/token`,
        { method: "POST" },
      );
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
            const token = await apiFetch<AblyTokenRequest>(
              `/v1/account/phone-numbers/${phoneNumberId}/token`,
              { method: "POST" },
            );
            callback(null, token);
          } catch (error) {
            const normalizedError =
              error instanceof Error ? error : new Error("Could not authenticate realtime messages.");
            notifyError(normalizedError);
            callback(normalizedError.message, null);
          }
        },
      });
      channel = client.channels.get(initialToken.channel_name);
      client.connection.on((stateChange) => {
        if (disposed) return;
        onEvent(phoneNumberId, { type: "connection", state: stateChange.current });
        if (stateChange.current === "connected") {
          retryDelay = INITIAL_RETRY_DELAY_MS;
        } else if (stateChange.current === "failed" || stateChange.current === "suspended") {
          notifyError(new Error(`Realtime connection ${stateChange.current}.`));
          scheduleRetry();
        }
      });
      void channel
        // Subscribe to every event on the channel (not just "message") since the exact
        // event name the backend publishes incoming-message notifications under is unclear.
        .subscribe((event) => {
          if (!disposed) onEvent(phoneNumberId, { type: "message", message: event.data });
        })
        .catch((error) => {
          notifyError(error instanceof Error ? error : new Error("Realtime subscription failed."));
          scheduleRetry();
        });
    } catch (error) {
      notifyError(
        error instanceof Error ? error : new Error("Could not authenticate realtime messages."),
      );
      scheduleRetry();
    }
  }

  void start();

  return () => {
    disposed = true;
    if (retryTimer) clearTimeout(retryTimer);
    teardownClient();
  };
}

/** Opens one Ably connection per assigned WhatsApp phone number to receive incoming messages; call the returned cleanup to close them all. */
export function subscribeToPhoneNumberMessages(
  phoneNumberIds: string[],
  onEvent: (phoneNumberId: string, event: PhoneNumberMessageEvent) => void,
  onError?: (phoneNumberId: string, error: Error) => void,
): () => void {
  const cleanups = [...new Set(phoneNumberIds.filter(Boolean))].map((phoneNumberId) =>
    subscribeToOne(phoneNumberId, onEvent, onError),
  );
  return () => cleanups.forEach((cleanup) => cleanup());
}
