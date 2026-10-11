export function resolveDirectChatMediaUrl(
  attachmentUrl: string | undefined,
  mediaId: string | undefined,
  mediaUrl: string | undefined,
): string | undefined {
  return attachmentUrl?.trim() || (mediaId ? undefined : mediaUrl);
}

export function resolveChatMediaUrl(
  attachmentUrl: unknown,
  media: { link?: unknown; url?: unknown } | undefined,
): string | undefined {
  for (const value of [attachmentUrl, media?.link, media?.url]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
