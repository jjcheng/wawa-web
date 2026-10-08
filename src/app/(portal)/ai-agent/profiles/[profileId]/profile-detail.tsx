"use client";

import { useState } from "react";

import { BackBar } from "@/components/back-bar";
import { BusinessAgentSections } from "@/components/business-agent-sections";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AgentProfileForm, type AgentProfile } from "../profile-form";

export function AgentProfileDetail({ profile }: { profile: AgentProfile }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <BackBar href="/ai-agent" />
      <PageHeader
        title={profile.name || "Agent profile"}
        description={profile.description}
        action={
          <Button
            type="button"
            size="sm"
            className="sm:ml-auto"
            onClick={() => setEditOpen(true)}
          >
            Edit
          </Button>
        }
      />
      <BusinessAgentSections
        basePath={`/ai-agent/profiles/${profile.id}`}
        budgetsHref={`/ai-agent/profiles/${profile.id}/budgets`}
        businessInfoHref={`/ai-agents/${profile.id}/business-info`}
        showKeywords={false}
      />
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit agent profile</DialogTitle>
            <DialogDescription>Update your AI agent profile.</DialogDescription>
          </DialogHeader>
          <AgentProfileForm
            key={profile.id}
            profile={profile}
            onSaved={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
