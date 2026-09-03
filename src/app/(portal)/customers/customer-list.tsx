"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const COLUMNS = ["Name", "Phone", "Tags"];

export function CustomerList({
  rows,
  newTags = [],
}: {
  rows: Record<string, string>[];
  newTags?: string[];
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState("All");
  const [tagError, setTagError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<string[]>("v1/customers/tags")
      .then((result) => setTags(Array.isArray(result) ? result : []))
      .catch((error) => setTagError(toApiError(error).message));
  }, []);

  const tagOptions = ["All", ...new Set([...tags, ...newTags])];

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
        {tagOptions.map((tag) => (
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
      {tagError ? <p className="text-destructive text-sm">{tagError}</p> : null}

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
