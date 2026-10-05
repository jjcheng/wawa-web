import type { BusinessAgentConnector } from "./connector-types";

export type ConnectorListResponse =
  | BusinessAgentConnector[]
  | { connectors?: BusinessAgentConnector[] | null }
  | null
  | undefined;

export function getConnectorList(response: ConnectorListResponse): BusinessAgentConnector[] {
  if (response == null) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.connectors)) return response.connectors;
  throw new Error("The API returned an invalid connector list.");
}
