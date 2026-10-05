import assert from "node:assert/strict";
import test from "node:test";

import { isAllowedUpstream } from "../../../../../../../lib/api/allowlist.ts";
import { getConnectorList } from "./connector-list.ts";
import { buildConnectorPayload } from "./connector-payload.ts";

function formData(values = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    name: " My Shopify Connector ",
    description: " Order management ",
    base_url: "https://api.shopify.com/v1",
    connector_protocol: "HTTP",
    token_url: "https://auth.example.com/token",
    scopes: " read  write\norders ",
    token_request_content_type: "application/x-www-form-urlencoded",
    client_id: "client-id",
    client_secret: " secret with spaces ",
    ...values,
  }))
    form.set(key, value);
  return form;
}

const defaults = {
  authType: "OAUTH2_CLIENT_CREDENTIALS",
  parameters: { headers: [], query_params: [], body_params: [] },
  mtls: false,
  userAuth: false,
};

test("connector list accepts arrays and wrapped connector arrays", () => {
  const connectors = [{ id: 1, name: "Shopify" }];
  assert.deepEqual(getConnectorList(connectors), connectors);
  assert.deepEqual(getConnectorList({ connectors }), connectors);
});

test("connector list treats omitted or null data as an empty list", () => {
  assert.deepEqual(getConnectorList(undefined), []);
  assert.deepEqual(getConnectorList(null), []);
});

test("connector list rejects invalid response shapes", () => {
  assert.throws(() => getConnectorList({ items: [] }), /invalid connector list/);
  assert.throws(() => getConnectorList({ connectors: null }), /invalid connector list/);
});

test("None authentication omits auth_config including stale credentials", () => {
  const payload = buildConnectorPayload(formData(), {
    ...defaults,
    authType: "NONE",
    parameters: {
      headers: [{ field_name: "Authorization", value: "stale-secret", prefix: "Bearer " }],
      query_params: [],
      body_params: [],
    },
  });
  assert.equal(payload.auth_type, "NONE");
  assert.equal(Object.hasOwn(payload, "auth_config"), false);
  assert.equal(Object.hasOwn(JSON.parse(JSON.stringify(payload)), "auth_config"), false);
});

test("None authentication requires no credentials or API key parameters", () => {
  const form = formData();
  for (const key of ["token_url", "client_id", "client_secret"]) form.delete(key);
  const payload = buildConnectorPayload(form, { ...defaults, authType: "NONE" });
  assert.equal(payload.auth_type, "NONE");
  assert.equal(Object.hasOwn(payload, "auth_config"), false);
});

test("OAuth payload includes only configuration and preserves secret whitespace", () => {
  const payload = buildConnectorPayload(
    formData({ id: "ignored", status: "ACTIVE" }),
    defaults,
  );
  assert.deepEqual(payload, {
    name: "My Shopify Connector",
    description: "Order management",
    base_url: "https://api.shopify.com/v1",
    connector_protocol: "HTTP",
    auth_type: "OAUTH2_CLIENT_CREDENTIALS",
    auth_config: {
      oauth2_client_credentials: {
        token_url: "https://auth.example.com/token",
        scopes_to_request: ["read", "write", "orders"],
        token_request_content_type: "application/x-www-form-urlencoded",
        client_id: "client-id",
        client_secret: " secret with spaces ",
      },
    },
  });
});

test("optional certificates and injection preserve PEM newlines and trailing prefix space", () => {
  const certificate = "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----";
  const payload = buildConnectorPayload(
    formData({
      client_certificate: `${certificate}\n`,
      ca_certificate: `${certificate}\n`,
      location: "headers",
      field_name: " Authorization ",
      prefix: "Bearer ",
      has_certificate: "true",
      fingerprint: "ignored",
    }),
    { ...defaults, mtls: true, userAuth: true },
  );
  assert.deepEqual(payload.mtls_config, {
    client_certificate: certificate,
    ca_certificate: certificate,
  });
  assert.deepEqual(payload.user_auth_injection_config, {
    location: "headers",
    field_name: "Authorization",
    prefix: "Bearer ",
  });
});

test("API key payload supports every location without including OAuth credentials", () => {
  const parameters = {
    headers: [{ field_name: " X-API-Key ", value: " secret ", prefix: "" }],
    query_params: [{ field_name: "client_id", value: "client-id", prefix: "" }],
    body_params: [{ field_name: "token", value: "token", prefix: "Bearer " }],
  };
  const payload = buildConnectorPayload(formData(), {
    ...defaults,
    authType: "API_KEY",
    parameters,
  });
  assert.deepEqual(payload.auth_config, {
    api_key: {
      ...parameters,
      headers: [{ field_name: "X-API-Key", value: " secret ", prefix: "" }],
    },
  });
  assert.equal(parameters.headers[0].field_name, " X-API-Key ");
});

test("API key authentication rejects empty parameters", () => {
  assert.throws(
    () => buildConnectorPayload(formData(), { ...defaults, authType: "API_KEY" }),
    /Add at least one API key parameter/,
  );
});

test("empty scopes are an empty array and disabled optional configurations are omitted", () => {
  const payload = buildConnectorPayload(
    formData({
      scopes: " \n ",
      client_certificate: "stale",
      prefix: "stale",
    }),
    defaults,
  );
  assert.deepEqual(payload.auth_config.oauth2_client_credentials.scopes_to_request, []);
  assert.equal("mtls_config" in payload, false);
  assert.equal("user_auth_injection_config" in payload, false);
});

test("proxy permits exact connector endpoints and rejects unrelated methods or paths", () => {
  const path = "v1/wa/phone-numbers/123/business-agent/connectors";
  assert.equal(isAllowedUpstream("GET", path), true);
  assert.equal(isAllowedUpstream("POST", path), true);
  assert.equal(isAllowedUpstream("PUT", `${path}/connector-1`), true);
  assert.equal(isAllowedUpstream("PUT", `${path}/123`), true);
  assert.equal(isAllowedUpstream("PUT", path), false);
  assert.equal(isAllowedUpstream("POST", `${path}/connector-1`), false);
  assert.equal(isAllowedUpstream("DELETE", `${path}/connector-1`), false);
  assert.equal(isAllowedUpstream("PUT", `${path}/connector-1/extra`), false);
  assert.equal(isAllowedUpstream("POST", path.replace("/123/", "/invalid/")), false);
});
