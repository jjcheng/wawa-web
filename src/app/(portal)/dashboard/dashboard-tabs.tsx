"use client";

import { useState, type ReactNode } from "react";

export function DashboardTabs({
  todos,
  stats,
}: {
  todos: ReactNode;
  stats: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<"todos" | "stats">("todos");

  return (
    <div className="space-y-4">
      <div className="flex border-b" role="tablist" aria-label="Dashboard sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "todos"}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "todos"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("todos")}
        >
          To-dos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "stats"}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "stats"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("stats")}
        >
          Stats
        </button>
      </div>
      {activeTab === "todos" ? todos : stats}
    </div>
  );
}
