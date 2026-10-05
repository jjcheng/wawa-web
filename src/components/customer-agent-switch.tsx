"use client";

import { useState } from "react";
import { Bot } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

export function CustomerAgentSwitch({
  customerId,
  initialOn,
}: {
  customerId: number | string;
  initialOn: boolean;
}) {
  const [on, setOn] = useState(initialOn);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const next = !on;
    setPending(true);
    try {
      await apiFetch("v1/wa/business-agent/pass-control", {
        method: "POST",
        query: { customer_id: String(customerId), to_agent: String(next) },
      });
      setOn(next);
      toast.success(next ? "Business Agent is taking over this conversation" : "You are taking over this conversation");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? "Take over from the business agent" : "Pass conversation to the business agent"}
      title={on ? "Business agent is handling this chat" : "Enable or disable Business agent for this customer"}
      disabled={pending}
      onClick={() => void toggle()}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 ${on ? "bg-green-600" : "bg-muted-foreground/40"}`}
    >
      <span
        className={`flex size-4 items-center justify-center rounded-full bg-white shadow transition-transform ${on ? "translate-x-4.5" : "translate-x-0.5"}`}
      >
        <Bot className={`size-3 ${on ? "text-green-600" : "text-muted-foreground"}`} />
      </span>
    </button>
  );
}
