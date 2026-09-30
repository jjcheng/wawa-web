"use client";

import { useState, type ReactNode } from "react";
import { CircleHelp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RemovePhoneNumberButton } from "@/components/whatsapp/remove-phone-number-button";
import { LocalDateTime } from "@/components/local-date-time";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { PhoneNumber } from "@/lib/api/types";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { toast } from "@/lib/toast";
import { AssignedUsersSummary } from "./assigned-users-button";

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
  addedAt,
  isMaster = false,
  trigger,
}: {
  id: number;
  name: string;
  status?: string;
  addedAt?: string;
  isMaster?: boolean;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<(PhoneNumber & Record<string, unknown>) | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAgentEligibility, setCheckingAgentEligibility] = useState(false);
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
      setDetails(await apiFetch<PhoneNumber & Record<string, unknown>>(`v1/wa/phone-numbers/${id}`));
    } catch (requestError) {
      setError(toApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    void loadDetails();
  }

  async function setupBusinessAgent() {
    if (checkingAgentEligibility) return;
    setCheckingAgentEligibility(true);
    try {
      const eligibility = await apiFetch<{ is_eligible: boolean }>(
        "v1/wa/business-agent/eligibility",
        { query: { phone_number_id: String(id) } },
      );
      if (eligibility.is_eligible) {
        router.push(`/assets/phone-numbers/${id}/business-agent`);
      } else {
        toast.warning(
          "This phone number is not eligible for Meta Business Agent. Please check https://developers.facebook.com/documentation/meta-business-agent/overview#which-phone-numbers-are-eligible for more.",
        );
      }
    } catch (eligibilityError) {
      toast.error(toApiError(eligibilityError).message);
    } finally {
      setCheckingAgentEligibility(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger ? (
          <div
            role="button"
            tabIndex={0}
            onClick={handleOpen}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleOpen();
              }
            }}
            className="block"
          >
            {trigger}
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={handleOpen}>View</Button>
        )}
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
                <dt className="text-muted-foreground">Added</dt>
                <dd className="min-w-0 break-words"><LocalDateTime value={addedAt} /></dd>
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
                {BUSINESS_AGENT_ENABLED ? (
                <>
                <dt className="text-muted-foreground">Business agent</dt>
                <dd className="min-w-0 break-words">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={checkingAgentEligibility}
                      onClick={() => void setupBusinessAgent()}
                    >
                      {checkingAgentEligibility ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Setup
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="About Meta Business Agent"
                          title="About Meta Business Agent"
                        >
                          <CircleHelp />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-72 text-sm leading-5">
                        Use Meta Business Agent to automate your conversations with your customers while you are taking an off.
                      </PopoverContent>
                    </Popover>
                  </div>
                </dd>
                </>
                ) : null}
                <dt className="text-muted-foreground">Assigned to</dt>
                <dd className="min-w-0 break-words">
                  <div>
                    {details.assigned_users?.length
                      ? details.assigned_users.map((user) => user.name || user.phone_number || "Unnamed user").join(", ")
                      : "No users assigned"}
                  </div>
                  {isMaster ? <AssignedUsersSummary phoneNumber={details} phoneNumberId={id} variant="manage" /> : null}
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
                  triggerSize="default"
                  label="Delete"
                  onDeleted={() => setOpen(false)}
                />
              ) : isMaster && isConnected ? (
                <RemovePhoneNumberButton
                  id={id}
                  name={name}
                  phoneNumber={String(details?.display_phone_number || details?.phone_number || "")}
                  triggerVariant="destructive"
                  triggerSize="default"
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
