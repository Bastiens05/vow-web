import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ensureRsvp } from "@/server/actions/suite";
import { getWeddingSpace } from "@/server/data";

export default async function RsvpManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  const supabase = await createClient();
  const { data: page } = couple
    ? await supabase.from("rsvp_pages").select("token, enabled").eq("wedding_id", id).maybeSingle()
    : { data: null };
  const { data: answers } = couple
    ? await supabase.from("rsvp_answers").select("id, full_name, attending, diet").eq("wedding_id", id).order("created_at", { ascending: false })
    : { data: [] };
  if (!couple) {
    return (
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Réponses</h2>
        <p className="mt-2 text-sm text-muted">Les mariés partagent le lien. Le traiteur voit les régimes dans les invités.</p>
      </Card>
    );
  }
  const link = page ? `${siteUrl()}/rsvp/${page.token}` : "";
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Réponses des invités</h2>
        <p className="mt-1 text-sm text-muted">Sans compte. La présence et le régime alimentent la liste d&apos;invités.</p>
        {page ? (
          <p className="mt-4 break-all text-sm">{link}</p>
        ) : (
          <form action={ensureRsvp} className="mt-4">
            <input type="hidden" name="wedding_id" value={id} />
            <Button type="submit">Créer le lien</Button>
          </form>
        )}
      </Card>
      <ul className="grid gap-2">
        {(answers ?? []).map((answer) => (
          <li key={answer.id} className="rounded-2xl bg-paper px-4 py-3">
            <p className="font-medium">{answer.full_name}</p>
            <p className="text-sm text-muted">{answer.attending ? "Présent" : "Absent"}{answer.diet ? ` · ${answer.diet}` : ""}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
