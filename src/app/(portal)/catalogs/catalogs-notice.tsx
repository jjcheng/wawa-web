"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "@/lib/toast";

export function CatalogsNotice({ notice }: { notice?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (notice !== "create-website") return;

    toast.info("Select a catalog and create website from there");
    router.replace("/catalogs", { scroll: false });
  }, [notice, router]);

  return null;
}
