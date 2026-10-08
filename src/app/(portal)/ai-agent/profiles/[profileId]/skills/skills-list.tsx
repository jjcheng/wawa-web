"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { RelativeTime } from "@/components/relative-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkillDialog } from "./skill-dialog";

export type AgentSkill = {
  id: number;
  title: string;
  description: string;
  added_at: string;
  enabled: boolean;
};

export function SkillsList({
  skills,
  profileId,
}: {
  skills: AgentSkill[];
  profileId: number;
}) {
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<AgentSkill | null>(null);
  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return skills;
    return skills.filter((skill) =>
      [skill.title, skill.description].some((value) => value.toLowerCase().includes(query)),
    );
  }, [skills, search]);

  return (
    <>
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
            <p className="text-muted-foreground text-base">No skills found.</p>
            {search ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setSearch("")}>
                Reset search
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {filteredSkills.map((skill, index) => (
              <li key={skill.id}>
                <button
                  type="button"
                  onClick={() => setSelectedSkill(skill)}
                  className="hover:bg-accent/60 flex w-full min-w-0 flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors sm:flex-nowrap"
                >
                  <span className="bg-accent flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 truncate leading-5 font-medium">{skill.title}</p>
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {skill.description}
                    </p>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm sm:hidden">
                      <RelativeTime value={skill.added_at} />
                      <span
                        className={
                          skill.enabled
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        }
                      >
                        {skill.enabled ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                  <div className="text-muted-foreground ml-auto hidden shrink-0 text-right text-sm sm:block">
                    <RelativeTime value={skill.added_at} />
                    <p
                      className={
                        skill.enabled
                          ? "mt-1 text-green-600 dark:text-green-400"
                          : "text-muted-foreground mt-1"
                      }
                    >
                      {skill.enabled ? "Active" : "Inactive"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selectedSkill ? (
        <SkillDialog
          key={selectedSkill.id}
          profileId={profileId}
          skill={selectedSkill}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedSkill(null);
          }}
        />
      ) : null}
    </>
  );
}
