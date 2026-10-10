import assert from "node:assert/strict";
import test from "node:test";

import { parseTimezoneOffset, TIMEZONE_OFFSETS } from "./timezone-offsets.ts";

test("timezone options cover all whole-hour offsets and fractional timezone offsets", () => {
  const expected = [
    ...Array.from({ length: 27 }, (_, index) => index - 12),
    -9.5, -3.5, -2.5, 3.5, 4.5, 5.5, 5.75, 6.5, 8.75, 9.5, 10.5, 12.75, 13.75,
  ].sort((a, b) => a - b);
  assert.deepEqual(TIMEZONE_OFFSETS.map((option) => option.hours), expected);
  for (const option of TIMEZONE_OFFSETS) {
    assert.equal(parseTimezoneOffset(String(option.hours)), option.hours);
    assert.match(option.label, /^UTC[+-]\d{2}:\d{2} - .+$/);
  }
});

test("timezone labels display fractional hours as minutes", () => {
  for (const [hours, prefix] of [
    [-3.5, "UTC-03:30"],
    [0, "UTC+00:00"],
    [5.5, "UTC+05:30"],
    [5.75, "UTC+05:45"],
    [8.75, "UTC+08:45"],
    [13.75, "UTC+13:45"],
  ]) {
    assert.ok(TIMEZONE_OFFSETS.find((option) => option.hours === hours)?.label.startsWith(prefix));
  }
});

test("invalid or missing timezone selections are rejected", () => {
  for (const value of ["", " ", "NaN", "Infinity", "-13", "15", "5.25", "Asia/Singapore"]) {
    assert.throws(() => parseTimezoneOffset(value), /Select a valid timezone/);
  }
});
