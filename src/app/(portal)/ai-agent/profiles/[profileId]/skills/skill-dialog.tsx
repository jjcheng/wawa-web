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
import type { InputError } from "@/lib/api/types";
import { toast } from "@/lib/toast";
import type { AgentSkill } from "./skills-list";

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;

export function SkillDialog({
  profileId,
  skill,
  open,
  onOpenChange,
}: {
  profileId: number;
  skill?: AgentSkill;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(skill?.title ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [enabled, setEnabled] = useState(skill?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState<InputError[]>([]);

  async function deleteSkill() {
    if (!skill || saving || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch(`v1/ai-agent/profiles/${profileId}/skills/${skill.id}`, {
        method: "DELETE",
      });
      toast.success("Skill deleted.");
      setDeleteOpen(false);
      onOpenChange(false);
      router.refresh();
    } catch (requestError) {
      const apiError = toApiError(requestError);
      setDeleteError(
        [
          apiError.message,
          ...apiError.inputErrors.map((item) => `${item.field}: ${item.message}`),
        ].join("\n"),
      );
    } finally {
      setDeleting(false);
    }
  }

  async function createSkill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || deleting) return;
    setError(null);
    setInputErrors([]);
    const nextTitle = title.trim();
    if (!nextTitle || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    if (nextTitle.length > TITLE_MAX_LENGTH || description.length > DESCRIPTION_MAX_LENGTH) {
      setError(
        `Title must be ${TITLE_MAX_LENGTH} characters or fewer and description 2,000 characters or fewer.`,
      );
      return;
    }

    setSaving(true);
    try {
      await apiFetch(
        `v1/ai-agent/profiles/${profileId}/skills${skill ? `/${skill.id}` : ""}`,
        {
          method: skill ? "PUT" : "POST",
          body: skill
            ? { title: nextTitle, description, enabled }
            : { title: nextTitle, description },
        },
      );
      toast.success(skill ? "Skill updated." : "Skill created.");
      onOpenChange(false);
      router.refresh();
    } catch (requestError) {
      const apiError = toApiError(requestError);
      setError(apiError.message);
      setInputErrors(apiError.inputErrors);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving && !deleting) onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{skill ? "Edit skill" : "Add skill"}</DialogTitle>
          <DialogDescription>
            Tell this AI agent how to handle your customers.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void createSkill(event)}>
          {skill ? (
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="skill-enabled">Enabled</Label>
              <button
                id="skill-enabled"
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={saving || deleting}
                onClick={() => setEnabled((current) => !current)}
                className={`focus-visible:ring-ring relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 ${enabled ? "bg-green-600" : "bg-muted-foreground/40"}`}
              >
                <span
                  className={`size-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="skill-title">Title</Label>
            <Input
              id="skill-title"
              placeholder="How the agent should greet customers"
              value={title}
              required
              maxLength={TITLE_MAX_LENGTH}
              disabled={saving || deleting}
              aria-invalid={inputErrors.some((item) => item.field === "title")}
              onChange={(event) => setTitle(event.target.value)}
            />
            <p className="text-muted-foreground text-right text-xs">
              {title.length}/{TITLE_MAX_LENGTH}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-description">Description</Label>
            <Textarea
              id="skill-description"
              placeholder="Always greet the customer by the name and ask how you can help."
              value={description}
              rows={5}
              required
              maxLength={DESCRIPTION_MAX_LENGTH}
              disabled={saving || deleting}
              aria-invalid={inputErrors.some((item) => item.field === "description")}
              onChange={(event) => setDescription(event.target.value)}
            />
            <p className="text-muted-foreground text-right text-xs">
              {description.length}/{DESCRIPTION_MAX_LENGTH}
            </p>
          </div>
          {error || inputErrors.length > 0 ? (
            <div className="text-destructive space-y-1 text-sm" role="alert">
              {error ? <p className="whitespace-pre-line">{error}</p> : null}
              {inputErrors.map((item, index) => (
                <p key={`${item.field}-${index}`} className="whitespace-pre-line">
                  {item.field ? `${item.field}: ` : ""}
                  {item.message}
                </p>
              ))}
            </div>
          ) : null}
          <DialogFooter className="flex-row justify-between">
            {skill ? (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                disabled={saving || deleting}
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            ) : null}
            <Button type="submit" className="ml-auto" disabled={saving || deleting}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? (skill ? "Saving..." : "Creating...") : skill ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
        {skill ? (
          <Dialog
            open={deleteOpen}
            onOpenChange={(nextOpen) => {
              if (!deleting) setDeleteOpen(nextOpen);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete skill?</DialogTitle>
                <DialogDescription>
                  This will permanently delete “{skill.title}”. This action cannot be undone.
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
                  onClick={() => void deleteSkill()}
                >
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
