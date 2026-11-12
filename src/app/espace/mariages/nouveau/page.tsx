import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WeddingForm } from "@/components/wedding/wedding-form";
import { Card } from "@/components/ui/card";
import { Container, PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Nouveau mariage" };

export default async function NewWeddingPage() {
  const session = await requireSession();
  if (session.profile.role !== "vendor") redirect("/espace");
  return (
    <Container>
      <PageHeader
        eyebrow="Mariage"
        title="Créer un mariage"
        description="Le prénom et le nom de chaque partenaire, la date et le lieu. L'e-mail envoie l'invitation tout de suite."
      />
      <Card>
        <WeddingForm />
      </Card>
    </Container>
  );
}
