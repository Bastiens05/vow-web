"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import type { QuoteTarget } from "@/lib/domain/vendor-home";

const mobile =
  "w-full max-sm:h-auto max-sm:min-h-[3.35rem] max-sm:flex-col max-sm:whitespace-normal max-sm:px-2.5 max-sm:py-2 max-sm:text-center max-sm:text-sm max-sm:leading-snug";

export function QuoteShortcut({ target }: { target: QuoteTarget }) {
  const [open, setOpen] = useState(false);
  if (target.kind === "link") {
    return (
      <Link href={target.href} className={buttonClass("secondary", mobile)}>
        <FileText className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        Créer un devis
      </Link>
    );
  }
  return (
    <div className="relative min-w-0">
      <button
        type="button"
        className={buttonClass("secondary", mobile)}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        <FileText className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        Créer un devis
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-line bg-paper p-2 shadow-[0_12px_40px_rgba(28,27,25,0.08)] sm:right-auto sm:w-72">
          {target.kind === "empty" ? (
            <p className="px-3 py-2 text-sm text-muted">
              Aucun mariage pour l&apos;instant.{" "}
              <Link href="/espace/mariages/nouveau" className="font-medium text-ink underline" onClick={() => setOpen(false)}>
                Nouveau mariage
              </Link>
            </p>
          ) : (
            <ul role="listbox" className="max-h-64 overflow-auto">
              {target.options.map((option) => (
                <li key={option.id}>
                  <Link
                    href={option.href}
                    className="block rounded-xl px-3 py-2 text-sm hover:bg-accent-soft"
                    onClick={() => setOpen(false)}
                  >
                    {option.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
