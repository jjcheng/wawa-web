/**
 * Upstream paths the BFF proxy is allowed to forward to. Keeping this closed
 * prevents the route handler from becoming an open proxy (SSRF).
 */
const ALLOWED: { method: string; pattern: RegExp }[] = [
  { method: "POST", pattern: /^auth\/v1\/login$/ },
  { method: "POST", pattern: /^auth\/v1\/logout$/ },
  { method: "GET", pattern: /^auth\/v1\/me$/ },
  { method: "PATCH", pattern: /^account\/users\/v1\/profile$/ },
  { method: "PATCH", pattern: /^account\/users\/v1\/password$/ },
  { method: "GET", pattern: /^wa\/v1\/user-phone-numbers$/ },
  { method: "DELETE", pattern: /^wa\/v1\/phone-numbers$/ },
  { method: "GET", pattern: /^wa\/v1\/templates$/ },
  { method: "POST", pattern: /^wa\/v1\/templates$/ },
  { method: "DELETE", pattern: /^wa\/v1\/templates$/ },
  { method: "GET", pattern: /^wa\/v1\/business-accounts$/ },
  { method: "PATCH", pattern: /^wa\/v1\/business-accounts\/name$/ },
  { method: "GET", pattern: /^wa\/v1\/business-portfolios$/ },
  { method: "PATCH", pattern: /^wa\/v1\/business-portfolios\/name$/ },
  { method: "POST", pattern: /^wa\/v1\/embedded-signup$/ },
];

export function isAllowedUpstream(method: string, path: string) {
  return ALLOWED.some(
    (entry) => entry.method === method.toUpperCase() && entry.pattern.test(path),
  );
}
