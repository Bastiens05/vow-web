import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales">
      <p>
        Éditeur : Bastien Sellier, entrepreneur individuel (micro-entrepreneur), 45 Route de Cagnac, 33460 Arcins, France.
        SIRET 934 683 624 00019. TVA non applicable, article 293 B du CGI.
      </p>
      <p>Directeur de la publication : Bastien Sellier.</p>
      <p>
        Contact : <a className="underline" href="mailto:contact@bastiensellier.com">contact@bastiensellier.com</a>, 06 89 11 80 12.
      </p>
      <p>
        Hébergement de l&apos;application : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
        Hébergement des données, de l&apos;authentification et des fichiers : Supabase Pte. Ltd., 65 Chulia Street #38-02/03, OCBC Centre, Singapore 049513.
      </p>
      <p>
        Paiement de l&apos;abonnement, lorsqu&apos;il est ouvert : Stripe Payments Europe, Limited, One Wilton Park, Wilton Place, Dublin 2, D02 FX04, Irlande.
        VOW n&apos;encaisse pas les prestations convenues entre le prestataire et les mariés.
      </p>
      <p>
        Médiateur de la consommation : Médiation Professionnelle - Médiateur de la Consommation - Alteritae, 5 rue Salvaing, 12000 Rodez.
        Site : <a className="underline" href="https://alteritae.com">alteritae.com</a>.
        Le recours au médiateur est ouvert aux clients consommateurs, après une réclamation écrite restée sans solution.
      </p>
      <p>
        Le service est soumis au droit français. À défaut d&apos;accord amiable, les tribunaux compétents sont déterminés selon les règles légales.
      </p>
    </LegalPage>
  );
}
