"use client";

import { Bot, ExternalLink, LogOut, RefreshCw, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";

import { ThemeToggle } from "@/components/theme-toggle";
import { useAiWorkerPanel } from "@/components/ai-worker/ai-worker-panel-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { logoutAction } from "@/lib/auth/actions";
import { publishBusinessAgentStatus, subscribeBusinessAgentStatus } from "@/lib/business-agent-status";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { formatPhoneNumber } from "@/lib/format";
import { metaBusinessManagerUrl } from "@/lib/meta-links";
import type { BusinessAccount, PhoneNumber, User } from "@/lib/api/types";

function initials(user: User) {
  const source =
    user.name?.trim() || formatPhoneNumber(user.phone_number, user.country_code) || "?";
  return source.slice(0, 2).toUpperCase();
}

type BusinessContext = {
  portfolioName: string | null;
  portfolioId: string | null;
  accountName: string | null;
  accountId: string | null;
};

const businessContextRequests = new Map<string, Promise<BusinessContext>>();

function businessContextStorageKey(user: User) {
  return `wawa.business-context.v3.${user.id}`;
}

function clearBusinessContextCache() {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("wawa.business-context.")) localStorage.removeItem(key);
  }
  businessContextRequests.clear();
}

function readBusinessContext(user: User): BusinessContext | null {
  try {
    const value = localStorage.getItem(businessContextStorageKey(user));
    if (!value) return null;

    const context = JSON.parse(value) as BusinessContext;
    if (typeof context.portfolioName !== "string" && context.portfolioName !== null)
      return null;
    if (typeof context.portfolioId !== "string" && context.portfolioId !== null) return null;
    if (typeof context.accountName !== "string" && context.accountName !== null) return null;
    if (typeof context.accountId !== "string" && context.accountId !== null) return null;
    return context;
  } catch {
    return null;
  }
}

function hasBusinessContextIds(context: BusinessContext) {
  return Boolean(context.portfolioId?.trim() && context.accountId?.trim());
}

export function Topbar({ user }: { user: User }) {
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null);
  const [refreshingBusinessContext, setRefreshingBusinessContext] = useState(false);
  const [assignedPhoneNumbers, setAssignedPhoneNumbers] = useState<PhoneNumber[]>(
    () => user.assigned_phone_numbers ?? [],
  );
  const [pendingAgentIds, setPendingAgentIds] = useState<Set<number>>(() => new Set());
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const aiWorkerPanel = useAiWorkerPanel();
  const agentRunning = assignedPhoneNumbers.some((phoneNumber) => phoneNumber.agent_enabled === true);
  const onboardedPhoneNumbers = assignedPhoneNumbers.filter((phoneNumber) => phoneNumber.meta_agent_id?.trim());

  useEffect(() => {
    setAssignedPhoneNumbers(user.assigned_phone_numbers ?? []);
  }, [user.assigned_phone_numbers]);

  useEffect(
    () =>
      subscribeBusinessAgentStatus((change) => {
        setAssignedPhoneNumbers((current) =>
          current.map((item) =>
            Number(item.id) === change.phoneNumberId
              ? {
                  ...item,
                  ...(change.agent_enabled !== undefined ? { agent_enabled: change.agent_enabled } : {}),
                  ...(change.meta_agent_id !== undefined ? { meta_agent_id: change.meta_agent_id } : {}),
                }
              : item,
          ),
        );
      }),
    [],
  );

  useEffect(() => {
    const cached = readBusinessContext(user);
    if (cached && hasBusinessContextIds(cached)) {
      const frame = requestAnimationFrame(() => setBusinessContext(cached));
      return () => cancelAnimationFrame(frame);
    }

    let active = true;
    const storageKey = businessContextStorageKey(user);
    const request =
      businessContextRequests.get(storageKey) ??
      apiFetch<BusinessAccount>("/v1/wa/business-accounts").then((account) => ({
        portfolioName: account.meta_business_portfolio_name ?? null,
        portfolioId: account.meta_business_portfolio_id ?? null,
        accountName: account.name ?? null,
        accountId: account.waba_id ?? null,
      }));

    businessContextRequests.set(storageKey, request);
    void request
      .then((context) => {
        localStorage.setItem(storageKey, JSON.stringify(context));
        if (active) setBusinessContext(context);
      })
      .catch(() => {
        businessContextRequests.delete(storageKey);
      });

    return () => {
      active = false;
    };
  }, [user]);

  async function refreshBusinessContext() {
    if (
      !businessContext ||
      !businessContext.portfolioId ||
      !businessContext.accountId ||
      refreshingBusinessContext
    ) return;
    setRefreshingBusinessContext(true);
    try {
      const account = await apiFetch<BusinessAccount>("v1/wa/business-accounts", { method: "PATCH" });
      const nextContext = {
        portfolioName: account.meta_business_portfolio_name ?? businessContext.portfolioName,
        portfolioId: account.meta_business_portfolio_id ?? businessContext.portfolioId,
        accountName: account.name ?? null,
        accountId: account.waba_id ?? businessContext.accountId,
      };
      setBusinessContext(nextContext);
      localStorage.setItem(businessContextStorageKey(user), JSON.stringify(nextContext));
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setRefreshingBusinessContext(false);
    }
  }

  async function toggleBusinessAgent(phoneNumber: PhoneNumber) {
    const phoneNumberId = Number(phoneNumber.id);
    if (!Number.isInteger(phoneNumberId) || pendingAgentIds.has(phoneNumberId)) return;

    const on = phoneNumber.agent_enabled !== true;
    setPendingAgentIds((current) => new Set(current).add(phoneNumberId));
    try {
      await apiFetch("v1/wa/business-agent/status", {
        method: "PATCH",
        query: {
          phone_number_id: String(phoneNumberId),
          on: String(on),
        },
      });
      publishBusinessAgentStatus({ phoneNumberId, agent_enabled: on });
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setPendingAgentIds((current) => {
        const next = new Set(current);
        next.delete(phoneNumberId);
        return next;
      });
    }
  }

  return (
    <header className="glass-surface sticky top-0 z-30 flex h-14 items-center gap-2 px-4">
      {businessContext && hasBusinessContextIds(businessContext) ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto min-w-0 cursor-pointer justify-start px-2 py-1 text-left leading-tight"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {businessContext.portfolioName || businessContext.portfolioId}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {businessContext.accountName || businessContext.accountId}
                </span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-2" align="start">
            <div className="relative space-y-3 p-1 text-sm">
              {user.type === "MASTER" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-0 right-0"
                  onClick={() => void refreshBusinessContext()}
                  disabled={refreshingBusinessContext}
                  aria-label="Update business information"
                  title="Update business information"
                >
                  <RefreshCw className={refreshingBusinessContext ? "animate-spin" : undefined} />
                </Button>
              ) : null}
              <div>
                <p className="font-medium">Meta Business Portfolio</p>
                <p className="text-muted-foreground truncate">
                  {businessContext.portfolioName}
                </p>
                <p className="text-muted-foreground font-mono text-xs">
                  {businessContext.portfolioId}
                </p>
              </div>
              <div>
                <p className="font-medium">WhatsApp Business Account</p>
                <p className="text-muted-foreground truncate">{businessContext.accountName}</p>
                <p className="text-muted-foreground font-mono text-xs">
                  {businessContext.accountId}
                </p>
              </div>
              <Button asChild className="w-full">
                <a
                  href={
                    metaBusinessManagerUrl({
                      portfolioId: businessContext.portfolioId,
                      accountId: businessContext.accountId,
                    }) ?? undefined
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp Manager <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <div className="ml-auto flex items-center gap-1">
        {BUSINESS_AGENT_ENABLED ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={agentRunning ? "text-green-600 dark:text-green-400 [&_svg]:animate-pulse" : undefined}
              aria-label="Business agent"
              title={agentRunning ? "Business agent is running" : "Business agent"}
            >
              <Bot className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-2 p-3">
            <p className="text-sm font-medium">Running business agents</p>
            {onboardedPhoneNumbers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No phone numbers have onboarded a business agent.</p>
            ) : (
              <ul className="divide-y">
                {onboardedPhoneNumbers.map((phoneNumber) => {
                  const phoneNumberId = Number(phoneNumber.id);
                  const isRunning = phoneNumber.agent_enabled === true;
                  const label = phoneNumber.name ||
                    formatPhoneNumber(phoneNumber.display_phone_number || phoneNumber.phone_number) ||
                    "Unnamed phone number";

                  return (
                    <li key={phoneNumber.id} className="flex items-center gap-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{label}</span>
                        {phoneNumber.name && (phoneNumber.display_phone_number || phoneNumber.phone_number) ? (
                          <span className="text-muted-foreground block truncate text-xs">
                            {formatPhoneNumber(phoneNumber.display_phone_number || phoneNumber.phone_number)}
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isRunning}
                        aria-label={`${isRunning ? "Turn off" : "Turn on"} business agent for ${label}`}
                        disabled={pendingAgentIds.has(phoneNumberId)}
                        onClick={() => void toggleBusinessAgent(phoneNumber)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 ${isRunning ? "bg-green-600" : "bg-muted-foreground/40"}`}
                      >
                        <span className={`size-4 rounded-full bg-white shadow transition-transform ${isRunning ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </PopoverContent>
        </Popover>
        ) : null}
        {/* <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="AI Worker" title="AI Worker">
              <Sparkles className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 space-y-1.5 p-3">
            <p className="text-sm font-medium">AI Worker</p>
            <p className="text-muted-foreground text-sm">Under development</p>
          </PopoverContent>
        </Popover> */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="AI Worker"
          title="AI Worker"
          aria-expanded={aiWorkerPanel.open}
          onClick={aiWorkerPanel.toggle}
        >
          <Sparkles className="size-4" />
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initials(user)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex w-full items-center justify-between gap-2">
                <p className="text-sm font-medium">{user.name || "Account"}</p>
                {user.type === "MASTER" ? (
                  <Badge className="h-4 px-1.5 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    MASTER
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground text-xs">
                {formatPhoneNumber(user.phone_number, user.country_code)}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer py-2">
              <Link href="/settings/profile">
                <Settings className="size-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer py-2"
              onSelect={(event) => {
                event.preventDefault();
                clearBusinessContextCache();
                logoutFormRef.current?.requestSubmit();
              }}
            >
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <form ref={logoutFormRef} action={logoutAction} className="hidden" />
    </header>
  );
}
