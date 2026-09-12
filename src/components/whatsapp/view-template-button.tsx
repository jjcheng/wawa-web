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
  DialogTrigger,
} from "@/components/ui/dialog";
import { DeleteTemplateButton } from "@/components/whatsapp/delete-template-button";
import { TemplatePreviewHtml } from "@/components/template-preview-html";
import type { Template } from "@/lib/api/types";
import { SMALL_BUTTON_HEIGHT } from "@/lib/utils";

function componentText(component: Record<string, unknown>) {
  return typeof component.text === "string" ? component.text : null;
}

export function ViewTemplateButton({
  template,
  onDeleted,
  iconOnly = false,
}: {
  template: Template;
  onDeleted?: () => void;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const components = template.components ?? [];
  const qualityReasons = template.quality_score?.reasons ?? [];

  const details: { label: string; value: string }[] = [
    { label: "Template ID", value: template.id },
    { label: "Parameter format", value: template.parameter_format || "—" },
    { label: "Quality score", value: template.quality_score?.score || "—" },
    { label: "Previous category", value: template.previous_category || "—" },
    { label: "Rejected reason", value: template.rejected_reason || "—" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={iconOnly ? "ghost" : "outline"}
          size={iconOnly ? "icon-sm" : "sm"}
          className={iconOnly ? undefined : SMALL_BUTTON_HEIGHT}
          aria-label={iconOnly ? "Preview template" : undefined}
          title={iconOnly ? "Preview template" : undefined}
        >
          {iconOnly ? <Eye /> : "View"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] min-w-0 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{template.name || "Template"}</DialogTitle>
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

        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Preview</p>
        {template.preview_html || template.preview_dark_html ? (
          <TemplatePreviewHtml
            lightHtml={template.preview_html}
            darkHtml={template.preview_dark_html}
          />
        ) : components.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Meta did not return any components for this template.
          </p>
        ) : (
          <div className="min-w-0 overflow-hidden">
            {components.map((component, index) => {
              const text = componentText(component);
              if (!text) return null;

              const type = String(component.type ?? "BODY").toUpperCase();
              const textClassName =
                type === "HEADER"
                  ? "font-semibold"
                  : type === "FOOTER"
                    ? "text-muted-foreground text-xs"
                    : "text-sm";

              return (
                <p
                  key={index}
                  className={`${index > 0 ? "mt-2" : ""} ${textClassName} break-all whitespace-pre-wrap`}
                >
                  {text}
                </p>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <DeleteTemplateButton
            id={template.id}
            wabaId={template.waba_id ?? ""}
            name={template.name ?? ""}
            triggerVariant="destructive"
            onDeleted={() => {
              setOpen(false);
              onDeleted?.();
            }}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
