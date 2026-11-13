import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlanLock } from "@/components/billing/plan-lock";
import { bucketInstallments, hourlyRate, thinMonths, travelMinutes } from "@/lib/domain/cashflow";
import { featureEnabled } from "@/lib/domain/plans";
import { FINANCE_FIGURES } from "@/lib/domain/finance";
import { formatEuros } from "@/lib/domain/money";
import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/server/features";
import { loadVendorFinance } from "@/server/finance";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Trésorerie" };

export default async function CashPage() {
  if (!featureEnabled("cashflow")) notFound();
  const session = await requireSession();
  if (session.profile.role !== "vendor" || !session.vendor) redirect("/espace");
  const account = { role: "vendor" as const, plan: session.billing?.plan ?? "essentiel" };
  if (!hasFeature(account, "cashflow")) return <PlanLock feature="cashflow" />;
  const supabase = await createClient();
  const [{ data: quotes }, { data: settings }, { data: times }] = await Promise.all([
    supabase.from("quotes").select("id, title, amount_cents, status, wedding_id").eq("vendor_id", session.vendor.id),
    supabase.from("vendor_cash_settings").select("thin_cents, include_unsigned").eq("vendor_id", session.vendor.id).maybeSingle(),
    supabase.from("wedding_time_entries").select("wedding_id, kind, minutes").eq("vendor_id", session.vendor.id),
  ]);
  const quoteIds = (quotes ?? []).map((quote) => quote.id);
  const { data: parts } = quoteIds.length
    ? await supabase.from("payment_installments").select("quote_id, due_on, amount_cents, collected_on").in("quote_id", quoteIds)
    : { data: [] };
  const includeUnsigned = settings?.include_unsigned ?? false;
  const rows = (parts ?? []).flatMap((part) => {
    const quote = (quotes ?? []).find((item) => item.id === part.quote_id);
    if (!quote || quote.status === "cancelled") return [];
    return [{
      dueOn: part.due_on,
      amountCents: part.amount_cents,
      collected: Boolean(part.collected_on),
      signed: quote.status === "accepted" || quote.status === "invoiced",
    }];
  });
  const start = new Date().toISOString().slice(0, 7);
  const months = bucketInstallments({ startMonth: start, months: 15, rows, includeUnsigned });
  const finance = await loadVendorFinance(session.vendor.id);
  const due = rows.filter((row) => !row.collected && row.signed).reduce((sum, row) => sum + row.amountCents, 0);
  const next3 = months.slice(0, 3).reduce((sum, month) => sum + month.collectedCents + month.scheduledCents, 0);
  const thin = thinMonths(months, settings?.thin_cents ?? 0);
  const byWedding = new Map<string, { price: number; collected: number; minutes: number }>();
  for (const quote of quotes ?? []) {
    if (quote.status === "cancelled") continue;
    if (!(quote.status === "accepted" || quote.status === "invoiced" || includeUnsigned)) continue;
    const current = byWedding.get(quote.wedding_id) ?? { price: 0, collected: 0, minutes: 0 };
    current.price += quote.amount_cents;
    byWedding.set(quote.wedding_id, current);
  }
  for (const part of parts ?? []) {
    const quote = (quotes ?? []).find((item) => item.id === part.quote_id);
    if (!quote || !part.collected_on) continue;
    const current = byWedding.get(quote.wedding_id);
    if (current) current.collected += part.amount_cents;
  }
  for (const entry of times ?? []) {
    const current = byWedding.get(entry.wedding_id) ?? { price: 0, collected: 0, minutes: 0 };
    current.minutes += entry.minutes;
    byWedding.set(entry.wedding_id, current);
  }
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-4xl font-semibold tracking-tight">Trésorerie</h1>
      <p className="mt-2 text-sm text-muted">Les quatre montants viennent des devis et des paiements enregistrés, les mêmes que sur l&apos;accueil. L&apos;échéancier dessous reste une prévision.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {FINANCE_FIGURES.map((figure) => (
          <li key={figure.key} className="rounded-3xl border border-line p-4">
            <p className="text-xs text-muted">{figure.label}</p>
            <p className="mt-1 text-2xl font-semibold">{formatEuros(finance[figure.key])}</p>
            <p className="mt-1 text-xs text-muted">{figure.detail}</p>
          </li>
        ))}
      </ul>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        <li className="rounded-3xl border border-line p-4"><p className="text-xs text-muted">Reste à encaisser</p><p className="mt-1 text-2xl font-semibold">{formatEuros(due)}</p></li>
        <li className="rounded-3xl border border-line p-4"><p className="text-xs text-muted">Trois prochains mois</p><p className="mt-1 text-2xl font-semibold">{formatEuros(next3)}</p></li>
      </ul>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Quinze mois</h2>
        <ul className="mt-3 grid gap-2">
          {months.map((month) => (
            <li key={month.month} className="grid grid-cols-4 gap-2 text-sm">
              <span>{month.month}</span>
              <span>{formatEuros(month.collectedCents)}</span>
              <span className="text-muted">{formatEuros(month.scheduledCents)}</span>
              <span className="text-muted">{formatEuros(month.unscheduledCents)}</span>
            </li>
          ))}
        </ul>
      </section>
      {thin.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-line p-4">
          <p className="text-sm">Mois plus légers : {thin.join(", ")}.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <p className="rounded-2xl bg-mist px-3 py-2">Brouillon : « Le solde de votre mariage peut être réglé quand vous voulez. »</p>
            <p className="rounded-2xl bg-mist px-3 py-2">Brouillon : « Un acompte plus tôt lisse le printemps. »</p>
            <p className="rounded-2xl bg-mist px-3 py-2">Lien de réservation : votre page publique.</p>
          </div>
        </section>
      ) : null}
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Par mariage</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {[...byWedding.entries()].map(([weddingId, row]) => (
            <li key={weddingId} className="flex justify-between gap-3">
              <span>{formatEuros(row.price)} · échéancier {formatEuros(row.collected)}</span>
              <span className="text-muted">{row.minutes} min · {hourlyRate(row.collected, row.minutes) ? formatEuros(hourlyRate(row.collected, row.minutes) ?? 0) : "—"} / h</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Le trajet se préremplit à {travelMinutes(0) === 0 ? "partir de la distance entre deux adresses" : ""} quand les coordonnées existent.</p>
      </section>
    </div>
  );
}
