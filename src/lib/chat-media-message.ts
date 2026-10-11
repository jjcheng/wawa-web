export function createChatMediaMessage(
  mediaId: unknown,
  file: { type: string; name: string },
  caption: string,
) {
  if (typeof mediaId !== "string" || !mediaId.trim()) {
    throw new Error("Media upload did not return a valid ID.");
  }
  const type = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("audio/")
        ? "audio"
        : "document";
  return {
    payload: {
      type,
      [type]: {
        id: mediaId.trim(),
        ...(caption && type !== "audio" ? { caption } : {}),
        ...(type === "document" ? { filename: file.name } : {}),
      },
    },
    sendCaptionAsText: Boolean(caption && type === "audio"),
  };
}
