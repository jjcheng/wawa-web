"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { PasswordStrengthIndicator } from "@/components/password-strength-indicator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { apiFetch } from "@/lib/api/client";
import { ApiError, toApiError } from "@/lib/api/errors";
import { setInitialPasswordSchema, type SetInitialPasswordInput } from "@/lib/api/schemas";
import type { User } from "@/lib/api/types";
import { restoreMasterSession } from "@/lib/auth/actions";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

const FIELDS = [
  { name: "new_password", label: "New password", autoComplete: "new-password" },
  {
    name: "confirm_new_password",
    label: "Confirm new password",
    autoComplete: "new-password",
  },
] as const;

export function SetPasswordForm({ next }: { next: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<SetInitialPasswordInput>({
    resolver: zodResolver(setInitialPasswordSchema),
    defaultValues: { new_password: "", confirm_new_password: "" },
  });
  const newPassword = useWatch({ control, name: "new_password" });

  const mutation = useMutation({
    mutationFn: (values: SetInitialPasswordInput) =>
      apiFetch<User>("v1/account/users/me/initial-password", { method: "PATCH", body: values }),
    onSuccess: async () => {
      const restoredMaster = await restoreMasterSession();
      toast.success("New WhatsApp number connected.");
      router.push(restoredMaster ? "/numbers" : next);
      router.refresh();
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
      className="space-y-4"
    >
      {FIELDS.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          <PasswordInput
            id={field.name}
            autoComplete={field.autoComplete}
            className={MEDIUM_BUTTON_HEIGHT}
            {...register(field.name)}
          />
          {errors[field.name] ? (
            <p className="text-destructive text-sm">{errors[field.name]?.message}</p>
          ) : null}
        </div>
      ))}

      <PasswordStrengthIndicator password={newPassword} />

      <Button type="submit" className={`w-full ${MEDIUM_BUTTON_HEIGHT}`} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Set password
      </Button>
    </form>
  );
}
