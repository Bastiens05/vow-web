export const VAT_EXEMPT_MENTION = "TVA non applicable, art. 293 B du CGI";
export const LATE_PENALTY_MENTION =
  "Pénalités de retard : trois fois le taux d'intérêt légal. Indemnité forfaitaire de recouvrement : 40 €.";
export const NO_DISCOUNT_MENTION = "Escompte pour paiement anticipé : néant.";

export const PAYMENT_KINDS = ["acompte", "solde"] as const;
export const PAYMENT_METHODS = ["virement", "cb", "especes", "cheque"] as const;

export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const KIND_LABEL: Record<PaymentKind, string> = {
  acompte: "Acompte",
  solde: "Solde",
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  virement: "Virement",
  cb: "Carte bancaire",
  especes: "Espèces",
  cheque: "Chèque",
};

export function isPaymentKind(value: string): value is PaymentKind {
  return (PAYMENT_KINDS as readonly string[]).includes(value);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function paymentKindLabel(kind: string): string {
  return isPaymentKind(kind) ? KIND_LABEL[kind] : kind;
}

export function paymentMethodLabel(method: string): string {
  return isPaymentMethod(method) ? METHOD_LABEL[method] : method;
}

/** Next invoice number from the vendor counter. Always last + 1, never a reused hole. */
export function allocateInvoiceNumber(lastNumber: number): number {
  if (!Number.isInteger(lastNumber) || lastNumber < 0) {
    throw new Error("Compteur de facture invalide");
  }
  return lastNumber + 1;
}

/** True when the issued numbers are not exactly 1..n. Holes are not backfilled. */
export function invoiceSequenceHasGap(issued: readonly number[]): boolean {
  const sorted = [...issued].sort((a, b) => a - b);
  return sorted.some((number, index) => number !== index + 1);
}

export type IssuedInvoice = {
  number: number;
  amountCents: number;
  title: string;
  sellerSiret: string;
  clientName: string;
  vatExempt: boolean;
  paymentTerms: string;
};

/** Issued invoices keep their number, amount, client and legal mentions. */
export function assertInvoiceImmutable(before: IssuedInvoice, after: IssuedInvoice): void {
  const same =
    before.number === after.number &&
    before.amountCents === after.amountCents &&
    before.title === after.title &&
    before.sellerSiret === after.sellerSiret &&
    before.clientName === after.clientName &&
    before.vatExempt === after.vatExempt &&
    before.paymentTerms === after.paymentTerms;
  if (!same) throw new Error("Facture déjà émise");
}

export type FinanceQuote = { status: string; amountCents: number };
export type FinanceInvoice = { status: string; amountCents: number };
export type FinancePayment = { kind: string; amountCents: number; paidOn: string };

export type FinanceSnapshot = {
  pendingQuotesCents: number;
  depositsCollectedCents: number;
  settledInvoicesCents: number;
  collectedThisYearCents: number;
};

export const FINANCE_FIGURES = [
  { key: "pendingQuotesCents", label: "Devis en attente", detail: "Envoyés, ni acceptés ni facturés" },
  { key: "depositsCollectedCents", label: "Acomptes encaissés", detail: "Paiements d'acompte" },
  { key: "settledInvoicesCents", label: "Factures réglées", detail: "Montant des factures acquittées" },
  { key: "collectedThisYearCents", label: "Encaissé cette année", detail: "Paiements enregistrés" },
] as const satisfies readonly { key: keyof FinanceSnapshot; label: string; detail: string }[];

export function financeSnapshot(input: {
  quotes: readonly FinanceQuote[];
  invoices: readonly FinanceInvoice[];
  payments: readonly FinancePayment[];
  year: string;
}): FinanceSnapshot {
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
  return {
    pendingQuotesCents: sum(
      input.quotes.filter((quote) => quote.status === "sent").map((quote) => quote.amountCents),
    ),
    depositsCollectedCents: sum(
      input.payments.filter((payment) => payment.kind === "acompte").map((payment) => payment.amountCents),
    ),
    settledInvoicesCents: sum(
      input.invoices.filter((invoice) => invoice.status === "paid").map((invoice) => invoice.amountCents),
    ),
    collectedThisYearCents: sum(
      input.payments
        .filter((payment) => payment.paidOn.startsWith(input.year))
        .map((payment) => payment.amountCents),
    ),
  };
}

export function remainingCents(invoiceCents: number, paidCents: number): number {
  return Math.max(0, invoiceCents - paidCents);
}

export function invoiceSettled(invoiceCents: number, paidCents: number): boolean {
  return invoiceCents > 0 && paidCents >= invoiceCents;
}

export function invoiceDocumentLines(input: {
  numberLabel: string;
  issuedOn: string;
  sellerName: string;
  sellerSiret: string;
  sellerAddress: string;
  clientName: string;
  title: string;
  amountLabel: string;
  vatExempt: boolean;
  paymentTerms: string;
  payments: readonly { label: string }[];
  remainingLabel: string;
  settled: boolean;
}): string[] {
  return [
    "VOW",
    `Facture ${input.numberLabel}`,
    `Date d'émission : ${input.issuedOn}`,
    `Émetteur : ${input.sellerName || "-"}`,
    `SIRET : ${input.sellerSiret || "-"}`,
    `Adresse : ${input.sellerAddress || "-"}`,
    `Client : ${input.clientName || "-"}`,
    `Désignation : ${input.title}`,
    `Montant : ${input.amountLabel}`,
    input.vatExempt ? VAT_EXEMPT_MENTION : "TVA 20 % incluse",
    `Conditions de paiement : ${input.paymentTerms || "Paiement à réception"}`,
    LATE_PENALTY_MENTION,
    NO_DISCOUNT_MENTION,
    "Paiements",
    ...(input.payments.length > 0 ? input.payments.map((payment) => payment.label) : ["Aucun paiement enregistré"]),
    `Reste à payer : ${input.remainingLabel}`,
    input.settled ? "ACQUITTÉE" : "En attente",
  ];
}
