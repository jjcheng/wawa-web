"use client";

import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const COOKIE_NOTICE_STORAGE_KEY = "wawago_cookie_notice_dismissed";
const COOKIE_NOTICE_CHANGE_EVENT = "wawago-cookie-notice-change";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(COOKIE_NOTICE_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(COOKIE_NOTICE_CHANGE_EVENT, onStoreChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY) !== "true";
}

function getServerSnapshot() {
  return false;
}

export function CookieNotice() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function dismiss() {
    window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, "true");
    window.dispatchEvent(new Event(COOKIE_NOTICE_CHANGE_EVENT));
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6">
      <div className="bg-popover text-popover-foreground ring-foreground/10 mx-auto flex max-w-3xl flex-col gap-3 rounded-lg p-4 text-sm shadow-lg ring-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground leading-6">
         We use cookies only to authenticate your session after signing in. We do not use them for ads, remarketing or cross-site tracking whatsoever. Learn more in our{" "}
          <a
            href="https://www.wawago.app/privacy"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            Privacy Policy
          </a>
          .
        </p>
        <Button type="button" size="sm" className="shrink-0" onClick={dismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
