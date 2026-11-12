import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthDesktopFrame } from "@/components/auth/auth-frame";
import { NewPasswordForm } from "@/app/mot-de-passe/form";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function NewPasswordPage() {
  const session = await getSession();
  if (!session) redirect("/mot-de-passe-oublie");
  return (
    <AuthDesktopFrame>
      <div className="auth-screen flex min-h-[calc(100dvh-3.5rem)] w-full flex-col px-5 py-10 md:min-h-dvh md:justify-center lg:min-h-dvh lg:justify-start lg:px-16 lg:py-12">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm font-semibold tracking-[0.28em] lg:sr-only">VOW</p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">Nouveau mot de passe</h1>
          <p className="mt-2 text-base leading-7 text-muted">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>
          <div className="mt-8">
            <NewPasswordForm />
          </div>
        </div>
      </div>
    </AuthDesktopFrame>
  );
}
