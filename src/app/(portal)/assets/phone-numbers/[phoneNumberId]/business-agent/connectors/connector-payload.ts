import type { AuthType, ConnectorPayload, Parameters } from "./connector-types";

export function buildConnectorPayload(
  form: FormData,
  {
    authType,
    parameters,
    mtls,
    userAuth,
  }: {
    authType: AuthType;
    parameters: Parameters;
    mtls: boolean;
    userAuth: boolean;
  },
): ConnectorPayload {
  const text = (name: string) => String(form.get(name) ?? "");
  if (authType === "API_KEY" && !Object.values(parameters).some((rows) => rows.length > 0)) {
    throw new Error("Add at least one API key parameter.");
  }

  return {
    name: text("name").trim(),
    description: text("description").trim(),
    base_url: text("base_url").trim(),
    connector_protocol: text("connector_protocol").trim(),
    auth_type: authType,
    ...(authType === "NONE"
      ? {}
      : {
          auth_config:
            authType === "OAUTH2_CLIENT_CREDENTIALS"
              ? {
                  oauth2_client_credentials: {
                    token_url: text("token_url").trim(),
                    scopes_to_request: text("scopes").split(/\s+/).filter(Boolean),
                    token_request_content_type: text("token_request_content_type"),
                    client_id: text("client_id").trim(),
                    client_secret: text("client_secret"),
                  },
                }
              : {
                  api_key: {
                    headers: parameters.headers.map((row) => ({
                      ...row,
                      field_name: row.field_name.trim(),
                    })),
                    query_params: parameters.query_params.map((row) => ({
                      ...row,
                      field_name: row.field_name.trim(),
                    })),
                    body_params: parameters.body_params.map((row) => ({
                      ...row,
                      field_name: row.field_name.trim(),
                    })),
                  },
                },
        }),
    ...(mtls
      ? {
          mtls_config: {
            client_certificate: text("client_certificate").trim(),
            ca_certificate: text("ca_certificate").trim(),
          },
        }
      : {}),
    ...(userAuth
      ? {
          user_auth_injection_config: {
            location: text("location"),
            field_name: text("field_name").trim(),
            prefix: text("prefix"),
          },
        }
      : {}),
  };
}
