import { TesterOfferForm } from "@/components/admin/tester-offer-form";
import { Button } from "@/components/ui/button";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { renderEmail } from "@/lib/domain/email-template";
import { planLabel, testerInviteHref, testerOfferLabel, type VendorPlan } from "@/lib/domain/plans";
import { siteUrl } from "@/lib/env";
import { resendTesterGrant, revokeTesterGrant } from "@/server/actions/tester-grants";
import { testerGrantEmailContent } from "@/server/product-mail";

export type TesterGrantRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  trade: string;
  plan: VendorPlan;
  free_until: string | null;
  discount_percent: number | null;
  grant_type: "tester" | "lifetime";
  status: "invited" | "accepted" | "revoked";
  token: string;
  created_at: string;
  pending?: boolean;
};

const STATUS: Record<TesterGrantRow["status"], string> = {
  invited: "Invité",
  accepted: "Activée",
  revoked: "Révoquée",
};

function grantStatusLabel(grant: TesterGrantRow) {
  if (grant.status === "invited" && grant.pending) return "À activer";
  return STATUS[grant.status];
}

export function TesterOfferBoard({
  grants,
  preview,
  showForm = true,
}: {
  grants: TesterGrantRow[];
  preview?: TesterGrantRow | null;
  showForm?: boolean;
}) {
  const shown = preview ?? grants.find((grant) => grant.status !== "revoked") ?? grants[0] ?? null;
  return (
    <section className="mt-8 space-y-4">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        {showForm ? (
          <div id="offre-testeur-form" className="rounded-3xl border border-line bg-paper p-5">
            <h2 className="text-lg font-semibold tracking-tight">Offre testeur</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Testeur : un an offert, puis une remise. Offert à vie : la formule choisie, sans date de fin.
              Si le prestataire a déjà un compte, l&apos;offre apparaît dans sa cloche et il l&apos;active.
              Sinon, elle s&apos;applique à l&apos;inscription. Le paiement reste fermé.
            </p>
            <div className="mt-4">
              <TesterOfferForm />
            </div>
          </div>
        ) : null}
        <div id="offre-testeur-liste" className="rounded-3xl border border-line bg-paper p-5">
          <h2 className="text-lg font-semibold tracking-tight">Offres</h2>
          <ul className="mt-4 divide-y divide-line">
            {grants.length === 0 ? <li className="py-3 text-sm text-muted">Aucune offre.</li> : null}
            {grants.map((grant) => (
              <li key={grant.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{grant.email}</p>
                    <p className="text-muted">
                      {planLabel(grant.plan)} · {grant.grant_type === "lifetime" ? "Offert à vie" : "Testeur"} · {grantStatusLabel(grant)} ·{" "}
                      {testerOfferLabel(grant.free_until, grant.discount_percent, grant.grant_type)}
                      {grant.first_name || grant.last_name ? ` · ${[grant.first_name, grant.last_name].join(" ").trim()}` : ""}
                      {isVendorCategory(grant.trade) ? ` · ${categoryLabel(grant.trade)}` : ""}
                    </p>
                  </div>
                  {grant.status !== "revoked" ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={resendTesterGrant}>
                        <input type="hidden" name="grant_id" value={grant.id} />
                        <Button type="submit" variant="secondary">
                          Renvoyer
                        </Button>
                      </form>
                      <form action={revokeTesterGrant}>
                        <input type="hidden" name="grant_id" value={grant.id} />
                        <Button type="submit" variant="danger">
                          Révoquer
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {shown ? (
        <div id="offre-testeur-email" className="rounded-3xl border border-line bg-paper p-5">
          <h2 className="text-lg font-semibold tracking-tight">Aperçu de l&apos;invitation</h2>
          <p className="mt-2 text-sm text-muted">Le message n&apos;est envoyé que si le canal e-mail est ouvert.</p>
          <TesterEmailPreview grant={shown} />
        </div>
      ) : null}
    </section>
  );
}

export function TesterEmailPreview({ grant }: { grant: TesterGrantRow }) {
  const url = `${siteUrl()}${testerInviteHref(grant.email, grant.token)}`;
  const content = testerGrantEmailContent({
    firstName: grant.first_name,
    planLabel: planLabel(grant.plan),
    discountPercent: grant.discount_percent ?? 0,
    url,
    grantType: grant.grant_type,
  });
  const rendered = renderEmail(content);
  return (
    <iframe
      title={`Invitation pour ${grant.email}`}
      className="mt-4 h-[28rem] w-full rounded-2xl border border-line bg-ivory"
      sandbox=""
      srcDoc={rendered.html}
    />
  );
}
