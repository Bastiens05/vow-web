import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { SeatBoard } from "@/components/wedding/seat-board";
import { createClient } from "@/lib/supabase/server";
import { addTable } from "@/server/actions/suite";
import { getWeddingSpace } from "@/server/data";

export default async function TablesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const editable = space.role === "couple" || space.actingAsCouple;
  const supabase = await createClient();
  const [{ data: tables }, { data: guests }, { data: seats }] = await Promise.all([
    supabase.from("seating_tables").select("id, name, capacity").eq("wedding_id", id).order("sort_order"),
    supabase.from("guests").select("id, full_name, dietary").eq("wedding_id", id).order("full_name"),
    supabase.from("seating_assignments").select("guest_id, table_id"),
  ]);
  const seatOf = new Map((seats ?? []).map((seat) => [seat.guest_id, seat.table_id]));
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Plan de table</h2>
        <p className="mt-1 text-sm text-muted">
          {editable
            ? "Glissez un invité sur une table, ou choisissez-la dans la liste. Le régime reste visible."
            : "Lecture seule : tables et régimes, selon votre métier."}
        </p>
        {editable ? (
          <form action={addTable} className="mt-4 flex items-end gap-2">
            <input type="hidden" name="wedding_id" value={id} />
            <Field label="Nouvelle table">
              <TextInput name="name" required placeholder="Table 1" />
            </Field>
            <Button type="submit" variant="secondary">
              Ajouter
            </Button>
          </form>
        ) : null}
      </Card>
      <SeatBoard
        weddingId={id}
        editable={editable}
        tables={tables ?? []}
        guests={(guests ?? []).map((guest) => ({
          id: guest.id,
          fullName: guest.full_name,
          diet: guest.dietary,
          tableId: seatOf.get(guest.id) ?? null,
        }))}
      />
    </div>
  );
}
