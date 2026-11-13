"use client";

import { useRef, useState } from "react";

export function FileDrop({
  accept,
  multiple = false,
  disabled = false,
  hint,
  progress = null,
  names = [],
  onFiles,
}: {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  hint: string;
  progress?: number | null;
  names?: string[];
  onFiles: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function take(list: FileList | null) {
    const files = list ? Array.from(list) : [];
    if (files.length === 0) return;
    onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (disabled) return;
        take(event.dataTransfer.files);
      }}
      className={`rounded-2xl border border-dashed px-4 py-5 text-center transition ${
        over ? "border-ink bg-ink/[0.04]" : "border-line bg-ivory/40"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-ink" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 16V6" />
          <path d="m8 9 4-4 4 4" />
          <path d="M5 18h14" />
        </svg>
      </span>
      <span className="mt-3 block text-sm font-medium">Déposez vos fichiers ici</span>
      <button
        type="button"
        disabled={disabled}
        className="mt-3 inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-medium text-ivory disabled:opacity-60"
        onClick={() => input.current?.click()}
      >
        Choisir des fichiers
      </button>
      <span className="mt-3 block text-xs leading-5 text-muted">{hint}</span>
      {names.length > 0 ? <span className="mt-3 block text-sm">{names.join(", ")}</span> : null}
      {progress !== null ? (
        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-line">
          <span className="block h-full rounded-full bg-ink transition-[width]" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </span>
      ) : null}
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label="Choisir des fichiers"
        className="sr-only"
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
