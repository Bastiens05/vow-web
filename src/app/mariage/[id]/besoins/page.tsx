import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { needConflicts } from "@/lib/domain/needs";
import { createClient } from "@/lib/supabase/server";
import { saveVenueLimit } from "@/server/actions/relay";
import { getWeddingSpace } from "@/server/data";
import { NeedsForm } from "./form";

export default async function NeedsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const [{ data: rows }, { data: limit }] = await Promise.all([
    supabase.from("technical_needs").select("*").eq("wedding_id", id),
    supabase.from("venue_limits").select("power_w, parking_note").eq("wedding_id", id).maybeSingle(),
  ]);
  const names = new Map(space.members.map((member) => [member.userId, member.fullName]));
  const conflicts = needConflicts(
    (rows ?? []).map((row) => ({
      userId: row.user_id,
      name: names.get(row.user_id) || "Prestataire",
      accessStart: row.access_start,
      accessEnd: row.access_end,
      parking: row.parking,
      powerW: row.power_w,
    })),
    limit?.power_w ?? null,
  );
  const mine = (rows ?? []).find((row) => row.user_id === space.session.userId) ?? null;
  const vendor = space.role === "vendor" && !space.actingAsCouple;
  const couple = space.actingAsCouple || space.role === "couple";
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Besoins techniques</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Chaque métier remplit sa fiche. Le couple et les prestataires voient l&apos;ensemble. Les conflits sont signalés.
        </p>
        <Link href={`/api/weddings/${id}/besoins`} className="mt-4 inline-flex min-h-11 items-center text-sm underline">
          PDF pour le lieu
        </Link>
      </Card>
      {conflicts.length > 0 ? (
        <Card>
          <h3 className="font-semibold">À vérifier</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {conflicts.map((conflict) => (
              <li key={conflict.message}>{conflict.message}</li>
            ))}
          </ul>
        </Card>
      ) : null}
      <ul className="grid gap-2">
        {(rows ?? []).map((row) => (
          <li key={row.user_id} className="rounded-2xl bg-paper px-4 py-3 text-sm">
            <p className="font-medium">{names.get(row.user_id) || "Prestataire"}</p>
            <p className="text-muted">
              {row.vehicle || "Véhicule non précisé"}
              {row.access_start ? ` · ${row.access_start.slice(0, 5)}–${row.access_end?.slice(0, 5) ?? ""}` : ""}
              {row.parking ? ` · ${row.parking}` : ""} · {row.power_w} W · {row.sockets} prises · {row.setup_minutes} min
            </p>
          </li>
        ))}
      </ul>
      {vendor ? (
        <Card>
          <NeedsForm weddingId={id} values={mine} />
        </Card>
      ) : null}
      {couple ? (
        <Card>
          <form action={saveVenueLimit} className="grid gap-3">
            <input type="hidden" name="wedding_id" value={id} />
            <Field label="Capacité électrique du lieu (W)">
              <TextInput name="power_w" inputMode="numeric" defaultValue={limit?.power_w ? String(limit.power_w) : ""} />
            </Field>
            <Field label="Note stationnement">
              <TextInput name="parking_note" defaultValue={limit?.parking_note ?? ""} />
            </Field>
            <Button type="submit" variant="secondary">
              Enregistrer le lieu
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
