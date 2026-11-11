import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { formatEuros } from "@/lib/domain/money";
import { createClient } from "@/lib/supabase/server";
import { saveBudget } from "@/server/actions/suite";
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
  const [{ data: budget }, { data: lines }] = await Promise.all([
    supabase.from("wedding_budgets").select("total_cents").eq("wedding_id", id).maybeSingle(),
    supabase.from("budget_lines").select("id, label, amount_cents").eq("wedding_id", id).order("sort_order"),
  ]);
  const spent = (lines ?? []).reduce((sum, line) => sum + line.amount_cents, 0);
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Budget</h2>
        <p className="mt-1 text-sm text-muted">Visible seulement par vous. Rien n&apos;est envoyé aux prestataires.</p>
        <p className="mt-4 text-sm text-muted">Global {formatEuros(budget?.total_cents ?? 0)} · réparti {formatEuros(spent)}</p>
        <BudgetForm weddingId={id} total={budget?.total_cents ?? 0} />
      </Card>
      <ul className="grid gap-2">
        {(lines ?? []).map((line) => (
          <li key={line.id} className="flex min-h-11 items-center justify-between rounded-2xl bg-paper px-4">
            <span>{line.label}</span>
            <span className="text-sm text-muted">{formatEuros(line.amount_cents)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BudgetForm({ weddingId, total }: { weddingId: string; total: number }) {
  return (
    <form action={saveBudget} className="mt-4 grid gap-3">
      <input type="hidden" name="wedding_id" value={weddingId} />
      <Field label="Budget global (€)">
        <TextInput name="total" inputMode="decimal" defaultValue={total ? String(total / 100) : ""} required />
      </Field>
      <Field label="Ligne (facultatif)">
        <TextInput name="label" placeholder="Traiteur" />
      </Field>
      <Field label="Montant de la ligne (€)">
        <TextInput name="amount" inputMode="decimal" />
      </Field>
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}
