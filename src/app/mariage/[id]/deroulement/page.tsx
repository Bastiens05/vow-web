import type { Metadata } from "next";
import { TimelineBoard } from "@/components/wedding/timeline-board";
import { Card } from "@/components/ui/card";
import { canManageTimeline } from "@/lib/domain/access";
import { getWeddingSpace, listTimeline } from "@/server/data";

export const metadata: Metadata = { title: "Déroulé" };

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const slots = await listTimeline(id, space.session.userId);
  return (
    <Card>
      <h2 className="font-serif text-3xl">Déroulé du jour</h2>
      <p className="mt-1 mb-6 text-sm text-muted">Les moments, dans l&apos;ordre de la journée.</p>
      <TimelineBoard weddingId={id} slots={slots} canEdit={canManageTimeline(space.role)} />
    </Card>
  );
}
