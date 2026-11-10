import type { Metadata } from "next";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { WeddingDirectory } from "@/components/wedding/wedding-directory";
import { openCoupleDemo } from "@/server/actions/account";
import { listMyWeddings } from "@/server/data";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Mariages" };

export default async function WeddingsPage() {
  const session = await requireSession();
  const weddings = await listMyWeddings(session.userId);
  const vendor = session.profile.role === "vendor";
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <PageHeader
        eyebrow={vendor ? "Espace prestataire" : "Espace mariés"}
        title="Mariages"
        description={vendor ? "Tous vos mariages, les plus proches d'abord. La démo reste à part." : "Les mariages auxquels vous participez."}
        actions={
          vendor ? (
            <ButtonLink href="/espace/mariages/nouveau">Nouveau mariage</ButtonLink>
          ) : null
        }
      />
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
