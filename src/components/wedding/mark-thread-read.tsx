"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markThreadRead } from "@/server/actions/messages";

export function MarkThreadRead({
  weddingId,
  vendorUserId,
  cursor,
  mobileOpen,
}: {
  weddingId: string;
  vendorUserId: string;
  cursor: string;
  mobileOpen: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    let cancelled = false;
    async function mark() {
      if (!query.matches && !mobileOpen) return;
      const changed = await markThreadRead(weddingId, vendorUserId);
      if (!cancelled && changed) router.refresh();
    }
    void mark();
    const onChange = () => void mark();
    query.addEventListener("change", onChange);
    return () => {
      cancelled = true;
      query.removeEventListener("change", onChange);
    };
  }, [weddingId, vendorUserId, cursor, mobileOpen, router]);
  return null;
}
