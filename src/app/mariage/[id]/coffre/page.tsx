import type { Metadata } from "next";
import { VaultBoard } from "@/components/wedding/vault-board";
import { VAULT_CHECKLIST } from "@/lib/domain/vault";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Coffre" };

export default async function VaultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  if (space.role !== "couple" && !space.actingAsCouple) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("vault_items").select("id, kind, label, file_name").eq("wedding_id", id);
  return (
    <div className="grid gap-4">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Coffre</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Déposez une fois les pièces que les prestataires demandent. Vous les partagez ensuite, d&apos;un geste, dans leur espace.
        </p>
      </header>
      <VaultBoard weddingId={id} userId={space.session.userId} checklist={VAULT_CHECKLIST} stored={data ?? []} />
    </div>
  );
}
