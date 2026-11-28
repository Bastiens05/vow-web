import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { landingFor } from "@/lib/domain/auth-routing";
import { listMyWeddings } from "@/server/data";
import { getSession } from "@/server/session";

/** Sends a signed-in person to the couple space or the vendor space. */
export async function redirectSignedInHome(): Promise<void> {
  const session = await getSession();
  if (!session) return;
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
