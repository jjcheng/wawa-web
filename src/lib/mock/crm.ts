export const mockCustomers = [
  {
    Name: "Amelia Tan",
    Phone: "+65 9123 4567",
    Tags: "Lead, Retail",
    "Last contact": "2 hours ago",
  },
  {
    Name: "Ben Ortiz",
    Phone: "+1 415 555 0138",
    Tags: "Customer",
    "Last contact": "Yesterday",
  },
  { Name: "Chloe Ng", Phone: "+65 8123 9911", Tags: "VIP", "Last contact": "3 days ago" },
  {
    Name: "Daniel Reyes",
    Phone: "+63 917 555 0117",
    Tags: "Lead",
    "Last contact": "1 week ago",
  },
];

export const mockConversations = [
  {
    Contact: "Amelia Tan",
    Channel: "WhatsApp",
    Status: "Open",
    Assignee: "You",
    Updated: "2 hours ago",
  },
  {
    Contact: "Ben Ortiz",
    Channel: "WhatsApp",
    Status: "Pending",
    Assignee: "Unassigned",
    Updated: "Yesterday",
  },
  {
    Contact: "Chloe Ng",
    Channel: "WhatsApp",
    Status: "Closed",
    Assignee: "You",
    Updated: "3 days ago",
  },
];

export const mockCampaigns = [
  {
    Name: "October promo",
    Audience: "Retail leads",
    Status: "Draft",
    Sent: "—",
    "Open rate": "—",
  },
  {
    Name: "Reorder reminder",
    Audience: "Repeat customers",
    Status: "Completed",
    Sent: "1,204",
    "Open rate": "62%",
  },
  {
    Name: "Welcome series",
    Audience: "New signups",
    Status: "Running",
    Sent: "318",
    "Open rate": "74%",
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
