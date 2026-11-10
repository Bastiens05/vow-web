import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { AlertDock } from "@/components/alerts/alert-dock";
import { DesktopNav, MobileChrome } from "@/components/layout/app-nav";
import { latestUnreadAlert } from "@/server/data";
import { getSession } from "@/server/session";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "VOW", template: "%s · VOW" },
  description: "L'espace partagé entre les prestataires de mariage et les couples.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-ivory text-ink">
        <Suspense fallback={<MobileBarFallback />}>
          <MobileChrome />
        </Suspense>
        <div className="md:grid md:min-h-dvh md:grid-cols-[232px_minmax(0,1fr)]">
          <Suspense fallback={<div className="hidden border-r border-line md:block" />}>
            <DesktopNav />
          </Suspense>
          <main className="min-w-0 pb-24 md:pb-10">{children}</main>
        </div>
        <Suspense fallback={null}>
          <AlertSlot />
        </Suspense>
      </body>
    </html>
  );
}

function MobileBarFallback() {
  return <div className="h-14 border-b border-line bg-ivory md:hidden" aria-hidden />;
}

async function AlertSlot() {
  const session = await getSession();
  if (!session) return null;
  const latest = await latestUnreadAlert(session.userId);
  return (
    <div className="fixed right-3 top-2 z-50 md:right-6">
      <AlertDock initialToast={latest?.body ?? null} initialUnread={latest ? 1 : 0} />
    </div>
  );
}
