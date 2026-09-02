import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { mockInboxMessages } from "@/lib/mock/crm";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <>
      <PageHeader
        title="Inbox"
        description="Messages from CoreConcept about your account and platform updates."
        action={<Badge variant="secondary">Preview — not yet backed by the API</Badge>}
      />

      <Card>
        <CardContent className="divide-y p-0">
          {mockInboxMessages.map((message) => (
            <div key={message.subject} className="flex items-start gap-3 p-4">
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  message.unread ? "bg-primary" : "bg-transparent",
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={cn("text-sm", message.unread ? "font-semibold" : "font-medium")}>
                    {message.subject}
                  </p>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {message.date}
                  </span>
                </div>
                <p className="text-muted-foreground truncate text-sm">{message.preview}</p>
                <p className="text-muted-foreground text-xs">From CoreConcept</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
