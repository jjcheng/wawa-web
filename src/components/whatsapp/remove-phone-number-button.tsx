"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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

export function RemovePhoneNumberButton({
  id,
  name,
  phoneNumber,
  mode = "disconnect",
  triggerVariant = "outline",
  label = "Disconnect",
  onDeleted,
}: {
  id: number;
  name: string;
  phoneNumber?: string;
  mode?: "disconnect" | "delete";
  triggerVariant?: "outline" | "destructive";
  label?: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      mode === "delete"
        ? apiFetch(`v1/wa/phone-numbers/${id}`, { method: "DELETE" })
        : apiFetch(`v1/wa/phone-numbers/${id}/disconnect`, {
            method: "POST",
          }),
    onSuccess: () => {
      toast.success(mode === "delete" ? "Phone number deleted." : "Phone number disconnected.");
      setOpen(false);
      onDeleted?.();
      router.refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" className={SMALL_BUTTON_HEIGHT}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "delete" ? "Delete this number?" : "Disconnect this number?"}</DialogTitle>
          <DialogDescription>
            {mode === "delete"
              ? "This would NOT remove your phone number from WhatsApp Business Account. To do so, use WhatsApp Manager."
              : `${name} ${phoneNumber ? `(${phoneNumber})` : ""} will be disconnected from WhatsApp Business Account.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row items-center justify-between gap-3 sm:justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "delete" ? "Delete" : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
