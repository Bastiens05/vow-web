import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PracticalBoard } from "@/components/wedding/practical-board";
import { SignaturePanel } from "@/components/wedding/signature-panel";
import { Card } from "@/components/ui/card";
import { categoryLabel, isVendorCategory, type VendorCategory } from "@/lib/domain/categories";
import { canSeeSheet } from "@/lib/domain/trades";
import { requestsFor } from "@/lib/domain/vault";
import { stripeEnabled } from "@/server/stripe";
import { createClient } from "@/lib/supabase/server";
import { getPracticalSheet, getWeddingSpace } from "@/server/data";
import { shareVaultItem } from "@/server/actions/vault";

export const metadata: Metadata = { title: "Bulle" };

export default async function BubblePage({ params }: { params: Promise<{ id: string; vendorId: string }> }) {
  const { id, vendorId } = await params;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  if (!couple && space.session.userId !== vendorId) notFound();
  const supabase = await createClient();
  const { data: directory } = await supabase.rpc("wedding_directory", { p_wedding_id: id });
  const person = (directory ?? []).find((row) => row.user_id === vendorId && row.member_role === "vendor");
  if (!person && !couple) notFound();
  const category = person?.category && isVendorCategory(person.category) ? person.category : space.session.vendor?.category ?? null;
  const trade = category ? categoryLabel(category) : "Prestataire";
  const showPhotos = canSeeSheet(couple ? "couple" : "vendor", couple ? category : category, "photos") && category !== null && canSeeSheet("vendor", category as VendorCategory, "photos");
  const showGuests = category !== null && canSeeSheet("vendor", category as VendorCategory, "guests");
  const sheet = await getPracticalSheet(id, { photos: showPhotos, guests: showGuests });
  const { data: vault } = await supabase.from("vault_items").select("id, kind, label, file_name").eq("wedding_id", id);
  const { data: shares } = await supabase.from("vault_shares").select("item_id, vendor_user_id").eq("vendor_user_id", vendorId);
  const shared = new Set((shares ?? []).map((row) => row.item_id));
  const items = vault ?? [];
  const requests = requestsFor(category);
  const { data: profile } = await supabase.from("vendor_profiles").select("id, business_name").eq("user_id", vendorId).maybeSingle();
  const { data: deposits } = profile
    ? await supabase.from("deposits").select("id, amount_cents, status, due_on").eq("wedding_id", id).eq("vendor_id", profile.id)
    : { data: [] };
  const { data: signatures } = await supabase.from("signature_requests").select("*").eq("wedding_id", id).eq("requested_by", vendorId);
  const shareAction = shareVaultItem.bind(null, id, {});

  return (
    <div className="grid gap-4">
      <header>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">{trade}</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">{person?.business_name || profile?.business_name || "Votre bulle"}</h2>
        {person?.phone || person?.email ? (
          <p className="mt-2 text-sm text-muted">{[person?.phone, person?.email].filter(Boolean).join(" · ")}</p>
        ) : null}
      </header>
      <Card>
        <h3 className="text-lg font-semibold tracking-tight">Documents demandés</h3>
        <ul className="mt-4 divide-y divide-line">
          {requests.map((request) => {
            const match = items.find((item) => item.kind === request.kind);
            const ready = Boolean(match && shared.has(match.id));
            return (
              <li key={request.kind} className="flex items-center justify-between gap-3 py-3">
                <span className="inline-flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${ready ? "bg-ok" : "bg-danger"}`} aria-hidden />
                  {request.label}
                </span>
                {couple && match && !ready ? (
                  <form action={async (formData) => { await shareAction(formData); }}>
                    <input type="hidden" name="item_id" value={match.id} />
                    <input type="hidden" name="vendor_user_id" value={vendorId} />
                    <button type="submit" className="text-sm underline active:opacity-70">Partager</button>
                  </form>
                ) : (
                  <span className="text-xs text-muted">{ready ? "Partagé" : couple ? "Dans le coffre" : "En attente"}</span>
                )}
              </li>
            );
          })}
        </ul>
        {couple ? (
          <Link href={`/mariage/${id}/coffre`} className="mt-3 inline-flex min-h-11 items-center text-sm underline">
            Ouvrir le coffre
          </Link>
        ) : null}
      </Card>
      <Card>
        <h3 className="text-lg font-semibold tracking-tight">Contrats</h3>
        {(signatures ?? []).length === 0 ? <p className="mt-3 text-sm text-muted">Aucun contrat à signer.</p> : null}
        {(signatures ?? []).map((request) => (
          <div key={request.id} className="mt-4 border-t border-line pt-4">
            <p className="text-sm">{request.status === "signed" ? "Signé" : "À signer"}</p>
            {couple && request.status !== "signed" ? <SignaturePanel requestId={request.id} weddingId={id} /> : null}
          </div>
        ))}
      </Card>
      <Card>
        <h3 className="text-lg font-semibold tracking-tight">Paiement</h3>
        {(deposits ?? []).length === 0 ? <p className="mt-3 text-sm text-muted">Aucun acompte pour l&apos;instant.</p> : null}
        <ul className="mt-3 space-y-2 text-sm">
          {(deposits ?? []).map((deposit) => (
            <li key={deposit.id}>{(deposit.amount_cents / 100).toLocaleString("fr-FR")} € · {deposit.status}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">{stripeEnabled() ? "Le paiement en ligne est ouvert." : "Paiement bientôt disponible."}</p>
        <Link href={`/mariage/${id}/devis`} className="mt-2 inline-flex min-h-11 items-center text-sm underline">Voir les devis</Link>
      </Card>
      <Card>
        <h3 className="text-lg font-semibold tracking-tight">Messages</h3>
        <Link href={`/mariage/${id}/messages?avec=${vendorId}`} className="mt-3 inline-flex min-h-11 items-center text-sm underline">
          Ouvrir la conversation
        </Link>
      </Card>
      {showPhotos || showGuests ? (
        <Card>
          <h3 className="mb-4 text-lg font-semibold tracking-tight">{showPhotos ? "Photos de groupe" : "Invités, tables et régimes"}</h3>
          <PracticalBoard
            weddingId={id}
            practical={null}
            groups={sheet.groups}
            guests={sheet.guests}
            canEditDetails={false}
            showDetails={false}
            showPhotos={showPhotos}
            showGuests={showGuests}
            canEditPhotos={couple && showPhotos}
            canEditGuests={couple && showGuests}
          />
        </Card>
      ) : null}
    </div>
  );
}
