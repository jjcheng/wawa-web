"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

type BusinessAgentSkill = {
  id: string;
  title: string;
  description: string;
  skill: string;
  channel: string;
  created_at: number;
  status: string;
};

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

type SkillValues = { title: string; description: string; skill: string };

const TITLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function getTitleError(title: string) {
  const value = title.trim();
  if (!value) return "Title is required.";
  if (!TITLE_PATTERN.test(value)) {
    return "Use only lowercase letters, numbers, and hyphens, and don't start or end with a hyphen.";
  }
  return null;
}

function SkillDialogBody({
  phoneNumberId,
  skill,
  onSaved,
  onDelete,
}: {
  phoneNumberId: number;
  skill: BusinessAgentSkill | null;
  onSaved: (skill: BusinessAgentSkill) => void;
  onDelete?: () => void;
}) {
  const [values, setValues] = useState<SkillValues>({
    title: skill?.title ?? "",
    description: skill?.description ?? "",
    skill: skill?.skill ?? "",
  });
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const titleError = showErrors ? getTitleError(values.title) : null;
  const descriptionError = showErrors && !values.description.trim();
  const skillError = showErrors && !values.skill.trim();

  function update(field: keyof SkillValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    if (submitting) return;
    if (getTitleError(values.title) || !values.description.trim() || !values.skill.trim()) {
      setShowErrors(true);
      return;
    }
    const payload: SkillValues = {
      title: values.title.trim(),
      description: values.description.trim(),
      skill: values.skill.trim(),
    };
    setSubmitting(true);
    try {
      const response = await apiFetch<Partial<BusinessAgentSkill> | null>(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/skills`, {
        method: skill ? "PUT" : "POST",
        body: skill ? { id: String(skill.id), ...payload } : payload,
      });
      onSaved(
        skill
          ? { ...skill, ...payload, ...response }
          : { id: "", created_at: Date.now(), status: "", channel: "", ...payload, ...response },
      );
      toast.success(skill ? "Skill updated." : "Skill added.");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{skill ? "Edit skill" : "Add skill"}</DialogTitle>
        <DialogDescription>Describe how the agent can reply based on customer&apos;s message.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 !overflow-y-auto">
        <label className="grid gap-1.5 text-sm font-medium">
          Title
          <Input
            autoFocus
            placeholder="greeting-skill"
            value={values.title}
            aria-invalid={titleError ? true : undefined}
            onChange={(event) =>
              update("title", event.target.value.replace(/\s/g, "-").replace(/[^A-Za-z0-9_-]/g, "").toLowerCase())
            }
          />
          {titleError ? <span className="text-destructive text-xs font-normal">{titleError}</span> : null}
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Description
          <Textarea
            rows={2}
            placeholder="How the agent should greet customers"
            value={values.description}
            aria-invalid={descriptionError || undefined}
            onChange={(event) => update("description", event.target.value)}
          />
          {descriptionError ? <span className="text-destructive text-xs font-normal">Description is required.</span> : null}
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Skill
          <Textarea
            rows={5}
            placeholder="Always greet the customer by name and ask how you can help."
            value={values.skill}
            aria-invalid={skillError || undefined}
            onChange={(event) => update("skill", event.target.value)}
          />
          {skillError ? <span className="text-destructive text-xs font-normal">Skill is required.</span> : null}
        </label>
      </div>
      <DialogFooter>
        {onDelete ? (
          <Button type="button" variant="destructive" className="sm:mr-auto" onClick={onDelete} disabled={submitting}>
            Delete
          </Button>
        ) : null}
        <Button type="button" onClick={() => void submit()} disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {skill ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function SkillsList({ phoneNumberId, description }: { phoneNumberId: number; description: string }) {
  const [skills, setSkills] = useState<BusinessAgentSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<BusinessAgentSkill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessAgentSkill | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addingCommonSkills, setAddingCommonSkills] = useState(false);

  async function addCommonSkills() {
    if (addingCommonSkills) return;
    setAddingCommonSkills(true);
    try {
      await apiFetch(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/common-skills`, {
        method: "POST",
      });
      toast.success("Common skills added.");
      const response = await apiFetch<BusinessAgentSkill[] | null>(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/skills`);
      setSkills(response ?? []);
      setLoadError(null);
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setAddingCommonSkills(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget?.id || deleting) return;
    setDeleting(true);
    try {
      await apiFetch(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/skills/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      });
      setSkills((current) => current.filter((skill) => skill !== deleteTarget));
      setDeleteTarget(null);
      toast.success("Skill deleted.");
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
        const response = await apiFetch<BusinessAgentSkill[] | null>(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/skills`);
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
      [skill.title, skill.description, skill.skill, skill.channel].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    );
  }, [skills, search]);

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" className="shrink-0" disabled={addingCommonSkills}>
                Add skill
                {addingCommonSkills ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onSelect={() => {
                setEditingSkill(null);
                setAddOpen(true);
              }}>
                Add skill
              </DropdownMenuItem>
              <DropdownMenuItem disabled={addingCommonSkills} onSelect={() => void addCommonSkills()}>
                Add common skills
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                placeholder="Search skills"
                aria-label="Search skills"
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
              <p className="text-muted-foreground text-base">{search ? "No skills found." : "No skills yet."}</p>
              {search ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setSearch("")}>
                  Reset filter
                </Button>
              ) : null}
            </div>
          ) : (
            filteredSkills.map(({ skill, index }) => {
              const status = formatLabel(skill.status);
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
                    <p className="mb-1 truncate font-medium leading-5">{skill.title || skill.skill || "Untitled skill"}</p>
                    {skill.description ? (
                      <p className="text-muted-foreground line-clamp-2 text-sm">{skill.description}</p>
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
            <SkillDialogBody
              key={editingSkill?.id ?? "new"}
              phoneNumberId={phoneNumberId}
              skill={editingSkill}
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
            <DialogTitle>Delete skill?</DialogTitle>
            <DialogDescription>
              The agent will no longer use this skill. This action cannot be undone.
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
