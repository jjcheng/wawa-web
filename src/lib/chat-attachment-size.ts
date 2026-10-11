export function validateChatAttachmentSize(file: { type: string; size: number }) {
  const limitMB = file.type.startsWith("image/") ? 5 : file.type.startsWith("video/") ? 16 : undefined;
  if (limitMB !== undefined && file.size > limitMB * 1024 * 1024) {
    throw new Error(`${file.type.startsWith("image/") ? "Images" : "Videos"} must be ${limitMB} MB or smaller.`);
  }
}
