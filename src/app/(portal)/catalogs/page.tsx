import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

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
import type { BusinessAccount, Catalog } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { metaCommerceManagerUrl } from "@/lib/meta-links";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Catalogs" };

export default async function CatalogsPage() {
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/dashboard");

  let catalogs: Catalog[] = [];
  let loadError: string | null = null;
  let managerUrl: string | null = null;

  try {
    const [businessAccount, catalogData] = await Promise.all([
      serverFetch<BusinessAccount>("/v1/wa/business-accounts").catch(() => null),
      serverFetch<Catalog[]>("/v1/wa/catalogs"),
    ]);

    catalogs = Array.isArray(catalogData) ? catalogData : [];
    managerUrl = metaCommerceManagerUrl({
      portfolioId: businessAccount?.meta_business_portfolio_id,
    });
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your product catalogs.";
  }

  return (
    <>
      <PageHeader
        title="Catalogs"
        description="Product catalogs owned by your Meta business portfolio, upload or edit in Meta Commerce Manager."
        action={
          managerUrl ? (
            <Button asChild variant="outline" className={MEDIUM_BUTTON_HEIGHT}>
              <a href={managerUrl} target="_blank" rel="noreferrer">
                Commerce Manager
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : undefined
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
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogs.length === 0 ? (
                  <TableEmptyState colSpan={5}>No product catalogs found.</TableEmptyState>
                ) : (
                  catalogs.map((catalog) => {
                    return (
                      <TableRow key={catalog.id}>
                        <TableCell className="font-medium">
                          {catalog.name || "Unnamed catalog"}
                        </TableCell>
                        <TableCell className="capitalize">
                          {catalog.vertical ? catalog.vertical.replaceAll("_", " ") : "—"}
                        </TableCell>
                        <TableCell>
                          {catalog.product_count !== undefined
                            ? catalog.product_count.toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/catalogs/${encodeURIComponent(catalog.id)}/products`}>
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
