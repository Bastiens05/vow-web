import type { Metadata } from "next";
import { VaultBoard } from "@/components/wedding/vault-board";
import { HashScroll } from "@/components/ui/hash-scroll";
import { Alert } from "@/components/ui/alert";
import { VAULT_CHECKLIST } from "@/lib/domain/vault";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Coffre" };
export const dynamic = "force-dynamic";

export default async function VaultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  if (space.role !== "couple" && !space.actingAsCouple) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vault_items")
    .select("id, kind, label, file_name, storage_path")
    .eq("wedding_id", id)
    .order("created_at", { ascending: false });
  const stored = await Promise.all(
    (data ?? []).map(async (row) => {
      const signed = row.storage_path
        ? await supabase.storage.from("wedding-documents").createSignedUrl(row.storage_path, 60 * 30)
        : { data: null };
      return { id: row.id, kind: row.kind, label: row.label, file_name: row.file_name, url: signed.data?.signedUrl ?? null };
    }),
  );
  return (
    <div id="pieces" className="grid scroll-mt-24 gap-4">
      <HashScroll />
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Coffre</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Déposez une fois les pièces que les prestataires demandent. Vous les partagez ensuite, d&apos;un geste, dans leur espace.
        </p>
      </header>
      {error ? <Alert>{error.message}</Alert> : null}
      <VaultBoard weddingId={id} userId={space.session.userId} checklist={VAULT_CHECKLIST} stored={stored} />
    </div>
  );
}
