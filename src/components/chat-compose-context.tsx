"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ReplyTarget = {
  metaId: string;
  preview: string;
};

export type ChatMessage = {
  id: number;
  meta_id: string;
  sending: boolean;
  timestamp: number;
  type: string;
  payload: Record<string, unknown>;
};

type ChatComposeContextValue = {
  replyTarget: ReplyTarget | null;
  setReplyTarget: (target: ReplyTarget | null) => void;
  appendedMessages: ChatMessage[];
  appendMessage: (message: ChatMessage) => void;
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
