import assert from "node:assert/strict";
import test from "node:test";

import { isMainRoute, MAIN_ROUTES } from "./main-routes.ts";

test("bottom tabs appear only on the five exact main routes", () => {
  assert.equal(MAIN_ROUTES.length, 5);
  for (const route of MAIN_ROUTES) {
    assert.equal(isMainRoute(route), true);
    assert.equal(isMainRoute(`${route}/details`), false);
  }
});

test("AI profile and business info pages do not show bottom tabs", () => {
  for (const route of [
    "/ai-agent/profiles",
    "/ai-agent/profiles/1",
    "/ai-agent/profiles/1/budgets",
    "/ai-agents/1/business-info",
    "/settings",
  ]) {
    assert.equal(isMainRoute(route), false);
  }
});
