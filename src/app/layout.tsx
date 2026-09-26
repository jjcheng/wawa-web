import type { Metadata } from "next";
import Script from "next/script";
import { cookies, headers } from "next/headers";
import { Geist, Geist_Mono, Inter, Playfair_Display } from "next/font/google";

import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

const themeScript = `(() => {
  try {
    const cookieTheme = document.cookie.match(/(?:^|;\\s*)theme=(light|dark|system)(?:;|$)/)?.[1];
    const theme = localStorage.getItem("theme") || cookieTheme || "system";
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const resolvedTheme = theme === "system" ? systemTheme : theme;
    document.cookie = "theme=" + theme + "; Path=/; Max-Age=31536000; SameSite=Lax";
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch {}
})();`;

export const metadata: Metadata = {
  title: {
    default: "WAWAGO Portal",
    template: "%s · WAWAGO",
  },
  description:
    "WAWAGO — WhatsApp-integrated CRM. Manage your WhatsApp Business numbers, contacts and conversations.",
  icons: {
    icon: [
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/favicons/favicon.ico",
    apple: "/favicons/apple-touch-icon.png",
  },
  manifest: "/favicons/site.webmanifest",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  const isCustomWebsite = requestHeaders.get("x-wawago-custom-website") === "true";
  const storedTheme = cookieStore.get("theme")?.value;
  const initialThemeClass = storedTheme === "dark" || storedTheme === "light" ? storedTheme : "";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${playfairDisplay.variable} ${initialThemeClass} h-full antialiased`}
    >
      <head>
        <Script id="theme-initializer" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className="flex min-h-full flex-col">
        <Providers isCustomWebsite={isCustomWebsite}>{children}</Providers>
      </body>
    </html>
  );
}
