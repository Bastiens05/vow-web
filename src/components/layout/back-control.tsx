"use client";

import { useRouter } from "next/navigation";

export function BackControl({ fallback, label }: { fallback: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium transition active:scale-[0.98] hover:bg-ink/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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
