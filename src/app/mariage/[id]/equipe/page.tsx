import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { AddVendorInvite } from "@/components/wedding/invite-block";
import { QuoteIntake } from "@/components/wedding/quote-intake";
import { VendorBubbles, type VendorBubblePerson } from "@/components/wedding/vendor-bubbles";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { publicObjectUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Prestataires" };

export default async function DirectoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  const supabase = await createClient();
  const { data } = await supabase.rpc("wedding_directory", { p_wedding_id: id });
  const people = (data ?? []).filter((person) => (couple ? person.member_role === "vendor" : true));
  const logos = await logoMap(people.map((person) => person.user_id));

  if (couple) {
    const bubbles: VendorBubblePerson[] = people.map((person) => ({
      userId: person.user_id,
      businessName: person.business_name,
      fullName: person.full_name,
      category: person.category,
      phone: person.phone,
      email: person.email,
      logoUrl: logos.get(person.user_id) ?? null,
    }));
    return (
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Prestataires</h2>
        <p className="mt-1 text-sm text-muted">Appuyez sur un prestataire pour ouvrir son espace.</p>
        {bubbles.length === 0 ? <p className="mt-6 text-sm text-muted">Aucun prestataire pour l&apos;instant.</p> : null}
        <div className="mt-8">
          <VendorBubbles weddingId={id} people={bubbles} />
        </div>
        <AddVendorInvite weddingId={id} />
        <QuoteIntake weddingId={id} userId={space.session.userId} />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Équipe</h2>
        <p className="mt-1 text-sm text-muted">
          Chacun voit qui travaille sur ce mariage. Le téléphone et l&apos;e-mail n&apos;apparaissent que si le prestataire les a ouverts.
        </p>
      </div>
      {people.length === 0 ? <Card><p className="text-sm text-muted">Personne pour l&apos;instant.</p></Card> : null}
      {people.map((person) => {
        const trade = person.category && isVendorCategory(person.category) ? categoryLabel(person.category) : null;
        return (
          <Card key={person.user_id} className="space-y-2">
            <h3 className="text-xl font-semibold">{person.business_name || person.full_name}</h3>
            <p className="text-sm text-muted">
              {person.member_role === "couple" ? "Couple" : trade || "Prestataire"}
              {person.business_name ? ` · ${person.full_name}` : ""}
            </p>
            {person.phone ? <a className="block text-sm underline" href={`tel:${person.phone}`}>{person.phone}</a> : null}
            {person.email ? <a className="block text-sm underline" href={`mailto:${person.email}`}>{person.email}</a> : null}
          </Card>
        );
      })}
    </div>
  );
}

async function logoMap(userIds: string[]) {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase.from("vendor_profiles").select("user_id, logo_path").in("user_id", userIds);
  for (const row of data ?? []) {
    if (!row.logo_path) continue;
    const url = publicObjectUrl("vendor-media", row.logo_path);
    if (url) map.set(row.user_id, url);
  }
  return map;
}
