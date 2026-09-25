"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { FormSubmitError } from "@/components/form-submit-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { ApiError, toApiError } from "@/lib/api/errors";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/api/schemas";
import type { User } from "@/lib/api/types";

const emptySubscribe = () => () => {};

function getLocalTimezoneDisplay(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return "";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZoneName: "shortOffset",
      timeZone: tz,
    }).formatToParts(new Date());
    const offset = parts.find((p) => p.type === "timeZoneName")?.value;
    return offset ? `${tz} (${offset})` : tz;
  } catch {
    return "";
  }
}

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const timezone = useSyncExternalStore(
    emptySubscribe,
    getLocalTimezoneDisplay,
    () => "",
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name ?? "",
      description: user.description ?? "",
      email: user.email ?? "",
    },
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: UpdateProfileInput) =>
      apiFetch<User>("v1/account/users/me/profile", {
        method: "PATCH",
        body: {
          name: values.name.trim(),
          description: values.description,
          email: values.email || null,
        },
      }),
    onSuccess: () => {
      setSubmitError(null);
      toast.success("Profile updated.");
      router.refresh();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError instanceof ApiError && apiError.inputErrors.length > 0) {
        for (const inputError of apiError.inputErrors) {
          if (
            inputError.field === "name" ||
            inputError.field === "description" ||
            inputError.field === "email"
          ) {
            setError(inputError.field, { message: inputError.message });
          }
        }
        return;
      }
      setSubmitError(apiError.message);
      toast.error(apiError.message);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="max-w-md space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Enter your name"
          {...register("name")}
        />
        {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-destructive text-sm">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" {...register("description")} />
        {errors.description ? (
          <p className="text-destructive text-sm">{errors.description.message}</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            A short note about your role, shown to your teammates.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Input
          id="timezone"
          type="text"
          value={timezone || "Loading timezone..."}
          readOnly
          className="bg-muted/50 text-muted-foreground cursor-default"
        />
        <p className="text-muted-foreground text-xs">
          Automatically detected from your browser.
        </p>
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Save
      </Button>
      <FormSubmitError message={submitError} />
    </form>
  );
}
