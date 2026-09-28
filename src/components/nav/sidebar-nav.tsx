"use client";

import {
  ChevronDown,
  FileText,
  Gauge,
  LayoutGrid,
  ListChecks,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Megaphone,
  Phone,
  Store,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type SubmitEvent } from "react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { User } from "@/lib/api/types";
import { toast } from "@/lib/toast";
import { useUnreadNotificationsCount } from "@/lib/unread-notifications-store";
import { cn } from "@/lib/utils";

const MAIN_ITEMS = [
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/catalogs", label: "Catalogs", icon: Store, masterOnly: true },
];

const ASSET_ITEMS = [
  { href: "/assets/phone-numbers", label: "Phone Numbers", icon: Phone },
  { href: "/assets/users", label: "Users", icon: UsersRound, masterOnly: true },
  { href: "/assets/templates", label: "Templates", icon: FileText },
  { href: "/assets/broadcasts", label: "Broadcasts", icon: Megaphone },
  { href: "/assets/usage", label: "Usage", icon: Gauge, masterOnly: true },
];

export function SidebarNav({ onNavigate, user }: { onNavigate?: () => void; user: User }) {
  const pathname = usePathname();
  const unreadNotificationsCount = useUnreadNotificationsCount();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  async function submitFeedback(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = feedback.trim();
    if (content.length < 20) {
      setFeedbackError("Feedback must be at least 20 characters.");
      return;
    }
    setFeedbackSubmitting(true);
    setFeedbackError(null);
    try {
      await apiFetch("v1/site/feedback", {
        method: "POST",
        body: { content },
      });
      setFeedback("");
      setFeedbackOpen(false);
      toast.success("Thank you for your feedback.");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  const assetItems = ASSET_ITEMS.filter((item) => !item.masterOnly || user.type === "MASTER");
  const assetsActive =
    pathname.startsWith("/websites/") || assetItems.some((item) => pathname.startsWith(item.href));
  const [assetsOpen, setAssetsOpen] = useState(assetsActive);

  return (
    <nav className="flex h-svh flex-col gap-1 overflow-y-auto px-3 py-4">
      <Brand className="mb-5 px-2" />
      {MAIN_ITEMS.filter((item) => !item.masterOnly || user.type === "MASTER").map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-base font-medium transition-colors duration-200",
              active
                ? "bg-transparent font-medium text-blue-600 dark:text-blue-400"
                : "text-foreground hover:text-blue-600 dark:hover:text-blue-400",
            )}
          >
            <item.icon
              width={16}
              height={16}
              strokeWidth={item.href === "/chats" ? 2 : undefined}
              className={cn(
                "transition-colors",
                active ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400",
              )}
            />
            {item.label}
            {item.href === "/tasks" && unreadNotificationsCount > 0 ? (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
                {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
              </span>
            ) : null}
          </Link>
        );
      })}

      <div>
        <button
          type="button"
          onClick={() => setAssetsOpen((open) => !open)}
          aria-expanded={assetsOpen}
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-base font-medium transition-colors duration-200",
            assetsActive
              ? "bg-transparent font-medium text-blue-600 dark:text-blue-400"
              : "text-foreground hover:text-blue-600 dark:hover:text-blue-400",
          )}
        >
          <LayoutGrid
            width={16}
            height={16}
            className={cn(
              "transition-colors",
              assetsActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400",
            )}
          />
          Assets
          <ChevronDown
            width={17}
            height={17}
            className={cn(
              "ml-auto transition-colors",
              assetsOpen && "rotate-180",
              assetsActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400",
            )}
          />
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            assetsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="border-border/70 mt-1.5 ml-5 space-y-1 border-l pl-3">
              {assetItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.9375rem] font-medium transition-colors duration-200",
                      active
                        ? "bg-transparent font-medium text-blue-600 dark:text-blue-400"
                        : "text-foreground hover:text-blue-600 dark:hover:text-blue-400",
                    )}
                  >
                    <item.icon
                      width={15}
                      height={15}
                      className={cn(
                        "transition-colors",
                        active ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={feedbackOpen}
        onOpenChange={(open) => {
          if (!feedbackSubmitting) setFeedbackOpen(open);
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            className="group text-foreground mt-auto flex w-full items-center gap-2.5 px-3 py-2 text-base font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400"
          >
            <MessageSquareText width={17} height={17} className="text-muted-foreground" />
            Feedback
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share feedback</DialogTitle>
            <DialogDescription>
              Tell us what is working well or what we can improve. We will get back to you if needed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitFeedback} className="space-y-4">
            <div className="space-y-1.5">
              <Textarea
                value={feedback}
                onChange={(event) => {
                  setFeedback(event.target.value);
                  if (feedbackError && event.target.value.trim().length >= 20) {
                    setFeedbackError(null);
                  }
                }}
                minLength={20}
                required
                rows={8}
                maxLength={5000}
                placeholder="Enter your feedback, at least 20 characters"
                aria-invalid={Boolean(feedbackError)}
                aria-describedby="feedback-help"
              />
              {/* <div id="feedback-help" className="flex justify-between gap-3 text-xs">
                <span className={feedbackError ? "text-destructive" : "text-muted-foreground"}>
                  {feedbackError ?? "Minimum 20 characters"}
                </span>
                <span className="text-muted-foreground">{feedback.trim().length}</span>
              </div> */}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={feedback.trim().length < 20 || feedbackSubmitting}
              >
                {feedbackSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {feedbackSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </nav>
  );
}
