"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, SendHorizontal } from "lucide-react";

import { ChatMessageText } from "@/components/chat-message-text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

export type ProfileMessage = {
  id: number | string;
  added_at?: string;
  role: "USER" | "ASSISTANT";
  content: string;
  failed?: boolean;
};

function formatTime(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
    date,
  );
}

const CONTENT_KEYS = ["content", "message", "response", "reply", "text", "agent_response"];

function toMessages(response: unknown): ProfileMessage[] {
  if (typeof response === "string") {
    return response.trim()
      ? [{ id: `local-${crypto.randomUUID()}`, role: "ASSISTANT", content: response }]
      : [];
  }
  if (Array.isArray(response)) return response.flatMap(toMessages);
  if (typeof response !== "object" || response === null) return [];

  const record = response as Record<string, unknown>;
  for (const key of ["messages", "data"]) {
    if (record[key] && typeof record[key] === "object") return toMessages(record[key]);
  }
  const contentKey = CONTENT_KEYS.find((key) => typeof record[key] === "string");
  if (!contentKey) return [];
  return [
    {
      id: (record.id as number | string | undefined) ?? `local-${crypto.randomUUID()}`,
      added_at: record.added_at as string | undefined,
      role: record.role === "USER" ? "USER" : "ASSISTANT",
      content: record[contentKey] as string,
    },
  ];
}

export function ProfileTestChat({
  profileId,
  name,
  initialMessages,
}: {
  profileId: number;
  name: string;
  initialMessages: ProfileMessage[];
}) {
  const [messages, setMessages] = useState<ProfileMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, sending]);

  async function clearChat() {
    setClearing(true);
    try {
      await apiFetch(`v1/ai-agent/profiles/${profileId}/messages`, { method: "DELETE" });
      setMessages([]);
      setConfirmClear(false);
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setClearing(false);
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    const localId = `local-${crypto.randomUUID()}`;
    setMessages((current) => [
      ...current,
      { id: localId, role: "USER", content: text, added_at: new Date().toISOString() },
    ]);
    setDraft("");
    setSending(true);
    try {
      const response = await apiFetch<unknown>(`v1/ai-agent/profiles/${profileId}/messages`, {
        method: "POST",
        body: { content: text },
      });
      const returned = toMessages(response);
      const reply = returned.filter((message) => message.role !== "USER");
      const echoed = returned.find((message) => message.role === "USER");
      setMessages((current) => {
        const next = echoed
          ? current.map((message) => (message.id === localId ? { ...echoed } : message))
          : current;
        return [...next, ...reply];
      });
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === localId ? { ...message, failed: true } : message,
        ),
      );
      toast.error(toApiError(error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Test</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Chat with {name} before it replies to real customers.
        </p>
      </div>

      <div className="flex h-[calc(100dvh-14rem)] min-h-[28rem] flex-col overflow-hidden rounded-lg border">
        <div className="bg-card flex items-center gap-3 border-b px-4 py-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
            <Bot className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {sending ? "typing..." : "AI agent"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmClear(true)}
            disabled={messages.length === 0 || sending}
          >
            Clear
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#efeae2] px-3 py-4 sm:px-6 dark:bg-[#0b141a]">
          {messages.length === 0 && !sending ? (
            <div className="flex h-full items-center justify-center">
              <p className="rounded-lg bg-[#fff5c4] px-3 py-2 text-center text-xs text-[#54656f] shadow-sm dark:bg-[#182229] dark:text-[#8696a0]">
                Send a message to start testing your AI agent.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {messages.map((message) => {
                const mine = message.role === "USER";
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-2.5 pt-1.5 pb-1 text-sm shadow-sm sm:max-w-[70%] ${
                        mine
                          ? "rounded-tr-none bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]"
                          : "rounded-tl-none bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]"
                      }`}
                    >
                      <ChatMessageText text={message.content} />
                      <p
                        suppressHydrationWarning
                        className="mt-0.5 text-right text-[0.6875rem] text-[#667781] dark:text-[#8696a0]"
                      >
                        {formatTime(message.added_at)}
                      </p>
                    </div>
                    {message.failed ? (
                      <p className="text-destructive mt-0.5 text-xs">Failed to send</p>
                    ) : null}
                  </div>
                );
              })}
              {sending ? (
                <div className="flex items-start">
                  <div className="flex items-center gap-2 rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm text-[#667781] shadow-sm dark:bg-[#202c33] dark:text-[#8696a0]">
                    <Loader2 className="size-3.5 animate-spin" />
                    typing...
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="bg-card flex items-end gap-2 border-t px-3 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <Textarea
            rows={1}
            value={draft}
            placeholder="Type a message"
            aria-label="Message"
            className="max-h-32 min-h-10 resize-none"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send"
            className="shrink-0 rounded-full"
            disabled={!draft.trim() || sending}
          >
            <SendHorizontal className="size-4" />
          </Button>
        </form>
      </div>
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear chat?</DialogTitle>
            <DialogDescription>
              This removes all messages in this test conversation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={clearing}
              onClick={() => void clearChat()}
            >
              {clearing ? "Clearing..." : "Clear chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
