import { LocalDateTime } from "@/components/local-date-time";
import type { Customer } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";

export function CustomerInfo({ customer }: { customer: Customer }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">Name</dt>
      <dd>{customer.display_name || "—"}</dd>
      <dt className="text-muted-foreground">Phone</dt>
      <dd>{formatPhoneNumber(customer.phone_number, customer.country_code)}</dd>
      <dt className="text-muted-foreground">Tags</dt>
      <dd>{customer.tags?.join(", ") || "—"}</dd>
      <dt className="text-muted-foreground">Status</dt>
      <dd>{customer.status || "—"}</dd>
      <dt className="text-muted-foreground">Added</dt>
      <dd><LocalDateTime value={customer.added_at} /></dd>
      <dt className="text-muted-foreground">Remarks</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words">{customer.remarks || "—"}</dd>
      {Object.keys(customer.additional_data ?? {}).length > 0 ? (
        <>
          <dt className="text-muted-foreground">Additional data</dt>
          <dd className="min-w-0 space-y-1 break-words">
            {Object.entries(customer.additional_data ?? {}).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span>{" "}
                {typeof value === "string" ? value : JSON.stringify(value)}
              </div>
            ))}
          </dd>
        </>
      ) : null}
    </dl>
  );
}
