"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageCircle, Plus, Sparkles, X } from "lucide-react";

import { AiChatRoom } from "@/components/ai-worker/ai-chat-room";
import { AiConversationDeleteButton } from "@/components/ai-worker/ai-conversation-delete-button";
import { AI_WORKER_PANEL_MAX_WIDTH, AI_WORKER_PANEL_MIN_WIDTH, useAiWorkerPanel } from "@/components/ai-worker/ai-worker-panel-context";
import { RelativeTime } from "@/components/relative-time";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { AiConversation } from "@/lib/api/types";

export function AiWorkerPanel() {
  const { open, isDesktop, panelWidth, setPanelWidth, setOpen } = useAiWorkerPanel();
  const dragRef = useRef<{ pointerId: number; startX: number; width: number } | null>(null);

  function resize(width: number) {
    setPanelWidth(Math.max(AI_WORKER_PANEL_MIN_WIDTH, Math.min(AI_WORKER_PANEL_MAX_WIDTH, window.innerWidth - 150, width)));
  }

  if (isDesktop) {
    if (!open) return null;
    return (
      <aside
        aria-label="AI Worker"
        id="ai-worker-panel"
        style={{ width: panelWidth, minWidth: AI_WORKER_PANEL_MIN_WIDTH, maxWidth: AI_WORKER_PANEL_MAX_WIDTH }}
        className="bg-background sticky top-0 flex h-svh shrink-0 flex-col self-start border-l"
      >
        <div
          role="separator"
          tabIndex={0}
          aria-label="Resize AI Worker panel"
          aria-orientation="vertical"
          aria-controls="ai-worker-panel"
          aria-valuemin={AI_WORKER_PANEL_MIN_WIDTH}
          aria-valuemax={AI_WORKER_PANEL_MAX_WIDTH}
          aria-valuenow={panelWidth}
          title="Resize AI Worker panel"
          className="hover:bg-primary/20 focus-visible:bg-primary/20 focus-visible:ring-ring absolute inset-y-0 -left-1 z-30 w-2 touch-none cursor-col-resize select-none focus-visible:ring-2 focus-visible:outline-none"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              width: panelWidth,
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            resize(drag.width + drag.startX - event.clientX);
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.pointerId !== event.pointerId) return;
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { dragRef.current = null; }}
          onLostPointerCapture={() => { dragRef.current = null; }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              resize(panelWidth + (event.key === "ArrowLeft" ? 16 : -16));
            } else if (event.key === "Home") {
              event.preventDefault();
              resize(AI_WORKER_PANEL_MIN_WIDTH);
            }
          }}
        />
        <AiWorkerPanelBody onClose={() => setOpen(false)} />
      </aside>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" showCloseButton={false} className="w-full gap-0 p-0 sm:max-w-md">
        <SheetTitle className="sr-only">AI Worker</SheetTitle>
        <SheetDescription className="sr-only">Chat with the AI Worker.</SheetDescription>
        <AiWorkerPanelBody onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

async function fetchConversations() {
  const response = await apiFetch<AiConversation[] | null>("v1/ai/conversations");
  return [...(response ?? [])].sort(
    (first, second) => new Date(second.last_updated_at).getTime() - new Date(first.last_updated_at).getTime(),
  );
}

function AiWorkerPanelBody({ onClose }: { onClose: () => void }) {
  // chat is null on the conversation list; initialId 0 starts a new conversation.
  const [chat, setChat] = useState<{ key: number; initialId: number } | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<AiConversation[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchConversations()
      .then((sorted) => {
        if (!active) return;
        setConversations(sorted);
        if (sorted[0]) {
          setChat({ key: 1, initialId: sorted[0].id });
          setActiveId(sorted[0].id);
        }
      })
      .catch((error) => {
        if (active) setLoadError(toApiError(error).message);
      });
    return () => {
      active = false;
    };
  }, []);

  function openConversation(id: number) {
    setChat((current) => ({ key: (current?.key ?? 0) + 1, initialId: id }));
    setActiveId(id);
  }

  function showList() {
    setChat(null);
    setActiveId(null);
    setConversations(null);
    setLoadError(null);
    fetchConversations()
      .then(setConversations)
      .catch((error) => setLoadError(toApiError(error).message));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-1 border-b px-2 py-2">
        {chat ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Back to conversations"
            onClick={showList}
          >
            <ArrowLeft />
          </Button>
        ) : (
          <Sparkles aria-hidden="true" className="text-primary mx-1.5 size-5" />
        )}
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">AI Worker</h2>
        {activeId !== null && activeId > 0 ? (
          <AiConversationDeleteButton conversationId={activeId} onDeleted={showList} />
        ) : null}
        <Button type="button" variant="ghost" size="icon-sm" aria-label="New chat" title="New chat" onClick={() => openConversation(0)}>
          <Plus />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Close AI Worker" onClick={onClose}>
          <X />
        </Button>
      </div>

      {chat ? (
        <AiChatRoom key={chat.key} conversationId={chat.initialId} onConversationCreated={setActiveId} />
      ) : (
        <AiConversationList conversations={conversations} loadError={loadError} onSelect={openConversation} />
      )}
    </div>
  );
}

function AiConversationList({
  conversations,
  loadError,
  onSelect,
}: {
  conversations: AiConversation[] | null;
  loadError: string | null;
  onSelect: (id: number) => void;
}) {
  if (loadError) return <p className="text-destructive p-4 text-sm">{loadError}</p>;

  if (conversations === null) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-6 text-sm" role="status">
        <Loader2 className="size-4 animate-spin" />
        Loading conversations...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto p-6 text-center">
        <Sparkles aria-hidden="true" className="text-primary size-10" strokeWidth={1.75} />
        <h3 className="text-base font-medium">About AI worker</h3>
        <p className="text-muted-foreground text-left text-sm leading-6">
          The AI worker (beta) is designed to help you easily configure WAWAGO using natural language instructions when you are unsure how to use the system. You can ask questions such as &quot;how to add a customer?&quot;, &quot;how to send a message?&quot;, &quot;what&apos;s the status of my broadcast?&quot; or &quot;create a birthday greeting template message&quot;. The chatbot will give me the step by step instruction, sometimes also able to generate a form to submit to execute a task.
        </p>
        <p className="text-muted-foreground text-left text-sm leading-6">
            This AI is not powered by LLM, the functionalities are limited.
        </p>
        <Button type="button" size="sm" onClick={() => onSelect(0)}>
          New chat
        </Button>
      </div>
    );
  }

  return (
    <div className="divide-border min-h-0 flex-1 divide-y overflow-y-auto">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          type="button"
          onClick={() => onSelect(conversation.id)}
          className="hover:bg-accent/40 focus-visible:ring-ring flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2"
        >
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <MessageCircle aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-foreground block truncate text-sm font-medium">
              {conversation.title || `Conversation ${conversation.id}`}
            </span>
            <span className="text-muted-foreground block text-xs">
              <RelativeTime value={conversation.last_updated_at} />
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
