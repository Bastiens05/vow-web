import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/page-header";

export default function NotFound() {
  return (
    <Container narrow>
      <h1 className="font-semibold tracking-tight text-5xl">Page introuvable</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Ce lien ne correspond à aucune page, ou vous n&apos;y avez pas accès.</p>
      <div className="mt-6">
        <ButtonLink href="/">Retour à l&apos;accueil</ButtonLink>
      </div>
    </Container>
  );
}
