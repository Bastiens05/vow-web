import type { Metadata } from "next";
import { TemplatePicker } from "@/components/wedding/template-picker";
import { TimelineBoard } from "@/components/wedding/timeline-board";
import { Card } from "@/components/ui/card";
import { suggestedTemplateId } from "@/lib/domain/timeline-templates";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace, listTimeline } from "@/server/data";

export const metadata: Metadata = { title: "Déroulé" };

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const slots = await listTimeline(id, space.session.userId);
  const supabase = await createClient();
  const [{ data: personal }, { data: suggestions }] = await Promise.all([
    supabase.from("timeline_templates").select("id, name").eq("user_id", space.session.userId).order("created_at", { ascending: false }),
    supabase.from("timeline_suggestions").select("id, label, created_at").eq("wedding_id", id).order("created_at", { ascending: false }).limit(1),
  ]);
  const suggestion = suggestions?.[0] ?? null;
  return (
    <Card>
      <h2 className="font-semibold tracking-tight text-3xl">Déroulé du jour</h2>
      <p className="mt-1 mb-6 text-sm text-muted">
        {space.actingAsCouple
          ? "Les moments, dans l'ordre de la journée."
          : "Lecture seule. Le couple tient le déroulé. Vous pouvez suggérer un modèle."}
      </p>
      <TemplatePicker
        weddingId={id}
        canApply={space.actingAsCouple}
        suggestedId={suggestedTemplateId(space.actingAsCouple ? null : (space.session.vendor?.category ?? null))}
        personal={personal ?? []}
        suggestion={suggestion}
      />
      <TimelineBoard weddingId={id} slots={slots} canEdit={space.actingAsCouple} />
    </Card>
  );
}
