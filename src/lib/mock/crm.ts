// System/announcement messages sent by CoreConcept to this account's users.
export const mockInboxMessages = [
  {
    subject: "Your WhatsApp Business number is now connected",
    preview: "Embedded Signup finished successfully. You can start sending templates.",
    date: "2 hours ago",
    unread: true,
  },
  {
    subject: "Scheduled maintenance on Sept 6",
    preview:
      "CoreConcept will run brief maintenance between 2–3 AM SGT. No downtime expected.",
    date: "Yesterday",
    unread: true,
  },
  {
    subject: "New template category: AUTHENTICATION",
    preview: "Meta now supports one-time password templates. Learn how to create one.",
    date: "3 days ago",
    unread: false,
  },
  {
    subject: "Your monthly usage summary is ready",
    preview: "View your conversation volume and template performance for last month.",
    date: "1 week ago",
    unread: false,
  },
];

export const mockWorkflows = [
  {
    Name: "Abandoned cart nudge",
    Trigger: "Cart idle 2h",
    Steps: "3",
    Status: "Active",
    "Last run": "12 minutes ago",
  },
  {
    Name: "Post-purchase survey",
    Trigger: "Order delivered",
    Steps: "2",
    Status: "Active",
    "Last run": "Yesterday",
  },
  {
    Name: "Win-back",
    Trigger: "No order 90 days",
    Steps: "4",
    Status: "Paused",
    "Last run": "3 weeks ago",
  },
];

export const mockUsage = [
  {
    Month: "Aug 2026",
    "Marketing conversations": "4,120",
    "Utility conversations": "2,880",
    "Service conversations": "1,904",
    Cost: "SGD 812.40",
  },
  {
    Month: "Jul 2026",
    "Marketing conversations": "3,640",
    "Utility conversations": "2,510",
    "Service conversations": "1,732",
    Cost: "SGD 724.15",
  },
  {
    Month: "Jun 2026",
    "Marketing conversations": "2,980",
    "Utility conversations": "2,204",
    "Service conversations": "1,588",
    Cost: "SGD 631.80",
  },
];
