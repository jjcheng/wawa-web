import assert from "node:assert/strict";
import test from "node:test";
import { applyMessageRevokes } from "./message-revokes.ts";
import { applyMessageEdits } from "./message-edits.ts";

const original = {
  id: 1, wa_message_id: "original", sending: false, timestamp: 100, type: "text",
  payload: { text: { body: "Before" } }, status: "read",
};
const revoke = {
  id: 2, wa_message_id: "revoke-event", sending: false, timestamp: 200, type: "revoke",
  payload: { revoke: { original_message_id: "original" } },
};

test("revoke marks only its target and preserves its content, identity, timestamp, and status", () => {
  const unrelated = { ...original, id: 3, wa_message_id: "unrelated" };
  const [updated, other, event] = applyMessageRevokes([original, unrelated, revoke]);
  assert.deepEqual(updated, { ...original, deleted: true });
  assert.equal(other, unrelated);
  assert.equal(event, revoke);
  assert.equal(original.deleted, undefined);
});

test("revokes apply to both sent and received messages", () => {
  assert.equal(applyMessageRevokes([{ ...original, sending: true }, revoke])[0].deleted, true);
  assert.equal(applyMessageRevokes([original, { ...revoke, sending: true }])[0].deleted, true);
});

test("raw WhatsApp revoke shape is supported", () => {
  const raw = {
    from: "sender", to: "recipient", id: "revoke-event", timestamp: "1791703398",
    type: "revoke", revoke: { original_message_id: "original" },
  };
  assert.equal(applyMessageRevokes([original, raw])[0].deleted, true);
});

test("retained revokes apply when original arrives later and duplicate revokes are idempotent", () => {
  const retained = applyMessageRevokes([revoke]);
  assert.equal(applyMessageRevokes([...retained, original])[1].deleted, true);
  assert.deepEqual(
    applyMessageRevokes([original, revoke, revoke])[0],
    applyMessageRevokes([original, revoke])[0],
  );
});

test("revoke can match message id and remains marked after an edit", () => {
  const byId = { ...revoke, payload: { revoke: { original_message_id: "1" } } };
  assert.equal(applyMessageRevokes([original, byId])[0].deleted, true);
  const edit = {
    ...revoke, id: 3, wa_message_id: "edit-event", type: "edit", timestamp: 300,
    payload: { edit: { original_message_id: "original", message: { type: "text", text: { body: "After" } } } },
  };
  const [updated] = applyMessageRevokes(applyMessageEdits([original, revoke, edit]));
  assert.equal(updated.deleted, true);
  assert.equal(updated.edited, true);
  assert.equal(updated.payload.text.body, "After");
});

test("malformed revoke is reported without changing messages", (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  for (const payload of [{}, { revoke: {} }, { revoke: { original_message_id: "" } }]) {
    assert.equal(applyMessageRevokes([original, { ...revoke, payload }])[0], original);
  }
  assert.equal(warn.mock.callCount(), 3);
});
