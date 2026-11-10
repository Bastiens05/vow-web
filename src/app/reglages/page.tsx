import type { Metadata } from "next";
import { SignOutButton } from "@/components/layout/sign-out-button";
import {
  AccountNameForm,
  BusinessForm,
  LogoField,
  NotificationForm,
  PasswordForm,
} from "@/components/account/settings-forms";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { openCoupleDemo } from "@/server/actions/account";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const session = await requireSession();
  const vendor = session.profile.role === "vendor";
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-5 py-8">
      <PageHeader
        eyebrow={vendor ? "Espace prestataire" : "Espace mariés"}
        title="Réglages"
        description="Le compte, l'activité et la sortie."
      />
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Compte</h2>
        <p className="text-sm text-muted">E-mail de connexion : {session.email}</p>
        <AccountNameForm name={session.profile.full_name} />
      </Card>
      {vendor ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Activité</h2>
          <BusinessForm
            businessName={session.vendor?.business_name ?? ""}
            category={session.vendor?.category ?? "photographer"}
            city={session.vendor?.city ?? ""}
            phone={session.vendor?.contact_phone ?? ""}
          />
          {session.vendor ? <LogoField userId={session.userId} logoPath={session.vendor.logo_path} /> : null}
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/espace/profil" variant="secondary">
              Ouvrir la vitrine
            </ButtonLink>
            {session.vendor?.published ? (
              <ButtonLink href={`/p/${session.vendor.slug}`} variant="secondary">
                Voir la page publique
              </ButtonLink>
            ) : null}
          </div>
        </Card>
      ) : null}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Alertes</h2>
        <NotificationForm inApp={session.profile.notify_in_app} push={session.profile.notify_push} />
      </Card>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Mot de passe</h2>
        <PasswordForm />
      </Card>
      {vendor ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Essai mariés</h2>
          <p className="text-sm leading-6 text-muted">
            Un mariage démo, à votre nom, séparé de vos clients. Vous y testez l&apos;espace mariés, puis vous pouvez le supprimer.
          </p>
          <form action={openCoupleDemo}>
            <Button type="submit">Tester l&apos;espace mariés</Button>
          </form>
        </Card>
      ) : null}
      <Card>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Sortie</h2>
        <SignOutButton />
      </Card>
    </div>
  );
}
