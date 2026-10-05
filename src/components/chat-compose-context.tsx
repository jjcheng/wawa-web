"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ReplyTarget = {
  waMessageId: string;
  preview: string;
};

export type ChatMessage = {
  id: number;
  wa_message_id: string;
  sending: boolean;
  timestamp: number;
  by_agent?: boolean;
  type: string;
  payload: Record<string, unknown>;
  attachment_url?: string;
  status?: string;
  error_message?: string;
  auto_load_media?: boolean;
  preview_html?: string;
  preview_dark_html?: string;
};

export type ChatMessageStatus = { wa_message_id: string; status: string };

type ChatComposeContextValue = {
  replyTarget: ReplyTarget | null;
  setReplyTarget: (target: ReplyTarget | null) => void;
  appendedMessages: ChatMessage[];
  appendMessage: (message: ChatMessage) => void;
  updateMessageStatus: (status: ChatMessageStatus) => void;
};

const ChatComposeContext = createContext<ChatComposeContextValue | null>(null);

export function ChatComposeProvider({ children }: { children: ReactNode }) {
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [appendedMessages, setAppendedMessages] = useState<ChatMessage[]>([]);
  return (
    <ChatComposeContext.Provider
      value={{
        replyTarget,
        setReplyTarget,
        appendedMessages,
        appendMessage: (message) =>
          setAppendedMessages((current) =>
            current.some((item) => item.id === message.id) ? current : [...current, message],
          ),
        updateMessageStatus: (status) =>
          setAppendedMessages((current) =>
            current.map((message) =>
              message.wa_message_id === status.wa_message_id
                ? { ...message, status: status.status }
                : message,
            ),
          ),
      }}
    >
      {children}
    </ChatComposeContext.Provider>
  );
}

export function useChatCompose() {
  const context = useContext(ChatComposeContext);
  if (!context) throw new Error("useChatCompose must be used within ChatComposeProvider");
  return context;
}
