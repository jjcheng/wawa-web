/** Strips <script> tags from backend-provided preview HTML before it's injected via dangerouslySetInnerHTML. */
export function stripScriptTags(html: string) {
  return html.replace(/<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|$)/gi, "");
}

export function withLazyImages(html: string) {
  return html.replace(/<img\b([^>]*)>/gi, (tag, attributes: string) =>
    /\bloading\s*=/i.test(attributes) ? tag : `<img${attributes} loading="lazy">`,
  );
}

export function htmlToPlainText(html: string) {
  return stripScriptTags(html)
    .replace(/<style\b[^>]*>[\s\S]*?(?:<\/style\s*>|$)/gi, " ")
    .replace(/<\/(p|div|section|article|header|footer|li|ul|ol|h[1-6]|blockquote|br)\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerptText(value: string, maxLength = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const clipped = normalized.slice(0, maxLength + 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 80 ? lastSpace : maxLength).trim()}...`;
}
