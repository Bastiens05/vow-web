import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Documents" };

export default async function BubblesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  if (!couple && space.session.profile.role === "vendor") {
    redirect(`/mariage/${id}/bulle/${space.session.userId}`);
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("wedding_directory", { p_wedding_id: id });
  const vendors = (data ?? []).filter((person) => person.member_role === "vendor");
  return (
    <div className="grid gap-3">
      <h2 className="text-3xl font-semibold tracking-tight">Documents</h2>
      <p className="text-sm text-muted">Un espace par prestataire. Vous n&apos;y mettez que ce qui le concerne.</p>
      {vendors.length === 0 ? <p className="text-sm text-muted">Aucun prestataire pour l&apos;instant.</p> : null}
      {vendors.map((person) => {
        const trade = person.category && isVendorCategory(person.category) ? categoryLabel(person.category) : "Prestataire";
        return (
          <Link
            key={person.user_id}
            href={`/mariage/${id}/bulle/${person.user_id}`}
            className="rounded-3xl border border-line bg-paper px-5 py-5 transition active:scale-[0.99]"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-muted">{trade}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">{person.business_name || person.full_name}</p>
          </Link>
        );
      })}
    </div>
  );
}
