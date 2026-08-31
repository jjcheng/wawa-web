import type { ReactNode } from "react";

import { PageHeader } from "@/components/page-header";
import { AnalyticsFilters } from "@/components/whatsapp/analytics-filters";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WabaOption } from "@/lib/waba-options";

export function AnalyticsShell({
  title,
  description,
  wabas,
  wabaError,
  selected,
  rangeDays,
  children,
}: {
  title: string;
  description: string;
  wabas: WabaOption[];
  wabaError: string | null;
  selected: string;
  rangeDays: number;
  children: ReactNode;
}) {
  if (!selected) {
    return (
      <>
        <PageHeader title={title} description={description} />
        {wabaError ? (
          <Alert variant="destructive">
            <AlertDescription>{wabaError}</AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No business account yet</CardTitle>
              <CardDescription>
                Connect a WhatsApp Business number to start collecting data.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={
          <AnalyticsFilters
            wabas={wabas}
            metaWabaId={selected}
            range={String(rangeDays)}
          />
        }
      />
      {children}
    </>
  );
}
