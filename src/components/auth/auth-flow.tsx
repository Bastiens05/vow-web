"use client";

import { useActionState, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { AuthDesktopFrame } from "@/components/auth/auth-frame";
import { LoginForm } from "@/components/auth/auth-forms";
import { AddressInput } from "@/components/ui/address-input";
import { Alert } from "@/components/ui/alert";
import { isValidEmail } from "@/lib/domain/auth-routing";
import { isVendorPlan, type VendorPlan } from "@/lib/domain/plans";
import { VENDOR_CATEGORIES, categoryLabel, type VendorCategory } from "@/lib/domain/categories";
import { WEDDING_VOLUMES, type WeddingVolume } from "@/lib/domain/volume";
import { signupMissing, type SignupIntent } from "@/lib/domain/signup-intent";
import { signUp, type ActionState } from "@/server/actions/auth";

type Step = "choose" | "vendor" | "couple" | "invite";

export function AuthFlow({
  mode,
  nextPath,
  initialEmail = "",
  lockedRole,
  inviteToken,
  initialCategory,
  initialFullName,
  initialPlan,
  initialBusinessName = "",
  notice,
  vendorCategories = VENDOR_CATEGORIES,
}: {
  mode: "login" | "signup";
  nextPath: string;
  initialEmail?: string;
  lockedRole?: "vendor" | "couple";
  inviteToken?: string;
  initialCategory?: VendorCategory;
  initialFullName?: string;
  initialPlan?: VendorPlan;
  initialBusinessName?: string;
  notice?: ReactNode;
  vendorCategories?: readonly VendorCategory[];
}) {
  const invite = nextPath.startsWith("/invitation/") || nextPath.startsWith("/equipe/");
  const vendorInvite = invite && lockedRole === "vendor";
  const [step, setStep] = useState<Step>(
    mode === "login"
      ? "invite"
      : vendorInvite
        ? "vendor"
        : invite
          ? "invite"
          : lockedRole === "vendor"
            ? "vendor"
            : lockedRole === "couple"
              ? "couple"
              : "choose",
  );
  const [email, setEmail] = useState(initialEmail);
  const [category, setCategory] = useState<VendorCategory | null>(
    initialCategory && vendorCategories.includes(initialCategory) ? initialCategory : (vendorCategories[0] ?? null),
  );
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [partnerOne, setPartnerOne] = useState("");
  const [partnerOneLast, setPartnerOneLast] = useState("");
  const [partnerTwo, setPartnerTwo] = useState("");
  const [partnerTwoLast, setPartnerTwoLast] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [weddingsPerYear, setWeddingsPerYear] = useState<WeddingVolume | "">("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [state, action, pending] = useActionState(signUp, {} as ActionState);

  const title =
    mode === "login"
      ? "Bon retour"
      : step === "choose"
        ? "Bienvenue"
        : step === "vendor"
          ? "Votre métier"
          : step === "couple"
            ? "Votre mariage"
            : "Créer le compte";

  const intro =
    mode === "login"
      ? "Votre e-mail et le mot de passe choisi à l'inscription."
      : step === "choose"
        ? "Dites-nous qui vous êtes. Les mariés arrivent en général par l'invitation."
        : step === "vendor"
          ? "Le métier, le nom et la ville. Le mot de passe ouvre l'espace tout de suite."
          : step === "couple"
            ? "Les prénoms, les noms et la date. Le mot de passe ouvre l'espace tout de suite."
            : "Un e-mail et un mot de passe. L'espace s'ouvre sans message à confirmer.";

  return (
    <AuthDesktopFrame>
      <div className="auth-screen auth-step flex min-h-[calc(100dvh-3.5rem)] w-full flex-col px-5 py-10 md:min-h-dvh md:justify-center lg:min-h-dvh lg:justify-start lg:px-16 lg:py-12">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:flex-none">
          {notice ? <div className="mb-6">{notice}</div> : null}
          <p className="sr-only">VOW</p>
          <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-base leading-7 text-muted">{intro}</p>

          {mode === "login" ? (
            <div className="mt-8">
              <LoginForm nextPath={nextPath || "/espace"} initialEmail={initialEmail} />
              <p className="mt-6 text-center text-sm text-muted">
                Pas encore de compte ?{" "}
                <Link href={`/inscription?next=${encodeURIComponent(nextPath || "/espace")}`} className="underline">
                  Créer un compte
                </Link>
              </p>
            </div>
          ) : null}

          {mode === "signup" && step === "choose" ? (
            <div className="mt-8 grid gap-3">
              <button type="button" className="auth-choice" onClick={() => pick("vendor")}>
                Je suis prestataire
              </button>
              <button type="button" className="auth-choice" onClick={() => pick("couple")}>
                Nous sommes les mariés
              </button>
              <p className="pt-4 text-center text-sm text-muted">
                Déjà un compte ?{" "}
                <Link href="/connexion" className="underline">
                  Se connecter
                </Link>
              </p>
            </div>
          ) : null}

          {mode === "signup" && step === "vendor" ? (
            <form action={action} noValidate className="mt-8 grid gap-4">
              <input type="hidden" name="next" value={nextPath || "/espace"} />
              {inviteToken ? <input type="hidden" name="invite" value={inviteToken} /> : null}
              <input type="hidden" name="plan" value={initialPlan && isVendorPlan(initialPlan) ? initialPlan : ""} />
              <RoleChoice selected="vendor" />
              <input type="hidden" name="category" value={category ?? ""} />
              <div className="flex flex-wrap gap-2">
                {vendorCategories.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={value === category ? "auth-chip auth-chip-on" : "auth-chip"}
                    onClick={() => setCategory(value)}
                  >
                    {categoryLabel(value)}
                  </button>
                ))}
              </div>
              <FieldLike label="Nom de l'activité" name="business_name" value={businessName} onChange={setBusinessName} autoComplete="organization" />
              <label className="grid gap-2 text-sm">
                Ville
                {vendorInvite ? <span className="text-xs text-muted">Facultatif pour une invitation.</span> : null}
                <AddressInput
                  name="city"
                  required={!vendorInvite}
                  mode="city"
                  value={city}
                  onValueChange={setCity}
                  className="auth-field min-h-14 rounded-2xl px-4 text-lg"
                />
              </label>
              <fieldset className="grid gap-2">
                <legend className="text-sm">Combien de mariages faites-vous par an ?</legend>
                <p className="text-xs text-muted">Facultatif.</p>
                <div className="flex flex-wrap gap-2">
                  {WEDDING_VOLUMES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={value === weddingsPerYear ? "auth-chip auth-chip-on" : "auth-chip"}
                      onClick={() => setWeddingsPerYear(weddingsPerYear === value ? "" : value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="weddings_per_year" value={weddingsPerYear} />
              </fieldset>
              <FieldLike label="Téléphone" name="phone" value={phone} onChange={setPhone} autoComplete="tel" optional />
              <FieldLike label="Instagram" name="instagram" value={instagram} onChange={setInstagram} autoComplete="off" optional />
              <FieldLike label="Site web" name="website" value={website} onChange={setWebsite} autoComplete="url" optional />
              <NameField defaultValue={initialFullName ?? ""} />
              <FieldLike label="E-mail" name="email" value={email} onChange={setEmail} type="email" autoComplete="email" readOnly={Boolean(initialEmail)} error={email.length > 0 && !isValidEmail(email) ? "Indiquez un e-mail valide." : null} />
              <SecretField value={password} onChange={setPassword} shown={shown} onToggle={() => setShown((value) => !value)} />
              {state.error ? <Alert>{state.error}</Alert> : null}
              <MissingFields
                items={signupMissing({
                  email,
                  password,
                  emailValid: isValidEmail(email),
                  kind: vendorInvite ? "invite-vendor" : "vendor",
                  intent: blankIntent({ role: "vendor", businessName, category, city }),
                }).filter((item) => item !== "un e-mail valide")}
              />
              <button
                type="submit"
                className="auth-primary"
                disabled={pending || signupMissing({
                  email,
                  password,
                  emailValid: isValidEmail(email),
                  kind: vendorInvite ? "invite-vendor" : "vendor",
                  intent: blankIntent({ role: "vendor", businessName, category, city }),
                }).length > 0}
              >
                {pending ? "Création…" : "Créer mon compte"}
              </button>
            </form>
          ) : null}

          {mode === "signup" && step === "couple" ? (
            <form action={action} noValidate className="mt-8 grid gap-4">
              <input type="hidden" name="next" value={nextPath || "/espace"} />
              <RoleChoice selected="couple" />
              <p className="text-sm font-medium">Partenaire 1</p>
              <FieldLike label="Prénom" name="partner_one" value={partnerOne} onChange={setPartnerOne} autoComplete="given-name" />
              <FieldLike label="Nom" name="partner_one_last" value={partnerOneLast} onChange={setPartnerOneLast} autoComplete="family-name" />
              <p className="text-sm font-medium">Partenaire 2</p>
              <FieldLike label="Prénom" name="partner_two" value={partnerTwo} onChange={setPartnerTwo} autoComplete="off" />
              <FieldLike label="Nom" name="partner_two_last" value={partnerTwoLast} onChange={setPartnerTwoLast} autoComplete="off" />
              <label className="grid gap-2 text-sm">
                Date du mariage
                <input
                  name="wedding_date"
                  lang="fr"
                  inputMode="numeric"
                  placeholder="jj/mm/aaaa"
                  autoComplete="off"
                  required
                  pattern="\d{2}/\d{2}/\d{4}"
                  title="jj/mm/aaaa"
                  onInvalid={(event) => event.currentTarget.setCustomValidity("Indiquez la date au format jj/mm/aaaa.")}
                  onInput={(event) => event.currentTarget.setCustomValidity("")}
                  value={weddingDate}
                  onChange={(event) => setWeddingDate(event.target.value)}
                  className="auth-field min-h-14 rounded-2xl border border-line bg-paper px-4 text-lg text-ink outline-none focus:border-ink"
                />
              </label>
              <label className="grid gap-2 text-sm">
                Ville
                <span className="sr-only">facultatif</span>
                <AddressInput name="city" mode="city" value={city} onValueChange={setCity} className="auth-field min-h-14 rounded-2xl px-4 text-lg" />
              </label>
              <FieldLike label="E-mail" name="email" value={email} onChange={setEmail} type="email" autoComplete="email" readOnly={Boolean(initialEmail)} error={email.length > 0 && !isValidEmail(email) ? "Indiquez un e-mail valide." : null} />
              <SecretField value={password} onChange={setPassword} shown={shown} onToggle={() => setShown((value) => !value)} />
              {state.error ? <Alert>{state.error}</Alert> : null}
              <MissingFields
                items={signupMissing({
                  email,
                  password,
                  emailValid: isValidEmail(email),
                  kind: "couple",
                  intent: blankIntent({
                    role: "couple",
                    partnerOne,
                    partnerOneLast,
                    partnerTwo,
                    partnerTwoLast,
                    weddingDate,
                  }),
                }).filter((item) => item !== "un e-mail valide")}
              />
              <button
                type="submit"
                className="auth-primary"
                disabled={
                  pending ||
                  signupMissing({
                    email,
                    password,
                    emailValid: isValidEmail(email),
                    kind: "couple",
                    intent: blankIntent({
                      role: "couple",
                      partnerOne,
                      partnerOneLast,
                      partnerTwo,
                      partnerTwoLast,
                      weddingDate,
                    }),
                  }).length > 0
                }
              >
                {pending ? "Création…" : "Créer mon compte"}
              </button>
              <p className="text-center text-sm text-muted">Vous avez déjà une invitation ? Ouvrez le lien reçu.</p>
            </form>
          ) : null}

          {mode === "signup" && step === "invite" ? (
            <form action={action} noValidate className="mt-8 grid gap-4">
              <input type="hidden" name="next" value={nextPath || "/espace"} />
              <RoleChoice selected={lockedRole ?? "couple"} locked={Boolean(lockedRole)} />
              <NameField defaultValue={initialFullName ?? ""} />
              <FieldLike label="E-mail" name="email" value={email} onChange={setEmail} type="email" autoComplete="email" readOnly={Boolean(initialEmail)} error={email.length > 0 && !isValidEmail(email) ? "Indiquez un e-mail valide." : null} />
              <SecretField value={password} onChange={setPassword} shown={shown} onToggle={() => setShown((value) => !value)} />
              {state.error ? <Alert>{state.error}</Alert> : null}
              <MissingFields
                items={signupMissing({
                  email,
                  password,
                  emailValid: isValidEmail(email),
                  kind: "account",
                  intent: blankIntent({ role: lockedRole ?? "couple" }),
                }).filter((item) => item !== "un e-mail valide")}
              />
              <button type="submit" className="auth-primary" disabled={pending || !isValidEmail(email) || password.length < 8}>
                {pending ? "Création…" : "Créer mon compte"}
              </button>
            </form>
          ) : null}

          <p className="mt-auto pt-10 text-center text-xs text-muted">
            <Link href="/cgu" className="underline">
              CGU
            </Link>
            {" · "}
            <Link href="/confidentialite" className="underline">
              Confidentialité
            </Link>
            {" · "}
            <Link href="/mentions-legales" className="underline">
              Mentions légales
            </Link>
          </p>
        </div>
      </div>
    </AuthDesktopFrame>
  );

  function pick(value: "vendor" | "couple") {
    setStep(value);
  }
}

function blankIntent(partial: Partial<SignupIntent> & { role: SignupIntent["role"] }): SignupIntent {
  return {
    role: partial.role,
    fullName: partial.fullName ?? "",
    businessName: partial.businessName ?? "",
    category: partial.category ?? null,
    city: partial.city ?? "",
    phone: "",
    website: "",
    instagram: "",
    weddingsPerYear: "",
    partnerOne: partial.partnerOne ?? "",
    partnerOneLast: partial.partnerOneLast ?? "",
    partnerTwo: partial.partnerTwo ?? "",
    partnerTwoLast: partial.partnerTwoLast ?? "",
    weddingDate: partial.weddingDate ?? "",
    plan: null,
  };
}

function MissingFields({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return <p className="text-sm text-danger">Il manque {items.join(", ")}.</p>;
}

function NameField({ defaultValue = "" }: { defaultValue?: string }) {
  return <FieldLike label="Nom complet" name="full_name" value={defaultValue} defaultValue={defaultValue} onChange={() => undefined} autoComplete="name" uncontrolled />;
}

function SecretField({
  value,
  onChange,
  shown,
  onToggle,
}: {
  value: string;
  onChange: (value: string) => void;
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="grid gap-2 text-sm">
      Mot de passe
      <span className="text-xs text-muted">8 caractères minimum.</span>
      <span className="relative">
        <input
          name="password"
          type={shown ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onInvalid={(event) => event.currentTarget.setCustomValidity("Le mot de passe doit contenir au moins 8 caractères.")}
          onInput={(event) => event.currentTarget.setCustomValidity("")}
          className="auth-field min-h-14 w-full rounded-2xl border border-line bg-paper px-4 pr-24 text-lg text-ink outline-none focus:border-ink"
        />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted" onClick={onToggle} aria-pressed={shown}>
          {shown ? "Masquer" : "Afficher"}
        </button>
        </span>
      {value.length > 0 && value.length < 8 ? (
        <span className="text-sm text-danger">Le mot de passe doit contenir au moins 8 caractères.</span>
      ) : null}
    </label>
  );
}

function RoleChoice({ selected, locked = true }: { selected: "vendor" | "couple"; locked?: boolean }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-sm text-ink">Je suis</legend>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["vendor", "Prestataire"],
            ["couple", "Couple"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-ivory"
          >
            <input
              type="radio"
              name="role"
              value={value}
              defaultChecked={selected === value}
              disabled={locked && selected !== value}
              className="accent-ink"
              required
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FieldLike({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
  optional = false,
  readOnly = false,
  uncontrolled = false,
  defaultValue,
  error = null,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete: string;
  optional?: boolean;
  readOnly?: boolean;
  uncontrolled?: boolean;
  defaultValue?: string;
  error?: string | null;
}) {
  return (
    <label className="grid gap-2 text-sm">
      {label}
      {optional ? <span className="sr-only">facultatif</span> : null}
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={!optional}
        readOnly={readOnly}
        onInvalid={(event) => {
          const input = event.currentTarget;
          input.setCustomValidity(input.type === "email" ? "Indiquez un e-mail valide." : "Ce champ est obligatoire.");
        }}
        onInput={(event) => event.currentTarget.setCustomValidity("")}
        {...(uncontrolled ? { defaultValue: defaultValue ?? value } : { value, onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value) })}
        className="auth-field min-h-14 rounded-2xl border border-line bg-paper px-4 text-lg text-ink outline-none focus:border-ink read-only:text-muted"
      />
      {error ? <span className="text-sm text-danger">{error}</span> : null}
    </label>
  );
}
