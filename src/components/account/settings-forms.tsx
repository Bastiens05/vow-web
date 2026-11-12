"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { PasswordField } from "@/components/auth/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { VENDOR_CATEGORIES, categoryLabel, type VendorCategory } from "@/lib/domain/categories";
import { safeFileName, validateUpload } from "@/lib/domain/uploads";
import { createClient } from "@/lib/supabase/client";
import { publicObjectUrl } from "@/lib/storage";
import {
  changePassword,
  saveAccountName,
  saveBusinessBasics,
  saveLogo,
  saveNotificationPrefs,
} from "@/server/actions/account";

export function AccountNameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(saveAccountName, {});
  return (
    <form action={action} className="space-y-3">
      <Field label="Nom">
        <TextInput name="full_name" required defaultValue={name} />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le nom"}
      </Button>
    </form>
  );
}

export function BusinessForm({
  businessName,
  category,
  city,
  phone,
}: {
  businessName: string;
  category: VendorCategory;
  city: string;
  phone: string;
}) {
  const [state, action, pending] = useActionState(saveBusinessBasics, {});
  return (
    <form action={action} className="space-y-3">
      <Field label="Nom commercial">
        <TextInput name="business_name" required defaultValue={businessName} />
      </Field>
      <Field label="Métier">
        <SelectInput name="category" defaultValue={category} required>
          {VENDOR_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {categoryLabel(value)}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Téléphone">
        <TextInput name="contact_phone" defaultValue={phone} />
      </Field>
      <Field label="Ville">
        <TextInput name="city" defaultValue={city} />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer l'activité"}
      </Button>
    </form>
  );
}

export function LogoField({ userId, logoPath }: { userId: string; logoPath: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const src = logoPath ? publicObjectUrl("vendor-media", logoPath) : null;

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const check = validateUpload(file, "photo");
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const path = `${userId}/logo-${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const uploaded = await supabase.storage.from("vendor-media").upload(path, file, { contentType: file.type });
    if (uploaded.error) {
      setPending(false);
      setError(uploaded.error.message);
      return;
    }
    const saved = await saveLogo(path);
    setPending(false);
    if (saved.error) setError(saved.error);
    else window.location.reload();
  }

  return (
    <div className="space-y-3">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Logo" className="h-16 w-16 rounded-2xl object-cover" />
      ) : (
        <p className="text-sm text-muted">Pas encore de logo.</p>
      )}
      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-paper px-4 text-sm font-medium">
        {pending ? "Envoi…" : "Choisir un logo"}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onChange} />
      </label>
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}

export function NotificationForm({
  inApp,
  push,
  email,
  reminders,
  calm = false,
}: {
  inApp: boolean;
  push: boolean;
  email: boolean;
  reminders: boolean;
  calm?: boolean;
}) {
  const [state, action, pending] = useActionState(saveNotificationPrefs, {});
  return (
    <form action={action} className="space-y-3">
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="notify_in_app" defaultChecked={inApp} className="h-5 w-5" />
        {calm ? "Afficher les nouveautés dans l'application" : "Afficher les alertes dans l'application"}
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="notify_push" defaultChecked={push} className="h-5 w-5" />
        Notifications sur le téléphone, si elles sont activées
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="notify_email" defaultChecked={email} className="h-5 w-5" />
        Recevoir les e-mails de VOW
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="notify_reminders" defaultChecked={reminders} className="h-5 w-5" />
        Rappels avant le mariage (désactivables aussi depuis l&apos;e-mail)
      </label>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Enregistrement…" : calm ? "Enregistrer" : "Enregistrer les alertes"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return (
    <form action={action} className="space-y-3">
      <PasswordField label="Nouveau mot de passe" name="password" autoComplete="new-password" hint="8 caractères minimum." />
      <PasswordField label="Confirmation" name="confirm" autoComplete="new-password" />
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Mise à jour…" : "Changer le mot de passe"}
      </Button>
    </form>
  );
}
