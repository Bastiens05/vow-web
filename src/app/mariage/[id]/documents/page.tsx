import type { Metadata } from "next";
import { DocumentManager } from "@/components/wedding/document-manager";
import { AddVendorInvite } from "@/components/wedding/invite-block";
import { PracticalBoard } from "@/components/wedding/practical-board";
import { VendorDossier } from "@/components/wedding/vendor-dossier";
import { coupleFullNames } from "@/lib/domain/format";
import { HashScroll } from "@/components/ui/hash-scroll";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getPracticalSheet, getWeddingSpace, listDocuments } from "@/server/data";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  const supabase = await createClient();
  if (couple) {
    const [{ data }, { data: quotes }] = await Promise.all([
      supabase.rpc("wedding_directory", { p_wedding_id: id }),
      supabase.from("quote_intakes").select("id, email, business_name, file_name, storage_path, status").eq("wedding_id", id).eq("status", "sent"),
    ]);
    const vendors = (data ?? []).filter((person) => person.member_role === "vendor");
    const photo = vendors.some((person) => person.category === "photographer" || person.category === "videographer" || person.category === "planner");
    const guests = vendors.some((person) => person.category === "caterer" || person.category === "venue" || person.category === "planner");
    return (
      <div className="grid gap-10">
        <HashScroll />
        <header>
          <h2 className="text-3xl font-semibold tracking-tight">Documents</h2>
          <FullNames wedding={space.wedding} />
          <p className="mt-1 text-sm text-muted">Un espace par prestataire.</p>
        </header>
        {vendors.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Aucun prestataire pour l&apos;instant.</p>
            <AddVendorInvite weddingId={id} />
          </Card>
        ) : null}
        {(quotes ?? []).length > 0 ? (
          <Card>
            <h3 className="text-lg font-semibold">Devis déposés</h3>
            <ul className="mt-3 grid gap-2 text-sm">
              {(quotes ?? []).map((quote) => (
                <li key={quote.id}>{quote.business_name || quote.file_name} · {quote.email}</li>
              ))}
            </ul>
          </Card>
        ) : null}
        {vendors.map((person) => (
          <VendorDossier
            key={person.user_id}
            weddingId={id}
            vendorId={person.user_id}
            couple
            businessName={person.business_name}
            fullName={person.full_name}
            category={person.category}
            phone={person.phone}
            email={person.email}
            fallbackCategory={null}
          />
        ))}
        {!photo ? <OrphanSheet weddingId={id} kind="photos" /> : null}
        {!guests ? <OrphanSheet weddingId={id} kind="guests" /> : null}
      </div>
    );
  }
  const documents = await listDocuments(id);
  const { data: requests } = await supabase.from("signature_requests").select("*").eq("wedding_id", id);
  const names = Object.fromEntries(space.members.map((member) => [member.userId, member.fullName]));
  return (
    <Card>
      <h2 className="font-semibold tracking-tight text-3xl">Documents</h2>
      <FullNames wedding={space.wedding} />
      <p className="mt-1 mb-5 text-sm leading-6 text-muted">
        Visibles uniquement par les membres de ce mariage. Une signature demandée ici est une signature électronique simple (eIDAS SES).
      </p>
      <DocumentManager
        weddingId={id}
        userId={space.session.userId}
        documents={documents}
        names={names}
        requests={requests ?? []}
        canRequest={space.host}
        canSign={space.actingAsCouple}
      />
    </Card>
  );
}

function FullNames({ wedding }: { wedding: { partner_one_name: string; partner_one_last_name: string | null; partner_two_name: string; partner_two_last_name: string | null } }) {
  const full = coupleFullNames(wedding.partner_one_name, wedding.partner_one_last_name, wedding.partner_two_name, wedding.partner_two_last_name);
  if (!full) return null;
  return <p className="mt-1 text-sm text-muted">{full}</p>;
}

async function OrphanSheet({ weddingId, kind }: { weddingId: string; kind: "photos" | "guests" }) {
  const sheet = await getPracticalSheet(weddingId, { photos: kind === "photos", guests: kind === "guests" });
  return (
    <Card>
      <PracticalBoard
        weddingId={weddingId}
        practical={null}
        groups={sheet.groups}
        guests={sheet.guests}
        canEditDetails={false}
        showDetails={false}
        showPhotos={kind === "photos"}
        showGuests={kind === "guests"}
        canEditPhotos={kind === "photos"}
        canEditGuests={kind === "guests"}
      />
    </Card>
  );
}
