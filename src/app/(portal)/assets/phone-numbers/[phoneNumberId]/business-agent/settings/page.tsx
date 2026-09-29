import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadBusinessAgentPhoneNumber } from "../load-phone-number";
import { GeneralSettings } from "./general-settings";
import { ScheduleSettings } from "./schedule-settings";

export const metadata: Metadata = { title: "General settings" };

export default async function BusinessAgentSettingsPage({
  params,
}: {
  params: Promise<{ phoneNumberId: string }>;
}) {
  const { phoneNumberId } = await params;
  const { phoneNumber, displayNumber } = await loadBusinessAgentPhoneNumber(phoneNumberId, {
    requireOnboarded: true,
  });

  return (
    <>
      <BackBar href={`/assets/phone-numbers/${phoneNumber.id}/business-agent`} />
      <PageHeader
        title="General settings"
        description={`General settings for the business agent of ${displayNumber}.`}
      />
      <Tabs defaultValue="conversation" className="w-full">
        <TabsList aria-label="Settings sections" className="w-fit">
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>
        <TabsContent value="conversation" className="mt-2">
          <GeneralSettings phoneNumberId={phoneNumber.id} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-2">
          <ScheduleSettings phoneNumberId={phoneNumber.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}
