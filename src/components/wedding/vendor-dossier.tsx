import Link from "next/link";
import { PracticalBoard } from "@/components/wedding/practical-board";
import { SignaturePanel } from "@/components/wedding/signature-panel";
import { Card } from "@/components/ui/card";
import { categoryLabel, isVendorCategory, type VendorCategory } from "@/lib/domain/categories";
import { canSeeSheet } from "@/lib/domain/trades";
import { requestsFor } from "@/lib/domain/vault";
import { stripeEnabled } from "@/server/stripe";
import { createClient } from "@/lib/supabase/server";
import { getPracticalSheet } from "@/server/data";
import { shareVaultItem } from "@/server/actions/vault";

export async function VendorDossier({
  weddingId,
  vendorId,
  couple,
  businessName,
  fullName,
  category,
  phone,
  email,
  fallbackCategory,
}: {
  weddingId: string;
  vendorId: string;
  couple: boolean;
  businessName: string | null;
  fullName: string | null;
  category: string | null;
  phone: string | null;
  email: string | null;
  fallbackCategory: VendorCategory | null;
}) {
  const tradeCategory = category && isVendorCategory(category) ? category : fallbackCategory;
  const trade = tradeCategory ? categoryLabel(tradeCategory) : "Prestataire";
  const name = businessName || fullName || "Prestataire";
  const showPhotos = tradeCategory !== null && canSeeSheet("vendor", tradeCategory, "photos");
  const showGuests = tradeCategory !== null && canSeeSheet("vendor", tradeCategory, "guests");
  const sheet = await getPracticalSheet(weddingId, { photos: showPhotos, guests: showGuests });
  const supabase = await createClient();
  const { data: vault } = await supabase.from("vault_items").select("id, kind, label, file_name").eq("wedding_id", weddingId);
  const { data: shares } = await supabase.from("vault_shares").select("item_id, vendor_user_id").eq("vendor_user_id", vendorId);
  const shared = new Set((shares ?? []).map((row) => row.item_id));
  const items = vault ?? [];
  const requests = requestsFor(tradeCategory);
  const { data: profile } = await supabase.from("vendor_profiles").select("id").eq("user_id", vendorId).maybeSingle();
  const { data: deposits } = profile
    ? await supabase.from("deposits").select("id, amount_cents, status").eq("wedding_id", weddingId).eq("vendor_id", profile.id)
    : { data: [] };
  const { data: signatures } = await supabase.from("signature_requests").select("*").eq("wedding_id", weddingId).eq("requested_by", vendorId);
  const shareAction = shareVaultItem.bind(null, weddingId, {});

  return (
    <section id={vendorId} className="grid gap-4">
      <header>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">{trade}</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">
          {name} · {trade}
        </h2>
        {phone || email ? <p className="mt-2 text-sm text-muted">{[phone, email].filter(Boolean).join(" · ")}</p> : null}
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
                    <button type="submit" className="text-sm underline">Partager</button>
                  </form>
                ) : (
                  <span className="text-xs text-muted">{ready ? "Partagé" : couple ? "Dans le coffre" : "En attente"}</span>
                )}
              </li>
            );
          })}
        </ul>
        {couple ? (
          <Link href={`/mariage/${weddingId}/coffre`} className="mt-3 inline-flex min-h-11 items-center text-sm underline">
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
            {couple && request.status !== "signed" ? <SignaturePanel requestId={request.id} weddingId={weddingId} /> : null}
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
      </Card>
      <Card>
        <h3 className="text-lg font-semibold tracking-tight">Messages</h3>
        <Link href={`/mariage/${weddingId}/messages?avec=${vendorId}`} className="mt-3 inline-flex min-h-11 items-center text-sm underline">
          Ouvrir la conversation
        </Link>
      </Card>
      {showPhotos || showGuests ? (
        <Card>
          <h3 className="mb-4 text-lg font-semibold tracking-tight">{showPhotos ? "Photos de groupe" : "Invités, tables et régimes"}</h3>
          <PracticalBoard
            weddingId={weddingId}
            practical={null}
            groups={sheet.groups}
            guests={sheet.guests}
            canEditDetails={false}
            showDetails={false}
            showPhotos={showPhotos}
            showGuests={showGuests}
            canEditPhotos={couple && showPhotos}
            canEditGuests={couple && showGuests}
            photosId={`${vendorId}-photos`}
            guestsId={`${vendorId}-guests`}
          />
        </Card>
      ) : null}
    </section>
  );
}
