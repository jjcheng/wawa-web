import { FileText, Gauge, Megaphone, Phone, UsersRound } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Assets" };

const ASSET_LINKS = [
  {
    href: "/assets/phone-numbers",
    label: "Phone numbers",
    description: "Connected WhatsApp Business numbers.",
    icon: Phone,
  },
  {
    href: "/assets/users",
    label: "Users",
    description: "Team members with portal access.",
    icon: UsersRound,
    masterOnly: true,
  },
  {
    href: "/assets/templates",
    label: "Templates",
    description: "WhatsApp message templates.",
    icon: FileText,
  },
  {
    href: "/assets/broadcasts",
    label: "Broadcasts",
    description: "Upcoming and past broadcasts to your customers.",
    icon: Megaphone,
  },
  {
    href: "/assets/usage",
    label: "Usage",
    description: "Usage and delivery insights.",
    icon: Gauge,
    masterOnly: true,
  },
];

export default async function AssetsPage() {
  const user = await requireUser();
  const links = ASSET_LINKS.filter((link) => !link.masterOnly || user.type === "MASTER");

  return (
    <>
      <PageHeader title="Assets" description="Manage the resources connected to your account." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="min-w-0">
            <Card
              className={cn(
                "h-full transition-colors hover:bg-accent/60",
                "rounded-full",
              )}
            >
              <CardContent className="flex min-w-0 items-center gap-3 px-4">
                <span className="bg-accent flex size-10 shrink-0 items-center justify-center rounded-full">
                  <link.icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{link.label}</p>
                  <p className="text-muted-foreground text-sm">{link.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
