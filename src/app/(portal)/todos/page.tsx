import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "TODOs" };

export default function TodosPage() {
  return (
    <>
      <PageHeader title="TODOs" description="Keep track of your upcoming work." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">TODOs</CardTitle>
          <CardDescription>Your TODO list will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No TODOs yet.</p>
        </CardContent>
      </Card>
    </>
  );
}
