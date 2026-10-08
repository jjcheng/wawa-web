"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { RelativeTime } from "@/components/relative-time";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AgentProfileForm, type AgentProfile } from "./profile-form";

export function AgentProfilesList({ initialProfiles }: { initialProfiles: AgentProfile[] }) {
  const router = useRouter();
  const profiles = initialProfiles;
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  function openCreateDialog() {
    setDialogOpen(true);
  }

  function handleSaved(createdProfileId?: number) {
    setDialogOpen(false);
    if (createdProfileId !== undefined) {
      router.push(`/ai-agent/profiles/${createdProfileId}`);
    }
  }

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter((profile) =>
      [profile.name, profile.description].some((value) => value.toLowerCase().includes(query)),
    );
  }, [profiles, search]);

  return (
    <>
      <PageHeader
        title="AI agent profiles"
        description="Let AI handle your customer enquiries while you are offline."
        action={
          <Button type="button" size="sm" className="rounded-full" onClick={openCreateDialog}>
            Add profile
          </Button>
        }
      />
      <div className="bg-card divide-border divide-y overflow-hidden rounded-lg border">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2 my-auto size-4"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search agent profiles"
              aria-label="Search agent profiles"
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
        {filteredProfiles.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-muted-foreground text-base">No agent profiles found.</p>
            {search ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setSearch("")}>
                Reset search
              </Button>
            ) : null}
          </div>
        ) : (
          filteredProfiles.map((profile) => {
            const displayName = profile.name || "Unnamed agent profile";
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => router.push(`/ai-agent/profiles/${profile.id}`)}
                className="hover:bg-accent/60 flex w-full min-w-0 flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors sm:flex-nowrap"
              >
                <span className="bg-accent flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mb-1 block truncate leading-5 font-medium">
                    {displayName}
                  </span>
                  <span className="text-muted-foreground line-clamp-2 block text-sm">
                    {profile.description}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-sm sm:hidden">
                    <RelativeTime value={profile.added_at} />
                  </span>
                </span>
                <span className="text-muted-foreground ml-auto hidden shrink-0 text-sm sm:block">
                  <RelativeTime value={profile.added_at} />
                </span>
              </button>
            );
          })
        )}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create agent profile</DialogTitle>
            <DialogDescription>
              Add a name and description for your AI agent profile.
            </DialogDescription>
          </DialogHeader>
          <AgentProfileForm onSaved={handleSaved} />
        </DialogContent>
      </Dialog>
    </>
  );
}
