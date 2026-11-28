"use client";

import { useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { VENDOR_CATEGORIES, categoryLabel } from "@/lib/domain/categories";
import { inviteDiscoveredVendor, searchDiscoverableVendors, type VendorSearchResult } from "@/server/actions/vendor-search";

export function VendorSearch({ weddingId, memberIds }: { weddingId: string; memberIds: string[] }) {
  const [query, setQuery] = useState("");
  const [trade, setTrade] = useState("");
  const [vendors, setVendors] = useState<VendorSearchResult[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [asked, setAsked] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState("");
  const [sent, setSent] = useState<Record<string, true>>({});
  const members = new Set(memberIds);
  const request = useRef(0);
  const timer = useRef<number | null>(null);

  function look(nextQuery: string, nextTrade: string) {
    setAsked(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const id = request.current + 1;
      request.current = id;
      void searchDiscoverableVendors(nextQuery, nextTrade).then((result) => {
        if (id !== request.current) return;
        setVendors(result.vendors);
        setUnavailable(result.unavailable);
      });
    }, 200);
  }

  return (
    <section className="mt-8 min-w-0">
      <h2 className="font-serif text-3xl font-normal tracking-tight text-ink">Trouver un prestataire</h2>
      <p className="mt-1 text-sm text-muted">Par nom d&apos;activité ou de personne. Seuls ceux qui ont choisi d&apos;apparaître sont listés.</p>
      <input
        value={query}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          void look(next, trade);
        }}
        placeholder="Nom, atelier…"
        aria-label="Rechercher un prestataire"
        className="mt-4 w-full min-w-0 rounded-2xl border border-line bg-paper px-4 py-3 text-base outline-none"
      />
      <div className="mt-3 flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1">
        <TradeChip active={trade === ""} onClick={() => { setTrade(""); void look(query, ""); }}>
          Tous
        </TradeChip>
        {VENDOR_CATEGORIES.map((category) => (
          <TradeChip
            key={category}
            active={trade === category}
            onClick={() => {
              setTrade(category);
              void look(query, category);
            }}
          >
            {categoryLabel(category)}
          </TradeChip>
        ))}
      </div>
      {unavailable ? <p className="mt-4 text-sm text-muted">La recherche n&apos;est pas encore ouverte.</p> : null}
      {problem ? <div className="mt-4"><Alert>{problem}</Alert></div> : null}
      {note ? <div className="mt-4"><Alert tone="success">{note}</Alert></div> : null}
      <ul className="mt-4 grid gap-2">
        {asked && !unavailable && vendors.length === 0 ? <li className="text-sm text-muted">Aucun prestataire ne correspond.</li> : null}
        {vendors.map((vendor) => {
          const already = members.has(vendor.userId) || sent[vendor.userId];
          return (
            <li key={vendor.userId} className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-paper px-3 py-3">
              {vendor.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vendor.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mist text-sm font-medium">
                  {(vendor.businessName || vendor.personName).slice(0, 1)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{vendor.businessName || vendor.personName}</span>
                <span className="block truncate text-xs text-muted">
                  {vendor.trade}
                  {vendor.city ? ` · ${vendor.city}` : ""}
                  {vendor.personName && vendor.businessName ? ` · ${vendor.personName}` : ""}
                </span>
              </span>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 px-3 text-sm"
                disabled={already || pendingId === vendor.userId}
                onClick={() => {
                  setPendingId(vendor.userId);
                  void inviteDiscoveredVendor(weddingId, vendor.userId).then((result) => {
                    setPendingId(null);
                    if (result.error) {
                      setNote("");
                      setProblem(result.error);
                      return;
                    }
                    setProblem("");
                    setSent((current) => ({ ...current, [vendor.userId]: true }));
                    setNote(result.success ?? "Invitation envoyée. Le prestataire peut accepter ou refuser.");
                  });
                }}
              >
                {members.has(vendor.userId) ? "Déjà avec vous" : sent[vendor.userId] ? "Demandé" : pendingId === vendor.userId ? "Envoi…" : "Inviter"}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TradeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full border px-3 text-sm ${active ? "border-ink bg-ink text-ivory" : "border-line bg-paper text-ink"}`}
    >
      {children}
    </button>
  );
}
