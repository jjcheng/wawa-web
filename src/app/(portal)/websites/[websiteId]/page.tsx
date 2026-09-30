import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import type { PhoneNumber, PhoneNumberListResponse, Website, WebsitePage } from "@/lib/api/types";
import { WebsiteDetailsForm } from "./website-details-form";
import { WebsiteStatusSwitch } from "./website-status-switch";

export const metadata: Metadata = { title: "Customize website" };

export default async function WebsitePage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/chats");

  const { websiteId } = await params;
  const { tab } = await searchParams;
  const showPages = tab === "pages";
  let website: Website | null = null;
  let initialPages: WebsitePage[] | null = null;
  let phoneNumbers: PhoneNumber[] = [];
  let loadError: string | null = null;

  try {
    website = await serverFetch<Website>(
      `/v1/commerce/websites/${encodeURIComponent(websiteId)}`,
    );
    if (showPages) {
      const pages = await serverFetch<WebsitePage[]>(
        `/v1/commerce/websites/${encodeURIComponent(websiteId)}/pages`,
      );
      initialPages = Array.isArray(pages) ? [...pages].sort((first, second) => first.rank - second.rank) : [];
    }
    const phoneNumberResponse = await serverFetch<PhoneNumberListResponse>("/v1/wa/phone-numbers", {
      query: { page: "1", page_size: "100" },
    });
    phoneNumbers = phoneNumberResponse.items ?? [];
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Could not load this website.";
  }

  return (
    <>
      <BackBar
        href="/catalogs"
        actions={
          website ? (
            <WebsiteStatusSwitch
              websiteId={websiteId}
              initialOnline={website.status?.toUpperCase() === "ACTIVE"}
            />
          ) : undefined
        }
      />
      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : website ? (
        <WebsiteDetailsForm
          websiteId={websiteId}
          url={website.url}
          initialActiveTab={showPages ? "pages" : "profile"}
          initialPages={initialPages}
          phoneNumbers={phoneNumbers}
          initialValues={{
            about: website.about ?? "",
            description: website.description ?? "",
            profilePictureUrl: website.profile_picture_url ?? "",
            coverImageUrl: website.cover_image_url ?? "",
            tagline: website.tagline ?? "",
            address: website.address ?? "",
            latitude: website.latitude?.toString() ?? "",
            longitude: website.longitude?.toString() ?? "",
            contactText: website.contact_text ?? "",
            copyrightText: website.copyright_text ?? "",
          }}
        />
      ) : null}
    </>
  );
}