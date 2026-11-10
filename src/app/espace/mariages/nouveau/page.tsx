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
        description="Les prénoms, la date et le lieu. Vous pourrez inviter le couple juste après."
      />
      <Card>
        <WeddingForm />
      </Card>
    </Container>
  );
}
