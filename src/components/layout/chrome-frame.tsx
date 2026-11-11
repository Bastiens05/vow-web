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
  const path = usePathname() ?? "";
  const pub = isPublicPath(path);
  const authDesk = path === "/connexion" || path === "/inscription" || path === "/bienvenue";
  if (pub) {
    return (
      <>
        <div className={authDesk ? "lg:hidden" : undefined}>{publicHeader}</div>
        <main className={authDesk ? "min-w-0 lg:min-h-dvh" : "min-w-0"}>{children}</main>
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
