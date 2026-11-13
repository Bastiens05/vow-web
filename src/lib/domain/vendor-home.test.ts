import { describe, expect, it } from "vitest";
import {
  addIsoDays,
  buildVendorTodos,
  quoteTarget,
  weddingReadiness,
} from "@/lib/domain/vendor-home";

const formatDate = (iso: string) => iso;

describe("quote shortcut", () => {
  it("opens the next wedding, or a picker when there are several", () => {
    expect(quoteTarget([])).toEqual({ kind: "empty" });
    expect(quoteTarget([{ id: "a", title: "Léa & Hugo", date: "2027-04-24" }])).toEqual({
      kind: "link",
      href: "/mariage/a/devis",
    });
    expect(
      quoteTarget([
        { id: "late", title: "Léa & Hugo", date: "2027-04-24" },
        { id: "soon", title: "Bastien & Lorène", date: "2026-11-21" },
      ]),
    ).toEqual({
      kind: "pick",
      options: [
        { id: "soon", title: "Bastien & Lorène", href: "/mariage/soon/devis" },
        { id: "late", title: "Léa & Hugo", href: "/mariage/late/devis" },
      ],
    });
  });
});

describe("wedding steps", () => {
  it("checks a signed contract, a received acompte, and documents that all came back", () => {
    expect(
      weddingReadiness({
        signatures: [{ status: "signed" }],
        depositPaid: true,
        documentRequests: [{ status: "validated" }, { status: "sent" }],
      }).map((step) => step.done),
    ).toEqual([true, true, true]);
  });

  it("stays open when nothing was requested or paid", () => {
    expect(
      weddingReadiness({
        signatures: [],
        depositPaid: false,
        documentRequests: [],
      }).map((step) => [step.label, step.done]),
    ).toEqual([
      ["Contrat signé", false],
      ["Acompte reçu", false],
      ["Documents complets", false],
    ]);
  });

  it("keeps the contract open while one signature is still pending", () => {
    const [contract, deposit, documents] = weddingReadiness({
      signatures: [{ status: "signed" }, { status: "pending" }],
      depositPaid: false,
      documentRequests: [{ status: "needed" }],
    });
    expect(contract?.done).toBe(false);
    expect(deposit?.done).toBe(false);
    expect(documents?.done).toBe(false);
  });
});

describe("vendor todos", () => {
  it("lists only the categories that have something to do", () => {
    const items = buildVendorTodos({
      today: "2026-11-13",
      formatDate,
      messages: [{ weddingId: "w1", names: "Bastien & Lorène", count: 2 }],
      quotes: [{ weddingId: "w2", names: "Léa & Hugo", count: 1 }],
      documents: [{ weddingId: "w1", names: "Bastien & Lorène", count: 3 }],
      overdueDeposits: [{ weddingId: "w2", names: "Léa & Hugo" }],
      overduePayments: [],
      vaultFiles: [
        { id: "rc", label: "Assurance RC Pro", expiresOn: "2026-12-03" },
        { id: "old", label: "Kbis", expiresOn: "2026-01-01" },
        { id: "later", label: "CGV", expiresOn: "2027-06-01" },
        { id: "none", label: "Autre", expiresOn: null },
      ],
    });
    expect(items.map((item) => item.title)).toEqual([
      "2 messages non lus",
      "Devis en attente de réponse",
      "3 documents demandés non reçus",
      "Acompte en retard",
      "Assurance RC Pro expire dans 20 jours",
    ]);
    expect(items[0]?.href).toBe("/mariage/w1/messages");
    expect(items[3]?.warn).toBe(true);
    expect(items[4]?.href).toBe("/coffre-fort");
    expect(items[4]?.subtitle).toBe("À renouveler avant le 2026-12-03");
    expect(addIsoDays("2026-11-13", 30)).toBe("2026-12-13");
  });

  it("is empty when every source is quiet", () => {
    expect(
      buildVendorTodos({
        today: "2026-11-13",
        formatDate,
        messages: [{ weddingId: "w1", names: "A & B", count: 0 }],
        quotes: [],
        documents: [],
        overdueDeposits: [],
        overduePayments: [],
        vaultFiles: [],
      }),
    ).toEqual([]);
  });
});
