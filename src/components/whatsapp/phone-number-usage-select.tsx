"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useNavigationProgress } from "@/components/nav/navigation-progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PhoneNumberOption = {
  id: string;
  label: string;
};

export function PhoneNumberUsageSelect({
  options,
  value,
}: {
  options: PhoneNumberOption[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startNavigationProgress } = useNavigationProgress();

  if (options.length <= 1) return null;

  function setPhoneNumber(phoneNumberId: string) {
    const params = new URLSearchParams(searchParams);
    params.set("phone_number_id", phoneNumberId);
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  return (
    <Select value={value} onValueChange={setPhoneNumber}>
      <SelectTrigger className="w-64" aria-label="Phone number">
        <SelectValue placeholder="Select a phone number" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
