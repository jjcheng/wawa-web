"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "@/lib/toast";

import { PasswordStrengthIndicator } from "@/components/password-strength-indicator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { apiFetch } from "@/lib/api/client";
import { ApiError, toApiError } from "@/lib/api/errors";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/api/schemas";
import type { User } from "@/lib/api/types";

const FIELDS = [
  { name: "old_password", label: "Current password", autoComplete: "current-password" },
  { name: "new_password", label: "New password", autoComplete: "new-password" },
  {
    name: "confirm_new_password",
    label: "Confirm new password",
    autoComplete: "new-password",
  },
] as const;

export function PasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { old_password: "", new_password: "", confirm_new_password: "" },
  });
  const newPassword = useWatch({ control, name: "new_password" });

  const mutation = useMutation({
    mutationFn: (values: ChangePasswordInput) =>
      apiFetch<User>("v1/account/users/me/password", { method: "PATCH", body: values }),
    onSuccess: () => {
      toast.success("Password changed.");
      reset();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError instanceof ApiError && apiError.inputErrors.length > 0) {
        for (const inputError of apiError.inputErrors) {
          const field = FIELDS.find((item) => item.name === inputError.field);
          if (field) setError(field.name, { message: inputError.message });
        }
        return;
      }
      toast.error(apiError.message);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="max-w-md space-y-4"
    >
      {FIELDS.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          <PasswordInput id={field.name} autoComplete={field.autoComplete} {...register(field.name)} />
          {errors[field.name] ? (
            <p className="text-destructive text-sm">{errors[field.name]?.message}</p>
          ) : null}
        </div>
      ))}

      <PasswordStrengthIndicator password={newPassword} />

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Change password
      </Button>
    </form>
  );
}
