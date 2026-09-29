"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { LocalDateTime } from "@/components/local-date-time";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

type BusinessAgentUiSkill = {
  id: string;
  title: string;
  component_type: string;
  status: string;
  instruction: string;
  created_at: number;
};

const COMPONENT_TYPES = [
  { value: "cta_url", label: "Call-to-action URL button" },
  { value: "image", label: "Image message" },
  { value: "interactive_list", label: "Interactive list" },
  { value: "interactive_reply_buttons", label: "Interactive reply buttons" },
  { value: "location", label: "Location message" },
  { value: "location_request", label: "Location request" },
  { value: "carousel_url", label: "Carousel with URL buttons" },
  { value: "carousel_quick_reply", label: "Carousel with quick-reply buttons" },
];

const STATUSES = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

function componentTypeLabel(value?: string | null) {
  return COMPONENT_TYPES.find((type) => type.value === value)?.label ?? value ?? null;
}

// int64 timestamps may be seconds or milliseconds.
function toMillis(value?: number | null) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value < 1e12 ? value * 1000 : value;
}

function formatLabel(value?: string | null) {
  if (!value) return null;
  const text = value.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type UiSkillValues = { title: string; component_type: string; status: string; instruction: string };

const ENDPOINT = "v1/wa/business-agent/ui-skills";

const TITLE_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

function getTitleError(title: string) {
  const value = title.trim();
  if (!value) return "Title is required.";
  if (!TITLE_PATTERN.test(value)) {
    return "Use only lowercase letters, numbers, underscores, and hyphens, and start and end with a letter or number.";
  }
  return null;
}

function UiSkillDialogBody({
  phoneNumberId,
  skill,
  onCancel,
  onSaved,
  onDelete,
}: {
  phoneNumberId: number;
  skill: BusinessAgentUiSkill | null;
  onCancel: () => void;
  onSaved: (skill: BusinessAgentUiSkill) => void;
  onDelete?: () => void;
}) {
  const [values, setValues] = useState<UiSkillValues>({
    title: skill?.title ?? "",
    component_type: skill?.component_type ?? "",
    status: skill?.status || "enabled",
    instruction: skill?.instruction ?? "",
  });
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const titleError = showErrors ? getTitleError(values.title) : null;
  const componentTypeError = showErrors && !values.component_type;
  const instructionError = showErrors && !values.instruction.trim();

  function update(field: keyof UiSkillValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    if (submitting) return;
    if (getTitleError(values.title) || !values.component_type || !values.instruction.trim()) {
      setShowErrors(true);
      return;
    }
    const payload: UiSkillValues = {
      title: values.title.trim(),
      component_type: values.component_type,
      status: values.status,
      instruction: values.instruction.trim(),
    };
    setSubmitting(true);
    try {
      const response = await apiFetch<Partial<BusinessAgentUiSkill> | null>(ENDPOINT, {
        method: skill ? "PUT" : "POST",
        query: { phone_number_id: String(phoneNumberId) },
        body: skill ? { id: String(skill.id), ...payload } : payload,
      });
      onSaved(
        skill
          ? { ...skill, ...payload, ...response }
          : { id: "", created_at: Date.now(), ...payload, ...response },
      );
      toast.success(skill ? "UI skill updated." : "UI skill added.");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{skill ? "Edit UI skill" : "Add UI skill"}</DialogTitle>
        <DialogDescription>Describe how the agent can reply interactive messages.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 !overflow-y-auto">
        <label className="grid gap-1.5 text-sm font-medium">
          Title
          <Input
            autoFocus
            placeholder="product_catalog"
            value={values.title}
            aria-invalid={titleError ? true : undefined}
            onChange={(event) =>
              update("title", event.target.value.replace(/\s/g, "_").replace(/[^A-Za-z0-9_-]/g, "").toLowerCase())
            }
          />
          {titleError ? <span className="text-destructive text-xs font-normal">{titleError}</span> : null}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid content-start gap-1.5 text-sm font-medium">
            <span id="ui-skill-component-type">Component type</span>
            <Select value={values.component_type} onValueChange={(value) => update("component_type", value)}>
              <SelectTrigger
                aria-labelledby="ui-skill-component-type"
                aria-invalid={componentTypeError || undefined}
                className="w-full"
              >
                <SelectValue placeholder="Select a component type" />
              </SelectTrigger>
              <SelectContent>
                {COMPONENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {componentTypeError ? (
              <span className="text-destructive text-xs font-normal">Component type is required.</span>
            ) : null}
          </div>
          <div className="grid content-start gap-1.5 text-sm font-medium">
            <span id="ui-skill-status">Status</span>
            <Select value={values.status} onValueChange={(value) => update("status", value)}>
              <SelectTrigger aria-labelledby="ui-skill-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <label className="grid gap-1.5 text-sm font-medium">
          Instruction
          <Textarea
            rows={4}
            placeholder="Send when the customer asks to see the product catalog"
            value={values.instruction}
            aria-invalid={instructionError || undefined}
            onChange={(event) => update("instruction", event.target.value)}
          />
          {instructionError ? <span className="text-destructive text-xs font-normal">Instruction is required.</span> : null}
        </label>
      </div>
      <DialogFooter>
        {onDelete ? (
          <Button type="button" variant="destructive" className="sm:mr-auto" onClick={onDelete} disabled={submitting}>
            Delete
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void submit()} disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {skill ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function UiSkillsList({ phoneNumberId, description }: { phoneNumberId: number; description: string }) {
  const [skills, setSkills] = useState<BusinessAgentUiSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<BusinessAgentUiSkill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessAgentUiSkill | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget?.id || deleting) return;
    setDeleting(true);
    try {
      await apiFetch(`${ENDPOINT}/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
        query: { phone_number_id: String(phoneNumberId) },
      });
      setSkills((current) => current.filter((skill) => skill !== deleteTarget));
      setDeleteTarget(null);
      toast.success("UI skill deleted.");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadSkills() {
      try {
        const response = await apiFetch<BusinessAgentUiSkill[] | null>(ENDPOINT, {
          query: { phone_number_id: String(phoneNumberId) },
        });
        if (active) setSkills(response ?? []);
      } catch (error) {
        if (active) setLoadError(toApiError(error).message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSkills();
    return () => {
      active = false;
    };
  }, [phoneNumberId]);

  const filteredSkills = useMemo(() => {
    const indexed = skills.map((skill, index) => ({ skill, index }));
    const query = search.trim().toLowerCase();
    if (!query) return indexed;
    return indexed.filter(({ skill }) =>
      [skill.title, skill.instruction, skill.component_type, componentTypeLabel(skill.component_type)].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    );
  }, [skills, search]);

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Agent UI skills</h1>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setEditingSkill(null);
              setAddOpen(true);
            }}
          >
            Add UI skill
          </Button>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      ) : loadError ? (
        <p className="text-destructive text-sm">{loadError}</p>
      ) : (
        <div className="bg-card divide-border overflow-hidden divide-y rounded-lg border">
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2 my-auto size-4"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search UI skills"
                aria-label="Search UI skills"
                className="h-8 border-none bg-transparent pr-7 pl-8 shadow-none focus-visible:ring-0"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>
          {filteredSkills.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-muted-foreground text-base">{search ? "No UI skills found." : "No UI skills yet."}</p>
              {search ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setSearch("")}>
                  Reset filter
                </Button>
              ) : null}
            </div>
          ) : (
            filteredSkills.map(({ skill, index }) => {
              const status = formatLabel(skill.status);
              const componentType = componentTypeLabel(skill.component_type);
              const createdAt = toMillis(skill.created_at);
              return (
                <button
                  key={skill.id || index}
                  type="button"
                  onClick={() => {
                    setEditingSkill(skill);
                    setAddOpen(true);
                  }}
                  disabled={!skill.id}
                  className="hover:bg-accent/60 flex w-full min-w-0 cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-default"
                >
                  <span className="bg-accent text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 truncate font-medium leading-5">{skill.title || "Untitled UI skill"}</p>
                    {componentType ? <p className="truncate text-sm">{componentType}</p> : null}
                    {skill.instruction ? (
                      <p className="text-muted-foreground line-clamp-2 text-sm">{skill.instruction}</p>
                    ) : null}
                    {createdAt ? (
                      <LocalDateTime value={createdAt} className="text-muted-foreground block truncate text-sm" />
                    ) : null}
                    {status ? <p className="truncate text-sm md:hidden">{status}</p> : null}
                  </div>
                  {status ? (
                    <div className="ml-auto hidden w-48 shrink-0 self-stretch text-right md:flex md:flex-col md:justify-center">
                      <span className="block truncate text-sm font-medium">{status}</span>
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[90vw]">
          {addOpen ? (
            <UiSkillDialogBody
              key={editingSkill?.id ?? "new"}
              phoneNumberId={phoneNumberId}
              skill={editingSkill}
              onCancel={() => setAddOpen(false)}
              onSaved={(saved) => {
                setSkills((current) =>
                  editingSkill
                    ? current.map((item) => (item === editingSkill ? saved : item))
                    : [...current, saved],
                );
                setAddOpen(false);
              }}
              onDelete={
                editingSkill?.id
                  ? () => {
                      setDeleteTarget(editingSkill);
                      setAddOpen(false);
                    }
                  : undefined
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete UI skill?</DialogTitle>
            <DialogDescription>
              The agent will no longer use this UI skill. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <p className="bg-muted rounded-md px-3 py-2 text-sm font-medium break-all">{deleteTarget.title}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
