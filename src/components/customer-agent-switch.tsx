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
      toast.success(next ? "Thread control passed to Business Agent" : "Thread control passed to you");
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
      title={on ? "Business agent is handling this chat" : "Business agent is off for this chat"}
      disabled={pending}
      onClick={() => void toggle()}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 ${on ? "bg-green-600" : "bg-muted-foreground/40"}`}
    >
      <span
        className={`flex size-6 items-center justify-center rounded-full bg-white shadow transition-transform ${on ? "translate-x-5.5" : "translate-x-0.5"}`}
      >
        <Bot className={`size-3.5 ${on ? "text-green-600" : "text-muted-foreground"}`} />
      </span>
    </button>
  );
}
