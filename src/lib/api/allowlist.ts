/**
 * Upstream paths the BFF proxy is allowed to forward to. Keeping this closed
 * prevents the route handler from becoming an open proxy (SSRF).
 */
const ALLOWED: { method: string; pattern: RegExp }[] = [
  { method: "POST", pattern: /^v1\/auth\/login$/ },
  { method: "POST", pattern: /^v1\/auth\/logout$/ },
  { method: "GET", pattern: /^v1\/auth\/me$/ },
  { method: "PATCH", pattern: /^v1\/account\/users\/profile$/ },
  { method: "PATCH", pattern: /^v1\/account\/users\/password$/ },
  { method: "GET", pattern: /^v1\/wa\/user-phone-numbers$/ },
  { method: "DELETE", pattern: /^v1\/wa\/phone-numbers$/ },
  { method: "GET", pattern: /^v1\/wa\/templates$/ },
  { method: "POST", pattern: /^v1\/wa\/templates$/ },
  { method: "DELETE", pattern: /^v1\/wa\/templates$/ },
  { method: "GET", pattern: /^v1\/wa\/templates\/costs$/ },
  { method: "GET", pattern: /^v1\/wa\/templates\/usage$/ },
  { method: "GET", pattern: /^v1\/wa\/business-accounts$/ },
  { method: "GET", pattern: /^v1\/wa\/business-accounts\/usage$/ },
  { method: "GET", pattern: /^v1\/wa\/business-accounts\/costs$/ },
  { method: "GET", pattern: /^v1\/wa\/phone-numbers\/usage$/ },
  { method: "GET", pattern: /^v1\/wa\/phone-numbers\/costs$/ },
  { method: "PATCH", pattern: /^v1\/wa\/business-accounts\/name$/ },
  { method: "GET", pattern: /^v1\/wa\/business-portfolios$/ },
  { method: "PATCH", pattern: /^v1\/wa\/business-portfolios\/name$/ },
  { method: "POST", pattern: /^v1\/wa\/embedded-signup$/ },
];

export function isAllowedUpstream(method: string, path: string) {
  return ALLOWED.some(
    (entry) => entry.method === method.toUpperCase() && entry.pattern.test(path),
  );
}
