"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function statusVariant(status?: string) {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "default" as const;
    case "REJECTED":
    case "PAUSED":
    case "DISABLED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

// Meta reports "NONE" rather than omitting the field when a template was not rejected.
function rejectedReason(reason?: string) {
  return !reason || reason.toUpperCase() === "NONE" ? null : reason;
}

export function TemplateStatusBadge({ status, reason }: { status?: string; reason?: string }) {
  const badge = <Badge variant={statusVariant(status)}>{status || "UNKNOWN"}</Badge>;
  const detail = status?.toUpperCase() === "REJECTED" ? rejectedReason(reason) : null;

  if (!detail) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{badge}</span>
      </TooltipTrigger>
      <TooltipContent>Rejected: {detail}</TooltipContent>
    </Tooltip>
  );
}
