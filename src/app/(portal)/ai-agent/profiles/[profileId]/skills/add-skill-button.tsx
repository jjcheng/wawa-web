"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

export function AddSkillButton({ profileId }: { profileId: number }) {
  const [addingCommon, setAddingCommon] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const router = useRouter();

  async function addCommonSkills() {
    if (addingCommon) return;
    setErrors([]);
    setAddingCommon(true);
    try {
      await apiFetch(`v1/ai-agent/profiles/${profileId}/common-skills`, {
        method: "POST",
      });
      toast.success("Common skills added.");
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
      setAddingCommon(false);
    }
  }

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" className="rounded-full" disabled={addingCommon}>
            {addingCommon ? <Loader2 className="size-4 animate-spin" /> : null}
            {addingCommon ? "Adding..." : "Add skill"}
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setErrors([]);
              router.push(`/ai-agent/profiles/${profileId}/skills/new`);
            }}
          >
            Create skill
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void addCommonSkills()}>
            Add common skills
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {errors.length > 0 ? (
        <div className="text-destructive space-y-1 text-sm" role="alert">
          {errors.map((error, index) => (
            <p key={index} className="whitespace-pre-line">
              {error}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
