import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlanLock } from "@/components/billing/plan-lock";
import { DOC_KINDS, docStatus } from "@/lib/domain/admin-docs";
import { featureEnabled } from "@/lib/domain/plans";
import { todayIso } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/server/features";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Mon dossier pro" };

const TONE: Record<string, string> = {
  valid: "text-ink",
  soon: "text-muted",
  expired: "text-danger",
};

export default async function AdminDocsPage() {
  if (!featureEnabled("admin_docs")) notFound();
  const session = await requireSession();
  if (session.profile.role !== "vendor" || !session.vendor) redirect("/espace");
  if (!hasFeature({ role: "vendor", plan: session.billing?.plan ?? "essentiel" }, "admin_docs")) return <PlanLock feature="admin_docs" />;
  const supabase = await createClient();
  const { data } = await supabase.from("vendor_credentials").select("id, kind, file_name, expires_on").eq("vendor_id", session.vendor.id);
  const today = todayIso();
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-4xl font-semibold tracking-tight">Mon dossier pro</h1>
      <p className="mt-2 text-sm text-muted">Privé. Un lieu ne reçoit un document que si vous l&apos;avez ouvert, et vous envoyez vous-même le lien.</p>
      <ul className="mt-6 grid gap-2">
        {DOC_KINDS.map((kind) => {
          const file = (data ?? []).find((row) => row.kind === kind.id);
          const status = file ? docStatus(file.expires_on, today) : null;
          const label = status === "valid" ? "Valide" : status === "soon" ? "Expire bientôt" : status === "expired" ? "Expiré" : "À déposer";
          return (
            <li key={kind.id} className="flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm">
              <span>{kind.label}{file ? ` · ${file.file_name}` : ""}</span>
              <span className={status ? TONE[status] : "text-muted"}>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
