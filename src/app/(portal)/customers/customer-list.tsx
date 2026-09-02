"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLUMNS = ["Name", "Phone", "Tags", "Last contact"];
const TAGS = ["All", "Instagram", "Google"] as const;

export function CustomerList({ rows }: { rows: Record<string, string>[] }) {
  const [selectedTag, setSelectedTag] = useState<(typeof TAGS)[number]>("All");

  const filteredRows =
    selectedTag === "All"
      ? rows
      : rows.filter((row) =>
          row.Tags.split(",")
            .map((tag) => tag.trim())
            .includes(selectedTag),
        );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TAGS.map((tag) => (
          <Button
            key={tag}
            size="sm"
            variant={selectedTag === tag ? "default" : "outline"}
            className={cn("cursor-pointer")}
            onClick={() => setSelectedTag(tag)}
          >
            {tag}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                {COLUMNS.map((column) => (
                  <th key={column} className="px-2 py-2 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={index} className="border-b last:border-0">
                  {COLUMNS.map((column) => (
                    <td key={column} className="px-2 py-2">
                      {row[column]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
