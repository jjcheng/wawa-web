"use client";

import { useId } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function CustomerAgentEnabledField({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="min-w-0 flex-1">AI Agent enabled</Label>
      <button
        id={id}
        name="agent_enabled"
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          "focus-visible:ring-ring relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
          enabled ? "bg-green-600" : "bg-muted-foreground/40",
        )}
      >
        <span className={cn(
          "size-4 rounded-full bg-white shadow transition-transform",
          enabled ? "translate-x-4" : "translate-x-0.5",
        )} />
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="About Business Agent" title="About Business Agent">
            <Info />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 text-sm leading-5">
          Enable AI to handle this customer. You also need to enable AI agent for the assigned phone number in order for AI to work.
        </PopoverContent>
      </Popover>
    </div>
  );
}