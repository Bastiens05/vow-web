"use client";

import { useState } from "react";
import { Field, TextInput } from "@/components/ui/field";

export function PasswordField({
  label,
  name,
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <TextInput
          name={name}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          className="pr-24"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-sm text-muted"
          onClick={() => setShown((value) => !value)}
          aria-pressed={shown}
        >
          {shown ? "Masquer" : "Afficher"}
        </button>
      </div>
    </Field>
  );
}
