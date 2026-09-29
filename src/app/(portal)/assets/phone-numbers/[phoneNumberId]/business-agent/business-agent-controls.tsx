"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  ChevronRight,
  FileText,
  FlaskConical,
  Globe,
  MessageCircleQuestion,
  Settings,
  Sparkles,
  Store,
} from "lucide-react";

type SectionIcon = ComponentType<{ className?: string }>;

function SectionHeading({ icon: Icon, title, description }: { icon: SectionIcon; title: string; description: string }) {
  return (
    <>
      <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block text-sm">{description}</span>
      </span>
    </>
  );
}

function SectionLink({ href, ...heading }: { href: string; icon: SectionIcon; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card hover:bg-accent/40 flex items-center gap-3 px-4 py-3">
      <SectionHeading {...heading} />
      <ChevronRight aria-hidden="true" className="text-muted-foreground ml-auto size-4 shrink-0" />
    </Link>
  );
}

export function BusinessAgentSections({ phoneNumberId }: { phoneNumberId: number }) {
  const basePath = `/assets/phone-numbers/${phoneNumberId}/business-agent`;

  return (
    <div className="divide-border mt-5 divide-y overflow-hidden rounded-xl border">
      <SectionLink href={`${basePath}/business-profile`} icon={Store} title="Business profile" description="Policies, contact details, and what your business does." />
      <SectionLink href={`${basePath}/faqs`} icon={MessageCircleQuestion} title="FAQs" description="Frequently asked questions agent can provide to customers." />
      <SectionLink href={`${basePath}/files`} icon={FileText} title="Files" description="Documents the agent can learn from." />
      <SectionLink href={`${basePath}/websites`} icon={Globe} title="Websites" description="Web pages the agent can reference." />
      <SectionLink href={`${basePath}/skills`} icon={Sparkles} title="Agent skills" description="Tell agent how to handle your customers." />
      {/* Hidden for now: Agent UI skills (`${basePath}/ui-skills`). */}
      <SectionLink href={`${basePath}/settings`} icon={Settings} title="General settings" description="General configuration for this business agent." />
      <SectionLink href={`${basePath}/test`} icon={FlaskConical} title="Test business agent" description="Chat with your agent before it replies to real customers." />
    </div>
  );
}
