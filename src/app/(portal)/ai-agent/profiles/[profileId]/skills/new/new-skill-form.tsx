"use client";

import { useState } from "react";
import { Info, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import type { InputError } from "@/lib/api/types";
import type { AgentSkill, AgentSkillInput } from "../skills-list";

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;
const INPUT_TITLE_MAX_LENGTH = 100;
const INPUT_DESCRIPTION_MAX_LENGTH = 255;

const emptySkillInput = (): AgentSkillInput => ({
  title: "",
  description: "",
  required: false,
});

export function SkillForm({ profileId, skill }: { profileId: number; skill?: AgentSkill }) {
  const router = useRouter();
  const [title, setTitle] = useState(skill?.title ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [alwaysApplyRequested, setAlwaysApply] = useState(skill?.always_apply ?? false);
  const [inputs, setInputs] = useState<AgentSkillInput[]>(() =>
    (skill?.inputs ?? []).map((input) => {
      // Older saved inputs used `name` instead of `title`.
      const legacy = input as Partial<AgentSkillInput> & { name?: string };
      return {
        title: legacy.title ?? legacy.name ?? "",
        description: legacy.description ?? "",
        required: Boolean(legacy.required),
      };
    }),
  );
  // Skills with inputs cannot be applied to every AI call.
  const alwaysApply = alwaysApplyRequested && inputs.length === 0;
  const [enabled, setEnabled] = useState(skill?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState<InputError[]>([]);

  function updateInput(index: number, field: keyof AgentSkillInput, value: string | boolean) {
    setInputs((current) =>
      current.map((input, inputIndex) =>
        inputIndex === index ? { ...input, [field]: value } : input,
      ),
    );
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
    if (
      inputs.some(
        (input) =>
          !input.title.trim() ||
          input.title.length > INPUT_TITLE_MAX_LENGTH ||
          input.description.length > INPUT_DESCRIPTION_MAX_LENGTH,
      )
    ) {
      setError(
        "Each input needs a title of 100 characters or fewer and a description of 255 characters or fewer.",
      );
      return;
    }

    setSaving(true);
    try {
      await apiFetch(
        `v1/ai-agent/profiles/${profileId}/skills${skill ? `/${skill.id}` : ""}`,
        {
          method: skill ? "PUT" : "POST",
          body: {
            title: nextTitle,
            description,
            always_apply: alwaysApply,
            ...(skill ? { enabled } : {}),
            inputs: inputs.map((input) => ({
              title: input.title.trim(),
              description: input.description.trim(),
              required: input.required,
            })),
          },
        },
      );
      toast.success(skill ? "Skill updated." : "Skill created.");
      router.push(`/ai-agent/profiles/${profileId}/skills`);
    } catch (requestError) {
      const apiError = toApiError(requestError);
      setError(apiError.message);
      setInputErrors(apiError.inputErrors);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSkill() {
    if (!skill || saving || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch(`v1/ai-agent/profiles/${profileId}/skills/${skill.id}`, {
        method: "DELETE",
      });
      toast.success("Skill deleted.");
      router.push(`/ai-agent/profiles/${profileId}/skills`);
      router.refresh();
    } catch (requestError) {
      const apiError = toApiError(requestError);
      setDeleteError(
        [
          apiError.message,
          ...apiError.inputErrors.map((item) =>
            item.field ? `${item.field}: ${item.message}` : item.message,
          ),
        ].join("\n"),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form
      className="bg-card mt-5 w-full max-w-2xl space-y-5 rounded-xl border p-4 sm:p-6"
      onSubmit={(event) => void createSkill(event)}
    >
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Label htmlFor="skill-always-apply">Always apply</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="About always apply"
              >
                <Info />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 text-sm leading-5">
              If turned on, this skill will be applied to all AI calls; otherwise, it is only
              added when needed. You should only turn this on for general tones and guidelines,
              avoid specific skills like making an appointment or handle refunds.
            </PopoverContent>
          </Popover>
        </div>
        <button
          id="skill-always-apply"
          type="button"
          role="switch"
          aria-checked={alwaysApply}
          disabled={saving || deleting || inputs.length > 0}
          onClick={() => setAlwaysApply((current) => !current)}
          className={`focus-visible:ring-ring relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 ${alwaysApply ? "bg-green-600" : "bg-muted-foreground/40"}`}
        >
          <span
            className={`size-4 rounded-full bg-white shadow transition-transform ${alwaysApply ? "translate-x-4" : "translate-x-0.5"}`}
          />
        </button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="skill-title">Title</Label>
        <Input
          id="skill-title"
          placeholder="How the agent should greet customers"
          value={title}
          required
          maxLength={TITLE_MAX_LENGTH}
          disabled={saving}
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
          disabled={saving}
          aria-invalid={inputErrors.some((item) => item.field === "description")}
          onChange={(event) => setDescription(event.target.value)}
        />
        <p className="text-muted-foreground text-right text-xs">
          {description.length}/{DESCRIPTION_MAX_LENGTH}
        </p>
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-end gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="About skill inputs"
              >
                <Info />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 text-sm leading-5">
              Automatically ask the user to provide the following inputs. Can be used to
              collect appointment details, order id etc... Once inputs are all collected, a
              notification will be sent to you.
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving || deleting}
            onClick={() => setInputs((current) => [...current, emptySkillInput()])}
          >
            Add input
          </Button>
        </div>
        {inputs.map((input, index) => (
          <div key={index} className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Input {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove input ${index + 1}`}
                disabled={saving || deleting}
                onClick={() => setInputs((current) => current.filter((_, i) => i !== index))}
              >
                <Trash2 />
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`skill-input-${index}-title`}>
                Title
                {input.required && (
                  <span className="text-muted-foreground ml-1 font-normal">(required)</span>
                )}
              </Label>
              <Input
                id={`skill-input-${index}-title`}
                value={input.title}
                required
                maxLength={INPUT_TITLE_MAX_LENGTH}
                disabled={saving || deleting}
                aria-invalid={inputErrors.some(
                  (item) => item.field === `inputs.${index}.title`,
                )}
                onChange={(event) => updateInput(index, "title", event.target.value)}
              />
              <p className="text-muted-foreground text-right text-xs">
                {input.title.length}/{INPUT_TITLE_MAX_LENGTH}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`skill-input-${index}-description`}>Description</Label>
              <Textarea
                id={`skill-input-${index}-description`}
                value={input.description}
                rows={2}
                maxLength={INPUT_DESCRIPTION_MAX_LENGTH}
                disabled={saving || deleting}
                aria-invalid={inputErrors.some(
                  (item) => item.field === `inputs.${index}.description`,
                )}
                onChange={(event) => updateInput(index, "description", event.target.value)}
              />
              <p className="text-muted-foreground text-right text-xs">
                {input.description.length}/{INPUT_DESCRIPTION_MAX_LENGTH}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={input.required}
                disabled={saving || deleting}
                onChange={(event) => updateInput(index, "required", event.target.checked)}
              />
              Required
            </label>
          </div>
        ))}
      </section>
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
      <div className="flex justify-between pt-4">
        {skill ? (
          <Button
            type="button"
            variant="destructive"
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
      </div>
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
    </form>
  );
}
