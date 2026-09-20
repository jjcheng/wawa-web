import type { ReactNode } from "react";

export function TableEmptyState({
  colSpan,
  action,
  children,
}: {
  colSpan: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-muted-foreground px-2 py-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <span>{children}</span>
          {action}
        </div>
      </td>
    </tr>
  );
}
