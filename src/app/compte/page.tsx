import type { Metadata } from "next";
import { signOut } from "@/server/actions/auth";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Compte" };

export default async function AccountPage() {
  const session = await requireSession();
  const vendor = session.profile.role === "vendor";
  return (
    <div className="mx-auto w-full max-w-lg px-5 py-8">
      <PageHeader eyebrow="Compte" title={session.profile.full_name || "Votre compte"} description={session.profile.email} />
      <Card className="space-y-4">
        <p className="text-sm text-muted">{vendor ? "Compte prestataire" : "Compte couple"}</p>
        {vendor ? (
          <ButtonLink href="/espace/profil" variant="secondary">
            Modifier la vitrine
          </ButtonLink>
        ) : null}
        <form action={signOut}>
          <button type="submit" className="min-h-11 text-sm text-muted underline">
            Se déconnecter
          </button>
        </form>
      </Card>
    </div>
  );
}
