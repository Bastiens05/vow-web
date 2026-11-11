"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { LoginForm, SignupForm } from "@/components/auth/auth-forms";
import { OtpInput } from "@/components/auth/otp-input";
import { isValidEmail } from "@/lib/domain/auth-routing";
import { requestEmailCode, startOAuth, verifyEmailCode, type ActionState } from "@/server/actions/auth";

type Step = "choose" | "email" | "code" | "password";

export function AuthFlow({
  mode,
  nextPath,
  initialEmail = "",
  lockedRole,
  google,
  apple,
  otp = false,
}: {
  mode: "login" | "signup";
  nextPath: string;
  initialEmail?: string;
  lockedRole?: "vendor" | "couple";
  google: boolean;
  apple: boolean;
  otp?: boolean;
}) {
  const [step, setStep] = useState<Step>(mode === "signup" && !lockedRole ? "choose" : "email");
  const [role, setRole] = useState<"vendor" | "couple" | null>(lockedRole ?? null);
  const [email, setEmail] = useState(initialEmail);
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
      : step === "code"
        ? "Votre code"
        : step === "password"
          ? mode === "login"
            ? "Mot de passe"
            : "Créer le compte"
          : "Votre e-mail";

  return (
    <div className="auth-screen auth-step mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col px-5 py-10 md:min-h-dvh md:justify-center">
      <p className="text-sm font-semibold tracking-[0.28em]">VOW</p>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-base leading-7 text-muted">
        {step === "choose"
          ? "Dites-nous qui vous êtes. Les mariés arrivent en général par l'invitation."
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
              className="auth-field min-h-14 rounded-2xl border border-black/10 bg-white px-4 text-lg outline-none focus:border-ink"
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
            <SignupForm nextPath={nextPath} defaultEmail={initialEmail} lockedRole={lockedRole ?? role ?? undefined} />
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
  );

  function pick(value: "vendor" | "couple") {
    setRole(value);
    setStep("email");
  }
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
