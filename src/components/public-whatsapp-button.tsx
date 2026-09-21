"use client";

import { useState } from "react";

import { WhatsappIcon } from "@/components/icons/whatsapp-icon";
import { apiFetch } from "@/lib/api/client";

type WhatsAppLinkResponse = string | { link?: string; url?: string };

function whatsappLink(response: WhatsAppLinkResponse) {
  if (typeof response === "string") return response;
  return response.link ?? response.url ?? "";
}

export function PublicWhatsAppButton({ storeName }: { storeName: string }) {
  const [loading, setLoading] = useState(false);

  async function contactStore() {
    if (loading) return;
    setLoading(true);
    try {
      const response = await apiFetch<WhatsAppLinkResponse>("v1/public/wa-link");
      const link = whatsappLink(response);
      if (link) window.location.assign(link);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void contactStore()}
      disabled={loading}
      aria-label={`Contact ${storeName} on WhatsApp`}
      title="Contact us on WhatsApp"
      className="fixed right-5 bottom-5 z-40 flex size-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-75 sm:right-8 sm:bottom-8"
    >
      <WhatsappIcon className="size-7" />
    </button>
  );
}