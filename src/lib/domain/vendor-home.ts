import { daysUntil } from "@/lib/domain/next-actions";

export const VAULT_HORIZON_DAYS = 30;

export type QuoteTarget =
  | { kind: "link"; href: string }
  | { kind: "pick"; options: { id: string; title: string; href: string }[] }
  | { kind: "empty" };

export type VendorTodo = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  warn: boolean;
};

export type WeddingStep = {
  id: "contract" | "deposit" | "documents";
  label: string;
  done: boolean;
};

type NamedCount = { weddingId: string; names: string; count: number };

export function addIsoDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** One upcoming wedding opens its devis page. Several open a picker. */
export function quoteTarget(weddings: readonly { id: string; title: string; date: string }[]): QuoteTarget {
  const sorted = [...weddings].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "fr"));
  if (sorted.length === 0) return { kind: "empty" };
  if (sorted.length === 1) {
    const only = sorted[0];
    if (!only) return { kind: "empty" };
    return { kind: "link", href: `/mariage/${only.id}/devis` };
  }
  return {
    kind: "pick",
    options: sorted.map((wedding) => ({
      id: wedding.id,
      title: wedding.title,
      href: `/mariage/${wedding.id}/devis`,
    })),
  };
}

export function documentRequestOpen(status: string): boolean {
  return status === "needed" || status === "correction";
}

export function documentRequestReceived(status: string): boolean {
  return status === "sent" || status === "validated";
}

/** Signed e-signature requests, a paid deposit or acompte, and every requested document received. */
export function weddingReadiness(input: {
  signatures: readonly { status: string }[];
  depositPaid: boolean;
  documentRequests: readonly { status: string }[];
}): WeddingStep[] {
  const contract = input.signatures.length > 0 && input.signatures.every((row) => row.status === "signed");
  const documents =
    input.documentRequests.length > 0 && input.documentRequests.every((row) => documentRequestReceived(row.status));
  return [
    { id: "contract", label: "Contrat signé", done: contract },
    { id: "deposit", label: "Acompte reçu", done: input.depositPaid },
    { id: "documents", label: "Documents complets", done: documents },
  ];
}

function countTitle(count: number, one: string, many: string): string {
  return count === 1 ? one : `${count} ${many}`;
}

function vaultTitle(label: string, expiresOn: string, today: string): string {
  const days = daysUntil(expiresOn, today);
  if (days === 0) return `${label} expire aujourd'hui`;
  if (days === 1) return `${label} expire dans 1 jour`;
  return `${label} expire dans ${days ?? "?"} jours`;
}

export function buildVendorTodos(input: {
  today: string;
  formatDate: (iso: string) => string;
  messages: readonly NamedCount[];
  quotes: readonly NamedCount[];
  documents: readonly NamedCount[];
  overdueDeposits: readonly { weddingId: string; names: string }[];
  overduePayments: readonly { weddingId: string; names: string }[];
  vaultFiles: readonly { id: string; label: string; expiresOn: string | null }[];
}): VendorTodo[] {
  const items: VendorTodo[] = [];
  for (const row of input.messages) {
    if (row.count < 1) continue;
    items.push({
      id: `messages-${row.weddingId}`,
      title: countTitle(row.count, "1 message non lu", "messages non lus"),
      subtitle: row.names,
      href: `/mariage/${row.weddingId}/messages`,
      warn: false,
    });
  }
  for (const row of input.quotes) {
    if (row.count < 1) continue;
    items.push({
      id: `quotes-${row.weddingId}`,
      title: countTitle(row.count, "Devis en attente de réponse", "devis en attente de réponse"),
      subtitle: row.names,
      href: `/mariage/${row.weddingId}/devis`,
      warn: false,
    });
  }
  for (const row of input.documents) {
    if (row.count < 1) continue;
    items.push({
      id: `documents-${row.weddingId}`,
      title: countTitle(row.count, "1 document demandé non reçu", "documents demandés non reçus"),
      subtitle: row.names,
      href: `/mariage/${row.weddingId}/documents`,
      warn: false,
    });
  }
  for (const row of input.overdueDeposits) {
    items.push({
      id: `deposit-${row.weddingId}`,
      title: "Acompte en retard",
      subtitle: row.names,
      href: `/mariage/${row.weddingId}/devis`,
      warn: true,
    });
  }
  for (const row of input.overduePayments) {
    items.push({
      id: `payment-${row.weddingId}`,
      title: "Paiement en retard",
      subtitle: row.names,
      href: `/mariage/${row.weddingId}/devis`,
      warn: true,
    });
  }
  const horizon = addIsoDays(input.today, VAULT_HORIZON_DAYS);
  const vault = input.vaultFiles
    .flatMap((file) => (file.expiresOn && file.expiresOn >= input.today && file.expiresOn <= horizon ? [file] : []))
    .sort((a, b) => (a.expiresOn ?? "").localeCompare(b.expiresOn ?? ""));
  for (const file of vault) {
    if (!file.expiresOn) continue;
    items.push({
      id: `vault-${file.id}`,
      title: vaultTitle(file.label, file.expiresOn, input.today),
      subtitle: `À renouveler avant le ${input.formatDate(file.expiresOn)}`,
      href: "/coffre-fort",
      warn: true,
    });
  }
  return items;
}
