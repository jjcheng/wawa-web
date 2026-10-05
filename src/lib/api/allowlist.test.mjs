import assert from "node:assert/strict";
import test from "node:test";

import { isAllowedUpstream } from "./allowlist.ts";

test("phone number usage requires a numeric ID and GET", () => {
  const path = "v1/wa/phone-numbers/40/usage";
  assert.equal(isAllowedUpstream("GET", path), true);
  assert.equal(isAllowedUpstream("GET", "v1/wa/phone-numbers/usage"), false);
  assert.equal(isAllowedUpstream("GET", path.replace("/40/", "/invalid/")), false);
  assert.equal(isAllowedUpstream("GET", `${path}/extra`), false);
  assert.equal(isAllowedUpstream("POST", path), false);
});

test("phone number business profile requires a numeric ID and GET", () => {
  const path = "v1/wa/phone-numbers/40/business-profile";
  assert.equal(isAllowedUpstream("GET", path), true);
  assert.equal(isAllowedUpstream("GET", "v1/wa/phone-numbers/business-profile"), false);
  assert.equal(isAllowedUpstream("GET", path.replace("/40/", "/invalid/")), false);
  assert.equal(isAllowedUpstream("GET", `${path}/extra`), false);
  assert.equal(isAllowedUpstream("POST", path), false);
});

const phoneNumberRoutes = [
  ["PATCH", "status"],
  ["GET", "eligibility"],
  ["POST", "onboard"],
  ["POST", "offboard"],
  ["GET", "business-info"],
  ["PUT", "business-info"],
  ["GET", "faqs"],
  ["POST", "faqs"],
  ["PUT", "faqs/faq-1"],
  ["DELETE", "faqs/faq-1"],
  ["GET", "files"],
  ["POST", "files"],
  ["DELETE", "files/file-1"],
  ["GET", "websites"],
  ["POST", "websites"],
  ["PUT", "websites"],
  ["GET", "websites/website-1"],
  ["DELETE", "websites/website-1"],
  ["GET", "skills"],
  ["POST", "skills"],
  ["PUT", "skills"],
  ["DELETE", "skills/skill-1"],
  ["POST", "common-skills"],
  ["GET", "ui-skills"],
  ["POST", "ui-skills"],
  ["PUT", "ui-skills"],
  ["DELETE", "ui-skills/skill-1"],
  ["POST", "test"],
  ["GET", "settings"],
  ["PUT", "settings"],
  ["PUT", "schedule"],
  ["GET", "connectors"],
  ["POST", "connectors"],
  ["PUT", "connectors/connector-1"],
];

test("phone-number-scoped business agent routes require a numeric ID and exact path", () => {
  for (const [method, suffix] of phoneNumberRoutes) {
    const path = `v1/wa/phone-numbers/40/business-agent/${suffix}`;
    assert.equal(isAllowedUpstream(method, path), true, `${method} ${path}`);
    assert.equal(isAllowedUpstream(method, `v1/wa/business-agent/${suffix}`), false);
    assert.equal(isAllowedUpstream(method, path.replace("/40/", "/invalid/")), false);
    assert.equal(isAllowedUpstream(method, `${path}/extra/nested`), false);
  }
  assert.equal(
    isAllowedUpstream("POST", "v1/wa/business-agent/phone-numbers/40/common-skills"),
    false,
  );
});

test("business agent routes do not permit unrelated methods", () => {
  for (const [method, suffix] of phoneNumberRoutes) {
    assert.equal(
      isAllowedUpstream("OPTIONS", `v1/wa/phone-numbers/40/business-agent/${suffix}`),
      false,
      `${method} ${suffix}`,
    );
  }
  assert.equal(isAllowedUpstream("DELETE", "v1/wa/phone-numbers/40/business-agent/status"), false);
  assert.equal(isAllowedUpstream("GET", "v1/wa/phone-numbers/40/business-agent/onboard"), false);
});

test("account budgets and customer pass-control retain their existing routes", () => {
  assert.equal(isAllowedUpstream("GET", "v1/wa/business-agent/budgets"), true);
  assert.equal(isAllowedUpstream("PUT", "v1/wa/business-agent/budgets"), true);
  assert.equal(isAllowedUpstream("POST", "v1/wa/business-agent/pass-control"), true);
  assert.equal(isAllowedUpstream("GET", "v1/wa/phone-numbers/40/business-agent/budgets"), false);
  assert.equal(isAllowedUpstream("POST", "v1/wa/phone-numbers/40/business-agent/pass-control"), false);
});
