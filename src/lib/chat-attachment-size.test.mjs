import assert from "node:assert/strict";
import test from "node:test";
import { validateChatAttachmentSize } from "./chat-attachment-size.ts";

for (const [type, mb] of [["image/jpeg", 5], ["image/png", 5], ["video/mp4", 16], ["video/3gpp", 16]]) {
  test(`${type} accepts exactly ${mb} MB and rejects one byte over`, () => {
    const limit = mb * 1024 * 1024;
    assert.doesNotThrow(() => validateChatAttachmentSize({ type, size: limit }));
    assert.doesNotThrow(() => validateChatAttachmentSize({ type, size: limit - 1 }));
    assert.throws(() => validateChatAttachmentSize({ type, size: limit + 1 }), new RegExp(`${mb} MB`));
  });
}

test("image and video limits do not apply to audio or documents", () => {
  for (const type of ["audio/mpeg", "application/pdf"]) {
    assert.doesNotThrow(() => validateChatAttachmentSize({ type, size: 20 * 1024 * 1024 }));
  }
});
