"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { CookieNotice } from "@/components/cookie-notice";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({
  children,
  isCustomWebsite: isCustomWebsiteRequest,
}: {
  children: ReactNode;
  isCustomWebsite: boolean;
}) {
  const pathname = usePathname();
  const isCustomWebsite = isCustomWebsiteRequest || pathname.startsWith("/sites/");
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>{children}</TooltipProvider>
        {!isCustomWebsite ? <CookieNotice /> : null}
        <Toaster richColors={false} position="top-center" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
