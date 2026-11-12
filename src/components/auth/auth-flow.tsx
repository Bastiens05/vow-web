"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AuthDesktopFrame } from "@/components/auth/auth-frame";
import { AddressInput } from "@/components/ui/address-input";
import { Alert } from "@/components/ui/alert";
import { LoginForm, SignupForm } from "@/components/auth/auth-forms";
import { OtpInput } from "@/components/auth/otp-input";
import { isValidEmail } from "@/lib/domain/auth-routing";
import { VENDOR_CATEGORIES, categoryLabel, type VendorCategory } from "@/lib/domain/categories";
import { WEDDING_VOLUMES, type WeddingVolume } from "@/lib/domain/volume";
import { requestEmailCode, startOAuth, verifyEmailCode, type ActionState } from "@/server/actions/auth";

type Step = "choose" | "vendor" | "couple" | "email" | "code" | "password";

export function AuthFlow({
  mode,
  nextPath,
  initialEmail = "",
  lockedRole,
  google,
  apple,
  otp = false,
  notice,
}: {
  mode: "login" | "signup";
  nextPath: string;
  initialEmail?: string;
  lockedRole?: "vendor" | "couple";
  google: boolean;
  apple: boolean;
  otp?: boolean;
  notice?: ReactNode;
}) {
  const invite = nextPath.startsWith("/invitation/") || nextPath.startsWith("/equipe/");
  const [step, setStep] = useState<Step>(
    mode === "signup" && !lockedRole
      ? "choose"
      : mode === "signup" && lockedRole === "vendor" && !invite
        ? "vendor"
        : mode === "signup" && lockedRole === "couple" && !invite
          ? "couple"
          : "email",
  );
  const [role, setRole] = useState<"vendor" | "couple" | null>(lockedRole ?? null);
  const [email, setEmail] = useState(initialEmail);
  const [category, setCategory] = useState<VendorCategory | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [partnerOne, setPartnerOne] = useState("");
  const [partnerTwo, setPartnerTwo] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [testerCode, setTesterCode] = useState("");
  const [weddingsPerYear, setWeddingsPerYear] = useState<WeddingVolume | "">("");
  const [token, setToken] = useState("");
  const [seconds, setSeconds] = useState(0);
  const submitted = useRef("");
  const [sent, request, sending] = useActionState(requestEmailCode, {} as ActionState);
  const [checked, verify, verifying] = useActionState(verifyEmailCode, {} as ActionState);
  const [appliedCode, setAppliedCode] = useState("");
  if (otp && sent.success?.startsWith("code:") && sent.success !== appliedCode) {
    setAppliedCode(sent.success);
    setStep("code");
    setSeconds(30);
  }

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  useEffect(() => {
    if (token.length !== 6 || token === submitted.current || verifying) return;
    submitted.current = token;
    const form = document.getElementById("otp-form");
    if (form instanceof HTMLFormElement) form.requestSubmit();
  }, [token, verifying]);

  const title =
    step === "choose"
      ? "Bienvenue"
      : step === "vendor"
        ? "Votre métier"
        : step === "couple"
          ? "Votre mariage"
          : step === "code"
            ? "Votre code"
            : step === "password"
              ? mode === "login"
                ? "Mot de passe"
                : "Créer le compte"
              : "Votre e-mail";

  return (
    <AuthDesktopFrame>
      <div className="auth-screen auth-step flex min-h-[calc(100dvh-3.5rem)] w-full flex-col px-5 py-10 md:min-h-dvh md:justify-center lg:min-h-dvh lg:justify-start lg:px-16 lg:py-12">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:flex-none">
      {notice ? <div className="mb-6">{notice}</div> : null}
      <p className="text-sm font-semibold tracking-[0.28em] lg:sr-only">VOW</p>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-base leading-7 text-muted">
        {step === "choose"
          ? "Dites-nous qui vous êtes. Les mariés arrivent en général par l'invitation."
          : step === "vendor"
            ? "Le métier, le nom et la ville. Sept jours pour essayer, puis 29,99 € TTC par mois."
            : step === "couple"
              ? "Vos prénoms et la date. L'espace commence vide : les prestataires arrivent par invitation."
              : step === "code"
                ? `Nous avons envoyé un code à ${email}. Le lien dans le message fonctionne aussi.`
                : step === "email"
                  ? otp
                    ? "Un code à 6 chiffres, rien à retenir."
                    : "Un lien de connexion, rien à retenir."
                  : "Le mot de passe reste possible, si vous préférez."}
      </p>

      {step === "choose" ? (
        <div className="mt-8 grid gap-3">
          <button type="button" className="auth-choice" onClick={() => pick("vendor")}>
            Je suis prestataire
          </button>
          <button type="button" className="auth-choice" onClick={() => pick("couple")}>
            Nous sommes les mariés
          </button>
        </div>
      ) : null}

      {step === "vendor" ? (
        <form action={request} className="mt-8 grid gap-4">
          <input type="hidden" name="next" value={nextPath || "/espace"} />
          <input type="hidden" name="create" value="1" />
          <input type="hidden" name="role" value="vendor" />
          <input type="hidden" name="category" value={category ?? ""} />
          <div className="flex flex-wrap gap-2">
            {VENDOR_CATEGORIES.map((value) => (
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
            <AddressInput
              name="city"
              required
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
          <FieldLike label="E-mail" name="email" value={email} onChange={setEmail} type="email" autoComplete="email" />
          <FieldLike label="Code test" name="tester_code" value={testerCode} onChange={setTesterCode} autoComplete="off" optional />
          {sent.error ? <Alert>{sent.error}</Alert> : null}
          {sent.success?.startsWith("link:") ? <Alert tone="success">Vérifiez votre boîte mail. Le lien ouvre votre espace.</Alert> : null}
          <button
            type="submit"
            className="auth-primary"
            disabled={sending || !isValidEmail(email) || !category || businessName.trim().length < 2 || city.trim().length < 2}
          >
            {sending ? "Envoi…" : "Recevoir un lien de connexion"}
          </button>
          <button type="button" className="auth-quiet" onClick={() => setStep("password")}>
            Continuer avec un mot de passe
          </button>
        </form>
      ) : null}

      {step === "couple" ? (
        <form action={request} className="mt-8 grid gap-4">
          <input type="hidden" name="next" value={nextPath || "/espace"} />
          <input type="hidden" name="create" value="1" />
          <input type="hidden" name="role" value="couple" />
          <FieldLike label="Premier prénom" name="partner_one" value={partnerOne} onChange={setPartnerOne} autoComplete="given-name" />
          <FieldLike label="Second prénom" name="partner_two" value={partnerTwo} onChange={setPartnerTwo} autoComplete="off" />
          <label className="grid gap-2 text-sm">
            Date du mariage
            <input
              name="wedding_date"
              type="date"
              required
              value={weddingDate}
              onChange={(event) => setWeddingDate(event.target.value)}
              className="auth-field min-h-14 rounded-2xl border border-line bg-paper px-4 text-lg text-ink outline-none focus:border-ink"
            />
          </label>
          <label className="grid gap-2 text-sm">
            Ville
            <span className="sr-only">facultatif</span>
            <AddressInput
              name="city"
              mode="city"
              value={city}
              onValueChange={setCity}
              className="auth-field min-h-14 rounded-2xl px-4 text-lg"
            />
          </label>
          <FieldLike label="E-mail" name="email" value={email} onChange={setEmail} type="email" autoComplete="email" />
          {sent.error ? <Alert>{sent.error}</Alert> : null}
          {sent.success?.startsWith("link:") ? <Alert tone="success">Vérifiez votre boîte mail. Le lien ouvre votre espace.</Alert> : null}
          <button
            type="submit"
            className="auth-primary"
            disabled={sending || !isValidEmail(email) || partnerOne.trim().length < 2 || partnerTwo.trim().length < 2 || !weddingDate}
          >
            {sending ? "Envoi…" : "Recevoir un lien de connexion"}
          </button>
          <p className="text-center text-sm text-muted">Vous avez déjà une invitation ? Ouvrez le lien reçu.</p>
          <button type="button" className="auth-quiet" onClick={() => setStep("password")}>
            Continuer avec un mot de passe
          </button>
        </form>
      ) : null}

      {step === "email" ? (
        <form action={request} className="mt-8 grid gap-4">
          <input type="hidden" name="next" value={nextPath || "/espace"} />
          <input type="hidden" name="create" value={mode === "signup" ? "1" : "0"} />
          {role ? <input type="hidden" name="role" value={role} /> : null}
          <label className="grid gap-2 text-sm">
            E-mail
            <input
              name="email"
              type="email"
              autoFocus
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              readOnly={Boolean(initialEmail)}
              onChange={(event) => setEmail(event.target.value)}
              className="auth-field min-h-14 rounded-2xl border border-line bg-paper px-4 text-lg text-ink outline-none focus:border-ink"
            />
          </label>
          {sent.error ? <Alert>{sent.error}</Alert> : null}
          {sent.success?.startsWith("link:") ? (
            <Alert tone="success">Vérifiez votre boîte mail. Le lien ouvre votre espace.</Alert>
          ) : null}
          <button type="submit" className="auth-primary" disabled={sending || !isValidEmail(email)}>
            {sending ? "Envoi…" : otp ? "Recevoir le code" : "Recevoir un lien de connexion"}
          </button>
          {(google || apple) && (
            <div className="grid gap-2">
              {google ? <OAuthButton provider="google" nextPath={nextPath} label="Continuer avec Google" /> : null}
              {apple ? <OAuthButton provider="apple" nextPath={nextPath} label="Continuer avec Apple" /> : null}
            </div>
          )}
          <button type="button" className="auth-quiet" onClick={() => setStep("password")}>
            Continuer avec un mot de passe
          </button>
        </form>
      ) : null}

      {step === "code" ? (
        <form id="otp-form" action={verify} className="mt-8 grid gap-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="next" value={nextPath || "/espace"} />
          <OtpInput value={token} onChange={setToken} disabled={verifying} />
          {checked.error ? <Alert>{checked.error}</Alert> : null}
          <button type="submit" className="auth-primary" disabled={verifying || token.length !== 6}>
            {verifying ? "Vérification…" : "Continuer"}
          </button>
          <button
            type="submit"
            formAction={request}
            className="auth-quiet"
            disabled={seconds > 0 || sending}
            onClick={() => setSeconds(30)}
          >
            {seconds > 0 ? `Renvoyer dans ${seconds}s` : "Renvoyer le code"}
          </button>
          <input type="hidden" name="create" value={mode === "signup" ? "1" : "0"} form="otp-form" />
          {role ? <input type="hidden" name="role" value={role} /> : null}
        </form>
      ) : null}

      {step === "password" ? (
        <div className="mt-8">
          {mode === "login" ? (
            <LoginForm nextPath={nextPath || "/espace"} />
          ) : (
            <SignupForm
              nextPath={nextPath}
              defaultEmail={email || initialEmail}
              lockedRole={lockedRole ?? role ?? undefined}
              extras={{
                business_name: businessName,
                category: category ?? "",
                city,
                phone,
                instagram,
                website,
                weddings_per_year: weddingsPerYear,
                partner_one: partnerOne,
                partner_two: partnerTwo,
                wedding_date: weddingDate,
                tester_code: testerCode,
              }}
            />
          )}
          <button type="button" className="auth-quiet mt-4 w-full" onClick={() => setStep("email")}>
            {otp ? "Revenir au code" : "Revenir au lien"}
          </button>
        </div>
      ) : null}

      <p className="mt-auto pt-10 text-center text-xs text-muted">
        <Link href="/cgu" className="underline">
          CGU
        </Link>
        {" · "}
        <Link href="/confidentialite" className="underline">
          Confidentialité
        </Link>
      </p>
        </div>
      </div>
    </AuthDesktopFrame>
  );

  function pick(value: "vendor" | "couple") {
    setRole(value);
    setStep(value === "vendor" ? "vendor" : "couple");
  }
}

function FieldLike({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
  optional = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete: string;
  optional?: boolean;
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="auth-field min-h-14 rounded-2xl border border-line bg-paper px-4 text-lg text-ink outline-none focus:border-ink"
      />
    </label>
  );
}

function OAuthButton({
  provider,
  nextPath,
  label,
}: {
  provider: "google" | "apple";
  nextPath: string;
  label: string;
}) {
  return (
    <form action={startOAuth.bind(null, provider, nextPath || "/espace")}>
      <button type="submit" className="auth-choice">
        {label}
      </button>
    </form>
  );
}
