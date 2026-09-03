import type { ReactNode } from "react";

export function TableEmptyState({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-muted-foreground px-2 pt-8 pb-4 text-center">
        {children}
      </td>
    </tr>
  );
}
