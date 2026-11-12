import { BudgetBoard, type BudgetRow } from "@/components/wedding/budget-board";
import { Card } from "@/components/ui/card";
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
        <h2 className="text-3xl font-semibold tracking-tight">Budget</h2>
        <p className="mt-2 text-sm text-muted">Le budget reste chez les mariés. Les prestataires ne le voient pas.</p>
      </Card>
    );
  }
  const supabase = await createClient();
  const [{ data: budget }, { data: lines }, { data: directory }, { data: quotes }] = await Promise.all([
    supabase.from("wedding_budgets").select("total_cents").eq("wedding_id", id).maybeSingle(),
    supabase.from("budget_lines").select("id, label, amount_cents, paid, vendor_user_id, sort_order").eq("wedding_id", id).order("sort_order"),
    supabase.rpc("wedding_directory", { p_wedding_id: id }),
    supabase.from("quotes").select("vendor_id, amount_cents, status").eq("wedding_id", id).in("status", ["accepted", "invoiced"]),
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
  const usedVendors = new Set<string>();
  const rows: BudgetRow[] = [];
  for (const person of vendors) {
    const line = (lines ?? []).find((item) => item.vendor_user_id === person.user_id);
    const trade = person.category && isVendorCategory(person.category) ? categoryLabel(person.category) : "Prestataire";
    usedVendors.add(person.user_id);
    rows.push({
      key: person.user_id,
      id: line?.id ?? null,
      label: person.business_name || person.full_name || trade,
      trade,
      euros: (line?.amount_cents ?? quoted.get(person.user_id) ?? 0) / 100,
      paid: line?.paid ?? false,
      vendorUserId: person.user_id,
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
        <h2 className="text-3xl font-semibold tracking-tight">Budget</h2>
        <p className="mt-1 text-sm text-muted">Visible seulement par vous.</p>
      </header>
      <BudgetBoard weddingId={id} totalCents={budget?.total_cents ?? 0} rows={rows} />
    </div>
  );
}
