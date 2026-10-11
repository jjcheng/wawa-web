import assert from "node:assert/strict";
import test from "node:test";
import { applyMessageStatus, hasReadStatus } from "./message-status.ts";

test("READ anywhere in status history takes precedence over current status and errors", () => {
  const message = {
    wa_message_id: "one", status: "FAILED", error_message: "Later failure",
    statuses: [{ status: "SENT" }, { status: "READ" }, { status: "DELIVERED" }],
  };
  assert.equal(hasReadStatus(message), true);
  assert.equal(applyMessageStatus(message, { wa_message_id: "one", status: "sent" }), message);
  assert.equal(hasReadStatus({ status: "READ" }), true);
  assert.equal(hasReadStatus({ statuses: [{ status: "read" }] }), true);
  assert.equal(hasReadStatus({ statuses: [{ status: "DELIVERED" }] }), false);
  assert.equal(hasReadStatus({}), false);
});

test("read messages ignore all subsequent status notifications", () => {
  const message = { wa_message_id: "one", status: "read" };
  for (const status of ["sent", "delivered", "failed", "read", "unknown"]) {
    assert.equal(applyMessageStatus(message, { wa_message_id: "one", status }), message);
  }
});

test("other statuses can transition to read", () => {
  for (const status of [undefined, "sent", "delivered", "failed"]) {
    assert.equal(
      applyMessageStatus({ wa_message_id: "one", status }, { wa_message_id: "one", status: "read" }).status,
      "read",
    );
  }
});

test("non-read transitions and unrelated messages preserve existing behavior", () => {
  const message = { wa_message_id: "one", status: "sent" };
  assert.equal(applyMessageStatus(message, { wa_message_id: "one", status: "delivered" }).status, "delivered");
  assert.equal(applyMessageStatus(message, { wa_message_id: "two", status: "read" }), message);
});
