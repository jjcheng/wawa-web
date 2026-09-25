"use client";

import { useEffect, useRef } from "react";

import { toast } from "@/lib/toast";

export function ApiErrorToast({ message }: { message: string | null }) {
  const reportedMessage = useRef<string | null>(null);

  useEffect(() => {
    if (!message || reportedMessage.current === message) return;

    reportedMessage.current = message;
    toast.error(message);
  }, [message]);

  return null;
}