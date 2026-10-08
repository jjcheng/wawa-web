"use client";

import { useEffect, useState } from "react";
import { BookOpen, Bot, FlaskConical, Handshake, ListChecks, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
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
import { publishBusinessAgentStatus, subscribeBusinessAgentStatus } from "@/lib/business-agent-status";
import { toast } from "@/lib/toast";
import { BusinessAgentSections } from "./business-agent-controls";
import { BusinessAgentInfoButton } from "./business-agent-info-button";

const ONBOARDING_BENEFITS = [
  { icon: BookOpen, title: "Knowledge", text: "Teach the agent your business info, FAQs, files, and websites." },
  { icon: ListChecks, title: "Instructions", text: "Define how agent responds to your customers." },
  { icon: Handshake, title: "Handover & Followup", text: "Hand over to a human and follow up when customers go quiet." },
  { icon: FlaskConical, title: "Test", text: "Try the agent before your customers do." },
];

export function BusinessAgentLifecycleButton({
  phoneNumberId,
  displayNumber,
  initialMetaAgentId,
  initialAgentRunning,
}: {
  phoneNumberId: number;
  displayNumber: string;
  initialMetaAgentId: string;
  initialAgentRunning: boolean;
}) {
  const [metaAgentId, setMetaAgentId] = useState(initialMetaAgentId);
  const [pending, setPending] = useState(false);
  const [confirmOffboard, setConfirmOffboard] = useState(false);
  const [agentRunning, setAgentRunning] = useState(initialAgentRunning);
  const [statusPending, setStatusPending] = useState(false);
  const isOnboarded = Boolean(metaAgentId.trim());

  useEffect(
    () =>
      subscribeBusinessAgentStatus((change) => {
        if (change.phoneNumberId !== phoneNumberId) return;
        if (change.agent_enabled !== undefined) setAgentRunning(change.agent_enabled);
        if (change.meta_agent_id !== undefined) setMetaAgentId(change.meta_agent_id);
      }),
    [phoneNumberId],
  );

  async function toggleActive() {
    if (statusPending) return;
    const on = !agentRunning;
    setStatusPending(true);
    try {
      await apiFetch(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/status`, {
        method: "PATCH",
        query: { on: String(on) },
      });
      publishBusinessAgentStatus({ phoneNumberId, agent_enabled: on });
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setStatusPending(false);
    }
  }

  async function submitLifecycleAction() {
    if (pending) return;
    setPending(true);

    const action = isOnboarded ? "offboard" : "onboard";
    try {
      const response = await apiFetch<{ meta_agent_id?: string }>(
        `v1/wa/phone-numbers/${phoneNumberId}/business-agent/${action}`,
        { method: "POST" },
      );
      setMetaAgentId(isOnboarded ? "" : response.meta_agent_id || "onboarded");
      publishBusinessAgentStatus(
        isOnboarded
          ? { phoneNumberId, meta_agent_id: "", agent_enabled: false }
          : { phoneNumberId, meta_agent_id: response.meta_agent_id || "onboarded" },
      );
      setConfirmOffboard(false);
      toast.success(isOnboarded ? "Phone number offboarded from business agent AI." : "Phone number onboarded business agent AI.");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Business agent settings"
        titleAction={<BusinessAgentInfoButton />}
        action={
          isOnboarded ? (
            <label className="flex items-center gap-2 text-sm font-medium">
              Active
              <button
                type="button"
                role="switch"
                aria-checked={agentRunning}
                aria-label={`${agentRunning ? "Turn off" : "Turn on"} business agent`}
                disabled={statusPending}
                onClick={() => void toggleActive()}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 ${agentRunning ? "bg-green-600" : "bg-muted-foreground/40"}`}
              >
                <span className={`size-4 rounded-full bg-white shadow transition-transform ${agentRunning ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </label>
          ) : undefined
        }
        description={(
          <>
            {displayNumber}{" "}
            {isOnboarded ? (
              "has onboarded Meta Business Agent."
            ) : (
              <>
                has not onboarded Meta Business Agent yet.
              </>
            )}
          </>
        )}
      />

      {isOnboarded ? (
        <>
          <BusinessAgentSections phoneNumberId={phoneNumberId} />
          <div className="mt-6 flex justify-start">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmOffboard(true)}
              disabled={pending}
            >
              Off-board
            </Button>
          </div>
        </>
      ) : (
        <section className="bg-card mt-5 rounded-xl border p-6 text-center sm:p-8">
          <span className="bg-accent mx-auto flex size-12 items-center justify-center rounded-full">
            <Bot className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Onboard {displayNumber} to get started</h2>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            Onboarding creates a Meta Business Agent for this number. It takes a few seconds, and
            you can offboard at any time.
          </p>
          <ul className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            {ONBOARDING_BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3 rounded-lg border p-3">
                <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="text-muted-foreground block text-sm">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="lg"
            className="mt-6"
            onClick={() => void submitLifecycleAction()}
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {pending ? "Onboarding..." : "Onboard now"}
          </Button>
        </section>
      )}

      <Dialog open={confirmOffboard} onOpenChange={setConfirmOffboard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Offboard Business Agent?</DialogTitle>
            <DialogDescription>
              The Business Agent will stop handling conversations for this phone number.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row items-center justify-between gap-3 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOffboard(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void submitLifecycleAction()}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Off-board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}