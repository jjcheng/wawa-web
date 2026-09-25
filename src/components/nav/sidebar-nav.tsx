"use client";

import {
  FileText,
  Gauge,
  // Globe2,
  Inbox,
  LayoutDashboard,
  Loader2,
  MessageSquareText,
  Megaphone,
  Phone,
  Store,
  Users,
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

const SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/inbox", label: "Inbox", icon: Inbox },
    ],
  },
  {
    label: "MESSAGING",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/broadcasts", label: "Broadcasts", icon: Megaphone },
    ],
  },
  {
    label: "Assets",
    items: [
      { href: "/users", label: "Users", icon: UsersRound },
      { href: "/phone-numbers", label: "Phone Numbers", icon: Phone },
      { href: "/templates", label: "Templates", icon: FileText },
      { href: "/catalogs", label: "Catalogs", icon: Store },
      // { href: "/websites", label: "Websites", icon: Globe2 },
    ],
  },
  {
    label: "Analytics",
    items: [{ href: "/usage", label: "Usage", icon: Gauge }],
  },
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

  return (
    <nav className="flex h-svh flex-col gap-5 overflow-y-auto p-3">
      <Brand className="px-2" />
      {SECTIONS.filter((section) => user.type === "MASTER" || section.label !== "Analytics").map((section) => (
        <div key={section.label} className="space-y-1">
          <p className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
            {section.label}
          </p>
          {section.items
            .filter(
              (item) =>
                (!["/catalogs", "/websites", "/users"].includes(item.href) || user.type === "MASTER"),
            )
            .map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                (item.href === "/catalogs" && pathname.startsWith("/websites/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                  {item.href === "/inbox" && unreadNotificationsCount > 0 ? (
                    <span className="bg-primary text-primary-foreground ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium">
                      {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
        </div>
      ))}
      <Dialog
        open={feedbackOpen}
        onOpenChange={(open) => {
          if (!feedbackSubmitting) setFeedbackOpen(open);
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground mt-auto flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <MessageSquareText className="size-4" />
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
