"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Template } from "@/lib/api/types";
import { SMALL_BUTTON_HEIGHT } from "@/lib/utils";

function componentText(component: Record<string, unknown>) {
  return typeof component.text === "string" ? component.text : null;
}

export function ViewTemplateButton({ template }: { template: Template }) {
  const [open, setOpen] = useState(false);
  const components = template.components ?? [];
  const qualityReasons = template.quality_score?.reasons ?? [];

  const details: { label: string; value: string }[] = [
    { label: "Template ID", value: template.id },
    { label: "WABA", value: template.meta_waba_id ?? "—" },
    { label: "Parameter format", value: template.parameter_format || "—" },
    { label: "Quality score", value: template.quality_score?.score || "—" },
    { label: "Previous category", value: template.previous_category || "—" },
    { label: "Rejected reason", value: template.rejected_reason || "—" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={SMALL_BUTTON_HEIGHT}>
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template.name || "Template"}</DialogTitle>
          <DialogDescription>
            {[template.category, template.language, template.status]
              .filter(Boolean)
              .join(" · ")}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {details.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="text-muted-foreground">{detail.label}</dt>
              <dd className="break-all">{detail.value}</dd>
            </div>
          ))}
        </dl>

        {qualityReasons.length > 0 ? (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Quality reasons
            </p>
            <ul className="mt-1 list-disc pl-4 text-sm">
              {qualityReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {components.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Meta did not return any components for this template.
          </p>
        ) : (
          <div className="space-y-3">
            {components.map((component, index) => {
              const text = componentText(component);
              return (
                <div key={index} className="rounded-md border p-3">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {String(component.type ?? "COMPONENT")}
                  </p>
                  {text ? (
                    <p className="mt-1 text-sm whitespace-pre-wrap">{text}</p>
                  ) : (
                    <pre className="text-muted-foreground mt-1 overflow-x-auto text-xs">
                      {JSON.stringify(component, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
