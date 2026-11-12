import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TesterOfferBoard, type TesterGrantRow } from "@/components/admin/tester-offer-board";
import { ButtonLink } from "@/components/ui/button";
import { categoryLabel } from "@/lib/domain/categories";
import type { VendorCategory } from "@/lib/domain/categories";
import { vendorAccess } from "@/lib/domain/billing";
import { effectiveVendorPlan, isVendorPlan, planLabel } from "@/lib/domain/plans";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; trade?: string; plan?: string }>;
}) {
  const query = await searchParams;
  const session = await requireSession();
  if (!session.isAdmin) redirect("/espace");
  const supabase = await createClient();
  const [{ data: vendors }, { data: bills }, { data: profiles }, { data: grants }, { data: notices }] = await Promise.all([
    supabase.from("vendor_profiles").select("id, business_name, category, city, user_id, weddings_per_year").order("business_name"),
    supabase.from("vendor_billing").select("vendor_id, status, trial_ends_at, tester_until, plan, comped"),
    supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: false }),
    supabase.from("tester_grants").select("id, email, first_name, last_name, trade, plan, free_until, discount_percent, grant_type, status, token, created_at").order("created_at", { ascending: false }),
    supabase.from("grant_notices").select("grant_id, activated_at"),
  ]);
  const pendingGrants = new Set((notices ?? []).filter((notice) => !notice.activated_at).map((notice) => notice.grant_id));
  const billByVendor = new Map((bills ?? []).map((bill) => [bill.vendor_id, bill]));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const vendorByUser = new Map((vendors ?? []).map((vendor) => [vendor.user_id, vendor]));
  const recent = (profiles ?? []).slice(0, 12);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      <p className="text-xs font-medium text-gold-deep">Administration</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Prestataires</h1>
      <p className="mt-2 text-sm text-muted">Essais, abonnements et invitations.</p>
      <div className="mt-8 overflow-x-auto rounded-3xl border border-line bg-paper">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Activité</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Métier</th>
              <th className="px-4 py-3 font-medium">Mariages / an</th>
              <th className="px-4 py-3 font-medium">Accès</th>
            </tr>
          </thead>
          <tbody>
            {(vendors ?? []).map((vendor) => {
              const bill = billByVendor.get(vendor.id);
              const person = profileById.get(vendor.user_id);
              const access = vendorAccess({
                role: "vendor",
                isAdmin: false,
                status: bill?.status ?? null,
                trialEndsAt: bill?.trial_ends_at ?? null,
                testerUntil: bill?.tester_until ?? null,
              });
              return (
                <tr key={vendor.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <p className="font-medium">{vendor.business_name}</p>
                    <p className="text-muted">{vendor.city}</p>
                  </td>
                  <td className="px-4 py-3">{person?.email}</td>
                  <td className="px-4 py-3">{categoryLabel(vendor.category as VendorCategory)}</td>
                  <td className="px-4 py-3">{vendor.weddings_per_year || "—"}</td>
                  <td className="px-4 py-3">{accessLabel(access.reason, access.daysLeft, bill?.tester_until ?? null)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Inscriptions récentes</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Chaque nouveau compte apparaît ici et dans la cloche. Inviter ouvre le formulaire avec l&apos;e-mail déjà rempli.
        </p>
        <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-paper">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Métier</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Formule</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-muted" colSpan={6}>
                    Aucune inscription.
                  </td>
                </tr>
              ) : null}
              {recent.map((person) => {
                const vendor = vendorByUser.get(person.id);
                const bill = vendor ? billByVendor.get(vendor.id) : null;
                const plan = bill?.plan && isVendorPlan(bill.plan) ? effectiveVendorPlan(bill.plan) : null;
                const trade = vendor?.category ?? "";
                const href = `/admin?email=${encodeURIComponent(person.email)}${trade ? `&trade=${encodeURIComponent(trade)}` : ""}${plan ? `&plan=${plan}` : ""}#inviter`;
                return (
                  <tr key={person.id} className="border-t border-line">
                    <td className="px-4 py-3">{person.email}</td>
                    <td className="px-4 py-3">{person.role === "vendor" ? "Prestataire" : "Mariés"}</td>
                    <td className="px-4 py-3">{vendor ? categoryLabel(vendor.category as VendorCategory) : "—"}</td>
                    <td className="px-4 py-3">{new Date(person.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3">{plan ? planLabel(plan, Boolean(bill?.comped)) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <ButtonLink href={href} variant="secondary">
                        Inviter
                      </ButtonLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <TesterOfferBoard
        prefill={{ email: query.email, trade: query.trade, plan: query.plan }}
        grants={(grants ?? []).flatMap((grant): TesterGrantRow[] =>
          isVendorPlan(grant.plan) ? [{ ...grant, plan: grant.plan, pending: pendingGrants.has(grant.id) }] : [],
        )}
      />
    </div>
  );
}

function accessLabel(reason: string, daysLeft: number | null, testerUntil: string | null): string {
  if (reason === "trial" && daysLeft !== null) return `Essai · ${daysLeft} j`;
  if (reason === "active") return "Abonné";
  if (reason === "tester") return testerUntil ? "Test daté" : "Test ouvert";
  return "Essai terminé";
}
