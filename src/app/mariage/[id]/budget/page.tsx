import { BudgetBoard, type BudgetRow } from "@/components/wedding/budget-board";
import { Card } from "@/components/ui/card";
import { committedCents, paidCents } from "@/lib/domain/budget-commit";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  if (!couple) {
    return (
      <Card>
        <h1 className="font-serif text-4xl font-normal tracking-tight text-ink">Budget</h1>
        <p className="mt-2 text-sm text-muted">Le budget reste chez les mariés. Les prestataires ne le voient pas.</p>
      </Card>
    );
  }
  const supabase = await createClient();
  const [{ data: budget }, { data: lines }, { data: directory }, { data: quotes }, { data: invoices }, { data: payments }] = await Promise.all([
    supabase.from("wedding_budgets").select("total_cents").eq("wedding_id", id).maybeSingle(),
    supabase.from("budget_lines").select("id, label, amount_cents, paid, vendor_user_id, sort_order").eq("wedding_id", id).order("sort_order"),
    supabase.rpc("wedding_directory", { p_wedding_id: id }),
    supabase.from("quotes").select("vendor_id, amount_cents, status").eq("wedding_id", id).in("status", ["accepted", "invoiced"]),
    supabase.from("invoices").select("id, vendor_id, amount_cents, status").eq("wedding_id", id),
    supabase.from("invoice_payments").select("vendor_id, amount_cents").eq("wedding_id", id),
  ]);
  const vendors = (directory ?? []).filter((person) => person.member_role === "vendor");
  const { data: profiles } = vendors.length
    ? await supabase.from("vendor_profiles").select("id, user_id").in("user_id", vendors.map((person) => person.user_id))
    : { data: [] as { id: string; user_id: string }[] };
  const userByProfile = new Map((profiles ?? []).map((profile) => [profile.id, profile.user_id]));
  const quoted = new Map<string, number>();
  for (const quote of quotes ?? []) {
    const userId = userByProfile.get(quote.vendor_id);
    if (!userId) continue;
    quoted.set(userId, (quoted.get(userId) ?? 0) + quote.amount_cents);
  }
  const invoiced = new Map<string, number>();
  for (const invoice of invoices ?? []) {
    if (invoice.status === "void") continue;
    const userId = userByProfile.get(invoice.vendor_id);
    if (!userId) continue;
    invoiced.set(userId, (invoiced.get(userId) ?? 0) + invoice.amount_cents);
  }
  const settled = new Map<string, number>();
  for (const payment of payments ?? []) {
    const userId = userByProfile.get(payment.vendor_id);
    if (!userId) continue;
    settled.set(userId, (settled.get(userId) ?? 0) + payment.amount_cents);
  }
  const usedVendors = new Set<string>();
  const rows: BudgetRow[] = [];
  for (const person of vendors) {
    const line = (lines ?? []).find((item) => item.vendor_user_id === person.user_id);
    const trade = person.category && isVendorCategory(person.category) ? categoryLabel(person.category) : "Prestataire";
    usedVendors.add(person.user_id);
    const amount = committedCents({
      lineCents: line?.amount_cents ?? null,
      quoteCents: quoted.get(person.user_id) ?? 0,
      invoiceCents: invoiced.get(person.user_id) ?? 0,
    });
    rows.push({
      key: person.user_id,
      id: line?.id ?? null,
      label: person.business_name || person.full_name || trade,
      trade,
      euros: amount / 100,
      paid: line?.paid ?? false,
      paidCents: paidCents({
        committed: amount,
        invoiceCents: invoiced.get(person.user_id) ?? 0,
        paymentCents: settled.get(person.user_id) ?? 0,
        linePaid: line?.paid ?? false,
      }),
      vendorUserId: person.user_id,
    });
  }
  for (const [userId, cents] of invoiced) {
    if (usedVendors.has(userId)) continue;
    usedVendors.add(userId);
    rows.push({
      key: userId,
      id: null,
      label: "Facture",
      trade: "Prestataire",
      euros: cents / 100,
      paid: false,
      paidCents: Math.min(settled.get(userId) ?? 0, cents),
      vendorUserId: userId,
    });
  }
  for (const line of lines ?? []) {
    if (line.vendor_user_id && usedVendors.has(line.vendor_user_id)) continue;
    rows.push({
      key: line.id,
      id: line.id,
      label: line.label,
      trade: "",
      euros: line.amount_cents / 100,
      paid: line.paid,
      vendorUserId: line.vendor_user_id,
    });
  }
  return (
    <div className="grid gap-3">
      <header>
        <h1 className="font-serif text-4xl font-normal tracking-tight text-ink sm:text-5xl">Budget</h1>
        <p className="mt-1 text-sm text-muted">Visible seulement par vous.</p>
      </header>
      <BudgetBoard weddingId={id} totalCents={budget?.total_cents ?? 0} rows={rows} />
    </div>
  );
}
