"use client";

import { createContext, useContext, useRef, type ReactNode, type RefObject } from "react";

const ChatViewportContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function ChatViewport({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <ChatViewportContext.Provider value={scrollRef}>
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </ChatViewportContext.Provider>
  );
}

export function useChatViewport() {
  return useContext(ChatViewportContext);
}
