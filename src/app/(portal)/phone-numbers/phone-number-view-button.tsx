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

function whatsappWebLink(value: unknown) {
  if (typeof value !== "string") return null;
  const phone = value.replace(/\D/g, "");
  return phone ? `https://wa.me/${phone}` : null;
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
  const canDelete = Boolean(error) || isDisconnected;

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
                <dt className="text-muted-foreground">Link</dt>
                <dd className="min-w-0 break-words">
                  {(() => {
                    const link = whatsappWebLink(details.display_phone_number || details.phone_number);
                    return link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        {link}
                      </a>
                    ) : (
                      "—"
                    );
                  })()}
                </dd>
              </dl>
            ) : null}
          </div>
          <DialogFooter className="flex-row items-center justify-between gap-3 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <div className="flex min-w-0 justify-end">
              {isMaster && canDelete ? (
                <RemovePhoneNumberButton
                  id={id}
                  name={name}
                  phoneNumber={String(details?.display_phone_number || details?.phone_number || "")}
                  mode="delete"
                  triggerVariant="destructive"
                  label="Delete"
                  onDeleted={() => setOpen(false)}
                />
              ) : isMaster && isConnected ? (
                <RemovePhoneNumberButton
                  id={id}
                  name={name}
                  phoneNumber={String(details?.display_phone_number || details?.phone_number || "")}
                  triggerVariant="destructive"
                  label="Disconnect"
                  onDeleted={() => setOpen(false)}
                />
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
