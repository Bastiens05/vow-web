"use client";

import { useRouter } from "next/navigation";

export function BackControl({ fallback, label }: { fallback: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="shrink-0 text-sm font-medium"
      onClick={() => {
        const referrer = document.referrer;
        const sameOrigin = referrer.startsWith(window.location.origin);
        if (sameOrigin && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      ← {label}
    </button>
  );
}
