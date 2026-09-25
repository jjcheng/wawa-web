"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PhoneNumber } from "@/lib/api/types";

export function AssignedPhoneNumbersButton({ phoneNumbers }: { phoneNumbers: PhoneNumber[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="link"
          size="sm"
          className="h-auto cursor-pointer px-0 font-semibold text-primary underline underline-offset-2"
          aria-label={`View ${phoneNumbers.length} assigned phone number${phoneNumbers.length === 1 ? "" : "s"}`}
          disabled={phoneNumbers.length === 0}
        >
          {phoneNumbers.length}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assigned phone numbers</DialogTitle>
          <DialogDescription>WhatsApp phone numbers this user can manage.</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5">
          {phoneNumbers.map((phoneNumber) => (
            <li key={phoneNumber.id}>
              <span>{phoneNumber.name || "Unnamed number"}</span>
              <span className="ml-2 text-muted-foreground">
                {phoneNumber.display_phone_number ?? "—"}
              </span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}