import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/page-header";

const points = [
  {
    title: "Une vitrine",
    text: "Nom, métier, ville, photos et premières offres. Une page publique par prestataire, quel que soit le métier.",
  },
  {
    title: "Une invitation",
    text: "Le prestataire crée le mariage et envoie un lien. Le couple crée son compte et rejoint l'espace, sans code partagé.",
  },
  {
    title: "Le jour J",
    text: "Messages, documents et déroulé au même endroit, visibles seulement par les membres de ce mariage.",
  },
];

export default function HomePage() {
  return (
    <Container>
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-deep">Prestataires & couples</p>
      <h1 className="mt-3 max-w-3xl font-serif text-5xl font-medium leading-tight tracking-tight sm:text-6xl">
        Le mariage, dans un seul espace.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
        VOW relie photographes, DJ, fleuristes, traiteurs, lieux, wedding planners et équipes beauté à leurs couples :
        vitrine, invitation, messages, documents et déroulé du jour.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/inscription">Créer mon espace</ButtonLink>
        <ButtonLink href="/connexion" variant="secondary">
          J&apos;ai déjà un compte
        </ButtonLink>
      </div>
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {points.map((point) => (
          <article key={point.title} className="rounded-2xl border border-line bg-paper p-5">
            <h2 className="font-serif text-3xl">{point.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{point.text}</p>
          </article>
        ))}
      </div>
      <p className="mt-10 text-sm text-muted">Imaginé près de Bordeaux, pour tous les métiers du mariage.</p>
    </Container>
  );
}
