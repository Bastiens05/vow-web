import { describe, expect, it } from "vitest";
import {
  LATE_PENALTY_MENTION,
  VAT_EXEMPT_MENTION,
  allocateInvoiceNumber,
  assertInvoiceImmutable,
  financeSnapshot,
  invoiceDocumentLines,
  invoiceSequenceHasGap,
  invoiceSettled,
  remainingCents,
} from "@/lib/domain/finance";

const issued = {
  number: 3,
  amountCents: 240000,
  title: "Reportage",
  sellerSiret: "12345678901234",
  clientName: "Camille Martin & Ada Bernard",
  vatExempt: true,
  paymentTerms: "Paiement à réception",
};

describe("invoice numbers", () => {
  it("starts at 1 and continues without gaps or reuse", () => {
    expect(allocateInvoiceNumber(0)).toBe(1);
    const seen = new Set<number>();
    let last = 0;
    for (let step = 0; step < 4; step += 1) {
      const number = allocateInvoiceNumber(last);
      expect(number).toBe(last + 1);
      expect(seen.has(number)).toBe(false);
      seen.add(number);
      last = number;
    }
    expect([...seen]).toEqual([1, 2, 3, 4]);
  });

  it("does not backfill a hole", () => {
    expect(invoiceSequenceHasGap([1, 2, 4])).toBe(true);
    expect(invoiceSequenceHasGap([1, 2, 3])).toBe(false);
    expect(invoiceSequenceHasGap([])).toBe(false);
    expect(allocateInvoiceNumber(4)).toBe(5);
  });

  it("rejects a change to an issued invoice", () => {
    expect(() => assertInvoiceImmutable(issued, issued)).not.toThrow();
    expect(() => assertInvoiceImmutable(issued, { ...issued, number: 4 })).toThrow(/Facture déjà émise/);
    expect(() => assertInvoiceImmutable(issued, { ...issued, amountCents: 100 })).toThrow(/Facture déjà émise/);
    expect(() => assertInvoiceImmutable(issued, { ...issued, sellerSiret: "99999999999999" })).toThrow(
      /Facture déjà émise/,
    );
    expect(() => assertInvoiceImmutable(issued, { ...issued, vatExempt: false })).toThrow(/Facture déjà émise/);
  });
});

describe("finance totals", () => {
  it("keeps pending quotes, deposits, settled invoices and this year's payments apart", () => {
    const snapshot = financeSnapshot({
      year: "2026",
      quotes: [
        { status: "draft", amountCents: 100 },
        { status: "sent", amountCents: 150000 },
        { status: "sent", amountCents: 50000 },
        { status: "accepted", amountCents: 80000 },
        { status: "invoiced", amountCents: 240000 },
      ],
      invoices: [
        { status: "paid", amountCents: 240000 },
        { status: "pending", amountCents: 90000 },
      ],
      payments: [
        { kind: "acompte", amountCents: 40000, paidOn: "2026-02-01" },
        { kind: "solde", amountCents: 200000, paidOn: "2026-06-12" },
        { kind: "acompte", amountCents: 10000, paidOn: "2025-11-02" },
      ],
    });
    expect(snapshot.pendingQuotesCents).toBe(200000);
    expect(snapshot.depositsCollectedCents).toBe(50000);
    expect(snapshot.settledInvoicesCents).toBe(240000);
    expect(snapshot.collectedThisYearCents).toBe(240000);
  });

  it("counts a recorded payment even when the invoice row is older", () => {
    const snapshot = financeSnapshot({
      year: "2026",
      quotes: [],
      invoices: [{ status: "paid", amountCents: 100000 }],
      payments: [{ kind: "solde", amountCents: 100000, paidOn: "2026-01-03" }],
    });
    expect(snapshot.collectedThisYearCents).toBe(100000);
    expect(snapshot.settledInvoicesCents).toBe(100000);
    expect(snapshot.depositsCollectedCents).toBe(0);
  });
});

describe("invoice balance and pdf", () => {
  it("shows the remaining balance and the acquittée mark when paid", () => {
    expect(remainingCents(100000, 40000)).toBe(60000);
    expect(remainingCents(100000, 100000)).toBe(0);
    expect(invoiceSettled(100000, 100000)).toBe(true);
    expect(invoiceSettled(100000, 40000)).toBe(false);

    const lines = invoiceDocumentLines({
      numberLabel: "F-2026-003",
      issuedOn: "13 novembre 2026",
      sellerName: "Studio Bastien",
      sellerSiret: "12345678901234",
      sellerAddress: "12 rue des Lilas, Lyon",
      clientName: "Camille Martin & Ada Bernard",
      title: "Reportage",
      amountLabel: "2 400,00 €",
      vatExempt: true,
      paymentTerms: "Paiement à réception",
      payments: [{ label: "13 novembre 2026 · Solde · Virement · 2 400,00 €" }],
      remainingLabel: "0,00 €",
      settled: true,
    });
    const text = lines.join("\n");
    expect(text).toContain("SIRET : 12345678901234");
    expect(text).toContain("Camille Martin & Ada Bernard");
    expect(text).toContain(VAT_EXEMPT_MENTION);
    expect(text).toContain(LATE_PENALTY_MENTION);
    expect(text).toContain("ACQUITTÉE");
    expect(text).toContain("Reste à payer : 0,00 €");
  });

  it("mentions 20 % VAT when the vendor is not exempt", () => {
    const lines = invoiceDocumentLines({
      numberLabel: "F-2026-004",
      issuedOn: "13 novembre 2026",
      sellerName: "Studio Bastien",
      sellerSiret: "12345678901234",
      sellerAddress: "Lyon",
      clientName: "Camille",
      title: "Reportage",
      amountLabel: "1 200,00 €",
      vatExempt: false,
      paymentTerms: "Paiement à réception",
      payments: [],
      remainingLabel: "1 200,00 €",
      settled: false,
    });
    expect(lines).toContain("TVA 20 % incluse");
    expect(lines).toContain("En attente");
    expect(lines).not.toContain("ACQUITTÉE");
  });
});
