import { CopyInviteButton } from "@/components/admin/copy-invite-button";
import { TesterOfferForm } from "@/components/admin/tester-offer-form";
import { Button } from "@/components/ui/button";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { renderEmail } from "@/lib/domain/email-template";
import { planLabel, testerInviteHref, testerOfferLabel, type VendorPlan } from "@/lib/domain/plans";
import { siteUrl } from "@/lib/env";
import { revokeShareCode, revokeTesterGrant } from "@/server/actions/tester-grants";
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

export type ShareCodeRow = {
  id: string;
  label: string;
  codeText: string | null;
  maxUses: number;
  useCount: number;
  expiresAt: string | null;
  grantType: "tester" | "lifetime" | null;
  plan: VendorPlan | null;
  discountPercent: number | null;
  revoked: boolean;
  createdAt: string;
};

const STATUS = {
  pending: "En attente",
  active: "Activée",
  revoked: "Révoquée",
} as const;

function typeLabel(grantType: "tester" | "lifetime" | null) {
  if (grantType === "lifetime") return "Offert à vie";
  if (grantType === "tester") return "Testeur";
  return "Ancien code";
}

export function TesterOfferBoard({
  grants,
  codes = [],
  preview,
  showForm = true,
}: {
  grants: TesterGrantRow[];
  codes?: ShareCodeRow[];
  preview?: TesterGrantRow | null;
  showForm?: boolean;
}) {
  const shown = preview ?? grants.find((grant) => grant.status !== "revoked") ?? grants[0] ?? null;
  const rows = inviteRows(grants, codes);
  return (
    <section className="mt-8 space-y-4">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        {showForm ? (
          <div id="inviter" className="rounded-3xl border border-line bg-paper p-5">
            <h2 className="text-lg font-semibold tracking-tight">Inviter</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Une invitation ouvre une formule, par e-mail ou par un code à partager. Le paiement reste fermé.
            </p>
            <div className="mt-4">
              <TesterOfferForm />
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

function inviteRows(grants: TesterGrantRow[], codes: ShareCodeRow[]): InviteListRow[] {
  const emails: InviteListRow[] = grants.map((grant) => {
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
  const shares: InviteListRow[] = codes.map((code) => {
    const status = code.revoked ? "revoked" : code.useCount > 0 ? "active" : "pending";
    const plan = code.plan ? planLabel(code.plan) : "Accès test";
    const until = code.expiresAt ? `saisir avant le ${new Date(code.expiresAt).toLocaleDateString("fr-FR")}` : "";
    return {
      key: `code-${code.id}`,
      title: code.codeText ?? `${code.label} · code non conservé`,
      detail: [plan, typeLabel(code.grantType), STATUS[status], `${code.useCount}/${code.maxUses}`, until].filter(Boolean).join(" · "),
      copy: code.codeText,
      copyLabel: "Copier le code",
      createdAt: code.createdAt,
      revoke: status === "revoked" ? null : { action: revokeShareCode, name: "code_id", id: code.id },
    };
  });
  return [...emails, ...shares].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
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
