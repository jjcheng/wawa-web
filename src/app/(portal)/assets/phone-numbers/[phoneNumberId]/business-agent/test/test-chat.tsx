"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Bot, Loader2, SendHorizontal } from "lucide-react";

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
import { formatWhatsAppText } from "@/lib/whatsapp-text";

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  created_at: number;
  failed?: boolean;
  note?: string;
};

type StoredConversation = {
  // Local id used to ignore replies that arrive after the chat was cleared.
  session_id: string;
  conversation_id: string;
  messages: ChatMessage[];
};

type TestResponse = {
  message_id?: string;
  agent_response?: string;
  conversation_id?: string;
  timestamp?: number;
  handoff_reason?: string;
  no_response_reason?: string;
} | null;

const STORAGE_EVENT = "business-agent-test-storage";

function storageKey(phoneNumberId: number) {
  return `business-agent-test:${phoneNumberId}`;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function parseConversation(raw: string | null): StoredConversation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredConversation>;
    if (typeof parsed.session_id !== "string" || !parsed.session_id) return null;
    return {
      session_id: parsed.session_id,
      conversation_id: typeof parsed.conversation_id === "string" ? parsed.conversation_id : "",
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return null;
  }
}

function writeConversation(key: string, conversation: StoredConversation | null) {
  if (conversation) window.localStorage.setItem(key, JSON.stringify(conversation));
  else window.localStorage.removeItem(key);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function newConversation(): StoredConversation {
  return { session_id: crypto.randomUUID(), conversation_id: "", messages: [] };
}

function readOrCreateConversation(key: string): StoredConversation {
  const existing = parseConversation(window.localStorage.getItem(key));
  if (existing) return existing;
  const created = newConversation();
  writeConversation(key, created);
  return created;
}

function appendMessage(key: string, message: ChatMessage) {
  const conversation = readOrCreateConversation(key);
  writeConversation(key, { ...conversation, messages: [...conversation.messages, message] });
}

function markFailed(key: string, messageId: string) {
  const conversation = readOrCreateConversation(key);
  writeConversation(key, {
    ...conversation,
    messages: conversation.messages.map((message) =>
      message.id === messageId ? { ...message, failed: true } : message,
    ),
  });
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function TestChat({ phoneNumberId, displayNumber }: { phoneNumberId: number; displayNumber: string }) {
  const key = storageKey(phoneNumberId);
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key),
    () => null,
  );
  const conversation = useMemo(() => parseConversation(raw), [raw]);
  const messages = conversation?.messages ?? [];

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    readOrCreateConversation(key);
  }, [key]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, sending]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    const { session_id, conversation_id } = readOrCreateConversation(key);
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text, created_at: Date.now() };
    appendMessage(key, userMessage);
    setDraft("");
    setSending(true);
    try {
      const response = await apiFetch<TestResponse>("v1/wa/business-agent/test", {
        method: "POST",
        query: { phone_number_id: String(phoneNumberId) },
        body: conversation_id ? { user_message: text, conversation_id } : { user_message: text },
      });
      const current = readOrCreateConversation(key);
      // Ignore replies for a conversation that was cleared while waiting.
      if (current.session_id !== session_id) return;
      if (response?.conversation_id && response.conversation_id !== current.conversation_id) {
        writeConversation(key, { ...current, conversation_id: response.conversation_id });
      }
      const agentResponse = response?.agent_response?.trim();
      const note = [response?.handoff_reason, response?.no_response_reason]
        .map((value) => value?.trim())
        .filter(Boolean)
        .join(" · ");
      if (agentResponse || note) {
        appendMessage(key, {
          id: response?.message_id || crypto.randomUUID(),
          role: "agent",
          text: agentResponse || "(No reply)",
          created_at: response?.timestamp ? response.timestamp * 1000 : Date.now(),
          note: note || undefined,
        });
      }
    } catch (error) {
      markFailed(key, userMessage.id);
      toast.error(toApiError(error).message);
    } finally {
      setSending(false);
    }
  }

  function clearChat() {
    writeConversation(key, newConversation());
    setConfirmClear(false);
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Test</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Chat with the business agent for {displayNumber} before it replies to real customers. Tokens consumed while testing are not billed.
        </p>
      </div>

      <div className="flex h-[calc(100dvh-14rem)] min-h-[28rem] flex-col overflow-hidden rounded-lg border">
        <div className="bg-card flex items-center gap-3 border-b px-4 py-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
            <Bot className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Business agent</p>
            <p className="text-muted-foreground truncate text-xs">{sending ? "typing..." : displayNumber}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmClear(true)}
            disabled={messages.length === 0 && !sending}
          >
            Clear chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#efeae2] px-3 py-4 sm:px-6 dark:bg-[#0b141a]">
          {messages.length === 0 && !sending ? (
            <div className="flex h-full items-center justify-center">
              <p className="rounded-lg bg-[#fff5c4] px-3 py-2 text-center text-xs text-[#54656f] shadow-sm dark:bg-[#182229] dark:text-[#8696a0]">
                Send a message to start testing your business agent.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {messages.map((message) => {
                const mine = message.role === "user";
                return (
                  <div key={message.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-2.5 pt-1.5 pb-1 text-sm shadow-sm sm:max-w-[70%] ${
                        mine
                          ? "rounded-tr-none bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]"
                          : "rounded-tl-none bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]"
                      }`}
                    >
                      <p className="break-words whitespace-pre-wrap">{formatWhatsAppText(message.text)}</p>
                      {message.note ? (
                        <p className="mt-1 border-t border-black/10 pt-1 text-xs text-[#667781] italic break-words dark:border-white/10 dark:text-[#8696a0]">
                          {message.note}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-right text-[0.6875rem] text-[#667781] dark:text-[#8696a0]">
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                    {message.failed ? <p className="text-destructive mt-0.5 text-xs">Failed to send</p> : null}
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
              This removes all messages in this test conversation and starts a new one.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={clearChat}>
              Clear chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
