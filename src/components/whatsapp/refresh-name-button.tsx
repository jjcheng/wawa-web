"use client";

import { useMutation } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { SMALL_BUTTON_HEIGHT } from "@/lib/utils";

export function RefreshNameButton({
  label,
  path,
  body,
  disabled,
}: {
  label: string;
  path: string;
  body: Record<string, string>;
  disabled?: boolean;
}) {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: () => apiFetch(path, { method: "PATCH", body }),
    onSuccess: () => {
      toast.success("Name refreshed from Meta.");
      router.refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <Button
      variant="outline"
      size="sm"
      className={SMALL_BUTTON_HEIGHT}
      title={label}
      disabled={disabled || mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      <RefreshCw className={mutation.isPending ? "size-3.5 animate-spin" : "size-3.5"} />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </Button>
  );
}
