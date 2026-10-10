"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

export function WebsiteAction({
  profileId,
  websiteId,
  status,
}: {
  profileId: number;
  websiteId: number;
  status: string;
}) {
  const router = useRouter();
  const running = status === "RUNNING";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef(false);

  async function performAction(action: "cancel" | "delete") {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await apiFetch(
        `v1/ai-agent/websites/${websiteId}${action === "cancel" ? "/cancel" : ""}`,
        { method: action === "cancel" ? "POST" : "DELETE" },
      );
      toast.success(action === "cancel" ? "Website crawl cancelled." : "Website deleted.");
      setDeleteOpen(false);
      if (action === "delete") {
        router.replace(`/ai-agent/profiles/${profileId}/websites`);
      }
      router.refresh();
    } catch (requestError) {
      const apiError = toApiError(requestError);
      const message = [
        apiError.message,
        ...apiError.inputErrors.map((item) =>
          item.field ? `${item.field}: ${item.message}` : item.message,
        ),
      ].join("\n");
      if (action === "cancel") toast.error(message);
      else setError(message);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={running ? "outline" : "destructive"}
        disabled={pending}
        onClick={() => {
          if (running) void performAction("cancel");
          else {
            setError(null);
            setDeleteOpen(true);
          }
        }}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {running ? (pending ? "Cancelling..." : "Cancel") : pending ? "Deleting..." : "Delete"}
      </Button>
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!pendingRef.current) setDeleteOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete website?</DialogTitle>
            <DialogDescription>
              This will permanently delete this website. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="text-destructive text-sm whitespace-pre-line" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => void performAction("delete")}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
