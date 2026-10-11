import assert from "node:assert/strict";
import test from "node:test";
import { createChatMediaMessage } from "./chat-media-message.ts";

for (const [type, mime] of [
  ["image", "image/jpeg"], ["video", "video/mp4"],
  ["audio", "audio/mpeg"], ["document", "application/pdf"],
]) {
  test(`${type} sends uploaded ID, not a link, and preserves caption behavior`, () => {
    const result = createChatMediaMessage(" media-id ", { type: mime, name: "attachment.pdf" }, "Caption");
    assert.deepEqual(result, {
      payload: {
        type,
        [type]: {
          id: "media-id",
          ...(type !== "audio" ? { caption: "Caption" } : {}),
          ...(type === "document" ? { filename: "attachment.pdf" } : {}),
        },
      },
      sendCaptionAsText: type === "audio",
    });
  });
}

test("missing or invalid upload IDs stop message creation", () => {
  for (const id of [undefined, null, "", " ", 123]) {
    assert.throws(() => createChatMediaMessage(id, { type: "image/png", name: "image.png" }, ""), /valid ID/);
  }
});

test("empty caption does not create an extra audio text message", () => {
  assert.deepEqual(createChatMediaMessage("id", { type: "audio/aac", name: "audio.aac" }, ""), {
    payload: { type: "audio", audio: { id: "id" } },
    sendCaptionAsText: false,
  });
});
