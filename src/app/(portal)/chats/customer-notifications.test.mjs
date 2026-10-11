import assert from "node:assert/strict";
import test from "node:test";

import { applyCustomerNotification } from "./customer-notifications.ts";

const customer = (id, status = "ACTIVE", tags = []) => ({
  id, display_name: `Customer ${id}`, country_code: "65", phone_number: "12345678", status, tags,
});
const notification = (id, order, content = "New message") => ({
  message: { customer_id: id, customer_name: `Customer ${id}`, customer_is_new: true, notification_content: content },
  receivedAt: "2026-10-11T06:00:00.000Z",
  order,
});

test("existing notified customer moves to top with updated preview and timestamp", () => {
  const notifications = new Map([[2, notification(2, 1)]]);
  const rows = applyCustomerNotification([customer(1), customer(2)], 2, notifications, "ACTIVE", []);
  assert.deepEqual(rows.map((row) => row.id), [2, 1]);
  assert.equal(rows[0].latest_message_content, "New message");
  assert.equal(rows[0].last_message_timestamp, notifications.get(2).receivedAt);
});

test("outgoing realtime messages update customer preview, timestamp, and ordering", () => {
  const outgoing = notification(2, 1, "Sent reply");
  outgoing.message.sending = true;
  const notifications = new Map([[2, outgoing]]);
  const rows = applyCustomerNotification([customer(1), customer(2)], 2, notifications, "ACTIVE", []);
  assert.deepEqual(rows.map((row) => row.id), [2, 1]);
  assert.equal(rows[0].latest_message_content, "Sent reply");
  assert.equal(rows[0].last_message_timestamp, outgoing.receivedAt);
});

test("new customer is inserted once using fetched details", () => {
  const notifications = new Map([[2, notification(2, 1)]]);
  const rows = applyCustomerNotification([customer(1)], 2, notifications, "ACTIVE", [], customer(2));
  const repeated = applyCustomerNotification(rows, 2, notifications, "ACTIVE", [], customer(2));
  assert.deepEqual(repeated.map((row) => row.id), [2, 1]);
  assert.equal(repeated[0].phone_number, "12345678");
});

test("late responses cannot move an older notification above a newer one", () => {
  const notifications = new Map([[2, notification(2, 1)], [3, notification(3, 2)]]);
  const rows = applyCustomerNotification([customer(1)], 3, notifications, "ACTIVE", [], customer(3));
  const late = applyCustomerNotification(rows, 2, notifications, "ACTIVE", [], customer(2));
  assert.deepEqual(late.map((row) => row.id), [3, 2, 1]);
  notifications.set(2, notification(2, 3, "Latest message"));
  const newest = applyCustomerNotification(late, 2, notifications, "ACTIVE", []);
  assert.deepEqual(newest.map((row) => row.id), [2, 3, 1]);
  assert.equal(newest[0].latest_message_content, "Latest message");
});

test("inserted customers respect status and tag filters", () => {
  const initial = [customer(1)];
  const notifications = new Map([[2, notification(2, 1)]]);
  assert.equal(applyCustomerNotification(initial, 2, notifications, "INACTIVE", [], customer(2)), initial);
  assert.equal(applyCustomerNotification(initial, 2, notifications, "ACTIVE", ["VIP"], customer(2)), initial);
  assert.equal(
    applyCustomerNotification(initial, 2, notifications, "ACTIVE", ["VIP"], customer(2, "ACTIVE", ["VIP"]))[0].id,
    2,
  );
});

test("missing details or cleared notifications do not create placeholder customers", () => {
  const initial = [customer(1)];
  assert.equal(applyCustomerNotification(initial, 2, new Map([[2, notification(2, 1)]]), "ACTIVE", []), initial);
  assert.equal(applyCustomerNotification(initial, 2, new Map(), "ACTIVE", [], customer(2)), initial);
});
