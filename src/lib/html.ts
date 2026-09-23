/** Strips <script> tags from backend-provided preview HTML before it's injected via dangerouslySetInnerHTML. */
export function stripScriptTags(html: string) {
  return html.replace(/<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|$)/gi, "");
}

export function withLazyImages(html: string) {
  return html.replace(/<img\b([^>]*)>/gi, (tag, attributes: string) =>
    /\bloading\s*=/i.test(attributes) ? tag : `<img${attributes} loading="lazy">`,
  );
}
