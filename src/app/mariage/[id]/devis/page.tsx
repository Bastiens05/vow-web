import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatLongDate } from "@/lib/domain/format";
import { documentNumber, formatEuros } from "@/lib/domain/money";
import { stripeEnabled } from "@/server/stripe";
import { createClient } from "@/lib/supabase/server";
import { invoiceQuote, markInvoicePaid, payDeposit, setQuoteStatus } from "@/server/actions/ledger";
import { getWeddingSpace } from "@/server/data";
import { QuoteForm, DepositForm } from "@/components/wedding/ledger-forms";

export const metadata: Metadata = { title: "Devis" };

const QUOTE_LABEL: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  invoiced: "Facturé",
};

export default async function QuotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paiement?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const vendorId = space.session.vendor?.id;
  const [quotes, invoices, deposits] = await Promise.all([
    supabase.from("quotes").select("*").eq("wedding_id", id).order("number"),
    supabase.from("invoices").select("*").eq("wedding_id", id).order("number"),
    supabase.from("deposits").select("*").eq("wedding_id", id).order("due_on"),
  ]);
  const canWrite = space.host && Boolean(vendorId);
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Devis et factures</h2>
        <p className="mt-1 text-sm text-muted">Un numéro par prestataire. Le couple voit les montants, pas ceux des autres métiers.</p>
        {query.paiement === "ferme" ? (
          <div className="mt-4">
            <Alert>Le paiement en ligne n&apos;est pas ouvert. L&apos;acompte reste noté ici.</Alert>
          </div>
        ) : null}
      </Card>
      {(quotes.data ?? []).map((quote) => {
        const year = new Date(quote.created_at).getFullYear();
        return (
          <Card key={quote.id} className="space-y-3">
            <p className="text-xs text-muted">{documentNumber("D", year, quote.number)}</p>
            <h3 className="text-xl font-semibold">{quote.title}</h3>
            <p>{formatEuros(quote.amount_cents)} · {QUOTE_LABEL[quote.status] ?? quote.status}</p>
            <div className="flex flex-wrap gap-2">
              <a className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm" href={`/api/quotes/${quote.id}/pdf`}>PDF</a>
              {canWrite && quote.status === "draft" ? (
                <form action={setQuoteStatus}>
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="wedding_id" value={id} />
                  <input type="hidden" name="status" value="sent" />
                  <Button type="submit" variant="secondary">Envoyer</Button>
                </form>
              ) : null}
              {canWrite && quote.status === "sent" ? (
                <form action={setQuoteStatus}>
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="wedding_id" value={id} />
                  <input type="hidden" name="status" value="accepted" />
                  <Button type="submit" variant="secondary">Marquer accepté</Button>
                </form>
              ) : null}
              {canWrite && quote.status !== "invoiced" ? (
                <form action={invoiceQuote}>
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="wedding_id" value={id} />
                  <Button type="submit">Créer la facture</Button>
                </form>
              ) : null}
            </div>
          </Card>
        );
      })}
      {(invoices.data ?? []).map((invoice) => {
        const year = new Date(invoice.created_at).getFullYear();
        return (
          <Card key={invoice.id} className="space-y-2">
            <p className="text-xs text-muted">{documentNumber("F", year, invoice.number)}</p>
            <h3 className="text-xl font-semibold">{invoice.title}</h3>
            <p>{formatEuros(invoice.amount_cents)} · {invoice.status === "paid" ? "Payée" : "En attente"}</p>
            <div className="flex flex-wrap gap-2">
              <a className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm" href={`/api/invoices/${invoice.id}/pdf`}>PDF</a>
              {canWrite && invoice.status === "pending" ? (
                <form action={markInvoicePaid}>
                  <input type="hidden" name="id" value={invoice.id} />
                  <input type="hidden" name="wedding_id" value={id} />
                  <Button type="submit" variant="secondary">Marquer payée</Button>
                </form>
              ) : null}
            </div>
          </Card>
        );
      })}
      {(deposits.data ?? []).map((deposit) => (
        <Card key={deposit.id} className="space-y-2">
          <h3 className="text-xl font-semibold">Acompte {formatEuros(deposit.amount_cents)}</h3>
          <p className="text-sm text-muted">Échéance {formatLongDate(deposit.due_on)} · {deposit.status === "pending" ? "À venir" : deposit.status === "reminded" ? "Relancé" : deposit.status === "paid" ? "Payé" : "Annulé"}</p>
          {!stripeEnabled() ? <p className="text-sm">Paiement en ligne fermé.</p> : null}
          {space.actingAsCouple && deposit.status !== "paid" ? (
            <form action={payDeposit}>
              <input type="hidden" name="id" value={deposit.id} />
              <input type="hidden" name="wedding_id" value={id} />
              <Button type="submit">{stripeEnabled() ? "Payer l'acompte" : "Paiement en ligne fermé"}</Button>
            </form>
          ) : null}
        </Card>
      ))}
      {canWrite ? (
        <>
          <QuoteForm weddingId={id} />
          <DepositForm weddingId={id} />
        </>
      ) : null}
    </div>
  );
}
