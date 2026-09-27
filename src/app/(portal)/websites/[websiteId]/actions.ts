"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { rawServerFetch } from "@/lib/api/server-client";
import type { ApiEnvelope } from "@/lib/api/types";

export type WebsiteActionState = {
  message?: string;
  deleted?: boolean;
  savedAt?: number;
};


export async function updateWebsiteStatus(websiteId: string, status: "ACTIVE" | "INACTIVE") {
  let response: Response;
  try {
    response = await rawServerFetch(`/v1/commerce/websites/${encodeURIComponent(websiteId)}/status`, {
      method: "PATCH",
      query: { status },
    });
  } catch {
    return { success: false, message: "Unable to reach the commerce service." };
  }

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;
  if (!response.ok || !envelope?.success) {
    return {
      success: false,
      message: envelope?.message ?? "Could not update the website status.",
    };
  }

  revalidatePath(`/websites/${encodeURIComponent(websiteId)}`);
  revalidatePath("/websites");
  return { success: true };
}

export async function updateWebsiteAction(
  _previousState: WebsiteActionState,
  formData: FormData,
): Promise<WebsiteActionState> {
  const websiteId = formData.get("website_id");
  if (typeof websiteId !== "string" || !websiteId) return { message: "Website ID is missing." };

  const latitudeText = String(formData.get("latitude") ?? "").trim();
  const longitudeText = String(formData.get("longitude") ?? "").trim();
  const latitude = latitudeText ? Number(latitudeText) : undefined;
  const longitude = longitudeText ? Number(longitudeText) : undefined;
  if ((latitudeText && !Number.isFinite(latitude)) || (longitudeText && !Number.isFinite(longitude))) {
    return { message: "Location coordinates must be valid numbers." };
  }

  let response: Response;
  try {
    response = await rawServerFetch(`/v1/commerce/websites/${encodeURIComponent(websiteId)}`, {
      method: "PATCH",
      body: {
        about: String(formData.get("about") ?? ""),
        description: String(formData.get("description") ?? ""),
        profile_picture_url: String(formData.get("profile_picture_url") ?? ""),
        cover_image_url: String(formData.get("cover_image_url") ?? ""),
        tagline: String(formData.get("tagline") ?? ""),
        address: String(formData.get("address") ?? ""),
        latitude,
        longitude,
        contact_text: String(formData.get("contact_text") ?? ""),
        copyright_text: String(formData.get("copyright_text") ?? ""),
      },
    });
  } catch {
    return { message: "Unable to reach the commerce service." };
  }

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;
  if (!response.ok || !envelope?.success) {
    return { message: envelope?.message ?? "Could not update the website." };
  }

  revalidatePath(`/websites/${encodeURIComponent(websiteId)}`);
  revalidatePath("/websites");
  return { savedAt: Date.now() };
}

export async function deleteWebsiteAction(
  _previousState: WebsiteActionState,
  formData: FormData,
): Promise<WebsiteActionState> {
  const websiteId = formData.get("website_id");
  if (typeof websiteId !== "string" || !websiteId) return { message: "Website ID is missing." };

  let response: Response;
  try {
    response = await rawServerFetch(`/v1/commerce/websites/${encodeURIComponent(websiteId)}`, {
      method: "DELETE",
    });
  } catch {
    return { message: "Unable to reach the commerce service." };
  }

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;
  if (!response.ok || !envelope?.success) {
    return { message: envelope?.message ?? "Could not delete the website." };
  }

  revalidatePath("/websites");
  revalidatePath("/catalogs");
  redirect("/catalogs");
}
