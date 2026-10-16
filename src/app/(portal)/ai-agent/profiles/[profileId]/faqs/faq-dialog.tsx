"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import type { AgentFaq } from "./faqs-list";

const QUESTION_MAX_LENGTH = 500;
const ANSWER_MAX_LENGTH = 2000;

export function FaqDialog({
  profileId,
  faq,
  open,
  onOpenChange,
  onSaved,
}: {
  profileId: number;
  faq?: AgentFaq;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (faq: AgentFaq) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(faq?.title ?? "");
  const [body, setBody] = useState(faq?.body ?? "");
  const [enabled, setEnabled] = useState(faq?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  function handleOpenChange(next: boolean) {
    if (saving || deleting) return;
    onOpenChange(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || deleting) return;
    const question = title.trim();
    const answer = body.trim();
    if (!question || !answer) {
      setErrors(["Question and answer are required."]);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      if (faq) {
        await apiFetch(
          `v1/ai-agent/profiles/${profileId}/faqs/${encodeURIComponent(faq.id)}`,
          {
            method: "PUT",
            body: { id: faq.id, profile_id: profileId, question, answer, enabled },
          },
        );
        toast.success("FAQ updated.");
        onSaved?.({ ...faq, title: question, body: answer, enabled });
      } else {
        await apiFetch(`v1/ai-agent/profiles/${profileId}/faqs`, {
          method: "POST",
          body: { profile_id: profileId, question, answer },
        });
        toast.success("FAQ added.");
      }
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      const apiError = toApiError(error);
      setErrors([
        apiError.message,
        ...apiError.inputErrors.map((item) =>
          item.field ? `${item.field}: ${item.message}` : item.message,
        ),
      ]);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!faq || saving || deleting) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await apiFetch(`v1/ai-agent/profiles/${profileId}/faqs/${encodeURIComponent(faq.id)}`, {
        method: "DELETE",
      });
      toast.success("FAQ deleted.");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      const apiError = toApiError(error);
      setDeleteError(apiError.message);
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{faq ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
              <DialogDescription>
                {faq
                  ? "Update this question and answer."
                  : "Add a question and answer this AI agent can use."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="faq-title">Question</Label>
              <Input
                id="faq-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={QUESTION_MAX_LENGTH}
                required
                disabled={busy}
              />
              <p className="text-muted-foreground text-right text-xs">
                {title.length}/{QUESTION_MAX_LENGTH}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-body">Answer</Label>
              <Textarea
                id="faq-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={ANSWER_MAX_LENGTH}
                rows={6}
                required
                disabled={busy}
              />
              <p className="text-muted-foreground text-right text-xs">
                {body.length}/{ANSWER_MAX_LENGTH}
              </p>
            </div>
            {faq ? (
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="faq-enabled">Enabled</Label>
                <button
                  id="faq-enabled"
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  disabled={busy}
                  onClick={() => setEnabled((current) => !current)}
                  className={`focus-visible:ring-ring relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 ${enabled ? "bg-green-600" : "bg-muted-foreground/40"}`}
                >
                  <span
                    className={`size-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
            ) : null}
            {errors.length > 0 ? (
              <div className="text-destructive space-y-1 text-sm" role="alert">
                {errors.map((error, index) => (
                  <p key={index} className="whitespace-pre-line">
                    {error}
                  </p>
                ))}
              </div>
            ) : null}
            <DialogFooter className="sm:justify-between">
              {faq ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteOpen(true);
                  }}
                  disabled={busy}
                >
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="submit" disabled={busy}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {saving ? "Saving..." : faq ? "Save" : "Add"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {faq ? (
        <Dialog
          open={deleteOpen}
          onOpenChange={(next) => {
            if (!deleting) setDeleteOpen(next);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete FAQ?</DialogTitle>
              <DialogDescription>
                This will permanently delete this FAQ. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {deleteError ? (
              <p className="text-destructive text-sm whitespace-pre-line" role="alert">
                {deleteError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
