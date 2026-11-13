import { formatPriceCents, parseEurosToCents } from "@/lib/domain/price";

export type PromoKind = "percent" | "amount";

export type OfferPrice = {
  priceCents: number | null;
  promoKind: PromoKind | null;
  promoValue: number | null;
  promoLabel: string;
  promoStartsOn: string | null;
  promoEndsOn: string | null;
};

export type VisiblePrice = {
  originalCents: number | null;
  currentCents: number | null;
  badge: string | null;
};

export function promoActive(offer: OfferPrice, today: string): boolean {
  if (!offer.promoKind || offer.promoValue === null || offer.priceCents === null) return false;
  if (offer.promoStartsOn && today < offer.promoStartsOn) return false;
  if (offer.promoEndsOn && today > offer.promoEndsOn) return false;
  return discountedCents(offer.priceCents, offer.promoKind, offer.promoValue) !== null;
}

export function discountedCents(priceCents: number, kind: PromoKind, value: number): number | null {
  if (kind === "percent") {
    if (value < 1 || value > 90) return null;
    return Math.max(0, Math.round((priceCents * (100 - value)) / 100));
  }
  if (value <= 0 || value >= priceCents) return null;
  return priceCents - value;
}

export function visiblePrice(offer: OfferPrice, today: string): VisiblePrice {
  if (!promoActive(offer, today) || offer.priceCents === null || !offer.promoKind || offer.promoValue === null) {
    return { originalCents: null, currentCents: offer.priceCents, badge: null };
  }
  const current = discountedCents(offer.priceCents, offer.promoKind, offer.promoValue);
  if (current === null) return { originalCents: null, currentCents: offer.priceCents, badge: null };
  return {
    originalCents: offer.priceCents,
    currentCents: current,
    badge: promoBadge(offer),
  };
}

export function promoBadge(offer: OfferPrice): string {
  const amount =
    offer.promoKind === "percent" && offer.promoValue !== null
      ? `−${offer.promoValue} %`
      : offer.promoKind === "amount" && offer.promoValue !== null
        ? `−${formatPriceCents(offer.promoValue)}`
        : "";
  const until = offer.promoEndsOn ? ` jusqu'au ${shortFrenchDate(offer.promoEndsOn)}` : "";
  const label = offer.promoLabel.trim();
  if (label && amount) return `${label} · ${amount}${until}`;
  return `${amount}${until}`.trim();
}

function shortFrenchDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(date).replace(".", "");
}

export type StoredPromo = {
  promo_kind: PromoKind | null;
  promo_value: number | null;
  promo_label: string;
  promo_starts_on: string | null;
  promo_ends_on: string | null;
};

export function parsePromo(input: {
  enabled: boolean;
  kind: string;
  value: string;
  label: string;
  starts: string;
  ends: string;
  priceCents: number | null;
}): { ok: true; value: StoredPromo | null } | { ok: false; error: string } {
  if (!input.enabled) {
    return { ok: true, value: null };
  }
  const kind = input.kind === "amount" ? "amount" : input.kind === "percent" ? "percent" : null;
  if (!kind) return { ok: false, error: "Choisissez un pourcentage ou un montant." };
  const label = input.label.trim().slice(0, 80);
  const starts = input.starts.trim();
  const ends = input.ends.trim();
  if (starts && !/^\d{4}-\d{2}-\d{2}$/.test(starts)) return { ok: false, error: "La date de début n'est pas valide." };
  if (ends && !/^\d{4}-\d{2}-\d{2}$/.test(ends)) return { ok: false, error: "La date de fin n'est pas valide." };
  if (starts && ends && ends < starts) return { ok: false, error: "La promo se termine avant de commencer." };
  let value: number | null = null;
  if (kind === "percent") {
    if (!/^\d+$/.test(input.value.trim())) return { ok: false, error: "Le pourcentage est un nombre entier." };
    value = Number(input.value.trim());
    if (value < 1 || value > 90) return { ok: false, error: "Le pourcentage est compris entre 1 et 90." };
  } else {
    const euros = parseEurosToCents(input.value);
    if (!euros.ok) return euros;
    if (euros.cents === null || euros.cents <= 0) return { ok: false, error: "Indiquez le montant de la remise." };
    if (input.priceCents !== null && euros.cents >= input.priceCents) {
      return { ok: false, error: "La remise doit rester inférieure au prix." };
    }
    value = euros.cents;
  }
  return {
    ok: true,
    value: {
      promo_kind: kind,
      promo_value: value,
      promo_label: label,
      promo_starts_on: starts || null,
      promo_ends_on: ends || null,
    },
  };
}

export const emptyPromo: StoredPromo = {
  promo_kind: null,
  promo_value: null,
  promo_label: "",
  promo_starts_on: null,
  promo_ends_on: null,
};
