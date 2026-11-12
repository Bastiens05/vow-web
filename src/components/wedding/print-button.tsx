"use client";

export function PrintButton() {
  return (
    <button type="button" className="min-h-11 rounded-full border border-line px-4 text-sm print:hidden" onClick={() => window.print()}>
      Imprimer
    </button>
  );
}
