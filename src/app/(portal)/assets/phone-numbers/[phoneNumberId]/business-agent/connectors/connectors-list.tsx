"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { getConnectorList, type ConnectorListResponse } from "./connector-list";
import type { BusinessAgentConnector } from "./connector-types";

function connectorTitle(connector: BusinessAgentConnector) {
  return (
    connector.name ||
    connector.title ||
    connector.type ||
    connector.connector_type ||
    "Unnamed connector"
  );
}

function connectorSummary(connector: BusinessAgentConnector) {
  return (
    connector.description ||
    connector.base_url ||
    connector.url ||
    connector.type ||
    connector.connector_type ||
    "No summary available."
  );
}

function connectorStatus(connector: BusinessAgentConnector) {
  return connector.connection_status?.status || connector.status;
}

export function ConnectorsList({
  phoneNumberId,
  description,
}: {
  phoneNumberId: number;
  description: string;
}) {
  const [connectors, setConnectors] = useState<BusinessAgentConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadConnectors() {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await apiFetch<ConnectorListResponse>(
          `v1/wa/phone-numbers/${phoneNumberId}/business-agent/connectors`,
        );
        if (active) setConnectors(getConnectorList(response));
      } catch (error) {
        if (active) setLoadError(toApiError(error).message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadConnectors();
    return () => {
      active = false;
    };
  }, [phoneNumberId, refreshKey]);

  const filteredConnectors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return connectors.map((connector, index) => ({ connector, index }));
    return connectors
      .map((connector, index) => ({ connector, index }))
      .filter(({ connector }) => {
        const title = connectorTitle(connector).toLowerCase();
        const summary = connectorSummary(connector).toLowerCase();
        return (
          title.includes(query) ||
          summary.includes(query) ||
          (connectorStatus(connector) ?? "").toLowerCase().includes(query)
        );
      });
  }, [connectors, search]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Connectors</h1>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        </div>
        <Button asChild>
          <Link href={`/assets/phone-numbers/${phoneNumberId}/business-agent/connectors/new`}>
            Add connector
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="space-y-2">
          <p role="alert" className="text-destructive text-sm">
            {loadError}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-card divide-border divide-y overflow-hidden rounded-lg border">
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2 my-auto size-4"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search connectors"
                  aria-label="Search connectors"
                  className="h-8 border-none bg-transparent pr-7 pl-8 shadow-none focus-visible:ring-0"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <Table>
              <TableBody>
                {filteredConnectors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-muted-foreground text-base">
                          {search ? "No connectors found." : "No connectors yet."}
                        </p>
                        {search ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setSearch("")}
                          >
                            Reset filter
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConnectors.map(({ connector, index }) => (
                    <TableRow key={connector.id ?? `${connectorTitle(connector)}-${index}`}>
                      <TableCell className="text-muted-foreground w-12 pl-4">{index + 1}</TableCell>
                      <TableCell>
                        {connector.id != null ? (
                          <Link
                            href={`/assets/phone-numbers/${phoneNumberId}/business-agent/connectors/${encodeURIComponent(String(connector.id))}/edit`}
                            className="font-medium hover:underline"
                            aria-label={`Edit ${connectorTitle(connector)}`}
                          >
                            {connectorTitle(connector)}
                          </Link>
                        ) : (
                          connectorTitle(connector)
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-md whitespace-normal">
                        {connectorSummary(connector)}
                      </TableCell>
                      <TableCell className="text-muted-foreground pr-4 text-xs tracking-wide uppercase">
                        {connectorStatus(connector) || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  );
}
