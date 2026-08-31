"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { WhatsappIcon } from "@/components/icons/whatsapp-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { embeddedSignupSchema } from "@/lib/api/schemas";
import type { EmbeddedSignupResult } from "@/lib/api/types";
import { cn, MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

const GRAPH_VERSION = "v26.0";
const DEFAULT_LABEL = "Add WhatsApp Business Number";

type SignupSession = {
  phone_number_id?: string;
  waba_id?: string;
  business_id?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (options: Record<string, unknown>) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export function EmbeddedSignupButton({
  appId,
  configId,
  label = DEFAULT_LABEL,
  className,
  redirectTo = "/numbers",
}: {
  appId: string;
  configId: string;
  label?: string;
  className?: string;
  /** Null when the visitor is signed out and has nowhere authenticated to land. */
  redirectTo?: string | null;
}) {
  const router = useRouter();
  const [sdkReady, setSdkReady] = useState(false);
  // Populated by the postMessage the Embedded Signup dialog emits before it closes.
  const sessionRef = useRef<SignupSession>({});

  const mutation = useMutation({
    mutationFn: (payload: unknown) => {
      const parsed = embeddedSignupSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("WhatsApp did not return the full onboarding details. Please retry.");
      }
      return apiFetch<EmbeddedSignupResult>("wa/v1/embedded-signup", {
        method: "POST",
        body: parsed.data,
      });
    },
    onSuccess: () => {
      if (redirectTo) {
        toast.success("WhatsApp account connected.");
        router.push(redirectTo);
        router.refresh();
        return;
      }
      toast.success("Number registered. Sign in with it to finish setting up your account.");
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP" && data.event === "FINISH") {
          sessionRef.current = data.data ?? {};
        }
      } catch {
        // Ignore non-JSON messages from the dialog.
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const initSdk = useCallback(() => {
    if (!window.FB) return;
    window.FB.init({
      appId,
      autoLogAppEvents: true,
      xfbml: true,
      version: GRAPH_VERSION,
    });
    setSdkReady(true);
  }, [appId]);

  function launch() {
    if (!window.FB) {
      toast.error("The Facebook SDK is not ready yet.");
      return;
    }
    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          toast.error("WhatsApp onboarding was cancelled.");
          return;
        }
        mutation.mutate({
          event: "whatsapp_embedded_signup",
          data: { ...sessionRef.current, code },
        });
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      },
    );
  }

  if (!appId || !configId) {
    return (
      <Alert>
        <AlertTitle>Embedded Signup is not configured</AlertTitle>
        <AlertDescription>
          Set <code>NEXT_META_APP_ID</code> and{" "}
          <code>NEXT_META_EMBEDDED_SIGNUP_CONFIG_ID</code> in your environment, then restart
          the dev server.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onReady={initSdk}
      />
      <Button
        onClick={launch}
        disabled={!sdkReady || mutation.isPending}
        className={cn(
          MEDIUM_BUTTON_HEIGHT,
          "bg-[#25D366] text-white hover:bg-[#1EBE5B] focus-visible:ring-[#25D366]/50",
          className,
        )}
      >
        {mutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <WhatsappIcon className="size-4" />
        )}
        {label}
      </Button>
    </>
  );
}
