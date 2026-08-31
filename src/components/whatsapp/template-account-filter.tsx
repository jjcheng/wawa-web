"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WabaOption } from "@/lib/waba-options";

export function TemplateAccountFilter({
  wabas,
  selected,
}: {
  wabas: WabaOption[];
  selected: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectAccount(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("meta_waba_id", value);
    router.push(`${pathname}?${params}`);
  }

  return (
    <Select value={selected} onValueChange={selectAccount}>
      <SelectTrigger className="w-56" aria-label="WhatsApp Business Account">
        <SelectValue placeholder="Select an account" />
      </SelectTrigger>
      <SelectContent>
        {wabas.map((waba) => (
          <SelectItem key={waba.metaWabaId} value={waba.metaWabaId}>
            {waba.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}