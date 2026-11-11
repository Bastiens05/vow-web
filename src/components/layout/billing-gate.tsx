import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { subscriptionGate, vendorAccess } from "@/lib/domain/billing";
import { getSession } from "@/server/session";

export async function BillingGate({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-vow-path") ?? "";
  const session = await getSession();
  if (!session || session.profile.role !== "vendor") return children;

  const access = vendorAccess({
    role: "vendor",
    isAdmin: session.isAdmin,
    status: session.billing?.status ?? null,
    trialEndsAt: session.billing?.trial_ends_at ?? null,
    testerUntil: session.billing?.tester_until ?? null,
  });

  if (!access.allowed && subscriptionGate(path)) redirect("/abonnement");

  const notice =
    access.reason === "trial" && access.daysLeft !== null && path !== "/abonnement" ? (
      <p className="border-b border-line bg-paper px-5 py-2 text-center text-sm text-muted">
        Essai en cours · {access.daysLeft} jour{access.daysLeft > 1 ? "s" : ""} restant{access.daysLeft > 1 ? "s" : ""}.{" "}
        <Link href="/abonnement" className="text-ink underline">
          Voir l&apos;offre
        </Link>
      </p>
    ) : null;

  return (
    <>
      {notice}
      {children}
    </>
  );
}
