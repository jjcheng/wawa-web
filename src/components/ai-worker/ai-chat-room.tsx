"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, Send, Sparkles } from "lucide-react";

import { AiMessagePartsView, type AiMessagePart } from "@/components/ai-worker/ai-message-part";
import { useAiWorkerPanel } from "@/components/ai-worker/ai-worker-panel-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

type AiConversationMessage = {
  role: string;
  parts?: AiMessagePart[] | null;
  feature?: string;
  url?: string;
  conversation_id?: number;
  added_at?: string;
  last_updated_at?: string;
};

type AiWorkResult = {
  feature?: string;
  url?: string;
  parts?: AiMessagePart[] | null;
};

type ChatMessage = {
  role: "USER" | "ASSISTANT";
  parts: AiMessagePart[];
  feature?: string;
  url?: string;
};

function toChatMessage(message: AiConversationMessage): ChatMessage {
  return {
    role: message.role.toUpperCase() === "USER" ? "USER" : "ASSISTANT",
    parts: message.parts ?? [],
    feature: message.feature,
    url: message.url,
  };
}

function MessageLink({ url }: { url: string }) {
  const { isDesktop, setOpen } = useAiWorkerPanel();
  const href = url.trim();
  const className = "text-primary inline-flex items-center gap-1 font-medium underline underline-offset-2";

  if (/^https:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" title={href} className={className}>
        Open link
        <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
      </a>
    );
  }
  // Only site-relative paths are linked; anything else (e.g. javascript:) is ignored.
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  return (
    <Link href={href} title={href} className={className} onClick={() => !isDesktop && setOpen(false)}>
      <ArrowLeft aria-hidden="true" className="size-3.5 shrink-0" />
      Open link
    </Link>
  );
}

export function AiChatRoom({
  conversationId: initialConversationId,
  onConversationCreated,
}: {
  conversationId: number;
  onConversationCreated?: (conversationId: number) => void;
}) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loadedHistoryConversationId, setLoadedHistoryConversationId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingHistory = initialConversationId > 0 && loadedHistoryConversationId !== initialConversationId;

  useEffect(() => {
    if (initialConversationId <= 0) return;

    let active = true;
    void apiFetch<AiConversationMessage[]>(
      `v1/ai/conversations/${initialConversationId}/messages`,
    )
      .then((history) => {
        if (!active) return;
        setMessages((history ?? []).map(toChatMessage));
      })
      .catch((error) => {
        if (active) toast.error(toApiError(error).message);
      })
      .finally(() => {
        if (active) setLoadedHistoryConversationId(initialConversationId);
      });

    return () => {
      active = false;
    };
  }, [initialConversationId]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, loadedHistoryConversationId]);

  async function sendMessage(content: string) {
    if (!content || sending) return;

    setSending(true);
    setMessages((current) => [
      ...current,
      { role: "USER", parts: [{ type: "TEXT", content }] },
    ]);
    setMessage("");
    try {
      const result = await apiFetch<AiConversationMessage>("v1/ai/conversations/chat", {
        method: "POST",
        body: { conversation_id: conversationId, message: content },
      });
      const nextConversationId = result.conversation_id;
      if (!nextConversationId || !Number.isInteger(nextConversationId) || nextConversationId <= 0) {
        throw new Error("The AI response did not include a valid conversation ID.");
      }

      setMessages((current) => [...current, toChatMessage(result)]);
      if (nextConversationId !== conversationId) {
        setConversationId(nextConversationId);
        onConversationCreated?.(nextConversationId);
      }
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSending(false);
    }
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(message.trim());
  }

  async function executeForm(feature: string, form: Record<string, unknown>) {
    if (sending) return;
    if (!feature) {
      toast.error("This form is missing its feature and cannot be submitted.");
      return;
    }

    setSending(true);
    try {
      const result = await apiFetch<AiWorkResult>("v1/ai/worker/execute", {
        method: "POST",
        body: { feature, form },
      });
      setMessages((current) => [
        ...current,
        { role: "ASSISTANT", parts: result.parts ?? [], feature: result.feature, url: result.url },
      ]);
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {loadingHistory && messages.length === 0 ? (
          <div className="text-muted-foreground m-auto flex items-center gap-2 text-sm" role="status">
            <Loader2 className="size-4 animate-spin" />
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-muted-foreground m-auto flex max-w-sm flex-col items-center gap-3 text-center">
            <Sparkles className="text-primary size-8" aria-hidden="true" />
            <p className="text-foreground text-base font-medium">What would you like help with?</p>
            <p className="text-sm leading-6">Ask questions related to configure WAWAGO.</p>
          </div>
        ) : (
          messages.map((chatMessage, index) => (
            <div
              key={index}
              className={chatMessage.role === "USER" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  chatMessage.role === "USER"
                    ? "max-w-[85%] space-y-3 rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                    : "max-w-[92%] min-w-0 space-y-3 rounded-xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm"
                }
              >
                <AiMessagePartsView
                  parts={chatMessage.parts}
                  feature={chatMessage.feature}
                  disabled={sending}
                  onSubmitForm={(feature, form) => void executeForm(feature, form)}
                />
                {chatMessage.url?.trim() ? <MessageLink url={chatMessage.url} /> : null}
              </div>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={submitMessage}
        className="shrink-0 border-t p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Write a message..."
            aria-label="Write a message"
            rows={1}
            className="max-h-32 min-h-10 resize-y"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={!message.trim() || sending} aria-label="Send message">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </form>
    </section>
  );
}
