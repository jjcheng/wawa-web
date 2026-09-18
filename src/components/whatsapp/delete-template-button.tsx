"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";

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
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { SMALL_BUTTON_HEIGHT } from "@/lib/utils";

export function DeleteTemplateButton({
  id,
  wabaId,
  name,
  triggerVariant = "outline",
  onDeleted,
}: {
  id: string;
  wabaId: string;
  name: string;
  triggerVariant?: "outline" | "destructive";
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("v1/wa/templates", {
        method: "DELETE",
        body: { waba_id: wabaId, name, id },
      }),
    onSuccess: () => {
      toast.success("Template deleted.");
      setOpen(false);
      onDeleted?.();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" className={SMALL_BUTTON_HEIGHT}>
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this template?</DialogTitle>
          <DialogDescription>
            {name} will be deleted from your WhatsApp Business Account. Messages already queued
            against it may fail.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
