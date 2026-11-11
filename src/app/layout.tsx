import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { AlertDock } from "@/components/alerts/alert-dock";
import { DesktopNav, MobileChrome, PublicHeader } from "@/components/layout/app-nav";
import { BillingGate } from "@/components/layout/billing-gate";
import { ChromeFrame } from "@/components/layout/chrome-frame";
import { latestUnreadAlert } from "@/server/data";
import { getSession } from "@/server/session";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "VOW", template: "%s · VOW" },
  description: "L'espace partagé entre les prestataires de mariage et les couples.",
  manifest: "/manifest.webmanifest",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-ivory text-ink">
        <ChromeFrame
          publicHeader={<PublicHeader />}
          mobile={
            <Suspense fallback={<MobileBarFallback />}>
              <MobileChrome />
            </Suspense>
          }
          desktop={
            <Suspense fallback={<div className="hidden border-r border-line md:block" />}>
              <DesktopNav />
            </Suspense>
          }
          alerts={
            <Suspense fallback={null}>
              <AlertSlot />
            </Suspense>
          }
        >
          <BillingGate>{children}</BillingGate>
        </ChromeFrame>
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
    <div className="pointer-events-none fixed right-0 top-0 z-50">
      <div className="pointer-events-auto flex h-14 items-center px-3 md:h-16 md:px-6">
        <AlertDock
          inApp={session.profile.notify_in_app}
          initialToast={session.profile.notify_in_app ? (latest?.body ?? null) : null}
          initialUnread={latest ? 1 : 0}
        />
      </div>
    </div>
  );
}
