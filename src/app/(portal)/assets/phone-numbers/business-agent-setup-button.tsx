"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

export function BusinessAgentSetupButton({
  phoneNumberId,
  iconOnly = false,
  agentEnabled = false,
  phoneNumberName = "this number",
}: {
  phoneNumberId: number;
  iconOnly?: boolean;
  agentEnabled?: boolean;
  phoneNumberName?: string;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  async function setup() {
    if (checking) return;
    setChecking(true);
    try {
      const eligibility = await apiFetch<{ is_eligible: boolean }>(
        `/v1/wa/phone-numbers/${phoneNumberId}/business-agent/eligibility`,
      );
      if (eligibility.is_eligible) {
        router.push(`/assets/phone-numbers/${phoneNumberId}/business-agent`);
      } else {
        toast.warning(
          "This phone number is not eligible for Meta Business Agent. Please check https://developers.facebook.com/documentation/meta-business-agent/overview#which-phone-numbers-are-eligible for more.",
        );
      }
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <Button
      type="button"
      variant={iconOnly ? "ghost" : "outline"}
      size={iconOnly ? "icon-sm" : "xs"}
      className={iconOnly ? (agentEnabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground") : undefined}
      aria-label={iconOnly ? `Manage business agent for ${phoneNumberName}` : undefined}
      title={iconOnly ? `Manage business agent (${agentEnabled ? "running" : "stopped"})` : undefined}
      aria-busy={checking}
      disabled={checking}
      onClick={() => void setup()}
    >
      {checking ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : iconOnly ? (
        <Bot aria-hidden="true" className={`size-5 ${agentEnabled ? "animate-pulse" : ""}`} />
      ) : null}
      {!iconOnly ? "Setup" : null}
    </Button>
  );
}