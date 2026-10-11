import type { ChatMessage } from "@/components/chat-compose-context";

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function applyMessageEdits(messages: ChatMessage[]): ChatMessage[] {
  const edits = new Map<string, { type: string; payload: Record<string, unknown> }>();
  for (const event of [...messages].sort((first, second) => first.timestamp - second.timestamp)) {
    if (event.type !== "edit" || event.sending) continue;
    const edit = record(event.payload.edit);
    const content = record(edit?.message);
    const originalId = edit?.original_message_id;
    if (typeof originalId !== "string" || !originalId.trim() ||
      typeof content?.type !== "string" || content.type === "edit") continue;
    edits.set(originalId, { type: content.type, payload: content });
  }
  return messages.map((message) => {
    const edit = edits.get(message.wa_message_id);
    if (!edit || message.sending || message.type === "edit") return message;
    const originalMedia = record(message.payload[message.type]);
    const editedMedia = record(edit.payload[edit.type]);
    const sameMedia = message.type === edit.type &&
      typeof originalMedia?.id === "string" && Boolean(originalMedia.id.trim()) &&
      originalMedia.id === editedMedia?.id;
    return {
      ...message,
      type: edit.type,
      payload: { ...message.payload, ...edit.payload },
      attachment_url: sameMedia ? message.attachment_url : undefined,
      edited: true,
    };
  });
}
