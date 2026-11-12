import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Landing } from "@/components/marketing/landing";
import { Pricing } from "@/components/marketing/pricing";
import { landingFor } from "@/lib/domain/auth-routing";
import { listMyWeddings } from "@/server/data";
import { getSession } from "@/server/session";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    const jar = await cookies();
    const raw = jar.get("vow-last-space")?.value;
    const lastSpace = raw === "vendor" || raw === "couple" ? raw : null;
    const weddings = await listMyWeddings(session.userId);
    const couple =
      weddings.find((wedding) => wedding.memberRole === "couple" && !wedding.is_demo) ??
      weddings.find((wedding) => wedding.memberRole === "couple");
    redirect(
      landingFor({
        role: session.profile.role,
        hasVendorProfile: Boolean(session.vendor),
        weddingId: couple?.id ?? null,
        hasCoupleMembership: Boolean(couple),
        lastSpace,
        nextPath: "",
        onboard: false,
      }),
    );
  }
  return (
    <>
      <Landing />
      <Pricing />
    </>
  );
}
