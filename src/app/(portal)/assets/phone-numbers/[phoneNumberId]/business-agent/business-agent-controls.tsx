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
  Wrench,
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
      <SectionLink href={`${basePath}/faqs`} icon={MessageCircleQuestion} title="FAQs" description="Frequently asked questions this business agent can provide." />
      <SectionLink href={`${basePath}/files`} icon={FileText} title="Files" description="Documents this business agent can learn from." />
      <SectionLink href={`${basePath}/websites`} icon={Globe} title="Websites" description="Web pages this business agent can reference." />
      <SectionLink href={`${basePath}/skills`} icon={Sparkles} title="Skills" description="Tell this business agent how to handle your customers." />
      <SectionLink href={`${basePath}/tools`} icon={Wrench} title="Tools" description="Actions this business agent can use." />
      {/* Hidden for now: Agent UI skills (`${basePath}/ui-skills`). */}
      <SectionLink href={`${basePath}/settings`} icon={Settings} title="Other settings" description="Other configurations of this business agent." />
      <SectionLink href={`${basePath}/test`} icon={FlaskConical} title="Test " description="Chat with this business agent before going live." />
    </div>
  );
}
