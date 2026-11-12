import type { Metadata } from "next";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ShareForm } from "@/components/account/share-form";
import { PhoneFactorForm } from "@/components/account/phone-factor";
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
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { rotateCalendar } from "@/server/actions/suite";
import { requireSession } from "@/server/session";
import { ClientDocumentSettings } from "@/components/account/client-document-settings";
import { documentSuggestions } from "@/lib/domain/client-documents";
import { isVendorCategory } from "@/lib/domain/categories";
import { AvailabilityForm, TeamInviteForm } from "./extras";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const session = await requireSession();
  const vendor = session.profile.role === "vendor";
  const owner = Boolean(session.vendor && session.vendor.user_id === session.userId);
  const supabase = await createClient();
  const { data: templates } = owner && session.vendor
    ? await supabase
        .from("vendor_document_templates")
        .select("id, title, note, required, offset_days")
        .eq("vendor_id", session.vendor.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };
  const { data: feedToken } = await supabase.rpc("ensure_calendar_feed");
  const feed = feedToken ? `${siteUrl()}/api/calendar/${feedToken}` : "";
  const webcal = feed.replace(/^https?:/, "webcal:");
  const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-5 py-8 lg:max-w-3xl">
      <PageHeader
        eyebrow={vendor ? "Espace prestataire" : "Réglages"}
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
          {session.vendor ? (
            <ShareForm sharePhone={session.vendor.share_phone} shareEmail={session.vendor.share_email} />
          ) : null}
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
      {owner && session.vendor ? (
        <Card>
          <ClientDocumentSettings
            templates={(templates ?? []).map((item) => ({
              id: item.id,
              title: item.title,
              note: item.note,
              required: item.required,
              offsetDays: item.offset_days,
            }))}
            suggestions={documentSuggestions(isVendorCategory(session.vendor.category) ? session.vendor.category : null)}
          />
        </Card>
      ) : null}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Nouveautés</h2>
        <NotificationForm
          calm
          inApp={session.profile.notify_in_app}
          push={session.profile.notify_push}
          email={session.profile.notify_email}
          reminders={session.profile.notify_reminders}
        />
      </Card>
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Calendrier</h2>
        <p className="text-sm leading-6 text-muted">
          Un lien privé, révocable. Il liste {vendor ? "vos mariages" : "votre mariage"}, les étapes du jour J et vos rendez-vous. Aucun compte Google n&apos;est requis.
        </p>
        {feed ? (
          <>
            <p className="break-all text-xs text-muted">{feed}</p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={google} variant="secondary">
                Ajouter à Google Agenda
              </ButtonLink>
              <ButtonLink href={webcal} variant="secondary">
                Apple Calendrier
              </ButtonLink>
            </div>
          </>
        ) : null}
        <form action={rotateCalendar}>
          <Button type="submit" variant="ghost">
            Révoquer et créer un nouveau lien
          </Button>
        </form>
      </Card>
      {owner ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Équipe</h2>
          <p className="text-sm leading-6 text-muted">
            Un assistant voit les mariages de l&apos;activité. Les devis et les factures restent chez vous.
          </p>
          <TeamInviteForm />
        </Card>
      ) : null}
      {owner ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Disponibilités</h2>
          <p className="text-sm leading-6 text-muted">
            Les couples et les demandes publiques réservent ces heures. Lien : /p/{session.vendor?.slug}/rdv
          </p>
          <AvailabilityForm />
          <ButtonLink href="/espace/rendez-vous" variant="secondary">
            Voir les rendez-vous
          </ButtonLink>
        </Card>
      ) : null}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Changer mon mot de passe</h2>
        <p className="text-sm leading-6 text-muted">Le mot de passe choisi ici remplace l&apos;ancien. Huit caractères au minimum.</p>
        <PasswordForm />
      </Card>
      {process.env.SMS_ENABLED === "true" ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Double sécurité par SMS</h2>
          <PhoneFactorForm />
        </Card>
      ) : null}
      <Card>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Sortie</h2>
        <SignOutButton />
      </Card>
    </div>
  );
}
