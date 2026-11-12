import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanPicker, SubscribeButton } from "@/app/abonnement/offer";
import { TesterOfferBoard, type TesterGrantRow } from "@/components/admin/tester-offer-board";
import { planLabel, testerOfferLabel } from "@/lib/domain/plans";

export const metadata: Metadata = { title: "Aperçu des offres" };

const invited: TesterGrantRow = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "alex.photographe@example.com",
  first_name: "Alex",
  last_name: "Martin",
  trade: "photographer",
  plan: "studio",
  free_until: "2027-11-12T12:00:00.000Z",
  discount_percent: 30,
  status: "invited",
  token: "apercu-token-invite",
  created_at: "2026-11-12T12:00:00.000Z",
};

const accepted: TesterGrantRow = {
  ...invited,
  id: "22222222-2222-2222-2222-222222222222",
  email: "camille.studio@example.com",
  first_name: "Camille",
  last_name: "Bernard",
  status: "accepted",
  token: "apercu-token-accepted",
};

export default function OffersPreviewPage() {
  if (process.env.SCREENSHOT_PREVIEWS !== "true") notFound();
  return (
    <div className="bg-ivory text-ink">
      <div id="apercu-admin" className="mx-auto w-full max-w-5xl px-5 py-8">
        <p className="text-xs font-medium text-gold-deep">Administration</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Prestataires</h1>
        <p className="mt-2 text-sm text-muted">Aperçu de l&apos;offre testeur, sans envoi d&apos;e-mail.</p>
        <TesterOfferBoard grants={[invited, accepted]} preview={invited} />
      </div>
      <div id="apercu-abonnement" className="mx-auto w-full max-w-3xl px-5 py-8">
        <p className="text-xs font-medium text-gold-deep">Prestataires</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Trois formules.</h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted">
          Studio comprend Pro, qui comprend Essentiel. Les mariés ne paient jamais. Le paiement en ligne reste fermé.
        </p>
        <div className="mt-8">
          <PlanPicker current="studio" comped={false} />
        </div>
        <section className="mt-4 rounded-3xl border border-line bg-paper p-6">
          <p className="text-sm text-muted">Studio Camille · Photographe</p>
          <p className="mt-3 text-lg font-semibold">Votre formule : {planLabel("studio")}</p>
          <p className="mt-3 text-sm leading-6">{testerOfferLabel(accepted.free_until, accepted.discount_percent)}</p>
          <div className="mt-6">
            <SubscribeButton enabled={false} />
          </div>
        </section>
      </div>
    </div>
  );
}
