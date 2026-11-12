"use client";

import { useSyncExternalStore, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export function ContactFormLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(
    () => () => undefined,
    () => typeof navigator.share === "function",
    () => false,
  );

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  async function share() {
    if (!navigator.share) return;
    await navigator.share({ title: "Formulaire de contact", url });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-muted">
        Les futurs mariés qui remplissent votre formulaire public arrivent ici. Mettez ce lien dans votre bio Instagram ou sur votre site.
      </p>
      <p className="break-all rounded-2xl bg-ivory px-3 py-3 text-sm">{url}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          {copied ? "Copié" : "Copier"}
        </Button>
        {canShare ? (
          <Button type="button" variant="secondary" onClick={() => void share()}>
            Partager
          </Button>
        ) : null}
        <ButtonLink href={url} variant="secondary">
          Voir mon formulaire
        </ButtonLink>
      </div>
    </div>
  );
}
