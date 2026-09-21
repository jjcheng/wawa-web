import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { TableEmptyState } from "@/components/table-empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Website } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Websites" };

export default async function WebsitesPage() {
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/dashboard");

  let websites: Website[] = [];
  let loadError: string | null = null;

  try {
    const response = await serverFetch<Website[]>("/v1/commerce/websites");
    websites = Array.isArray(response) ? response : [];
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Could not load your websites.";
  }

  return (
    <>
      <PageHeader
        title="Websites"
        description="Generated from your Meta catalogs."
        action={
          <div className="self-center">
            <Button asChild>
              <Link href="/catalogs?notice=create-website">Create website</Link>
            </Button>
          </div>
        }
      />

      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {!loadError ? (
        <Card className="rounded-md py-0">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catalog</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {websites.length === 0 ? (
                  <TableEmptyState colSpan={5}>No websites found.</TableEmptyState>
                ) : (
                  websites.map((website) => {
                    return (
                      <TableRow key={website.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/websites/${encodeURIComponent(String(website.id))}/catalog/sets/products`}
                            className="text-primary hover:underline"
                          >
                            {website.catalog_name || "—"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {website.url ? (
                            <a
                              href={website.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary max-w-64 truncate hover:underline"
                            >
                              {website.url}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {website.status
                            ? website.status.charAt(0) + website.status.slice(1).toLowerCase()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {website.entry_date ? formatDateTime(website.entry_date) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/websites/${encodeURIComponent(String(website.id))}`}
                            >
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
