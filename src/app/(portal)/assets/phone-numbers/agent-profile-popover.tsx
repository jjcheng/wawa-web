"use client";

import { useId, useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import { AgentProfileForm } from "../../ai-agent/profiles/profile-form";

type AgentProfileOption = { id: number; name: string };

export function AgentProfilePopover({
  phoneNumberId,
  agentProfileId,
  agentEnabled = false,
  phoneNumberName,
}: {
  phoneNumberId: number;
  agentProfileId?: number | null;
  agentEnabled?: boolean;
  phoneNumberName: string;
}) {
  const id = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [createProfileOpen, setCreateProfileOpen] = useState(false);
  const [profiles, setProfiles] = useState<AgentProfileOption[] | null>(null);
  const [selectedProfile, setSelectedProfile] = useState(
    agentProfileId ? String(agentProfileId) : "",
  );
  const [enabled, setEnabled] = useState(agentEnabled);
  const [savedEnabled, setSavedEnabled] = useState(agentEnabled);
  const [savedProfile, setSavedProfile] = useState(
    agentProfileId ? String(agentProfileId) : "",
  );
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProfiles() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<AgentProfileOption[] | null>("v1/ai-agent/profiles");
      if (response != null && !Array.isArray(response)) {
        throw new Error("Unexpected response while loading agent profiles.");
      }
      setProfiles(response ?? []);
    } catch (requestError) {
      setError(toApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (saving) return;
    setSaveErrors([]);
    const profileId = Number(selectedProfile);
    if (!Number.isSafeInteger(profileId) || profileId < 1) {
      setSaveErrors(["Select an agent profile."]);
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`v1/wa/phone-numbers/${phoneNumberId}/agent-profile`, {
        method: "PATCH",
        query: { agent_profile_id: String(profileId), enabled: String(enabled) },
      });
      setSavedEnabled(enabled);
      setSavedProfile(selectedProfile);
      toast.success("Agent profile saved.");
      setOpen(false);
      router.refresh();
    } catch (requestError) {
      const apiError = toApiError(requestError);
      setSaveErrors([
        apiError.message,
        ...apiError.inputErrors.map((item) =>
          item.field ? `${item.field}: ${item.message}` : item.message,
        ),
      ]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving) return;
        setOpen(nextOpen);
        if (nextOpen) {
          setEnabled(savedEnabled);
          setSelectedProfile(savedProfile);
          setSaveErrors([]);
          if (profiles === null) void loadProfiles();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={
            savedEnabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
          }
          aria-label={`Manage AI agent for ${phoneNumberName}`}
          title={`Manage AI agent (${savedEnabled ? "running" : "stopped"})`}
        >
          <Bot
            aria-hidden="true"
            className={`size-5 ${savedEnabled ? "animate-pulse" : ""}`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <p className="text-sm font-medium">AI agent for {phoneNumberName}</p>
        <div className="space-y-2">
          <Label htmlFor={`${id}-profile`}>Agent profile</Label>
          <Select
            value={selectedProfile}
            onValueChange={setSelectedProfile}
            disabled={saving || loading || !profiles?.length}
          >
            <SelectTrigger id={`${id}-profile`} className="w-full">
              <SelectValue
                placeholder={loading ? "Loading profiles..." : "Select an agent profile"}
              />
            </SelectTrigger>
            <SelectContent>
              {profiles?.map((profile) => (
                <SelectItem key={profile.id} value={String(profile.id)}>
                  {profile.name || "Unnamed agent profile"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {profiles?.length === 0 ? (
            <p className="text-muted-foreground text-sm">No agent profiles available.</p>
          ) : null}
          <Button
            type="button"
            variant="info"
            size="sm"
            onClick={() => setCreateProfileOpen(true)}
          >
            Create AI agent profile
          </Button>
          {loading ? (
            <Loader2 aria-label="Loading agent profiles" className="size-4 animate-spin" />
          ) : null}
          
          {error ? (
            <div className="space-y-2">
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => void loadProfiles()}
              >
                Retry
              </Button>
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${id}-enabled`}>Enabled</Label>
          <button
            id={`${id}-enabled`}
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={saving}
            onClick={() => setEnabled((current) => !current)}
            className={`focus-visible:ring-ring relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none ${enabled ? "bg-green-600" : "bg-muted-foreground/40"}`}
          >
            <span
              className={`size-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>
        {saveErrors.length > 0 ? (
          <div className="text-destructive space-y-1 text-sm" role="alert">
            {saveErrors.map((message, index) => (
              <p key={index} className="whitespace-pre-line">
                {message}
              </p>
            ))}
          </div>
        ) : null}
        <Button
          type="button"
          disabled={saving || loading || !selectedProfile}
          onClick={() => void save()}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Saving..." : "Save"}
        </Button>
      </PopoverContent>
      <Dialog open={createProfileOpen} onOpenChange={setCreateProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create agent profile</DialogTitle>
            <DialogDescription>
              Add a name and an optional description for your AI agent profile.
            </DialogDescription>
          </DialogHeader>
          <AgentProfileForm
            onSaved={(createdProfileId) => {
              setCreateProfileOpen(false);
              if (createdProfileId !== undefined) {
                setOpen(false);
                router.push(`/ai-agent/profiles/${createdProfileId}`);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </Popover>
  );
}
