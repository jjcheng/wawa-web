import { ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LoadMoreButton({
  loading,
  onClick,
  withTopMargin = true,
}: {
  loading: boolean;
  onClick: () => void;
  withTopMargin?: boolean;
}) {
  return (
    <div className={withTopMargin ? "mt-4 flex justify-end" : "flex justify-end"}>
      <Button variant="outline" onClick={onClick} disabled={loading}>
        Load more
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ChevronDown className="size-4" />
        )}
      </Button>
    </div>
  );
}
