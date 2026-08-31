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
import type { PhoneNumber } from "@/lib/api/types";
import { serverEnv } from "@/lib/env.server";
import { formatDateTime, formatPhoneNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Phone numbers" };

export default async function PhoneNumbersPage() {
  let phoneNumbers: PhoneNumber[] = [];
  let loadError: string | null = null;
  try {
    phoneNumbers = (await serverFetch<PhoneNumber[]>("/v1/wa/user-phone-numbers")) ?? [];
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your WhatsApp numbers.";
  }

  return (
    <>
      <PageHeader
        title="WhatsApp business numbers"
        description="Numbers from your WhatsApp Business accounts that are assigned to you."
        action={
          <EmbeddedSignupButton
            appId={serverEnv.NEXT_META_APP_ID}
            configId={serverEnv.NEXT_META_EMBEDDED_SIGNUP_CONFIG_ID}
          />
        }
      />

      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {!loadError && phoneNumbers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No numbers yet</CardTitle>
            <CardDescription>
              Complete WhatsApp Embedded Signup to link a business number to your account.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {phoneNumbers.length > 0 ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Business account</TableHead>
                  <TableHead>Entry date</TableHead>
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
                    <TableCell>
                      <p>{number.business_account?.name || "—"}</p>
                      <p className="text-muted-foreground font-mono text-xs">
                        {number.meta_waba_id || "—"}
                      </p>
                    </TableCell>
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
