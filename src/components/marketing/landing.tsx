import Link from "next/link";

const features = [
  {
    title: "Le relais",
    text: "Une étape est prête. La personne suivante est prévenue, dans l'application.",
    visual: Relay,
  },
  {
    title: "Le plan pluie",
    text: "Le couple bascule le plan. Toute l'équipe voit les nouveaux lieux.",
    visual: Rain,
  },
  {
    title: "Les besoins techniques",
    text: "Accès, puissance, stationnement. Le lieu et les prestataires lisent la même fiche.",
    visual: Needs,
  },
  {
    title: "L'alerte météo",
    text: "Quand elle est activée, un dépassement de seuil rappelle le plan pluie. Rien ne part tout seul.",
    visual: Weather,
  },
  {
    title: "La recommandation suivie",
    text: "Un prestataire en recommande un autre. Le clic et la demande restent visibles.",
    visual: Referral,
  },
];

export function Landing() {
  return (
    <div>
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] text-white/60">VOW</p>
            <h1 className="mt-5 max-w-xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Du premier contact au jour J.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
              Un seul espace pour les prestataires de mariage. La vitrine, le couple, le déroulé, et les outils que les
              agendas ne font pas.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/inscription?role=vendor"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-ink"
              >
                Je suis prestataire
              </Link>
              <Link
                href="/inscription?role=couple"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-5 text-sm font-medium text-white"
              >
                Nous nous marions
              </Link>
            </div>
            <Link href="/connexion" className="mt-6 inline-flex min-h-11 items-center text-sm text-white/60">
              J&apos;ai déjà un compte
            </Link>
          </div>
          <RelayCard />
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-deep">Pour les prestataires</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Ce qui change vraiment le jour du mariage.
        </h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-6">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={`flex flex-col justify-between rounded-3xl border border-line bg-paper p-5 ${index === 0 ? "lg:col-span-4" : "lg:col-span-2"} ${index > 0 ? "lg:min-h-64" : ""}`}
            >
              <div>{feature.visual()}</div>
              <div className="mt-6">
                <h3 className="text-xl font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{feature.text}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-10 text-sm text-muted">Imaginé près de Bordeaux, pour tous les métiers du mariage.</p>
      </section>
    </div>
  );
}

function RelayCard() {
  return (
    <div className="rounded-[2rem] bg-white p-6 text-ink shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
      <p className="text-xs font-medium text-gold-deep">Jour J · aperçu</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">Le relais avance.</p>
      <ol className="mt-6 space-y-3">
        <li className="flex items-center justify-between rounded-2xl bg-ivory px-4 py-3">
          <span>Préparatifs</span>
          <span className="text-xs font-medium">Prêt</span>
        </li>
        <li className="flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-white">
          <span>Cérémonie</span>
          <span className="text-xs">À vous</span>
        </li>
        <li className="flex items-center justify-between rounded-2xl bg-ivory px-4 py-3 text-muted">
          <span>Cocktail</span>
          <span className="text-xs">Ensuite</span>
        </li>
      </ol>
    </div>
  );
}

function Relay() {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="rounded-full bg-ink px-3 py-1 text-white">Préparatifs</span>
      <span className="text-muted">→</span>
      <span className="rounded-full border border-line px-3 py-1">Cérémonie</span>
      <span className="text-muted">→</span>
      <span className="rounded-full border border-line px-3 py-1 text-muted">Cocktail</span>
    </div>
  );
}

function Rain() {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="rounded-2xl bg-ivory px-3 py-4 text-muted">Soleil</div>
      <div className="rounded-2xl bg-ink px-3 py-4 text-white">Pluie</div>
    </div>
  );
}

function Needs() {
  return (
    <ul className="space-y-2 text-sm">
      <li className="flex justify-between border-b border-line py-2">
        <span className="text-muted">Puissance</span>
        <span>16 A</span>
      </li>
      <li className="flex justify-between border-b border-line py-2">
        <span className="text-muted">Accès</span>
        <span>Cour</span>
      </li>
      <li className="flex justify-between py-2">
        <span className="text-muted">Stationnement</span>
        <span>Cour intérieure</span>
      </li>
    </ul>
  );
}

function Weather() {
  return (
    <div className="rounded-2xl bg-ivory px-4 py-4 text-sm">
      <p className="font-medium">Samedi · pluie au-dessus du seuil</p>
      <p className="mt-1 text-muted">Le plan pluie est prêt à être activé.</p>
    </div>
  );
}

function Referral() {
  return (
    <div className="text-sm">
      <p>Atelier → Fleurs</p>
      <p className="mt-2 text-muted">Demande arrivée depuis la recommandation.</p>
    </div>
  );
}
