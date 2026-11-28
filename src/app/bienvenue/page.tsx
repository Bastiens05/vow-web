import { redirect } from "next/navigation";
import { WelcomeForm } from "@/app/bienvenue/welcome-form";
import { getSession } from "@/server/session";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ etape?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.profile.role !== "vendor") redirect("/espace");
  const params = await searchParams;
  return (
    <WelcomeForm
      logo={params.etape === "logo"}
      userId={session.userId}
      logoPath={session.vendor?.logo_path ?? null}
    />
  );
}
