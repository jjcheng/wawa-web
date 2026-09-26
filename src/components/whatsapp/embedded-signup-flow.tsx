"use client";

import { useMutation } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { CircleCheckIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { embeddedSignupSchema } from "@/lib/api/schemas";
import { completeEmbeddedSignup } from "@/lib/auth/actions";
import { cn, MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

const GRAPH_VERSION = "v26.0";

function showConnectedToast(description = "You're all set to start messaging your customers.") {
  toast.success("WhatsApp account connected", {
    description,
    icon: <CircleCheckIcon className="size-4 text-emerald-500" />,
    duration: 6000,
  });
  void confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#25D366", "#1877F2", "#34D399"],
  });
}

type SignupSession = {
  phone_number_id?: string;
  waba_id?: string;
  business_id?: string;
  page_ids?: string[];
  catalog_ids?: string[];
  dataset_ids?: string[];
  instagram_account_ids?: string[];
};

type SignupMessage = SignupSession & {
  type?: string;
  event?: string;
  data?: SignupSession;
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

export function EmbeddedSignupFlow({
  appId,
  configId,
  redirectTo,
  className,
}: {
  appId: string;
  configId: string;
  redirectTo: string | null;
  className?: string;
  }) {
  const router = useRouter();
  const [sdkReady, setSdkReady] = useState(false);
  const sessionRef = useRef<SignupSession>({});
  const authorizationCodeRef = useRef<string | null>(null);
  const redirectUriRef = useRef<string | null>(null);
  const isSubmittingRef = useRef(false);
  const signupActiveRef = useRef(false);
  const [signupAborted, setSignupAborted] = useState(false);
  const [signupStarted, setSignupStarted] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: unknown) => {
      const parsed = embeddedSignupSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("WhatsApp did not return the full onboarding details. Please retry.");
      }
      return completeEmbeddedSignup(parsed.data);
    },
    onSuccess: (result) => {
      if (result.message) {
        signupActiveRef.current = false;
        isSubmittingRef.current = false;
        setSignupStarted(false);
        setSignupError(result.message);
        setSignupAborted(true);
        toast.error(result.message);
        return;
      }
      if (result.phoneNumberId !== undefined) {
        showConnectedToast("Final step: assign this phone number to one or more users.");
        router.push(`/assign-users?phone_number_id=${encodeURIComponent(String(result.phoneNumberId))}`);
        router.refresh();
        return;
      }
      const destination = redirectTo ?? "/chats";
      if (result.status === "PENDING_PASSWORD") {
        showConnectedToast("Final step: set your password and you're all good to go!");
        router.push(`/set-password?next=${encodeURIComponent("/chats")}`);
        return;
      }
      if (!result.loggedIn) {
        // No access token was issued: send the user back to where they can see the result.
        showConnectedToast("You're all set, login now using your existing password!");
        router.push(result.redirectTo ?? "/login");
        router.refresh();
        return;
      }
      showConnectedToast();
      router.push(destination);
      router.refresh();
    },
    onError: (error) => {
      signupActiveRef.current = false;
      isSubmittingRef.current = false;
      setSignupStarted(false);
      setSignupError(error instanceof Error ? error.message : "WhatsApp onboarding failed. Please try again.");
      setSignupAborted(true);
      toast.error("WhatsApp onboarding failed. Please try again.");
    },
  });

  const submitSignup = useCallback(() => {
    const authorizationCode = authorizationCodeRef.current;
    const session = sessionRef.current;
    const redirectUri = redirectUriRef.current;
    if (isSubmittingRef.current) return;
    if (
      !authorizationCode ||
      !redirectUri ||
      !session.phone_number_id ||
      !session.waba_id ||
      !session.business_id
    ) {
      return;
    }

    isSubmittingRef.current = true;
    setSignupStarted(true);
    mutation.mutate({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: session,
      authorization_code: authorizationCode,
      redirect_uri: redirectUri,
    });
  }, [mutation]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : (event.data as unknown);
        if (
          typeof data === "object" &&
          data !== null &&
          (data as SignupMessage).type === "WA_EMBEDDED_SIGNUP"
        ) {
          const signupMessage = data as SignupMessage;
          if (signupMessage.event === "FINISH") {
            // console.log("Session Logging Response:", signupMessage);
            sessionRef.current = signupMessage.data ?? signupMessage;
            submitSignup();
          } else if (signupMessage.event === "CANCEL") {
            if (isSubmittingRef.current) return;
            signupActiveRef.current = false;
            isSubmittingRef.current = false;
            setSignupStarted(false);
            setSignupAborted(true);
            toast.info("WhatsApp onboarding was cancelled.");
          }
        }
      } catch {
        // Ignore non-JSON messages from the dialog.
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [submitSignup]);

  const initSdk = useCallback(() => {
    if (!window.FB) return;
    window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version: GRAPH_VERSION });
    setSdkReady(true);
  }, [appId]);

  useEffect(() => {
    window.fbAsyncInit = initSdk;
    if (window.FB) {
      const frame = requestAnimationFrame(initSdk);
      return () => cancelAnimationFrame(frame);
    }
    if (document.getElementById("facebook-jssdk")) return;

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, [initSdk]);

  function launchWhatsAppSignup() {
    if (signupActiveRef.current || isSubmittingRef.current) return;
    signupActiveRef.current = true;
    sessionRef.current = {};
    authorizationCodeRef.current = null;
    redirectUriRef.current = window.location.href;
    setSignupStarted(true);
    setSignupAborted(false);
    setSignupError(null);
    if (!window.FB) {
      signupActiveRef.current = false;
      isSubmittingRef.current = false;
      setSignupStarted(false);
      toast.error("The Facebook SDK is not ready yet.");
      return;
    }
    window.FB.login(fbLoginCallback, {
      config_id: configId,
      response_type: "code",
      override_default_response_type: true,
      redirect_uri: redirectUriRef.current,
      extras: { 
        version: "v4",
        featureType: 'whatsapp_business_app_onboarding',
        sessionInfoVersion: '3',
        setup: {

        }
       },
    });
  }

  function fbLoginCallback(response: { authResponse?: { code?: string } }) {
    const code = response.authResponse?.code;
    if (!code) {
      if (isSubmittingRef.current) return;
      signupActiveRef.current = false;
      isSubmittingRef.current = false;
      setSignupStarted(false);
      setSignupAborted(true);
      toast.error("WhatsApp onboarding was cancelled.");
      return;
    }
    // console.log("ES Response Code:", code);
    authorizationCodeRef.current = code;
    submitSignup();
  }

  if (!appId || !configId) {
    return (
      <Alert>
        <AlertTitle>Embedded Signup is not configured</AlertTitle>
        <AlertDescription>Set the Meta Embedded Signup environment variables and restart the dev server.</AlertDescription>
      </Alert>
    );
  }

  if (signupAborted) {
    return (
      <div className={cn("grid gap-3 text-center", className)}>
        {signupError ? (
          <p className="text-destructive text-sm">{signupError}</p>
        ) : null}
        <p className="text-destructive text-sm font-medium">
          Signup aborted, refresh the page to try again
        </p>
        <Button type="button" onClick={() => window.location.reload()} className={MEDIUM_BUTTON_HEIGHT}>
          Refresh page
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={launchWhatsAppSignup}
      disabled={!sdkReady || signupStarted || mutation.isPending}
      className={cn(
        MEDIUM_BUTTON_HEIGHT,
        "bg-[#1877F2] text-white hover:bg-[#166FE5] focus-visible:ring-[#1877F2]/50",
        className,
      )}
    >
      {signupStarted || mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
      Get Started with Facebook
    </Button>
  );
}