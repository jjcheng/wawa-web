"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PhoneNumber, User } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BusinessAgentLink({
  userType,
  phoneNumbers,
  children,
  className,
  onNavigate,
  "aria-current": ariaCurrent,
}: {
  userType: User["type"];
  phoneNumbers: PhoneNumber[];
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
  "aria-current"?: "page";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function managePhoneNumber(id: number) {
    setOpen(false);
    router.push(`/assets/phone-numbers/${id}/business-agent`);
    onNavigate?.();
  }

  if (userType !== "OPERATOR") {
    return (
      <Link href="/assets/business-agent" className={className} aria-current={ariaCurrent} onClick={onNavigate}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={cn("w-full text-left", className)}
        aria-current={ariaCurrent}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (phoneNumbers.length === 1) managePhoneNumber(phoneNumbers[0].id);
          else setOpen(true);
        }}
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select phone number</DialogTitle>
            <DialogDescription>Manage the business agent for a phone number.</DialogDescription>
          </DialogHeader>
          {phoneNumbers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No phone numbers assigned.</p>
          ) : (
            <ul className="divide-border max-h-[60vh] divide-y overflow-y-auto rounded-lg border">
              {phoneNumbers.map((number) => (
                <li key={number.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start gap-3 rounded-none px-3 py-3"
                    onClick={() => managePhoneNumber(number.id)}
                  >
                    <Phone aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate font-medium">{number.name || "Unnamed number"}</span>
                      <span className="text-muted-foreground block truncate font-normal">
                        {formatPhoneNumber(number.display_phone_number || number.phone_number) || "Number unavailable"}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}