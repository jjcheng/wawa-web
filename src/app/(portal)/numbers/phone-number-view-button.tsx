"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
}: {
  id: number;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reconnectConfirmOpen, setReconnectConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  async function disconnect() {
    setActionLoading(true);
    try {
      await apiFetch(`v1/wa/phone-numbers/${id}/disconnect`, { method: "POST" });
      toast.success("Phone number disconnected.");
      setConfirmOpen(false);
      setOpen(false);
      router.refresh();
    } catch (requestError) {
      toast.error(toApiError(requestError).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function reconnect() {
    setActionLoading(true);
    try {
      await apiFetch(`v1/wa/phone-numbers/${id}/reconnect`, { method: "POST" });
      toast.success("Phone number reconnected.");
      setReconnectConfirmOpen(false);
      setOpen(false);
      router.refresh();
    } catch (requestError) {
      toast.error(toApiError(requestError).message);
    } finally {
      setActionLoading(false);
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
          <DialogFooter>
            {details?.status?.toString().toUpperCase() === "CONNECTED" ? (
              <Button variant="destructive" onClick={() => setConfirmOpen(true)} disabled={actionLoading}>
                Disconnect
              </Button>
            ) : details?.status?.toString().toUpperCase() === "DISCONNECTED" ? (
              <Button variant="default" onClick={() => setReconnectConfirmOpen(true)} disabled={actionLoading}>
                Reconnect
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect this phone number?</DialogTitle>
            <DialogDescription>
              {name} will be disconnected from WhatsApp and marked inactive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={actionLoading}>
              Keep number
            </Button>
            <Button variant="destructive" onClick={disconnect} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={reconnectConfirmOpen} onOpenChange={setReconnectConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconnect this phone number?</DialogTitle>
            <DialogDescription>
              {name} will be reconnected to WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconnectConfirmOpen(false)} disabled={actionLoading}>
              Keep disconnected
            </Button>
            <Button onClick={reconnect} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm reconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
