import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { EmbeddedSignupButton } from "@/components/whatsapp/embedded-signup-button";
import { RemovePhoneNumberButton } from "@/components/whatsapp/remove-phone-number-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatDateTime, formatPhoneNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Phone numbers" };

export default async function PhoneNumbersPage() {
  let phoneNumbers: PhoneNumber[] = [];
  let loadError: string | null = null;
  try {
    phoneNumbers = (await serverFetch<PhoneNumberListResponse>("/v1/wa/user-phone-numbers", {
      query: { page: "1", page_size: "10" },
    })).items ?? [];
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your WhatsApp numbers.";
  }

  return (
    <>
      <PageHeader
        title="Phone numbers"
        description="Numbers from your WhatsApp Business accounts that are assigned to you."
        action={<EmbeddedSignupButton />}
      />

      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {!loadError && phoneNumbers.length === 0 ? (
        <Card className="rounded-md py-0">
          <CardHeader>
            <CardTitle className="text-base">No numbers yet</CardTitle>
            <CardDescription>
              Complete WhatsApp Embedded Signup to link a business number to your account.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {phoneNumbers.length > 0 ? (
        <Card className="rounded-md py-0">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phoneNumbers.map((number) => (
                  <TableRow key={number.id}>
                    <TableCell className="font-medium">
                      {number.name || "Unnamed number"}
                    </TableCell>
                    <TableCell>{formatPhoneNumber(number.phone_number)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDateTime(number.entry_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <RemovePhoneNumberButton
                          id={number.id}
                          name={number.name || "This number"}
                          phoneNumber={formatPhoneNumber(number.phone_number)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
