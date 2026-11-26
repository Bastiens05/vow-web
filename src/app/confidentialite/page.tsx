import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Confidentialité" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Confidentialité">
      <p>
        Le responsable du traitement est [dénomination sociale], [adresse du siège], [adresse e-mail de contact].
        VOW traite des données pour créer les comptes, faire fonctionner l&apos;espace de mariage et, lorsque le paiement est ouvert, encaisser l&apos;abonnement.
      </p>
      <h2 className="pt-4 text-xl font-semibold">Données utilisées</h2>
      <p>
        Identité et contact (nom, e-mail, téléphone), informations du mariage (prénoms, date, lieu), messages, fichiers déposés,
        devis, factures et paiements enregistrés, données de connexion. Le mot de passe n&apos;est pas lisible par VOW : il est géré par le service d&apos;authentification.
      </p>
      <h2 className="pt-4 text-xl font-semibold">Sous-traitants</h2>
      <p>
        L&apos;application est hébergée par Vercel. La base de données, l&apos;authentification et les fichiers sont chez Supabase.
        Le paiement de l&apos;abonnement, lorsqu&apos;il est ouvert, est traité par Stripe. Ces prestataires peuvent traiter des données hors de l&apos;Union européenne
        avec les garanties prévues par le RGPD. Les adresses et les clauses contractuelles types sont à joindre : [coordonnées et garanties de Vercel],
        [coordonnées et garanties de Supabase], [coordonnées et garanties de Stripe].
      </p>
      <h2 className="pt-4 text-xl font-semibold">Durées</h2>
      <p>
        Les données du compte sont effacées ou anonymisées à la suppression du compte. Les factures émises et les paiements qui les justifient
        sont conservés dix ans, comme l&apos;exigent les obligations comptables françaises. Les journaux techniques sont conservés [durée des journaux].
      </p>
      <h2 className="pt-4 text-xl font-semibold">Droits</h2>
      <p>
        Vous pouvez demander l&apos;accès, la rectification, l&apos;effacement, la limitation, l&apos;opposition et la portabilité à [adresse e-mail de contact].
        Une facture déjà émise ne peut pas être effacée avant le délai légal. Vous pouvez saisir la CNIL. La suppression du compte se fait aussi directement dans Réglages.
      </p>
    </LegalPage>
  );
}
