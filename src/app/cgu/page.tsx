import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return (
    <LegalPage title="Conditions d'utilisation">
      <p>
        Les présentes conditions régissent l&apos;accès au service VOW, un espace en ligne qui relie un prestataire de mariage
        et les mariés autour d&apos;un même mariage : messages, documents, devis et factures. Elles sont proposées par Bastien Sellier,
        entrepreneur individuel (micro-entrepreneur), 45 Route de Cagnac, 33460 Arcins, France, SIRET 934 683 624 00019.
        TVA non applicable, article 293 B du CGI.
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
        même après la suppression du compte. Le paiement de l&apos;abonnement, lorsqu&apos;il est ouvert, est traité par Stripe Payments Europe, Limited.
        VOW ne prélève pas de commission sur les prestations convenues entre le prestataire et les mariés.
      </p>
      <h2 className="pt-4 text-xl font-semibold">Suppression et fin</h2>
      <p>
        Le compte se supprime depuis Réglages. La suppression retire les données du compte, sauf les factures déjà émises et les paiements
        qui y sont attachés. Le prestataire peut aussi cesser d&apos;utiliser une formule à tout moment. Le service peut être suspendu
        en cas d&apos;usage frauduleux ou d&apos;atteinte aux autres membres.
      </p>
      <h2 className="pt-4 text-xl font-semibold">Droit applicable</h2>
      <p>
        Les conditions sont soumises au droit français. À défaut d&apos;accord amiable, les tribunaux compétents sont déterminés selon les règles légales,
        sous réserve des règles protectrices du consommateur. Pour un litige de consommation non résolu, le médiateur est Médiation Professionnelle - Médiateur de la Consommation - Alteritae,
        5 rue Salvaing, 12000 Rodez (<a className="underline" href="https://alteritae.com">alteritae.com</a>).
        Contact : <a className="underline" href="mailto:contact@bastiensellier.com">contact@bastiensellier.com</a>, 06 89 11 80 12.
      </p>
    </LegalPage>
  );
}
