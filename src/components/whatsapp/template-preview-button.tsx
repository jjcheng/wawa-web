"use client";

import { Eye } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Template } from "@/lib/api/types";

export function TemplatePreviewButton({ template }: { template: Template }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Preview template" title="Preview template">
          <Eye />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] min-w-0 overflow-y-auto sm:max-w-lg">
        {template.preview_html ? (
          <div
            className="flex min-w-0 justify-center overflow-hidden [&>div:first-child]:!w-auto [&>div:first-child]:!max-w-none [&>div:first-child]:!bg-transparent [&>div:first-child]:!p-0 [&_*]:max-w-full"
            dangerouslySetInnerHTML={{ __html: template.preview_html }}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            Meta did not return a preview for this template.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
