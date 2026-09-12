import type { BusinessAccount } from "@/lib/api/types";

export type WabaOption = { wabaId: string; name: string };

export function toWabaOptions(businessAccounts: BusinessAccount[]): WabaOption[] {
  return businessAccounts.flatMap((businessAccount) => {
    const wabaId = businessAccount.waba_id;
    return wabaId
      ? [{ wabaId, name: businessAccount.name || wabaId }]
      : [];
  });
}
