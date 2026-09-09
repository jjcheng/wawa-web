/**
 * Upstream paths the BFF proxy is allowed to forward to. Keeping this closed
 * prevents the route handler from becoming an open proxy (SSRF).
 */
const ALLOWED: { method: string; pattern: RegExp }[] = [
  { method: "POST", pattern: /^v1\/auth\/login$/ },
  { method: "POST", pattern: /^v1\/auth\/logout$/ },
  { method: "GET", pattern: /^v1\/auth\/me$/ },
  { method: "PATCH", pattern: /^v1\/account\/users\/me\/profile$/ },
  { method: "PATCH", pattern: /^v1\/account\/users\/me\/password$/ },
  { method: "POST", pattern: /^v1\/account\/users\/me\/initial-password$/ },
  { method: "POST", pattern: /^v1\/customers$/ },
  { method: "POST", pattern: /^v1\/customers\/import$/ },
  { method: "GET", pattern: /^v1\/customers$/ },
  { method: "DELETE", pattern: /^v1\/customers$/ },
  { method: "PATCH", pattern: /^v1\/customers\/status$/ },
  { method: "GET", pattern: /^v1\/customers\/get$/ },
  { method: "PATCH", pattern: /^v1\/customers\/\d+$/ },
  { method: "GET", pattern: /^v1\/customers\/tags$/ },
  { method: "GET", pattern: /^v1\/wa\/user-phone-numbers$/ },
  { method: "GET", pattern: /^v1\/wa\/messages$/ },
  { method: "POST", pattern: /^v1\/wa\/messages$/ },
  { method: "POST", pattern: /^v1\/wa\/messages\/realtime-token$/ },
  { method: "GET", pattern: /^v1\/wa\/media$/ },
  { method: "POST", pattern: /^v1\/wa\/media$/ },
  { method: "DELETE", pattern: /^v1\/wa\/phone-numbers$/ },
  { method: "GET", pattern: /^v1\/wa\/templates$/ },
  { method: "GET", pattern: /^v1\/wa\/sample-templates$/ },
  { method: "POST", pattern: /^v1\/wa\/templates$/ },
  { method: "POST", pattern: /^v1\/wa\/templates\/from-sample$/ },
  { method: "DELETE", pattern: /^v1\/wa\/templates$/ },
  { method: "GET", pattern: /^v1\/wa\/templates\/usage$/ },
  { method: "GET", pattern: /^v1\/wa\/business-accounts$/ },
  { method: "GET", pattern: /^v1\/wa\/business-accounts\/usage$/ },
  { method: "GET", pattern: /^v1\/wa\/phone-numbers\/usage$/ },
  { method: "PATCH", pattern: /^v1\/wa\/business-accounts\/name$/ },
  { method: "GET", pattern: /^v1\/wa\/business-portfolios$/ },
  { method: "PATCH", pattern: /^v1\/wa\/business-portfolios\/name$/ },
];

export function isAllowedUpstream(method: string, path: string) {
  return ALLOWED.some(
    (entry) => entry.method === method.toUpperCase() && entry.pattern.test(path),
  );
}
