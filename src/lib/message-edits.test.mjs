import assert from "node:assert/strict";
import test from "node:test";
import { applyMessageEdits } from "./message-edits.ts";

const original = {
  id: 1, wa_message_id: "original", sending: false, timestamp: 100, type: "text",
  payload: { text: { body: "Before" }, context: { message_id: "reply" } },
};
const edit = (timestamp = 200, body = "After") => ({
  id: timestamp, wa_message_id: `edit-${timestamp}`, sending: false, timestamp, type: "edit",
  payload: { edit: { original_message_id: "original", message: { type: "text", text: { body } } } },
});

test("incoming edit replaces original content and preserves identity, time, and reply context", () => {
  const [updated] = applyMessageEdits([original, edit()]);
  assert.equal(updated.payload.text.body, "After");
  assert.equal(updated.edited, true);
  assert.equal(updated.wa_message_id, original.wa_message_id);
  assert.equal(updated.timestamp, original.timestamp);
  assert.deepEqual(updated.payload.context, original.payload.context);
  assert.equal(original.payload.text.body, "Before");
});

test("sent originals and outgoing edits are ignored", () => {
  const sent = { ...original, sending: true };
  assert.equal(applyMessageEdits([sent, edit()])[0], sent);
  assert.equal(applyMessageEdits([original, { ...edit(), sending: true }])[0], original);
});

test("latest edit wins regardless of arrival order", () => {
  const [updated] = applyMessageEdits([original, edit(300, "Latest"), edit(200, "Older")]);
  assert.equal(updated.payload.text.body, "Latest");
});

test("retained edits apply when original is loaded later; malformed edits are ignored", () => {
  assert.equal(applyMessageEdits([edit(), original])[1].edited, true);
  for (const payload of [{}, { edit: {} }, { edit: { original_message_id: "original", message: null } }]) {
    assert.equal(applyMessageEdits([original, { ...edit(), payload }])[0], original);
  }
});

for (const type of ["image", "video", "audio", "document", "sticker"]) {
  test(`${type} caption edit preserves attachment URL when media ID is unchanged`, () => {
    const mediaOriginal = {
      ...original, type, attachment_url: "https://example.com/attachment",
      payload: { [type]: { id: "media-id", caption: "Before" } },
    };
    const mediaEdit = {
      ...edit(),
      payload: { edit: { original_message_id: "original", message: {
        type, [type]: { id: "media-id", caption: "After" },
      } } },
    };
    const [updated] = applyMessageEdits([mediaOriginal, mediaEdit]);
    assert.equal(updated.attachment_url, mediaOriginal.attachment_url);
    assert.equal(updated.payload[type].caption, "After");
    const changedId = {
      ...mediaEdit, payload: { edit: { original_message_id: "original", message: {
        type, [type]: { id: "different-id" },
      } } },
    };
    assert.equal(applyMessageEdits([mediaOriginal, changedId])[0].attachment_url, undefined);
  });
}
