"use client";

import { useEffect, useMemo, useState } from "react";
import { removeBudgetLine, saveBudgetLine, saveBudgetTotal } from "@/server/actions/budget";
import { formatEuros } from "@/lib/domain/money";

export type BudgetRow = {
  key: string;
  id: string | null;
  label: string;
  trade: string;
  euros: number;
  paid: boolean;
  vendorUserId: string | null;
};

const SPLIT = [
  { label: "Lieu et traiteur", percent: 45 },
  { label: "Photo", percent: 10 },
  { label: "Vidéo", percent: 7 },
  { label: "DJ et musique", percent: 6 },
  { label: "Tenues", percent: 8 },
  { label: "Fleurs et décoration", percent: 8 },
  { label: "Alliances", percent: 5 },
  { label: "Divers", percent: 11 },
];

const EXTRAS = ["Tenues", "Fleurs et décoration", "Alliances", "Faire-part", "Cérémonie"];

export function BudgetBoard({ weddingId, totalCents, rows }: { weddingId: string; totalCents: number; rows: BudgetRow[] }) {
  const [total, setTotal] = useState(totalCents ? String(totalCents / 100) : "");
  const [lines, setLines] = useState(rows);
  const [note, setNote] = useState("");

  useEffect(() => {
    const euros = Number(total.replace(",", "."));
    if (!Number.isFinite(euros)) return;
    if (Math.round(euros * 100) === totalCents && total !== "") return;
    const handle = window.setTimeout(() => {
      void saveBudgetTotal(weddingId, euros).then((result) => setNote(result.error ?? "Enregistré"));
    }, 500);
    return () => window.clearTimeout(handle);
  }, [total, totalCents, weddingId]);

  const cents = Math.round((Number(total.replace(",", ".")) || 0) * 100);
  const engaged = lines.reduce((sum, line) => sum + Math.round(line.euros * 100), 0);
  const paid = lines.filter((line) => line.paid).reduce((sum, line) => sum + Math.round(line.euros * 100), 0);
  const ratio = cents > 0 ? Math.min(1, engaged / cents) : 0;

  const labels = useMemo(() => new Set(lines.map((line) => line.label)), [lines]);

  async function persist(next: BudgetRow) {
    const result = await saveBudgetLine(weddingId, {
      id: next.id ?? undefined,
      label: next.label,
      euros: next.euros,
      paid: next.paid,
      vendorUserId: next.vendorUserId,
    });
    setNote(result.error ?? "Enregistré");
    if (result.id && !next.id) {
      setLines((current) => current.map((line) => (line.key === next.key ? { ...line, id: result.id ?? null } : line)));
    }
  }

  function update(key: string, patch: Partial<BudgetRow>, save = true) {
    setLines((current) => {
      const next = current.map((line) => (line.key === key ? { ...line, ...patch } : line));
      const row = next.find((line) => line.key === key);
      if (save && row) void persist(row);
      return next;
    });
  }

  async function suggest() {
    if (cents <= 0) {
      setNote("Indiquez d'abord le budget global.");
      return;
    }
    let used = 0;
    const created: BudgetRow[] = SPLIT.map((part, index) => {
      const amount = index === SPLIT.length - 1 ? cents - used : Math.round((cents * part.percent) / 100);
      used += amount;
      const existing = lines.find((line) => line.label === part.label);
      return {
        key: existing?.key ?? part.label,
        id: existing?.id ?? null,
        label: part.label,
        trade: `${part.percent} %`,
        euros: amount / 100,
        paid: existing?.paid ?? false,
        vendorUserId: existing?.vendorUserId ?? null,
      };
    });
    setLines(created);
    for (const line of created) await persist(line);
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-3xl border border-line bg-paper p-5">
        <label className="block text-sm text-muted" htmlFor="budget-total">
          Budget global
        </label>
        <input
          id="budget-total"
          inputMode="decimal"
          value={total}
          onChange={(event) => setTotal(event.target.value)}
          placeholder="0"
          className="mt-1 w-full bg-transparent text-5xl font-semibold tracking-tight outline-none"
        />
        <div className="mt-4 flex items-center gap-4">
          <Ring ratio={ratio} />
          <div className="text-sm">
            <p>Engagé {formatEuros(engaged)}</p>
            <p className="text-muted">Reste {formatEuros(Math.max(0, cents - engaged))}</p>
            <p className="text-muted">Payé {formatEuros(paid)}</p>
          </div>
        </div>
        {note ? <p className="mt-3 text-xs text-muted">{note}</p> : null}
      </section>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" className="min-h-11 shrink-0 rounded-full border border-line px-3 text-sm" onClick={() => void suggest()}>
          Répartition suggérée
        </button>
        {EXTRAS.filter((label) => !labels.has(label)).map((label) => (
          <button
            key={label}
            type="button"
            className="min-h-11 shrink-0 rounded-full border border-line px-3 text-sm"
            onClick={() =>
              setLines((current) => [
                ...current,
                { key: `${label}-${current.length}`, id: null, label, trade: "", euros: 0, paid: false, vendorUserId: null },
              ])
            }
          >
            + {label}
          </button>
        ))}
      </div>
      <ul className="grid gap-2">
        {lines.map((line) => (
          <li key={line.key} className="flex items-center gap-3 rounded-2xl border border-line bg-paper px-3 py-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist text-xs font-medium">
              {line.label.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{line.label}</span>
              {line.trade ? <span className="block truncate text-xs text-muted">{line.trade}</span> : null}
            </span>
            <input
              inputMode="decimal"
              aria-label={`Montant ${line.label}`}
              value={String(line.euros)}
              onChange={(event) => update(line.key, { euros: Number(event.target.value.replace(",", ".")) || 0 }, false)}
              onBlur={() => {
                const row = lines.find((item) => item.key === line.key);
                if (row) void persist(row);
              }}
              className="w-20 bg-transparent text-right text-sm outline-none"
            />
            <button
              type="button"
              className={`min-h-11 rounded-full px-3 text-xs ${line.paid ? "bg-ok/15 text-ink" : "border border-line text-muted"}`}
              onClick={() => update(line.key, { paid: !line.paid })}
            >
              {line.paid ? "Payé" : "Reste"}
            </button>
            {line.id ? (
              <button
                type="button"
                className="text-xs text-muted underline"
                onClick={() => {
                  void removeBudgetLine(weddingId, line.id as string);
                  setLines((current) => current.filter((item) => item.key !== line.key));
                }}
              >
                Retirer
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ring({ ratio }: { ratio: number }) {
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--vow-line)" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke="var(--vow-ink)"
        strokeWidth="6"
        strokeDasharray={`${circ * ratio} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
    </svg>
  );
}
