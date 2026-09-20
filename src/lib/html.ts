/** Strips <script> tags from backend-provided preview HTML before it's injected via dangerouslySetInnerHTML. */
export function stripScriptTags(html: string) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}
