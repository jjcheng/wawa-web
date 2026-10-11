import type { ChatMessage } from "@/components/chat-compose-context";

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function applyMessageRevokes(messages: ChatMessage[]): ChatMessage[] {
  const revokedIds = new Set<string>();
  for (const event of messages) {
    if (event.type !== "revoke") continue;
    const revoke = record(record(event.payload)?.revoke ?? record(event)?.revoke);
    const originalId = revoke?.original_message_id;
    if (typeof originalId !== "string" || !originalId.trim()) {
      console.warn("Ignoring invalid message revoke notification: missing original_message_id.");
      continue;
    }
    revokedIds.add(originalId);
  }
  return messages.map((message) => {
    if (message.type === "revoke" || message.type === "edit" ||
      (!revokedIds.has(message.wa_message_id) && !revokedIds.has(String(message.id)))) {
      return message;
    }
    return { ...message, deleted: true };
  });
}
