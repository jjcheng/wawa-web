"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";
const OPEN_STORAGE_KEY = "wawago_ai_worker_panel_open";
const OPEN_CHANGE_EVENT = "wawago-ai-worker-panel-change";
export const AI_WORKER_PANEL_WIDTH = "24rem";

type AiWorkerPanelContextValue = {
  open: boolean;
  isDesktop: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const AiWorkerPanelContext = createContext<AiWorkerPanelContextValue | null>(null);

function subscribeToDesktop(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function subscribeToOpen(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(OPEN_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(OPEN_CHANGE_EVENT, onChange);
  };
}

function readOpen() {
  return window.localStorage.getItem(OPEN_STORAGE_KEY) === "true";
}

function writeOpen(open: boolean) {
  window.localStorage.setItem(OPEN_STORAGE_KEY, String(open));
  window.dispatchEvent(new Event(OPEN_CHANGE_EVENT));
}

export function AiWorkerPanelProvider({ children }: { children: ReactNode }) {
  const open = useSyncExternalStore(subscribeToOpen, readOpen, () => false);
  const isDesktop = useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
  const toggle = useCallback(() => writeOpen(!readOpen()), []);
  const value = useMemo(() => ({ open, isDesktop, setOpen: writeOpen, toggle }), [open, isDesktop, toggle]);

  return (
    <AiWorkerPanelContext value={value}>
      {/* Fixed bars use this to stay clear of the docked desktop panel. */}
      <div
        className="contents"
        style={{ "--ai-panel-width": open && isDesktop ? AI_WORKER_PANEL_WIDTH : "0px" } as CSSProperties}
      >
        {children}
      </div>
    </AiWorkerPanelContext>
  );
}

export function useAiWorkerPanel() {
  const context = useContext(AiWorkerPanelContext);
  if (!context) throw new Error("useAiWorkerPanel must be used within AiWorkerPanelProvider.");
  return context;
}
