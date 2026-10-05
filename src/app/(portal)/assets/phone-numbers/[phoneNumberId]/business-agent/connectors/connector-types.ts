export type AuthType = "NONE" | "OAUTH2_CLIENT_CREDENTIALS" | "API_KEY";
export type Parameter = { field_name: string; value: string; prefix: string };
export type ParameterLocation = "headers" | "query_params" | "body_params";
export type Parameters = Record<ParameterLocation, Parameter[]>;

export type ConnectorPayload = {
  name: string;
  description: string;
  base_url: string;
  connector_protocol: string;
  auth_type: AuthType;
  auth_config?: {
    oauth2_client_credentials?: {
      token_url: string;
      scopes_to_request: string[];
      token_request_content_type: string;
      client_id: string;
      client_secret: string;
    };
    api_key?: Parameters;
  };
  mtls_config?: {
    client_certificate: string;
    ca_certificate: string;
  };
  user_auth_injection_config?: { location: string; field_name: string; prefix: string };
};

export type BusinessAgentConnector = Partial<Omit<ConnectorPayload, "mtls_config">> & {
  id?: number | string;
  title?: string;
  type?: string;
  connector_type?: string;
  status?: string;
  created_at?: string | number;
  url?: string;
  connection_status?: { status?: string; error_message?: string };
  mtls_config?: Partial<NonNullable<ConnectorPayload["mtls_config"]>> & {
    has_certificate?: boolean;
  };
};
