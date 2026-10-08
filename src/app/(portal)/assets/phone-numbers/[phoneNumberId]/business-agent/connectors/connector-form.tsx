"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import { buildConnectorPayload, normalizeConnectorName } from "./connector-payload";
import type {
  AuthType,
  ConnectorProtocol,
  BusinessAgentConnector,
  Parameter,
  ParameterLocation,
  Parameters,
} from "./connector-types";

function ParameterFields({
  location,
  label,
  parameters,
  onChange,
}: {
  location: ParameterLocation;
  label: string;
  parameters: Parameter[];
  onChange: (parameters: Parameter[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{label}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...parameters, { field_name: "", value: "", prefix: "" }])}
        >
          <Plus className="size-3.5" /> Add parameter
        </Button>
      </div>
      {parameters.map((parameter, index) => (
        <div key={index} className="grid grid-cols-[1fr_auto] items-end gap-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {(["field_name", "value", "prefix"] as const).map((field) => {
              const id = `${location}-${index}-${field}`;
              return (
                <div key={field} className="space-y-1">
                  <Label htmlFor={id}>
                    {field === "field_name"
                      ? "Field name"
                      : field === "value"
                        ? "Value"
                        : "Prefix"}
                  </Label>
                  <Input
                    id={id}
                    type={field === "value" ? "password" : "text"}
                    autoComplete="off"
                    required={field !== "prefix"}
                    pattern={field === "field_name" ? ".*\\S.*" : undefined}
                    value={parameter[field]}
                    onChange={(event) =>
                      onChange(
                        parameters.map((item, row) =>
                          row === index ? { ...item, [field]: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Remove ${label.toLowerCase()} parameter ${index + 1}`}
            onClick={() => onChange(parameters.filter((_, row) => row !== index))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function ConnectorForm({
  phoneNumberId,
  connector,
}: {
  phoneNumberId: number;
  connector?: BusinessAgentConnector & { id: number | string };
}) {
  const router = useRouter();
  const connectorsPath = `/assets/phone-numbers/${phoneNumberId}/business-agent/connectors`;
  const oauth = connector?.auth_config?.oauth2_client_credentials;
  const apiKey = connector?.auth_config?.api_key;
  const injection = connector?.user_auth_injection_config;
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(() => normalizeConnectorName(connector?.name ?? ""));
  const [protocol, setProtocol] = useState<ConnectorProtocol>(
    connector?.connector_protocol ?? "HTTP",
  );
  const [authType, setAuthType] = useState<AuthType>(
    connector?.auth_type ?? "API_KEY",
  );
  const [parameters, setParameters] = useState<Parameters>({
    headers: apiKey?.headers ?? [],
    query_params: apiKey?.query_params ?? [],
    body_params: apiKey?.body_params ?? [],
  });
  const [mtls, setMtls] = useState(
    Boolean(
      connector?.mtls_config?.client_certificate || connector?.mtls_config?.has_certificate,
    ),
  );
  const [userAuth, setUserAuth] = useState(Boolean(injection));
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    setError(null);
    setSubmitting(true);
    try {
      const payload = buildConnectorPayload(form, { authType, parameters, mtls, userAuth });
      const endpoint = `v1/wa/phone-numbers/${phoneNumberId}/business-agent/connectors`;
      await apiFetch(
        connector ? `${endpoint}/${encodeURIComponent(String(connector.id))}` : endpoint,
        {
          method: connector ? "PUT" : "POST",
          body: payload,
        },
      );
      toast.success(connector ? "Connector updated." : "Connector added.");
      router.push(connectorsPath);
      router.refresh();
    } catch (cause) {
      const apiError = toApiError(cause);
      setError(apiError.message);
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <Card>
        <CardContent className="space-y-4">
          <fieldset disabled={submitting} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connector-name">Name</Label>
              <Input
                id="connector-name"
                name="name"
                value={name}
                onChange={(event) => setName(normalizeConnectorName(event.target.value))}
                required
                pattern="[a-z_][a-z0-9_]*"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="connector-name-help"
                placeholder="my_shopify_connector"
              />
              <p id="connector-name-help" className="text-muted-foreground text-xs">
                Use lowercase letters, numbers, or underscores. Names cannot start with a number. Spaces and dashes become underscores; unsupported characters and leading numbers are
                removed automatically.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="connector-description">Description</Label>
              <Textarea
                id="connector-description"
                name="description"
                required
                defaultValue={connector?.description}
                placeholder="Connects to Shopify for order management"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="connector-url">Base URL</Label>
              <Input
                id="connector-url"
                name="base_url"
                defaultValue={connector?.base_url ?? connector?.url}
                type="url"
                pattern="https?://.+"
                required
                placeholder="https://api.shopify.com/v1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="connector-protocol">Connector protocol</Label>
              <Select
                name="connector_protocol"
                value={protocol}
                disabled={submitting}
                onValueChange={(value) => {
                  if (value === "HTTP" || value === "MCP") setProtocol(value);
                }}
              >
                <SelectTrigger id="connector-protocol" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTTP">HTTP</SelectItem>
                  <SelectItem value="MCP">MCP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="connector-auth-type">Authentication</Label>
              <Select
                disabled={submitting}
                value={authType}
                onValueChange={(value) => {
                  if (
                    value === "NONE" ||
                    value === "OAUTH2_CLIENT_CREDENTIALS" ||
                    value === "API_KEY"
                  )
                    setAuthType(value);
                }}
              >
                <SelectTrigger id="connector-auth-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="OAUTH2_CLIENT_CREDENTIALS">
                    OAuth 2.0 client credentials
                  </SelectItem>
                  <SelectItem value="API_KEY">API key</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {authType === "OAUTH2_CLIENT_CREDENTIALS" ? (
              <div className="space-y-4 rounded-lg border p-3">
                <div className="space-y-2">
                  <Label htmlFor="connector-token-url">Token URL</Label>
                  <Input
                    id="connector-token-url"
                    name="token_url"
                    defaultValue={oauth?.token_url}
                    type="url"
                    pattern="https?://.+"
                    required
                    placeholder="https://auth.example.com/token"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connector-client-id">Client ID</Label>
                  <Input
                    id="connector-client-id"
                    name="client_id"
                    defaultValue={oauth?.client_id}
                    required
                    pattern=".*\S.*"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connector-client-secret">Client secret</Label>
                  <Input
                    id="connector-client-secret"
                    name="client_secret"
                    defaultValue={oauth?.client_secret}
                    type="password"
                    required
                    autoComplete="new-password"
                  />
                  {connector && !oauth?.client_secret ? (
                    <p className="text-muted-foreground text-xs">
                      Enter the client secret to save; the API did not return it.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connector-scopes">Scopes (optional)</Label>
                  <Input
                    id="connector-scopes"
                    name="scopes"
                    defaultValue={oauth?.scopes_to_request?.join(" ")}
                    placeholder="read write"
                  />
                  <p className="text-muted-foreground text-xs">Separate scopes with spaces.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connector-content-type">Token request content type</Label>
                  <Select
                    disabled={submitting}
                    name="token_request_content_type"
                    defaultValue={
                      oauth?.token_request_content_type ?? "application/x-www-form-urlencoded"
                    }
                  >
                    <SelectTrigger id="connector-content-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="application/x-www-form-urlencoded">
                        application/x-www-form-urlencoded
                      </SelectItem>
                      <SelectItem value="application/json">application/json</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : authType === "API_KEY" ? (
              <div className="space-y-4 rounded-lg border p-3">
                {(
                  [
                    ["headers", "Headers"],
                    ["query_params", "Query parameters"],
                    ["body_params", "Body parameters"],
                  ] as const
                ).map(([location, label]) => (
                  <ParameterFields
                    key={location}
                    location={location}
                    label={label}
                    parameters={parameters[location]}
                    onChange={(rows) =>
                      setParameters((current) => ({ ...current, [location]: rows }))
                    }
                  />
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Checkbox
                id="connector-mtls"
                checked={mtls}
                onChange={(event) => setMtls(event.target.checked)}
              />
              <Label htmlFor="connector-mtls">Configure mutual TLS certificates</Label>
            </div>
            {mtls ? (
              <div className="space-y-4 rounded-lg border p-3">
                <div className="space-y-2">
                  <Label htmlFor="connector-client-certificate">
                    Client certificate (PEM)
                  </Label>
                  <Textarea
                    id="connector-client-certificate"
                    name="client_certificate"
                    defaultValue={connector?.mtls_config?.client_certificate}
                    required
                    className="font-mono text-xs"
                  />
                  {connector?.mtls_config?.has_certificate &&
                  !connector.mtls_config.client_certificate ? (
                    <p className="text-muted-foreground text-xs">
                      Enter the client certificate to save; the API did not return it.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connector-ca-certificate">
                    CA certificate (PEM, optional)
                  </Label>
                  <Textarea
                    id="connector-ca-certificate"
                    name="ca_certificate"
                    defaultValue={connector?.mtls_config?.ca_certificate}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Checkbox
                id="connector-user-auth"
                checked={userAuth}
                onChange={(event) => setUserAuth(event.target.checked)}
              />
              <Label htmlFor="connector-user-auth">Inject user authentication</Label>
            </div>
            {userAuth ? (
              <div className="space-y-4 rounded-lg border p-3">
                <div className="space-y-2">
                  <Label htmlFor="connector-location">Location</Label>
                  <Input
                    id="connector-location"
                    name="location"
                    defaultValue={injection?.location ?? "headers"}
                    required
                    pattern=".*\S.*"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connector-field-name">Field name</Label>
                  <Input
                    id="connector-field-name"
                    name="field_name"
                    defaultValue={injection?.field_name ?? "Authorization"}
                    required
                    pattern=".*\S.*"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connector-prefix">Prefix</Label>
                  <Input
                    id="connector-prefix"
                    name="prefix"
                    defaultValue={injection?.prefix ?? "Bearer "}
                  />
                  <p className="text-muted-foreground text-xs">
                    Include any trailing space needed before the token.
                  </p>
                </div>
              </div>
            ) : null}
          </fieldset>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <div className="flex justify-start">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {connector ? "Save" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
