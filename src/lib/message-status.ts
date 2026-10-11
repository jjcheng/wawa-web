type MessageStatusHistory = {
  status?: string;
  statuses?: { status: string }[];
};

export function hasReadStatus(message: MessageStatusHistory): boolean {
  return message.status?.toLowerCase() === "read" ||
    Boolean(message.statuses?.some((event) => event.status.toLowerCase() === "read"));
}

export function applyMessageStatus<T extends MessageStatusHistory & { wa_message_id: string }>(
  message: T,
  update: { wa_message_id: string; status: string },
): T {
  if (message.wa_message_id !== update.wa_message_id || hasReadStatus(message)) {
    return message;
  }
  return { ...message, status: update.status };
}
