import type { Metadata } from "next";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { WeddingDirectory } from "@/components/wedding/wedding-directory";
import { openCoupleDemo } from "@/server/actions/account";
import { listMyWeddings } from "@/server/data";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Mariages" };

export default async function WeddingsPage() {
  const session = await requireSession();
  const weddings = await listMyWeddings(session.userId);
  const vendor = session.profile.role === "vendor";
  const real = weddings.filter((wedding) => !wedding.is_demo);
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <PageHeader
        eyebrow={vendor ? "Espace prestataire" : "Espace mariés"}
        title="Mariages"
        description={vendor ? "Tous vos mariages, les plus proches d'abord. La démo reste à part." : "Les mariages auxquels vous participez."}
        actions={
          vendor && real.length > 0 ? (
            <ButtonLink href="/espace/mariages/nouveau">Nouveau mariage</ButtonLink>
          ) : null
        }
      />
      {real.length === 0 ? (
        <div className="mb-8">
          <EmptyState title="Aucun mariage pour l'instant">
            {vendor ? <ButtonLink href="/espace/mariages/nouveau">Créez votre premier mariage</ButtonLink> : <p>Une invitation vous ouvrira l&apos;espace.</p>}
          </EmptyState>
        </div>
      ) : null}
      {vendor ? (
        <form action={openCoupleDemo} className="mb-8">
          <Button type="submit" variant="secondary">
            Tester l&apos;espace mariés
          </Button>
        </form>
      ) : null}
      <WeddingDirectory weddings={weddings} />
    </div>
  );
}
