import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Équipe" };

export default async function DirectoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  const supabase = await createClient();
  const { data } = await supabase.rpc("wedding_directory", { p_wedding_id: id });
  const people = (data ?? []).filter((person) => (couple ? person.member_role === "vendor" : true));
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">{couple ? "Prestataires" : "Équipe"}</h2>
        <p className="mt-1 text-sm text-muted">
          {couple
            ? "Les prestataires de votre mariage, avec leur métier et un moyen de les joindre."
            : "Chacun voit qui travaille sur ce mariage. Le téléphone et l'e-mail n'apparaissent que si le prestataire les a ouverts."}
        </p>
      </Card>
      {people.length === 0 ? <Card><p className="text-sm text-muted">Aucun prestataire pour l&apos;instant.</p></Card> : null}
      {people.map((person) => {
        const trade = person.category && isVendorCategory(person.category) ? categoryLabel(person.category) : null;
        return (
          <Card key={person.user_id} className="space-y-2">
            <h3 className="text-xl font-semibold">{person.business_name || person.full_name}</h3>
            <p className="text-sm text-muted">
              {person.member_role === "couple" ? "Couple" : trade || "Prestataire"}
              {person.business_name ? ` · ${person.full_name}` : ""}
            </p>
            {person.phone ? (
              <a className="block text-sm underline" href={`tel:${person.phone}`}>
                {person.phone}
              </a>
            ) : null}
            {person.email ? (
              <a className="block text-sm underline" href={`mailto:${person.email}`}>
                {person.email}
              </a>
            ) : null}
            <Link href={`/mariage/${id}/messages?avec=${person.user_id}`} className="inline-flex min-h-11 items-center text-sm underline">
              Écrire
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
