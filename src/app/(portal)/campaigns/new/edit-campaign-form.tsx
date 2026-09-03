"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Customer, Template } from "@/lib/api/types";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

const SCHEDULES = ["Send now", "Schedule for later"] as const;

type EditCampaignInput = {
  name: string;
  customer_ids: number[];
  template_id: string;
  schedule: (typeof SCHEDULES)[number];
};

function templateVariables(template?: Template) {
  if (!template) return [];
  const variables = new Set<string>();
  for (const component of template.components ?? []) {
    if (typeof component.text !== "string") continue;
    for (const match of component.text.matchAll(/{{\s*([^}]+?)\s*}}/g)) {
      variables.add(match[1]);
    }
  }
  return [...variables];
}

export function EditCampaignForm({
  campaignId,
  customers,
  templates,
}: {
  campaignId?: string;
  customers: Customer[];
  templates: Template[];
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<EditCampaignInput>({
    defaultValues: {
      name: "",
      customer_ids: customers.map((customer) => customer.id),
      template_id: "",
      schedule: SCHEDULES[0],
    },
  });
  const schedule = useWatch({ control, name: "schedule" });
  const selectedCustomerIds = useWatch({ control, name: "customer_ids" });
  const selectedTemplateId = useWatch({ control, name: "template_id" });
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
  const variables = templateVariables(selectedTemplate);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const templatesByCategory = templates.reduce<Record<string, Template[]>>(
    (groups, template) => {
      const category = template.category || "Other";
      (groups[category] ??= []).push(template);
      return groups;
    },
    {},
  );

  const mutation = useMutation({
    mutationFn: async (values: EditCampaignInput) => {
      throw new Error(`Campaigns aren't backed by the API yet (${values.name}).`);
    },
    onSuccess: () => {
      toast.success(campaignId ? "Campaign updated." : "Campaign created.");
      router.push("/campaigns");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:space-y-0 lg:gap-x-6"
    >
      <div className="max-w-xl space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Campaign name</Label>
          <Input
            id="name"
            placeholder="October promo"
            {...register("name", { required: true })}
          />
          {errors.name ? (
            <p className="text-destructive text-sm">Enter a campaign name.</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Customers</Label>
          <Popover>
            <PopoverTrigger asChild>
              <div className="border-input hover:bg-muted/30 flex min-h-8 w-full cursor-pointer flex-wrap items-center gap-1 rounded-lg border px-2 py-1">
                {customers
                  .filter((customer) => selectedCustomerIds.includes(customer.id))
                  .map((customer) => (
                    <span
                      key={customer.id}
                      className="bg-muted inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
                    >
                      {customer.display_name}
                      <button
                        type="button"
                        aria-label={`Remove ${customer.display_name}`}
                        className="hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          setValue(
                            "customer_ids",
                            selectedCustomerIds.filter((id) => id !== customer.id),
                          );
                        }}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                {selectedCustomerIds.length === 0 ? (
                  <span className="text-muted-foreground text-sm">Select customers</span>
                ) : null}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width)">
              {customers.map((customer) => (
                <label
                  key={customer.id}
                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm"
                >
                  <Checkbox
                    checked={selectedCustomerIds.includes(customer.id)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...selectedCustomerIds, customer.id]
                        : selectedCustomerIds.filter((id) => id !== customer.id);
                      setValue("customer_ids", next);
                    }}
                  />
                  {customer.display_name}
                </label>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="template">Template</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={(value) => {
              setValue("template_id", value);
              setVariableValues({});
            }}
          >
            <SelectTrigger id="template" className="w-full">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                <SelectGroup key={category}>
                  <SelectLabel>{category}</SelectLabel>
                  {categoryTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name || template.id}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          {variables.length > 0 ? (
            <div className="space-y-3 pt-2">
              {variables.map((variable) => (
                <div key={variable} className="space-y-2">
                  <Label htmlFor={`template-variable-${variable}`}>
                    {variable.startsWith("$") ? variable : `Variable ${variable}`}
                  </Label>
                  <Input
                    id={`template-variable-${variable}`}
                    value={variableValues[variable] ?? ""}
                    onChange={(event) =>
                      setVariableValues((currentValues) => ({
                        ...currentValues,
                        [variable]: event.target.value,
                      }))
                    }
                    placeholder={`Enter ${variable}`}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule">Schedule</Label>
          <Select
            value={schedule}
            onValueChange={(value) =>
              setValue("schedule", value as EditCampaignInput["schedule"])
            }
          >
            <SelectTrigger id="schedule" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULES.map((schedule) => (
                <SelectItem key={schedule} value={schedule}>
                  {schedule}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className={MEDIUM_BUTTON_HEIGHT} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {campaignId ? "Save campaign" : "Create campaign"}
        </Button>
      </div>
      {selectedTemplate?.raw_html ? (
        <div className="min-w-0 self-start lg:col-start-2 lg:row-start-1">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Preview
          </p>
          <div
            className="overflow-hidden [&_*]:max-w-full [&>div:first-child]:!w-auto [&>div:first-child]:!max-w-none [&>div:first-child]:!bg-transparent [&>div:first-child]:!p-0"
            dangerouslySetInnerHTML={{ __html: selectedTemplate.raw_html }}
          />
        </div>
      ) : null}
    </form>
  );
}
