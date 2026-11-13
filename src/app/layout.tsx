import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { Suspense } from "react";
import { headers } from "next/headers";
import { AlertDock } from "@/components/alerts/alert-dock";
import { AssistantDock } from "@/components/assistant/assistant-dock";
import { preferredCoupleWedding } from "@/lib/domain/access";
import { assistantEnabled } from "@/lib/domain/assistant";
import { DesktopNav, MobileChrome, PublicHeader } from "@/components/layout/app-nav";
import { BillingGate } from "@/components/layout/billing-gate";
import { ChromeFrame } from "@/components/layout/chrome-frame";
import { VaultButton, VaultLink } from "@/components/layout/vault-button";
import { VaultBoard } from "@/components/wedding/vault-board";
import { VAULT_CHECKLIST } from "@/lib/domain/vault";
import { createClient } from "@/lib/supabase/server";
import { latestUnreadAlert, listMyWeddings } from "@/server/data";
import { getSession } from "@/server/session";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument" });

export const metadata: Metadata = {
  title: { default: "VOW", template: "%s · VOW" },
  description: "L'espace partagé entre les prestataires de mariage et les couples.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "VOW",
    description: "L'espace commun des prestataires et des mariés.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-vow-path") ?? "";
  return (
    <html lang="fr" className={`${inter.variable} ${instrument.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-ivory text-ink">
        <ChromeFrame
          publicHeader={<PublicHeader accounts={!path.startsWith("/invitation/")} overlay={path === "/"} />}
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

async function defaultAssistantWedding(userId: string, role: "couple" | "vendor") {
  const weddings = await listMyWeddings(userId);
  if (role === "couple") return preferredCoupleWedding(weddings, userId)?.id ?? null;
  return weddings.find((wedding) => !wedding.is_demo)?.id ?? weddings[0]?.id ?? null;
}

async function AlertSlot() {
  const session = await getSession();
  if (!session) return null;
  const latest = await latestUnreadAlert(session.userId);
  const vault = await coupleVault(session.userId);
  const showCoupleVault = Boolean(vault && (session.profile.role === "couple" || vault.onCouplePage));
  const showVendorVault = session.profile.role === "vendor" && Boolean(session.vendor) && !showCoupleVault;
  return (
    <div className="pointer-events-none fixed right-0 top-0 z-50">
      <div className="pointer-events-auto flex h-14 items-center gap-0.5 px-3 md:h-16 md:px-6">
        {showCoupleVault && vault ? (
          <VaultButton href={`/mariage/${vault.weddingId}/coffre`} missing={vault.missing}>
            <VaultBoard weddingId={vault.weddingId} userId={session.userId} checklist={VAULT_CHECKLIST} stored={vault.stored} />
          </VaultButton>
        ) : null}
        {showVendorVault ? <VaultLink href="/coffre-fort" label="Coffre-fort" /> : null}
        {assistantEnabled() ? (
          <AssistantDock role={session.profile.role} defaultWeddingId={await defaultAssistantWedding(session.userId, session.profile.role)} />
        ) : null}
        <AlertDock
          calm
          inApp={session.profile.notify_in_app}
          initialToast={session.profile.notify_in_app ? (latest?.body ?? null) : null}
          initialToastHref={session.profile.notify_in_app ? (latest?.href ?? null) : null}
          initialUnread={latest ? 1 : 0}
        />
      </div>
    </div>
  );
}

async function coupleVault(userId: string) {
  const path = (await headers()).get("x-vow-path") ?? "";
  const match = /^\/mariage\/([^/]+)/.exec(path);
  const weddings = await listMyWeddings(userId);
  const onPath = match ? weddings.find((wedding) => wedding.id === match[1]) : null;
  const preview = Boolean(onPath && onPath.is_demo && onPath.couple_preview && onPath.created_by === userId);
  const onCouplePage = Boolean(onPath && (onPath.memberRole === "couple" || preview));
  const card = onCouplePage ? onPath : preferredCoupleWedding(weddings, userId);
  if (!card) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("vault_items").select("id, kind, label, file_name, storage_path").eq("wedding_id", card.id);
  const stored = data ?? [];
  const present = new Set(stored.map((item) => item.kind));
  const missing = VAULT_CHECKLIST.filter((item) => !present.has(item.kind)).length;
  return { weddingId: card.id, missing, stored, onCouplePage };
}
