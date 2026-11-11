import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatSlotTime } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { toggleRain } from "@/server/actions/relay";
import { getWeddingSpace } from "@/server/data";
import { RainForms } from "./forms";

export default async function RainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const [{ data: plan }, { data: stops }, { data: slots }] = await Promise.all([
    supabase.from("rain_plans").select("active").eq("wedding_id", id).maybeSingle(),
    supabase.from("rain_stops").select("id, label, address").eq("wedding_id", id).order("sort_order"),
    supabase.from("rain_slots").select("id, title, starts_at, place").eq("wedding_id", id).order("starts_at"),
  ]);
  const couple = space.actingAsCouple || space.role === "couple";
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Plan pluie</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          {plan?.active
            ? "Le plan pluie est en cours. La carte et le jour J le montrent."
            : "Préparez les lieux et les horaires de repli. Un geste les active pour tout le monde."}
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {(stops ?? []).map((stop) => (
            <li key={stop.id}>
              {stop.label} — {stop.address}
            </li>
          ))}
          {(slots ?? []).map((slot) => (
            <li key={slot.id}>
              {formatSlotTime(slot.starts_at)} · {slot.title}
              {slot.place ? ` · ${slot.place}` : ""}
            </li>
          ))}
        </ul>
        {couple ? (
          <form action={toggleRain} className="mt-4 grid gap-3">
            <input type="hidden" name="wedding_id" value={id} />
            <input type="hidden" name="active" value={plan?.active ? "off" : "on"} />
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name="confirm" required className="h-5 w-5" />
              Je confirme : {plan?.active ? "revenir au plan prévu" : "basculer tout le mariage"}
            </label>
            <Button type="submit">{plan?.active ? "Retirer le plan pluie" : "Activer le plan pluie"}</Button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted">Seul le couple active ou retire le plan.</p>
        )}
      </Card>
      {couple ? (
        <Card>
          <RainForms weddingId={id} />
        </Card>
      ) : null}
    </div>
  );
}
