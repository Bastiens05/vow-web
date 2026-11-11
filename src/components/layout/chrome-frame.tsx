"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isPublicPath } from "@/lib/domain/chrome";

export function ChromeFrame({
  publicHeader,
  mobile,
  desktop,
  alerts,
  children,
}: {
  publicHeader: ReactNode;
  mobile: ReactNode;
  desktop: ReactNode;
  alerts: ReactNode;
  children: ReactNode;
}) {
  const pub = isPublicPath(usePathname() ?? "");
  if (pub) {
    return (
      <>
        {publicHeader}
        <main className="min-w-0">{children}</main>
      </>
    );
  }
  return (
    <>
      {mobile}
      <div className="md:grid md:min-h-dvh md:grid-cols-[232px_minmax(0,1fr)]">
        {desktop}
        <main className="min-w-0 pb-24 md:pb-10">{children}</main>
      </div>
      {alerts}
    </>
  );
}
