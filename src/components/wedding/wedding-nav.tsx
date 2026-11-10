"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { segment: null, label: "Aperçu", href: "" },
  { segment: "messages", label: "Messages", href: "/messages" },
  { segment: "documents", label: "Documents", href: "/documents" },
  { segment: "deroulement", label: "Déroulé", href: "/deroulement" },
] as const;

export function WeddingNav({ weddingId, isVendor }: { weddingId: string; isVendor: boolean }) {
  const segment = useSelectedLayoutSegment();
  const links = isVendor
    ? [...items, { segment: "inviter" as const, label: "Invitations", href: "/inviter" }]
    : [...items];

  return (
    <nav className="mb-8 flex gap-2 overflow-x-auto border-b border-line pb-3">
      {links.map((item) => {
        const active = segment === item.segment;
        return (
          <Link
            key={item.label}
            href={`/mariage/${weddingId}${item.href}`}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm",
              active ? "bg-ink text-ivory" : "text-muted hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
