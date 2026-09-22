"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { WhatsappIcon } from "@/components/icons/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

type WhatsAppLinkResponse = string | { link?: string; url?: string };

function whatsappLink(response: WhatsAppLinkResponse) {
  if (typeof response === "string") return response;
  return response.link ?? response.url ?? "";
}

function productWhatsAppLink(link: string, productUrl: string) {
  const url = new URL(link);
  const existingText = url.searchParams.get("text");
  url.searchParams.set("text", [existingText, productUrl].filter(Boolean).join("\n"));
  return url.toString();
}

export function ProductWhatsAppButton() {
  const [loading, setLoading] = useState(false);

  async function askMore() {
    if (loading) return;
    const whatsappTab = window.open("about:blank", "_blank");
    if (whatsappTab) whatsappTab.opener = null;
    setLoading(true);
    try {
      const response = await apiFetch<WhatsAppLinkResponse>("v1/public/wa-link");
      const link = whatsappLink(response);
      if (!link) throw new Error("WhatsApp link is unavailable.");
      const destination = productWhatsAppLink(link, window.location.href);
      if (whatsappTab) whatsappTab.location.assign(destination);
      else window.open(destination, "_blank", "noopener,noreferrer");
    } catch (error) {
      whatsappTab?.close();
      toast.error(toApiError(error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      className="rounded-full bg-[#25d366] text-white hover:bg-[#1fbd59]"
      onClick={() => void askMore()}
      disabled={loading}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <WhatsappIcon className="size-4" />}
      {loading ? "Opening WhatsApp..." : "Ask on WhatsApp"}
    </Button>
  );
}