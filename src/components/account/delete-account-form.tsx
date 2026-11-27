"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function DeleteAccountForm() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirm.trim() !== "SUPPRIMER") {
      setError("Écrivez SUPPRIMER pour confirmer.");
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch("/api/compte", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; ok?: boolean } | null;
    if (!response.ok || !payload?.ok) {
      setError(payload?.error || "La suppression n'a pas abouti.");
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form noValidate className="grid gap-3" onSubmit={(event) => void onSubmit(event)}>
      <p className="text-sm leading-6 text-muted">
        Le compte, les messages et les fichiers personnels sont effacés. Les factures déjà émises restent conservées, avec les paiements qui les justifient, pendant le délai légal.
      </p>
      <label className="grid gap-2 text-sm">
        Écrivez SUPPRIMER pour confirmer
        <input
          name="confirm"
          autoComplete="off"
          value={confirm}
          onChange={(event) => {
            setConfirm(event.target.value);
            setError(null);
          }}
          className="min-h-12 rounded-2xl border border-line bg-paper px-4"
        />
      </label>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Suppression…" : "Supprimer mon compte"}
      </Button>
    </form>
  );
}
