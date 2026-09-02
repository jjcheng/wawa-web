"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
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
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

const AUDIENCES = ["All customers", "Retail leads", "Repeat customers", "New signups"] as const;
const SCHEDULES = ["Send now", "Schedule for later"] as const;

type EditCampaignInput = {
  name: string;
  audience: (typeof AUDIENCES)[number];
  schedule: (typeof SCHEDULES)[number];
  message: string;
};

export function EditCampaignForm({ campaignId }: { campaignId?: string }) {
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
      audience: AUDIENCES[0],
      schedule: SCHEDULES[0],
      message: "",
    },
  });
  const audience = useWatch({ control, name: "audience" });
  const schedule = useWatch({ control, name: "schedule" });

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
      className="max-w-xl space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Campaign name</Label>
        <Input id="name" placeholder="October promo" {...register("name", { required: true })} />
        {errors.name ? (
          <p className="text-destructive text-sm">Enter a campaign name.</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="audience">Audience</Label>
        <Select
          value={audience}
          onValueChange={(value) => setValue("audience", value as EditCampaignInput["audience"])}
        >
          <SelectTrigger id="audience" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIENCES.map((audience) => (
              <SelectItem key={audience} value={audience}>
                {audience}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="schedule">Schedule</Label>
        <Select
          value={schedule}
          onValueChange={(value) => setValue("schedule", value as EditCampaignInput["schedule"])}
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

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          rows={5}
          placeholder="Hi {{1}}, here's what's new this week..."
          {...register("message", { required: true })}
        />
        {errors.message ? (
          <p className="text-destructive text-sm">Enter the campaign message.</p>
        ) : null}
      </div>

      <Button type="submit" className={MEDIUM_BUTTON_HEIGHT} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {campaignId ? "Save campaign" : "Create campaign"}
      </Button>
    </form>
  );
}
