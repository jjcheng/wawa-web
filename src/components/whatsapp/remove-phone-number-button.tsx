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
  triggerVariant = "outline",
  label = "Disconnect",
  onDeleted,
}: {
  id: number;
  name: string;
  phoneNumber?: string;
  triggerVariant?: "outline" | "destructive";
  label?: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`v1/wa/phone-numbers/${id}/disconnect`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Phone number disconnected.");
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
          <DialogTitle>Disconnect this number?</DialogTitle>
          <DialogDescription>
            {name} {phoneNumber ? `(${phoneNumber})` : ""} will be disconnected from WhatsApp. This cannot be undone.
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
            Disconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
