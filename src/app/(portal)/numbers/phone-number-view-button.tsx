"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RemovePhoneNumberButton } from "@/components/whatsapp/remove-phone-number-button";
import { ReconnectPhoneNumberButton } from "@/components/whatsapp/reconnect-phone-number-button";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";

const DETAIL_FIELDS = [
  ["Phone number", "display_phone_number", "phone_number"],
  ["Verified name", "verified_name"],
  ["Status", "status"],
  ["Quality rating", "quality_rating"],
  ["Platform type", "platform_type"],
  ["Co-existence", "is_on_biz_app"],
  ["Name status", "name_status"],
  ["Messaging limit", "messaging_limit_tier"],
] as const;

function displayValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function PhoneNumberViewButton({
  id,
  name,
  isMaster = false,
}: {
  id: number;
  name: string;
  status?: string;
  isMaster?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStatus = details && !loading ? String(details.status ?? "").toUpperCase() : "";
  const isConnected = currentStatus === "CONNECTED";
  const isDisconnected = currentStatus === "DISCONNECTED";

  async function loadDetails() {
    setOpen(true);
    if (loading) return;
    setLoading(true);
    setError(null);
    setDetails(null);
    try {
      setDetails(await apiFetch<Record<string, unknown>>(`v1/wa/phone-numbers/${id}`));
    } catch (requestError) {
      setError(toApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={loadDetails}>View</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>WhatsApp phone number details</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin" /></div>
            ) : error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : details ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {DETAIL_FIELDS.map(([label, ...keys]) => {
                  const value = keys.map((key) => details[key]).find((item) => item !== undefined);
                  return (
                    <div key={label} className="contents">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="min-w-0 break-words">{displayValue(value)}</dd>
                    </div>
                  );
                })}
              </dl>
            ) : null}
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {isMaster && isConnected ? (
              <RemovePhoneNumberButton
                id={id}
                name={name}
                phoneNumber={String(details?.display_phone_number || details?.phone_number || "")}
                triggerVariant="destructive"
                label="Disconnect"
                onDeleted={() => setOpen(false)}
              />
            ) : isMaster && isDisconnected ? (
              <ReconnectPhoneNumberButton
                id={id}
                name={name}
                phoneNumber={String(details?.display_phone_number || details?.phone_number || "")}
                onReconnected={() => setOpen(false)}
              />
            ) : <div />}
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
