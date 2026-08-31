import type { BusinessAccount } from "@/lib/api/types";

export type WabaOption = { metaWabaId: string; name: string };

export function toWabaOptions(businessAccounts: BusinessAccount[]): WabaOption[] {
  return businessAccounts.flatMap((businessAccount) => {
    const metaWabaId = businessAccount.meta_waba_id;
    return metaWabaId
      ? [{ metaWabaId, name: businessAccount.name || metaWabaId }]
      : [];
  });
}
