import type { Metadata } from "next";
import Link from "next/link";

import { PhoneNumberStatusFilter } from "./phone-number-status-filter";
import { AssignedUsersButton } from "./assigned-users-button";
import { PhoneNumberViewButton } from "./phone-number-view-button";
import { BackBar } from "@/components/back-bar";
import { LocalDateTime } from "@/components/local-date-time";
import { PageHeader } from "@/components/page-header";
import { TableEmptyState } from "@/components/table-empty-state";
import { EmbeddedSignupButton } from "@/components/whatsapp/embedded-signup-button";
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
import type { PhoneNumber, PhoneNumberListResponse } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Phone numbers" };

export default async function PhoneNumbersPage({ searchParams }: PageProps<"/phone-numbers">) {
  const params = await searchParams;
  const user = await requireUser();

  let phoneNumbers: PhoneNumber[] = [];
  const requestedStatus = typeof params.status === "string" ? params.status : "ALL";
  const status =
    requestedStatus === "CONNECTED" || requestedStatus === "DISCONNECTED"
      ? requestedStatus
      : "ALL";
  const isMaster = user.type === "MASTER";
  let loadError: string | null = null;
  try {
    phoneNumbers =
      (
        await serverFetch<PhoneNumberListResponse>("/v1/wa/phone-numbers", {
          query: { page: "1", page_size: "10", status: status === "ALL" ? undefined : status },
        })
      ).items ?? [];
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your WhatsApp numbers.";
  }

  return (
    <>
      <BackBar href="/assets" />
      <PageHeader
        title="Phone numbers"
        description={
          user.type === "MASTER"
            ? "All phone numbers under your WhatsApp Business Account."
            : "Your registered WhatsApp business number."
        }
        action={user.type === "MASTER" ? <EmbeddedSignupButton /> : undefined}
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
                  <TableHead>WhatsApp Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>
                    <PhoneNumberStatusFilter value={status} />
                  </TableHead>
                  <TableHead>Added</TableHead>
                  {isMaster ? <TableHead>Assigned to</TableHead> : null}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phoneNumbers.length === 0 ? (
                  <TableEmptyState
                    colSpan={isMaster ? 6 : 5}
                    action={
                      status !== "ALL" ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href="/phone-numbers">Reset filters</Link>
                        </Button>
                      ) : undefined
                    }
                  >
                    {status !== "ALL" ? "No phone numbers match this filter." : "No phone numbers found."}
                  </TableEmptyState>
                ) : (
                  phoneNumbers.map((number) => (
                    <TableRow key={number.id}>
                      <TableCell>{number.name || "Unnamed number"}</TableCell>
                      <TableCell>
                        {formatPhoneNumber(number.display_phone_number || number.phone_number)}
                      </TableCell>
                      <TableCell>
                        {number.status
                          ? number.status.charAt(0) + number.status.slice(1).toLowerCase()
                          : "—"}
                      </TableCell>
                      <TableCell><LocalDateTime value={number.added_at} /></TableCell>
                      {isMaster ? (
                        <TableCell className="w-[220px] max-w-[220px] align-top">
                          <AssignedUsersButton users={number.assigned_users ?? []} />
                        </TableCell>
                      ) : null}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <PhoneNumberViewButton
                            id={number.id}
                            name={number.name || "This number"}
                            status={number.status}
                            isMaster={user.type === "MASTER"}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
