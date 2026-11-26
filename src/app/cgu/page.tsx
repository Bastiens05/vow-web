import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return (
    <LegalPage title="Conditions d'utilisation">
      <p>
        Les présentes conditions régissent l&apos;accès au service VOW, un espace en ligne qui relie un prestataire de mariage
        et les mariés autour d&apos;un même mariage : messages, documents, devis et factures. Elles sont proposées par [dénomination sociale],
        [forme juridique] au capital de [capital social] euros, dont le siège est [adresse du siège], immatriculée sous le SIRET [SIRET]
        (RCS [ville du RCS]).
      </p>
      <h2 className="pt-4 text-xl font-semibold">Compte</h2>
      <p>
        L&apos;inscription demande une adresse e-mail et un mot de passe d&apos;au moins 8 caractères. Le compte est personnel.
        Le prestataire choisit une formule (Essentiel, Pro ou Studio). Les mariés ne paient pas l&apos;accès au service.
        L&apos;essai, l&apos;offre testeur et l&apos;offre offerte sont décrits au moment de l&apos;invitation.
      </p>
      <h2 className="pt-4 text-xl font-semibold">Contenu et factures</h2>
      <p>
        Chacun reste responsable des informations qu&apos;il dépose. Une facture émise est figée : son numéro, son montant,
        l&apos;identité du vendeur et le nom du client ne sont plus modifiés. VOW conserve ces factures le temps exigé par la loi,
        même après la suppression du compte. Le paiement en ligne, lorsqu&apos;il est ouvert, passe par Stripe. VOW ne prélève pas de commission
        sur les prestations convenues entre le prestataire et les mariés.
      </p>
      <h2 className="pt-4 text-xl font-semibold">Suppression et fin</h2>
      <p>
        Le compte se supprime depuis Réglages. La suppression retire les données du compte, sauf les factures déjà émises et les paiements
        qui y sont attachés. [nom du prestataire] peut aussi cesser d&apos;utiliser une formule à tout moment. Le service peut être suspendu
        en cas d&apos;usage frauduleux ou d&apos;atteinte aux autres membres.
      </p>
      <h2 className="pt-4 text-xl font-semibold">Droit applicable</h2>
      <p>
        Les conditions sont soumises au droit français. À défaut d&apos;accord amiable, les tribunaux du ressort de [ville du tribunal compétent] sont compétents,
        sous réserve des règles protectrices du consommateur. Contact : [adresse e-mail de contact].
      </p>
    </LegalPage>
  );
}
