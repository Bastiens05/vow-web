import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales">
      <p>
        Éditeur : [dénomination sociale], [forme juridique], capital de [capital social] euros, siège [adresse du siège],
        SIRET [SIRET], RCS [ville du RCS], TVA [numéro de TVA intracommunautaire].
      </p>
      <p>Directeur de la publication : [nom du directeur de la publication].</p>
      <p>Contact : [adresse e-mail de contact], [téléphone].</p>
      <p>
        Hébergement de l&apos;application : Vercel Inc., [adresse de Vercel à confirmer].
        Hébergement des données et de l&apos;authentification : Supabase Inc., [adresse de Supabase à confirmer].
      </p>
      <p>
        Paiement : Stripe, [adresse de Stripe à confirmer], intervient lorsque le paiement de l&apos;abonnement est ouvert.
        VOW n&apos;encaisse pas les prestations convenues entre le prestataire et les mariés.
      </p>
      <p>
        Médiateur de la consommation : [nom et site du médiateur], pour les clients consommateurs qui en remplissent les conditions.
      </p>
    </LegalPage>
  );
}
