import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cancelAppointment } from "@/server/actions/suite";
import { requireSession } from "@/server/session";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function AppointmentsPage() {
  const session = await requireSession();
  if (!session.vendor) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("id, full_name, email, starts_at, status, note")
    .eq("vendor_id", session.vendor.id)
    .order("starts_at", { ascending: true });
  return (
    <div className="mx-auto w-full max-w-lg px-5 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Rendez-vous</h1>
      <p className="mt-2 text-sm text-muted">Les créneaux se règlent dans Réglages. Annuler ne prévient pas par SMS.</p>
      <ul className="mt-6 grid gap-3">
        {(data ?? []).map((row) => (
          <li key={row.id}>
            <Card>
              <p className="font-medium">{row.full_name}</p>
              <p className="text-sm text-muted">
                {new Date(row.starts_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} · {row.status === "confirmed" ? "Confirmé" : "Annulé"}
              </p>
              {row.note ? <p className="mt-2 text-sm">{row.note}</p> : null}
              {row.status === "confirmed" && session.vendor?.user_id === session.userId ? (
                <form action={cancelAppointment} className="mt-3">
                  <input type="hidden" name="id" value={row.id} />
                  <Button type="submit" variant="secondary">
                    Annuler
                  </Button>
                </form>
              ) : null}
            </Card>
          </li>
        ))}
        {(data ?? []).length === 0 ? <li className="text-sm text-muted">Aucun rendez-vous.</li> : null}
      </ul>
    </div>
  );
}
