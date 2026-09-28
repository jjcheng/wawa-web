"use client";

import type { PhoneNumber, User } from "@/lib/api/types";

function phoneNumberLabel(phoneNumber: PhoneNumber) {
  return phoneNumber.name || "Unnamed number";
}

export function AssignedPhoneNumbersButton({ user }: { user: User }) {
  const phoneNumbers = user.assigned_phone_numbers ?? [];

  const firstPhoneNumber = phoneNumbers[0] ? phoneNumberLabel(phoneNumbers[0]) : "";
  const compactText = phoneNumbers.length === 0
    ? "0 phone numbers"
    : `${firstPhoneNumber}${phoneNumbers.length > 1 ? ` and ${phoneNumbers.length - 1} more` : ""}`;

  return <span className="block max-w-[190px] truncate text-sm sm:text-right">{compactText}</span>;
}