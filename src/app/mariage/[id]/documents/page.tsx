import type { Metadata } from "next";
import { DocumentManager } from "@/components/wedding/document-manager";
import { VaultPicker } from "@/components/wedding/vault-picker";
import { isVendorVaultCategory } from "@/lib/domain/vendor-vault";
import { AddVendorInvite } from "@/components/wedding/invite-block";
import { PracticalBoard } from "@/components/wedding/practical-board";
import { VendorDossier } from "@/components/wedding/vendor-dossier";
import { documentAuthorLabel } from "@/lib/domain/document-author";
import { isVendorCategory } from "@/lib/domain/categories";
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
    const [{ data }, { data: quotes }, documents, { data: requests }, { data: vaultItems }] = await Promise.all([
      supabase.rpc("wedding_directory", { p_wedding_id: id }),
      supabase.from("quote_intakes").select("id, email, business_name, file_name, storage_path, status").eq("wedding_id", id).eq("status", "sent"),
      listDocuments(id),
      supabase.from("signature_requests").select("*").eq("wedding_id", id),
      supabase.from("vault_items").select("id, label, file_name").eq("wedding_id", id),
    ]);
    const vendors = (data ?? []).filter((person) => person.member_role === "vendor");
    const photo = vendors.some((person) => person.category === "photographer" || person.category === "videographer" || person.category === "planner");
    const guests = vendors.some((person) => person.category === "caterer" || person.category === "venue" || person.category === "planner");
    const names = authorNames(space.session.userId, data ?? [], space.members);
    return (
      <div className="grid min-w-0 gap-4">
        <HashScroll />
        <header className="min-w-0">
          <h1 className="font-serif text-4xl font-normal tracking-tight text-balance text-ink sm:text-5xl">Documents</h1>
          <p className="mt-2 max-w-prose text-[13px] leading-5 text-pretty text-ink">Un espace par prestataire.</p>
        </header>
        {vendors.length === 0 ? (
          <Card>
            <p className="text-[13px] text-ink">Aucun prestataire pour l&apos;instant.</p>
            <AddVendorInvite weddingId={id} />
          </Card>
        ) : null}
        <Card className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight">Documents du mariage</h3>
          <p className="mt-1 text-sm leading-6 text-muted">Les fichiers déposés par le couple et les prestataires.</p>
          <div className="mt-4">
            <DocumentManager
              weddingId={id}
              userId={space.session.userId}
              documents={documents}
              names={names}
              requests={requests ?? []}
              canRequest={false}
              canSign
              manage={false}
            />
          </div>
          {(vaultItems ?? []).length > 0 ? (
            <p className="mt-4 text-sm text-muted">
              Coffre : {(vaultItems ?? []).map((item) => item.file_name || item.label).join(", ")}.{" "}
              <a href={`/mariage/${id}/coffre`} className="underline">Ouvrir le coffre</a>
            </p>
          ) : null}
        </Card>
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
  const { data: vaultFiles } = space.session.vendor
    ? await supabase
        .from("vendor_vault_files")
        .select("id, title, category, expires_on, alert_days")
        .eq("vendor_id", space.session.vendor.id)
        .order("title")
    : { data: [] };
  const fileIds = (vaultFiles ?? []).map((file) => file.id);
  const { data: vaultShares } = fileIds.length
    ? await supabase.from("vendor_vault_shares").select("file_id").eq("wedding_id", id).in("file_id", fileIds)
    : { data: [] };
  const sharedIds = new Set((vaultShares ?? []).map((row) => row.file_id));
  const today = new Date().toISOString().slice(0, 10);
  const { data: directory } = await supabase.rpc("wedding_directory", { p_wedding_id: id });
  const names = authorNames(space.session.userId, directory ?? [], space.members);
  return (
    <div className="mx-auto grid w-full min-w-0 max-w-3xl gap-4">
      <header className="min-w-0">
        <h1 className="font-serif text-4xl font-normal tracking-tight text-balance text-ink sm:text-5xl">Documents</h1>
        <p className="mt-2 max-w-prose break-words text-[13px] leading-5 text-pretty text-ink">
          Visibles uniquement par les membres de ce mariage. Une signature demandée ici est une signature électronique simple (eIDAS SES).
        </p>
      </header>
      {space.session.vendor && space.session.vendor.user_id === space.session.userId ? (
        <Card>
        <VaultPicker
          weddingId={id}
          today={today}
          files={(vaultFiles ?? []).flatMap((file) =>
            isVendorVaultCategory(file.category)
              ? [
                  {
                    id: file.id,
                    title: file.title,
                    category: file.category,
                    expiresOn: file.expires_on,
                    alertDays: file.alert_days,
                    shared: sharedIds.has(file.id),
                  },
                ]
              : [],
          )}
          vendors={space.members
            .filter((member) => member.role === "vendor" && member.userId !== space.session.userId)
            .map((member) => ({ userId: member.userId, label: member.fullName }))}
        />
        </Card>
      ) : null}
      <Card>
        <h3 className="text-lg font-semibold tracking-tight">Documents du mariage</h3>
        <div className="mt-4">
          <DocumentManager
            weddingId={id}
            userId={space.session.userId}
            documents={documents}
            names={names}
            requests={requests ?? []}
            canRequest={space.host}
            canSign={space.actingAsCouple}
          />
        </div>
      </Card>
    </div>
  );
}

function authorNames(
  viewerId: string,
  directory: { user_id: string; member_role: string; category: string | null }[],
  members: { userId: string; role: string }[],
): Record<string, string> {
  const byUser = new Map(directory.map((person) => [person.user_id, person]));
  const names: Record<string, string> = {};
  for (const member of members) {
    const person = byUser.get(member.userId);
    names[member.userId] = documentAuthorLabel({
      uploadedBy: member.userId,
      viewerId,
      role: person?.member_role ?? member.role,
      category: person?.category && isVendorCategory(person.category) ? person.category : null,
    });
  }
  return names;
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
