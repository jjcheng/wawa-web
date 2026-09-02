"use client";

import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LIBRARY_TEMPLATES = [
  {
    name: "order_confirmation",
    category: "UTILITY",
    language: "English (US)",
    body: "Hi {{1}}, your order {{2}} is confirmed and will arrive by {{3}}.",
  },
  {
    name: "shipping_update",
    category: "UTILITY",
    language: "English (US)",
    body: "Good news, {{1}}! Your package {{2}} has shipped and is on its way.",
  },
  {
    name: "appointment_reminder",
    category: "UTILITY",
    language: "English (US)",
    body: "Reminder: your appointment is scheduled for {{1}} at {{2}}.",
  },
  {
    name: "otp_verification",
    category: "AUTHENTICATION",
    language: "English (US)",
    body: "{{1}} is your verification code. It expires in 5 minutes.",
  },
  {
    name: "payment_receipt",
    category: "UTILITY",
    language: "English (US)",
    body: "Thanks for your payment of {{1}}. Your receipt number is {{2}}.",
  },
  {
    name: "welcome_message",
    category: "MARKETING",
    language: "English (US)",
    body: "Welcome to {{1}}! We're glad to have you here.",
  },
  {
    name: "seasonal_promotion",
    category: "MARKETING",
    language: "English (US)",
    body: "Enjoy {{1}}% off this week only. Shop now before it ends!",
  },
  {
    name: "abandoned_cart",
    category: "MARKETING",
    language: "English (US)",
    body: "You left {{1}} in your cart. Complete your order before it's gone.",
  },
  {
    name: "feedback_request",
    category: "UTILITY",
    language: "English (US)",
    body: "Hi {{1}}, how was your recent experience with us? We'd love your feedback.",
  },
] as const;

export function TemplateSourceTabs({
  newTemplate,
  managerUrl,
}: {
  newTemplate: ReactNode;
  managerUrl: string | null;
}) {
  const managerLink = managerUrl ? (
    <a
      href={managerUrl}
      target="_blank"
      rel="noreferrer"
      className="text-foreground inline-flex items-center gap-1 font-semibold underline underline-offset-2"
    >
      WhatsApp Manager
      <ExternalLink className="size-3.5" />
    </a>
  ) : (
    "WhatsApp Manager"
  );

  return (
    <Tabs defaultValue="library">
      <TabsList className="mb-4">
        <TabsTrigger className="cursor-pointer" value="library">
          Template Library
        </TabsTrigger>
        <TabsTrigger className="cursor-pointer" value="new">
          New Template
        </TabsTrigger>
      </TabsList>

      <Card>
        <CardContent>
          <TabsContent value="library" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LIBRARY_TEMPLATES.map((template) => (
                <div key={template.name} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{template.name}</p>
                    <Badge variant="secondary">{template.category}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{template.language}</p>
                  <p className="text-sm">{template.body}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => toast.info("Using library templates isn't available yet.")}
                  >
                    Use template
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <p className="text-muted-foreground text-sm">
              For complete template creation features, use {managerLink}, this is recommended by
              Meta. Use this page only to create a simple templates with no variable.
            </p>
            {newTemplate}
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}
