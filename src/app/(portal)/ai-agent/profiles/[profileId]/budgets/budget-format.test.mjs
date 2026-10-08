import assert from "node:assert/strict";
import test from "node:test";

import { formatBudget, parseBudget, validateBudgets } from "./budget-format.ts";

test("budget amounts are divided by 1000 and displayed with at most two decimals", () => {
  for (const [stored, displayed] of [
    [0, "0"],
    [1000, "1"],
    [1500, "1.5"],
    [12340, "12.34"],
    [12344, "12.34"],
    [12345, "12.35"],
    [1, "0"],
    [999999, "1000"],
  ]) {
    assert.equal(formatBudget(stored), displayed);
  }
});

test("entered budgets are scaled to exact integers", () => {
  for (const [entered, stored] of [
    ["0", 0],
    ["1", 1000],
    ["1.5", 1500],
    ["1.01", 1010],
    ["12.35", 12350],
  ]) {
    assert.equal(parseBudget(entered), stored);
  }
});

test("invalid budget input is rejected", () => {
  for (const value of ["", "-1", "1.001", "1e3", "NaN", "99999999999999999"]) {
    assert.throws(() => parseBudget(value));
  }
});

test("invalid budget amounts are not displayed as zero or NaN", () => {
  for (const value of [undefined, null, "1000", NaN, Infinity, 1.5]) {
    assert.throws(() => formatBudget(value), /invalid budget amount/);
  }
});

test("positive budgets can be equal or increase with each time window", () => {
  for (const amounts of [
    [10, 10, 10],
    [10, 20, 30],
    [1, 2, 3],
  ]) {
    const [budget_daily, budget_7_days, budget_30_days] = amounts;
    assert.deepEqual(validateBudgets({ budget_daily, budget_7_days, budget_30_days }), []);
  }
});

test("all budget fields reject zero and negative amounts", () => {
  for (const field of ["budget_daily", "budget_7_days", "budget_30_days"]) {
    for (const amount of [0, -10]) {
      const errors = validateBudgets({
        budget_daily: 1000,
        budget_7_days: 2000,
        budget_30_days: 3000,
        [field]: amount,
      });
      assert.ok(
        errors.some((error) => error.field === field && /greater than 0/.test(error.message)),
      );
    }
  }
});

test("decreasing budgets report both time window errors", () => {
  const errors = validateBudgets({
    budget_daily: 3000,
    budget_7_days: 2000,
    budget_30_days: 1000,
  });
  assert.deepEqual(
    errors.map((error) => error.field),
    ["budget_7_days", "budget_30_days"],
  );
});
