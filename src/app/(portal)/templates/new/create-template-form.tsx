"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { ApiError, toApiError } from "@/lib/api/errors";
import {
  createTemplateSchema,
  TEMPLATE_CATEGORIES,
  TEMPLATE_LANGUAGES,
  toTemplateComponents,
  type CreateTemplateInput,
} from "@/lib/api/schemas";
import type { Template } from "@/lib/api/types";
import { useSelectedSampleTemplate } from "./template-source-context";
import type { WabaOption } from "@/lib/waba-options";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

const FORM_FIELDS: (keyof CreateTemplateInput)[] = [
  "waba_id",
  "name",
  "language",
  "category",
];

export function CreateTemplateForm({ waba }: { waba: WabaOption }) {
  const router = useRouter();
  const selectedSample = useSelectedSampleTemplate();
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateTemplateInput>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      waba_id: waba.wabaId,
      name: "",
      language: "en_US",
      category: "UTILITY",
      header_text: "",
      body_text: "",
      footer_text: "",
    },
  });

  useEffect(() => {
    if (!selectedSample) return;

    const componentText = (type: string) => {
      const text = selectedSample.components?.find(
        (component) => String(component.type ?? "").toUpperCase() === type,
      )?.text;
      return typeof text === "string" ? text : "";
    };
    const category =
      TEMPLATE_CATEGORIES.find((option) => option === selectedSample.category) ?? "UTILITY";

    reset({
      waba_id: waba.wabaId,
      name: selectedSample.name ?? "",
      language: selectedSample.language ?? "en_US",
      category,
      header_text: componentText("HEADER"),
      body_text: componentText("BODY"),
      footer_text: componentText("FOOTER"),
    });
  }, [reset, selectedSample, waba.wabaId]);

  const mutation = useMutation({
    mutationFn: (values: CreateTemplateInput) =>
      apiFetch<Template>("v1/wa/templates", {
        method: "POST",
        body: {
          waba_id: values.waba_id,
          name: values.name,
          language: values.language,
          category: values.category,
          components: toTemplateComponents(values),
        },
      }),
    onSuccess: () => {
      toast.success("Template submitted to Meta for review.");
      router.push("/templates");
      router.refresh();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError instanceof ApiError && apiError.inputErrors.length > 0) {
        for (const inputError of apiError.inputErrors) {
          const field = FORM_FIELDS.find((name) => name === inputError.field);
          if (field) setError(field, { message: inputError.message });
        }
        return;
      }
      toast.error(apiError.message);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="max-w-xl space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="order_confirmation"
            {...register("name", {
              onChange: (event) => {
                event.target.value = event.target.value.replaceAll(" ", "_");
              },
            })}
          />
          {errors.name ? (
            <p className="text-destructive text-sm">{errors.name.message}</p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Lowercase letters, numbers and underscores.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="language" className="w-full">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_LANGUAGES.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      {language.label} ({language.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.language ? (
            <p className="text-destructive text-sm">{errors.language.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.category ? (
          <p className="text-destructive text-sm">{errors.category.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="header_text">Header (optional)</Label>
        <Input id="header_text" {...register("header_text")} />
        {errors.header_text ? (
          <p className="text-destructive text-sm">{errors.header_text.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="body_text">Body</Label>
        <Textarea
          id="body_text"
          rows={5}
          placeholder="Hi, your order is on its way."
          {...register("body_text")}
        />
        {errors.body_text ? (
          <p className="text-destructive text-sm">{errors.body_text.message}</p>
        ) : (
          <p className="text-muted-foreground text-sm">{""}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="footer_text">Footer (optional)</Label>
        <Input id="footer_text" {...register("footer_text")} />
        {errors.footer_text ? (
          <p className="text-destructive text-sm">{errors.footer_text.message}</p>
        ) : null}
      </div>

      <Button type="submit" className={MEDIUM_BUTTON_HEIGHT} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Create template
      </Button>
    </form>
  );
}
