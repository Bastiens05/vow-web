import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { GalleryManager } from "@/components/wedding/gallery-manager";
import { formatFileSize, formatLongDate } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Galerie" };

function canOpenGallery(actingAsCouple: boolean, category: string | null | undefined): boolean {
  if (actingAsCouple) return true;
  return category === "photographer" || category === "videographer";
}

function linkClosed(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return Date.parse(expiresAt) < Date.now();
}

export default async function GalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const allowed = canOpenGallery(space.actingAsCouple, space.session.vendor?.category);
  if (!allowed) {
    return (
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Galerie</h2>
        <p className="mt-2 text-sm text-muted">Cette galerie est réservée au couple, au photographe et au vidéaste.</p>
      </Card>
    );
  }
  const supabase = await createClient();
  const { data: deliveries } = await supabase.from("deliveries").select("*").eq("wedding_id", id).order("created_at", { ascending: false });
  const deliveryIds = (deliveries ?? []).map((delivery) => delivery.id);
  const { data: files } = deliveryIds.length
    ? await supabase.from("delivery_files").select("*").in("delivery_id", deliveryIds)
    : { data: [] };
  const canUpload = !space.actingAsCouple && (space.session.vendor?.category === "photographer" || space.session.vendor?.category === "videographer");
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Galerie</h2>
        <p className="mt-1 text-sm text-muted">Les fichiers finaux du photographe et du vidéaste. Les autres métiers ne les voient pas.</p>
      </Card>
      {(deliveries ?? []).map((delivery) => {
        const expired = linkClosed(delivery.expires_at);
        const rows = (files ?? []).filter((file) => file.delivery_id === delivery.id);
        return (
          <Card key={delivery.id} className="space-y-3">
            <h3 className="text-xl font-semibold">{delivery.title}</h3>
            <p className="text-sm text-muted">
              {delivery.expires_at ? `Jusqu'au ${formatLongDate(delivery.expires_at)}` : "Sans date de fin"}
              {expired ? " · Lien expiré" : ""}
            </p>
            <ul className="space-y-2">
              {rows.map((file) => (
                <li key={file.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">{file.file_name} · {formatFileSize(file.size_bytes)}</span>
                  {expired ? (
                    <span className="text-sm text-muted">Indisponible</span>
                  ) : (
                    <a className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm" href={`/api/deliveries/${file.id}`}>
                      Télécharger
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
      {canUpload && space.session.vendor ? (
        <GalleryManager weddingId={id} userId={space.session.userId} vendorId={space.session.vendor.id} />
      ) : null}
    </div>
  );
}
