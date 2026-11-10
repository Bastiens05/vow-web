import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OffersEditor } from "@/components/vendor/offers-editor";
import { PhotoManager } from "@/components/vendor/photo-manager";
import { ProfileForm } from "@/components/vendor/profile-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { getVendorEditor } from "@/server/data";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Ma vitrine" };

export default async function ProfilePage() {
  const session = await requireSession();
  if (session.profile.role !== "vendor") redirect("/espace");
  const { vendor, offers, photos } = await getVendorEditor(session.userId);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        eyebrow="Vitrine"
        title="Votre page publique"
        description="Ce que les couples voient avant même d'être invités dans un mariage."
        actions={
          vendor?.published ? (
            <ButtonLink href={`/p/${vendor.slug}`} variant="secondary">
              Voir la page
            </ButtonLink>
          ) : null
        }
      />
      <Card>
        <ProfileForm vendor={vendor} />
      </Card>
      {vendor ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="font-semibold tracking-tight text-3xl">Offres</h2>
            <p className="mt-1 mb-4 text-sm text-muted">Les formules affichées sur la page publique.</p>
            <OffersEditor offers={offers} />
          </Card>
          <Card>
            <h2 className="font-semibold tracking-tight text-3xl">Portfolio</h2>
            <p className="mt-1 mb-4 text-sm text-muted">JPG, PNG ou WebP, 8 Mo maximum.</p>
            <PhotoManager vendorId={vendor.id} userId={session.userId} photos={photos} />
          </Card>
        </div>
      ) : null}
    </div>
  );
}
