import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Confidentialité" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Confidentialité">
      <p>
        Le responsable du traitement est Bastien Sellier, entrepreneur individuel (micro-entrepreneur), 45 Route de Cagnac, 33460 Arcins, France,
        joignable à <a className="underline" href="mailto:contact@bastiensellier.com">contact@bastiensellier.com</a>.
        VOW traite des données pour créer les comptes, faire fonctionner l&apos;espace de mariage et, lorsque le paiement est ouvert, encaisser l&apos;abonnement.
      </p>
      <h2 className="pt-4 text-xl font-semibold">Données utilisées</h2>
      <p>
        Identité et contact (nom, e-mail, téléphone), informations du mariage (prénoms, date, lieu), messages, fichiers déposés,
        devis, factures et paiements enregistrés, données de connexion. Le mot de passe n&apos;est pas lisible par VOW : il est géré par le service d&apos;authentification.
      </p>
      <h2 className="pt-4 text-xl font-semibold">Sous-traitants</h2>
      <p>
        L&apos;application est hébergée par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
        Vercel est certifié au EU-U.S. Data Privacy Framework. Son accord de traitement prévoit aussi les clauses contractuelles types de la Commission européenne (décision 2021/914).
      </p>
      <p>
        La base de données, l&apos;authentification et les fichiers sont traités par Supabase Pte. Ltd., 65 Chulia Street #38-02/03, OCBC Centre, Singapore 049513.
        Les données peuvent être stockées aux États-Unis et à Singapour. Ces transferts sont encadrés par les clauses contractuelles types approuvées par la Commission européenne, incorporées à l&apos;accord de traitement de Supabase.
      </p>
      <p>
        Le paiement de l&apos;abonnement, lorsqu&apos;il est ouvert, est traité par Stripe Payments Europe, Limited, One Wilton Park, Wilton Place, Dublin 2, D02 FX04, Irlande.
        Les données personnelles transférées aux États-Unis sont reçues par Stripe, LLC dans le cadre du EU-U.S. Data Privacy Framework.
        À défaut, les clauses contractuelles types de la Commission européenne s&apos;appliquent.
      </p>
      <h2 className="pt-4 text-xl font-semibold">Durées</h2>
      <p>
        Les données du compte sont effacées ou anonymisées à la suppression du compte. Les factures émises et les paiements qui les justifient
        sont conservés dix ans, comme l&apos;exigent les obligations comptables françaises. Les journaux techniques sont conservés 12 mois.
      </p>
      <h2 className="pt-4 text-xl font-semibold">Droits</h2>
      <p>
        Vous pouvez demander l&apos;accès, la rectification, l&apos;effacement, la limitation, l&apos;opposition et la portabilité à contact@bastiensellier.com.
        Une facture déjà émise ne peut pas être effacée avant le délai légal. Vous pouvez saisir la CNIL. La suppression du compte se fait aussi directement dans Réglages.
      </p>
    </LegalPage>
  );
}
