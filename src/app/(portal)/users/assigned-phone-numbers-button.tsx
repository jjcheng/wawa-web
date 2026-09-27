"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { PhoneNumber, PhoneNumberListResponse, User } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
import { toast } from "@/lib/toast";

function phoneNumberLabel(phoneNumber: PhoneNumber) {
  return phoneNumber.name || "Unnamed number";
}

function phoneNumberEntry(phoneNumber: PhoneNumber) {
  const name = phoneNumberLabel(phoneNumber);
  const display = phoneNumber.display_phone_number;
  return display ? `${name} (${display})` : name;
}

export function AssignedPhoneNumbersButton({ user }: { user: User }) {
  const router = useRouter();
  const phoneNumbers = user.assigned_phone_numbers ?? [];
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availablePhoneNumbers, setAvailablePhoneNumbers] = useState<PhoneNumber[]>([]);
  const [phoneNumbersLoading, setPhoneNumbersLoading] = useState(false);
  const [phoneNumbersError, setPhoneNumbersError] = useState<string | null>(null);
  const [selectedPhoneNumberIds, setSelectedPhoneNumberIds] = useState<Set<number>>(
    () => new Set(phoneNumbers.map((phoneNumber) => Number(phoneNumber.id))),
  );

  useEffect(() => {
    if (!dialogOpen) return;
    const controller = new AbortController();
    let active = true;

    async function loadPhoneNumbers() {
      try {
        const response = await apiFetch<PhoneNumber[] | PhoneNumberListResponse>("v1/wa/phone-numbers", {
          signal: controller.signal,
        });
        if (active) setAvailablePhoneNumbers(Array.isArray(response) ? response : response.items ?? []);
      } catch (error) {
        if (active) setPhoneNumbersError(toApiError(error).message);
      } finally {
        if (active) setPhoneNumbersLoading(false);
      }
    }

    void loadPhoneNumbers();
    return () => {
      active = false;
      controller.abort();
    };
  }, [dialogOpen]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch("v1/admin/assign-phone-numbers", {
        method: "POST",
        body: { user_id: user.id, phone_number_ids: [...selectedPhoneNumberIds] },
      }),
    onSuccess: () => {
      setDialogOpen(false);
      toast.success("Assigned phone numbers updated.");
      router.refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  function openManageDialog() {
    setSelectedPhoneNumberIds(new Set(phoneNumbers.map((phoneNumber) => Number(phoneNumber.id))));
    setPhoneNumbersLoading(true);
    setPhoneNumbersError(null);
    setPopoverOpen(false);
    setDialogOpen(true);
  }

  function togglePhoneNumber(phoneNumberId: number, checked: boolean) {
    setSelectedPhoneNumberIds((current) => {
      const next = new Set(current);
      if (checked) next.add(phoneNumberId);
      else next.delete(phoneNumberId);
      return next;
    });
  }

  const firstPhoneNumber = phoneNumbers[0] ? phoneNumberLabel(phoneNumbers[0]) : "";
  const compactText = phoneNumbers.length === 0
    ? "0 phone numbers"
    : `${firstPhoneNumber}${phoneNumbers.length > 1 ? ` and ${phoneNumbers.length - 1} more` : ""}`;

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="block max-w-[190px] cursor-pointer text-left text-sm text-primary underline underline-offset-2 decoration-from-font"
            aria-label={phoneNumbers.length === 0
              ? "Manage phone numbers: none assigned"
              : `View assigned phone numbers: ${phoneNumbers.map(phoneNumberEntry).join(", ")}`}
          >
            {compactText}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Managing phone numbers</p>
              {phoneNumbers.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {phoneNumbers.map((phoneNumber) => (
                    <li key={phoneNumber.id}>{phoneNumberEntry(phoneNumber)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No phone numbers assigned.</p>
              )}
            </div>
            <Button type="button" size="sm" className="w-full" onClick={openManageDialog}>
              Manage
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign phone numbers to {user.name || "Unnamed user"}</DialogTitle>
            <DialogDescription>
              {formatPhoneNumber(user.phone_number, user.country_code) || "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] min-h-0 !overflow-y-auto">
            {phoneNumbersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : phoneNumbersError ? (
              <p className="text-destructive p-3 text-sm">{phoneNumbersError}</p>
            ) : availablePhoneNumbers.length === 0 ? (
              <p className="text-muted-foreground p-3 text-sm">No phone numbers are available.</p>
            ) : (
              <ul className="divide-y">
                {availablePhoneNumbers.map((phoneNumber) => {
                  const phoneNumberId = Number(phoneNumber.id);
                  const label = phoneNumber.name || "Unnamed number";

                  return (
                    <li key={phoneNumber.id}>
                      <label className="flex cursor-pointer items-center gap-3 py-1.5">
                        <Checkbox
                          checked={selectedPhoneNumberIds.has(phoneNumberId)}
                          onChange={(event) => togglePhoneNumber(phoneNumberId, event.target.checked)}
                          aria-label={`Assign ${label}`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{label}</span>
                          <span className="text-muted-foreground block text-xs">
                            {formatPhoneNumber(phoneNumber.display_phone_number || phoneNumber.phone_number) || "—"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={phoneNumbersLoading || Boolean(phoneNumbersError) || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}