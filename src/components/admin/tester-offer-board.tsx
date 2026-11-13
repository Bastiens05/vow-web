import { CopyInviteButton } from "@/components/admin/copy-invite-button";
import { TesterOfferForm } from "@/components/admin/tester-offer-form";
import { Button } from "@/components/ui/button";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { renderEmail } from "@/lib/domain/email-template";
import { planLabel, testerInviteHref, testerOfferLabel, type VendorPlan } from "@/lib/domain/plans";
import { siteUrl } from "@/lib/env";
import { revokeTesterGrant } from "@/server/actions/tester-grants";
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

const STATUS = {
  pending: "En attente",
  active: "Activée",
  revoked: "Révoquée",
} as const;

function typeLabel(grantType: "tester" | "lifetime") {
  return grantType === "lifetime" ? "Offert à vie" : "Testeur";
}

export function TesterOfferBoard({
  grants,
  preview,
  showForm = true,
  prefill,
}: {
  grants: TesterGrantRow[];
  preview?: TesterGrantRow | null;
  showForm?: boolean;
  prefill?: { email?: string; trade?: string; plan?: string };
}) {
  const shown = preview ?? grants.find((grant) => grant.status !== "revoked") ?? grants[0] ?? null;
  const rows = inviteRows(grants);
  return (
    <section className="mt-8 space-y-4">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        {showForm ? (
          <div id="inviter" className="rounded-3xl border border-line bg-paper p-5">
            <h2 className="text-lg font-semibold tracking-tight">Inviter</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Une invitation par e-mail ouvre une formule. Le paiement reste fermé.
            </p>
            <div className="mt-4">
              <TesterOfferForm key={prefill?.email ?? "nouvelle"} prefill={prefill} />
            </div>
          </div>
        ) : null}
        <div id="offre-testeur-liste" className="rounded-3xl border border-line bg-paper p-5">
          <h2 className="text-lg font-semibold tracking-tight">Invitations</h2>
          <ul className="mt-4 divide-y divide-line">
            {rows.length === 0 ? <li className="py-3 text-sm text-muted">Aucune invitation.</li> : null}
            {rows.map((row) => (
              <li key={row.key} className="py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.title}</p>
                    <p className="text-muted">{row.detail}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.copy ? <CopyInviteButton value={row.copy} label={row.copyLabel} /> : null}
                    {row.revoke ? (
                      <form action={row.revoke.action}>
                        <input type="hidden" name={row.revoke.name} value={row.revoke.id} />
                        <Button type="submit" variant="danger">
                          Révoquer
                        </Button>
                      </form>
                    ) : null}
                  </div>
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

type InviteListRow = {
  key: string;
  title: string;
  detail: string;
  copy: string | null;
  copyLabel: string;
  createdAt: string;
  revoke: { action: (formData: FormData) => Promise<void>; name: string; id: string } | null;
};

function inviteRows(grants: TesterGrantRow[]): InviteListRow[] {
  return grants.map((grant) => {
    const status = grant.status === "revoked" ? "revoked" : grant.status === "accepted" ? "active" : "pending";
    const name = [grant.first_name, grant.last_name].filter(Boolean).join(" ");
    const extra = [
      planLabel(grant.plan),
      typeLabel(grant.grant_type),
      STATUS[status],
      grant.status === "accepted" ? "1/1" : "0/1",
      testerOfferLabel(grant.free_until, grant.discount_percent, grant.grant_type),
      name,
      isVendorCategory(grant.trade) ? categoryLabel(grant.trade) : "",
    ].filter(Boolean);
    return {
      key: `email-${grant.id}`,
      title: grant.email,
      detail: extra.join(" · "),
      copy: `${siteUrl()}${testerInviteHref(grant.email, grant.token)}`,
      copyLabel: "Copier le lien",
      createdAt: grant.created_at,
      revoke: status === "revoked" ? null : { action: revokeTesterGrant, name: "grant_id", id: grant.id },
    };
  });
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
