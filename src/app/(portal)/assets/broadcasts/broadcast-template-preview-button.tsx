"use client";

import { Eye } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Broadcast } from "@/lib/api/types";

function componentLabel(component: Record<string, unknown>) {
  return String(component.type ?? "Component").toLowerCase();
}

function componentText(component: Record<string, unknown>) {
  const parameters = Array.isArray(component.parameters) ? component.parameters : [];
  return parameters
    .map((parameter) => {
      if (!parameter || typeof parameter !== "object") return null;
      const value = parameter as Record<string, unknown>;
      if (typeof value.text === "string") return value.text;
      const media = value.image ?? value.video ?? value.document;
      if (media && typeof media === "object") {
        const mediaValue = media as Record<string, unknown>;
        return String(mediaValue.link ?? mediaValue.id ?? "Media");
      }
      return String(value.payload ?? value.coupon_code ?? "");
    })
    .filter(Boolean)
    .join("\n");
}

export function BroadcastTemplatePreviewButton({ broadcast }: { broadcast: Broadcast }) {
  const [open, setOpen] = useState(false);
  const components = broadcast.send_template_payload?.components ?? [];

  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Preview broadcast template"
        title="Preview broadcast template"
      >
        <Eye />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{broadcast.name}</DialogTitle>
            <DialogDescription>Broadcast template preview</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-3 overflow-y-auto">
            {components.length === 0 ? (
              <p className="text-muted-foreground text-sm">No template preview available.</p>
            ) : (
              components.map((component, index) => (
                <div key={`${componentLabel(component)}-${index}`} className="rounded-md border p-3">
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    {componentLabel(component)}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{componentText(component) || "—"}</p>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
