import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CodeForm } from "@/app/admin/code-form";
import { categoryLabel } from "@/lib/domain/categories";
import type { VendorCategory } from "@/lib/domain/categories";
import { vendorAccess } from "@/lib/domain/billing";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  const session = await requireSession();
  if (!session.isAdmin) redirect("/espace");
  const supabase = await createClient();
  const [{ data: vendors }, { data: bills }, { data: profiles }, { data: codes }] = await Promise.all([
    supabase.from("vendor_profiles").select("id, business_name, category, city, user_id").order("business_name"),
    supabase.from("vendor_billing").select("vendor_id, status, trial_ends_at, tester_until"),
    supabase.from("profiles").select("id, email, full_name"),
    supabase.from("tester_codes").select("id, label, max_uses, use_count, expires_at, access_until").order("created_at", { ascending: false }),
  ]);
  const billByVendor = new Map((bills ?? []).map((bill) => [bill.vendor_id, bill]));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      <p className="text-xs font-medium text-gold-deep">Administration</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Prestataires</h1>
      <p className="mt-2 text-sm text-muted">Essais, abonnements et codes. Le code saisi ici n&apos;est pas conservé en clair.</p>
      <div className="mt-8 overflow-x-auto rounded-3xl border border-line bg-paper">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Activité</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Métier</th>
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
                  <td className="px-4 py-3">{accessLabel(access.reason, access.daysLeft, bill?.tester_until ?? null)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-line bg-paper p-5">
          <h2 className="text-lg font-semibold tracking-tight">Nouveau code</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Sans date de fin, l&apos;accès reste ouvert. Le nombre d&apos;utilisations est un maximum.
          </p>
          <div className="mt-4">
            <CodeForm />
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-paper p-5">
          <h2 className="text-lg font-semibold tracking-tight">Codes</h2>
          <ul className="mt-4 divide-y divide-line">
            {(codes ?? []).length === 0 ? <li className="py-3 text-sm text-muted">Aucun code.</li> : null}
            {(codes ?? []).map((code) => (
              <li key={code.id} className="py-3 text-sm">
                <p className="font-medium">{code.label}</p>
                <p className="text-muted">
                  {code.use_count}/{code.max_uses} utilisations
                  {code.access_until ? ` · jusqu'au ${new Date(code.access_until).toLocaleDateString("fr-FR")}` : " · sans date de fin"}
                  {code.expires_at ? ` · saisir avant le ${new Date(code.expires_at).toLocaleDateString("fr-FR")}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function accessLabel(reason: string, daysLeft: number | null, testerUntil: string | null): string {
  if (reason === "trial" && daysLeft !== null) return `Essai · ${daysLeft} j`;
  if (reason === "active") return "Abonné";
  if (reason === "tester") return testerUntil ? "Test daté" : "Test ouvert";
  return "Essai terminé";
}
