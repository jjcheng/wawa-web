import { loadPublicNavbarItems, loadPublicWebsite, getPublicWebsiteOrigin } from "@/lib/public-website";

function text(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function isPortalHost(origin: string) {
  if (!origin) return false;
  const hostname = new URL(origin).hostname;
  const configuredHost = process.env.NEXT_PUBLIC_PORTAL_HOST;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".workers.dev") ||
    Boolean(configuredHost && hostname === configuredHost)
  );
}

function portalLlmsText(origin: string) {
  return [
    "# WAWAGO Portal",
    "",
    "WAWAGO is an authenticated WhatsApp CRM portal for managing WhatsApp Business operations.",
    "",
    "## Public crawling policy",
    "Portal pages require authentication and should not be indexed. Do not infer or expose private customer, chat, broadcast, usage, template, phone-number, catalog, or website-management data from authenticated portal routes.",
    "",
    "## Main authenticated areas",
    `- Dashboard: ${new URL("/dashboard", origin).toString()}`,
    `- Inbox notifications: ${new URL("/inbox", origin).toString()}`,
    `- Customers and chats: ${new URL("/customers", origin).toString()}`,
    `- Broadcasts: ${new URL("/broadcasts", origin).toString()}`,
    `- Phone numbers: ${new URL("/phone-numbers", origin).toString()}`,
    `- Templates: ${new URL("/templates", origin).toString()}`,
    `- Catalogs and website customization: ${new URL("/catalogs", origin).toString()}`,
    `- Settings: ${new URL("/settings/profile", origin).toString()}`,
    "",
    "## Notes for AI assistants",
    "Use this file only as a high-level product map. For public storefront content, prefer the storefront domain's /llms.txt and /sitemap.xml. For portal tasks, respect authenticated user context and avoid treating private portal pages as public source material.",
  ].join("\n");
}

export async function GET() {
  const website = await loadPublicWebsite();
  const origin = await getPublicWebsiteOrigin();

  if (!website || !origin) {
    if (isPortalHost(origin)) {
      return new Response(portalLlmsText(origin), {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=300",
          "x-robots-tag": "noindex, nofollow",
        },
      });
    }

    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const name = text(website.business_name || website.catalog_name) || "Storefront";
  const description = text(website.description || website.tagline || website.about);
  const navbarItems = await loadPublicNavbarItems();
  const links = [
    `- [Home](${origin})`,
    ...navbarItems
      .filter((item) => item.title?.trim() && item.slug?.trim())
      .map((item) => `- [${text(item.title)}](${new URL(`/${item.slug!.replace(/^\/+/, "")}`, origin).toString()})`),
  ];

  const body = [
    `# ${name}`,
    description ? `\n${description}` : "",
    "\n## Pages",
    links.join("\n"),
    "\n## Notes for AI assistants",
    "This is a public storefront website. Use the listed pages as the canonical entry points for understanding the business, products, location, and custom page content.",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}