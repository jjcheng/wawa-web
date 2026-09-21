"use server";

import { redirect } from "next/navigation";

import { rawServerFetch } from "@/lib/api/server-client";
import type { ApiEnvelope, Website } from "@/lib/api/types";

export type WebsiteSetupState = {
  message?: string;
};

export async function createWebsiteAction(
  _previousState: WebsiteSetupState,
  formData: FormData,
): Promise<WebsiteSetupState> {
  const subdomain = formData.get("subdomain");
  const metaCatalogId = formData.get("meta_catalog_id");

  if (
    typeof subdomain !== "string" ||
    !subdomain.trim() ||
    subdomain.length > 60 ||
    typeof metaCatalogId !== "string" ||
    !metaCatalogId.trim()
  ) {
    return { message: "Enter a valid subdomain and try again." };
  }

  let response: Response;
  try {
    response = await rawServerFetch("/v1/commerce/websites", {
      method: "POST",
      body: {
        subdomain: subdomain.trim(),
        meta_catalog_id: metaCatalogId,
      },
    });
  } catch {
    return { message: "Unable to reach the commerce service. Please try again." };
  }

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<Website> | null;
  if (!response.ok || !envelope?.success) {
    return { message: envelope?.message ?? "Could not create the website. Please try again." };
  }

  const websiteId = envelope.data?.id;
  if (websiteId === undefined || websiteId === null || websiteId === "") {
    return { message: "Website was created but no website ID was returned." };
  }

  redirect(`/websites/${encodeURIComponent(String(websiteId))}`);
}
