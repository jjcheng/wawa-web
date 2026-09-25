"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PhoneNumber } from "@/lib/api/types";

function phoneNumberLabel(phoneNumber: PhoneNumber) {
  return phoneNumber.name || "Unnamed number";
}

function phoneNumberEntry(phoneNumber: PhoneNumber) {
  const name = phoneNumberLabel(phoneNumber);
  const display = phoneNumber.display_phone_number;
  return display ? `${name} (${display})` : name;
}

export function AssignedPhoneNumbersButton({ phoneNumbers }: { phoneNumbers: PhoneNumber[] }) {
  if (phoneNumbers.length === 0) return <span className="text-muted-foreground">—</span>;

  const visiblePhoneNumbers = phoneNumbers.slice(0, 5);
  const additionalCount = phoneNumbers.length - visiblePhoneNumbers.length;
  const compactText = [
    ...visiblePhoneNumbers.map((phoneNumber) => phoneNumberLabel(phoneNumber)),
    ...(additionalCount > 0 ? [`and ${additionalCount} more`] : []),
  ].join(", ");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="block max-w-[190px] cursor-pointer text-left text-sm text-primary underline underline-offset-2 decoration-from-font"
          aria-label={`View assigned phone numbers: ${phoneNumbers.map(phoneNumberEntry).join(", ")}`}
        >
          {compactText}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Assigned phone numbers</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {phoneNumbers.map((phoneNumber) => (
              <li key={phoneNumber.id}>{phoneNumberEntry(phoneNumber)}</li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}