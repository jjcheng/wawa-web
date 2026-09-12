"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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

export function ReconnectPhoneNumberButton({
  id,
  name,
  phoneNumber,
  onReconnected,
}: {
  id: number;
  name: string;
  phoneNumber?: string;
  onReconnected?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`v1/wa/phone-numbers/${id}/reconnect`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Phone number reconnected.");
      setOpen(false);
      onReconnected?.();
      router.refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="info" size="sm" className={SMALL_BUTTON_HEIGHT}>
          Reconnect
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reconnect this number?</DialogTitle>
          <DialogDescription>
            {name} {phoneNumber ? `(${phoneNumber})` : ""} will be reconnected to WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="info"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Reconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}