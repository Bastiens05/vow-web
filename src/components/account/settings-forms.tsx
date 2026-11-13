"use client";

import { useActionState, useState } from "react";
import { PasswordField } from "@/components/auth/password-field";
import { FileDrop } from "@/components/ui/file-drop";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { VENDOR_CATEGORIES, categoryLabel, type VendorCategory } from "@/lib/domain/categories";
import { prepareLogoFile } from "@/lib/images/prepare-logo";
import { safeFileName, validateUpload } from "@/lib/domain/uploads";
import { createClient } from "@/lib/supabase/client";
import { publicObjectUrl } from "@/lib/storage";
import { changePassword, saveAccountName, saveBusinessBasics, saveNotificationPrefs } from "@/server/actions/account";

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

const LOGO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function LogoField({ userId, logoPath }: { userId: string; logoPath: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "prepare" | "upload" | "save">("idle");
  const [savedPath, setSavedPath] = useState(logoPath);
  const [replacing, setReplacing] = useState(false);
  const src = savedPath ? publicObjectUrl("vendor-media", savedPath) : null;
  const pending = phase !== "idle";
  const progress = phase === "prepare" ? 30 : phase === "upload" ? 70 : phase === "save" ? 90 : null;

  async function onFile(file: File) {
    if (!LOGO_TYPES.has(file.type)) {
      setSuccess(null);
      setError("Formats acceptés : JPG, PNG ou WebP.");
      return;
    }
    setPhase("prepare");
    setError(null);
    setSuccess(null);
    let prepared = file;
    try {
      prepared = await prepareLogoFile(file);
    } catch {
      setPhase("idle");
      setError("Cette image n'a pas pu être préparée.");
      return;
    }
    const check = validateUpload(prepared, "photo");
    if (!check.ok) {
      setPhase("idle");
      setError(check.error);
      return;
    }
    const supabase = createClient();
    const path = `${userId}/logo-${crypto.randomUUID()}-${safeFileName(prepared.name)}`;
    setPhase("upload");
    const uploaded = await supabase.storage.from("vendor-media").upload(path, prepared, { contentType: prepared.type, upsert: false });
    if (uploaded.error) {
      setPhase("idle");
      setError(uploaded.error.message);
      return;
    }
    setPhase("save");
    const { data: profile, error: readError } = await supabase.from("vendor_profiles").select("id, logo_path").eq("user_id", userId).maybeSingle();
    if (readError || !profile) {
      await supabase.storage.from("vendor-media").remove([path]);
      setPhase("idle");
      setError("Enregistrez d'abord le nom commercial.");
      return;
    }
    const saved = await supabase.from("vendor_profiles").update({ logo_path: path }).eq("id", profile.id);
    if (saved.error) {
      await supabase.storage.from("vendor-media").remove([path]);
      setPhase("idle");
      setError(saved.error.message);
      return;
    }
    if (profile.logo_path && profile.logo_path !== path) {
      await supabase.storage.from("vendor-media").remove([profile.logo_path]);
    }
    setSavedPath(path);
    setReplacing(false);
    setPhase("idle");
    setSuccess("Logo enregistré.");
    const url = publicObjectUrl("vendor-media", path);
    if (url) window.dispatchEvent(new CustomEvent("vow-logo", { detail: url }));
  }

  const showDrop = !src || replacing;

  return (
    <div className="space-y-3" aria-busy={pending}>
      {src ? (
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-ivory/70 p-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Logo" className="h-[120px] w-[120px] rounded-2xl bg-paper object-contain" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="min-h-10 px-4 text-sm" disabled={pending} onClick={() => setReplacing(true)}>
              Modifier le logo
            </Button>
            {replacing ? (
              <Button type="button" variant="ghost" className="min-h-10 px-4 text-sm" disabled={pending} onClick={() => setReplacing(false)}>
                Annuler
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">Pas encore de logo.</p>
      )}
      {showDrop ? (
        <FileDrop
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          hint="JPG, PNG ou WebP · le logo de votre activité. Une grande photo est réduite avant l'envoi."
          progress={progress}
          onFiles={(files) => {
            const file = files[0];
            if (file) void onFile(file);
          }}
        />
      ) : null}
      {pending ? <p className="text-sm text-muted">{phase === "prepare" ? "Préparation du logo…" : phase === "upload" ? "Envoi…" : "Enregistrement…"}</p> : null}
      {error ? <Alert>{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}
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
