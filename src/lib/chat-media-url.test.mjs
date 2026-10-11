import assert from "node:assert/strict";
import test from "node:test";
import { resolveChatMediaUrl, resolveDirectChatMediaUrl } from "./chat-media-url.ts";

test("nonempty attachment URL bypasses ID lookup", () => {
  assert.equal(resolveDirectChatMediaUrl(" https://example.com/stored ", "media-id", "https://example.com/link"), "https://example.com/stored");
});

test("ID lookup is needed only without an attachment URL; link-only media stays direct", () => {
  assert.equal(resolveDirectChatMediaUrl(" ", "media-id", "https://example.com/link"), undefined);
  assert.equal(resolveDirectChatMediaUrl(undefined, "media-id", undefined), undefined);
  assert.equal(resolveDirectChatMediaUrl(undefined, undefined, "https://example.com/link"), "https://example.com/link");
});

test("sent media links and legacy media URLs are resolved", () => {
  assert.equal(resolveChatMediaUrl(undefined, { link: "https://example.com/video.mp4" }), "https://example.com/video.mp4");
  assert.equal(resolveChatMediaUrl(undefined, { url: "https://example.com/image.jpg" }), "https://example.com/image.jpg");
});

test("attachment URL takes precedence and empty values fall through", () => {
  assert.equal(resolveChatMediaUrl("https://example.com/stored", { link: "https://example.com/link" }), "https://example.com/stored");
  assert.equal(resolveChatMediaUrl(" ", { link: " ", url: "https://example.com/document.pdf" }), "https://example.com/document.pdf");
  assert.equal(resolveChatMediaUrl(undefined, undefined), undefined);
});
