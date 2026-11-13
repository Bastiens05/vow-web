import type { Metadata } from "next";
import { AccountNav } from "@/components/layout/account-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ShareForm } from "@/components/account/share-form";
import { PhoneFactorForm } from "@/components/account/phone-factor";
import {
  AccountNameForm,
  BillingIdentityForm,
  BusinessForm,
  LogoField,
  NotificationForm,
  PasswordForm,
} from "@/components/account/settings-forms";
import { BillingControls } from "@/app/abonnement/offer";
import { ContactFormLink } from "@/components/account/contact-form-link";
import { Button, ButtonLink } from "@/components/ui/button";
import { stripeEnabled, stripeTestMode } from "@/server/stripe";
import { Card } from "@/components/ui/card";
import { HashScroll } from "@/components/ui/hash-scroll";
import { PageHeader } from "@/components/ui/page-header";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { rotateCalendar } from "@/server/actions/suite";
import { requireSession } from "@/server/session";
import { ClientDocumentSettings } from "@/components/account/client-document-settings";
import { VendorVaultBoard } from "@/components/account/vendor-vault-board";
import { isVendorVaultCategory } from "@/lib/domain/vendor-vault";
import { documentSuggestions } from "@/lib/domain/client-documents";
import { isVendorCategory } from "@/lib/domain/categories";
import { AvailabilityForm, TeamInviteForm } from "./extras";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const session = await requireSession();
  const vendor = session.profile.role === "vendor";
  const owner = Boolean(session.vendor && session.vendor.user_id === session.userId);
  const supabase = await createClient();
  const { data: vaultFiles } = owner && session.vendor
    ? await supabase
        .from("vendor_vault_files")
        .select("id, title, category, file_name, expires_on, alert_days, auto_share")
        .eq("vendor_id", session.vendor.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const { data: templates } = owner && session.vendor
    ? await supabase
        .from("vendor_document_templates")
        .select("id, title, note, required, offset_days")
        .eq("vendor_id", session.vendor.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };
  const { data: billingIdentity } = owner && session.vendor
    ? await supabase
        .from("vendor_billing_identity")
        .select("siret, legal_address, vat_exempt, payment_terms")
        .eq("vendor_id", session.vendor.id)
        .maybeSingle()
    : { data: null };
  const { data: feedToken } = await supabase.rpc("ensure_calendar_feed");
  const feed = feedToken ? `${siteUrl()}/api/calendar/${feedToken}` : "";
  const webcal = feed.replace(/^https?:/, "webcal:");
  const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-5 py-8 lg:max-w-3xl">
      <HashScroll />
      <PageHeader
        eyebrow={vendor ? "Espace prestataire" : "Réglages"}
        title="Réglages"
        description="Le compte, l'activité et la sortie."
      />
      {vendor ? <AccountNav admin={session.isAdmin} /> : null}
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
          {owner && session.vendor ? (
            <div className="space-y-3 border-t border-line pt-4">
              <h3 className="text-base font-semibold">Factures</h3>
              <p className="text-sm text-muted">Identité, SIRET et TVA repris sur les factures au moment de leur émission.</p>
              <BillingIdentityForm
                siret={billingIdentity?.siret ?? ""}
                address={billingIdentity?.legal_address ?? ""}
                vatExempt={billingIdentity?.vat_exempt ?? true}
                paymentTerms={billingIdentity?.payment_terms ?? "Paiement à réception"}
              />
            </div>
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
          <VendorVaultBoard
            userId={session.userId}
            today={new Date().toISOString().slice(0, 10)}
            files={(vaultFiles ?? []).flatMap((file) =>
              isVendorVaultCategory(file.category)
                ? [
                    {
                      id: file.id,
                      title: file.title,
                      category: file.category,
                      fileName: file.file_name,
                      expiresOn: file.expires_on,
                      alertDays: file.alert_days,
                      autoShare: file.auto_share,
                    },
                  ]
                : [],
            )}
          />
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
      {vendor ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Abonnement</h2>
          <p className="text-sm leading-6 text-muted">
            Ajoutez une carte ou un prélèvement SEPA, puis gérez la formule, les factures et la résiliation.
          </p>
          <BillingControls
            enabled={stripeEnabled()}
            testMode={stripeTestMode()}
            hasCustomer={Boolean(session.billing?.stripe_customer_id)}
          />
          <ButtonLink href="/abonnement" variant="secondary">
            Voir les formules
          </ButtonLink>
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
      {vendor && session.vendor ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Ma vitrine</h2>
          <p className="text-sm leading-6 text-muted">
            La page publique et le formulaire de contact à mettre dans votre bio.
          </p>
          <ContactFormLink url={`${siteUrl()}/demande/${session.vendor.slug}`} />
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/espace/profil" variant="secondary">
              Modifier la vitrine
            </ButtonLink>
            {session.vendor.published ? (
              <ButtonLink href={`/p/${session.vendor.slug}`} variant="secondary">
                Voir la page
              </ButtonLink>
            ) : null}
            <ButtonLink href="/demandes" variant="secondary">
              Demandes reçues
            </ButtonLink>
          </div>
        </Card>
      ) : null}
      {vendor ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Abonnement</h2>
          <p className="text-sm leading-6 text-muted">La formule de votre espace prestataire.</p>
          <ButtonLink href="/abonnement">Ouvrir l&apos;abonnement</ButtonLink>
        </Card>
      ) : null}
      <Card>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Sortie</h2>
        <SignOutButton />
      </Card>
    </div>
  );
}
