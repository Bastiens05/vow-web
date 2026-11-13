import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { coupleFullNames, formatLongDate } from "@/lib/domain/format";
import {
  invoiceSettled,
  paymentKindLabel,
  paymentMethodLabel,
  remainingCents,
} from "@/lib/domain/finance";
import { documentNumber, formatEuros } from "@/lib/domain/money";
import { stripeEnabled } from "@/server/stripe";
import { createClient } from "@/lib/supabase/server";
import { invoiceQuote, markInvoicePaid, payDeposit, setQuoteStatus } from "@/server/actions/ledger";
import { getWeddingSpace } from "@/server/data";
import { AgreedPriceForm, QuoteForm, DepositForm, PaymentForm } from "@/components/wedding/ledger-forms";

export const metadata: Metadata = { title: "Devis" };

function centsInput(cents: number): string {
  const euros = cents / 100;
  return Number.isInteger(euros) ? String(euros) : euros.toFixed(2).replace(".", ",");
}

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
  searchParams: Promise<{ paiement?: string; facture?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const vendorId = space.session.vendor?.id;
  const [quotes, invoices, deposits, paymentsResult] = await Promise.all([
    supabase.from("quotes").select("*").eq("wedding_id", id).order("number"),
    supabase.from("invoices").select("*").eq("wedding_id", id).order("number"),
    supabase.from("deposits").select("*").eq("wedding_id", id).order("due_on"),
    supabase.from("invoice_payments").select("*").eq("wedding_id", id).order("paid_on"),
  ]);
  const canWrite = space.host && Boolean(vendorId);
  const payments = paymentsResult.error ? [] : paymentsResult.data ?? [];
  const agreed = [...(quotes.data ?? [])].reverse().find((quote) => quote.vendor_id === vendorId && quote.status !== "invoiced");
  const agreedAmount = agreed ? centsInput(agreed.amount_cents) : "";
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Devis et factures</h2>
        {coupleFullNames(space.wedding.partner_one_name, space.wedding.partner_one_last_name, space.wedding.partner_two_name, space.wedding.partner_two_last_name) ? (
          <p className="mt-1 text-sm text-muted">
            {coupleFullNames(space.wedding.partner_one_name, space.wedding.partner_one_last_name, space.wedding.partner_two_name, space.wedding.partner_two_last_name)}
          </p>
        ) : null}
        <p className="mt-1 text-sm text-muted">Un numéro par prestataire. Le couple voit les montants, pas ceux des autres métiers.</p>
        {query.facture === "erreur" ? (
          <div className="mt-4">
            <Alert>La facture n&apos;a pas pu être créée.</Alert>
          </div>
        ) : null}
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
        const lines = payments.filter((payment) => payment.invoice_id === invoice.id);
        const paid = lines.reduce((sum, payment) => sum + payment.amount_cents, 0);
        const remaining = remainingCents(invoice.amount_cents, paid);
        const settled = invoice.status === "paid" || invoiceSettled(invoice.amount_cents, paid);
        return (
          <Card key={invoice.id} className="space-y-2">
            <p className="text-xs text-muted">{documentNumber("F", year, invoice.number)}</p>
            <h3 className="text-xl font-semibold">{invoice.title}</h3>
            <p>{formatEuros(invoice.amount_cents)} · {settled ? "Acquittée" : "En attente"}</p>
            <p className="text-sm">Reste à payer {formatEuros(remaining)}</p>
            {invoice.client_name ? <p className="text-sm text-muted">Client · {invoice.client_name}</p> : null}
            {lines.length > 0 ? (
              <ul className="grid gap-1 text-sm text-muted">
                {lines.map((payment) => (
                  <li key={payment.id}>
                    {formatLongDate(payment.paid_on)} · {paymentKindLabel(payment.kind)} · {paymentMethodLabel(payment.method)} · {formatEuros(payment.amount_cents)}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <a className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm" href={`/api/invoices/${invoice.id}/pdf`}>PDF</a>
              {canWrite && !settled ? (
                <form action={markInvoicePaid}>
                  <input type="hidden" name="id" value={invoice.id} />
                  <input type="hidden" name="wedding_id" value={id} />
                  <Button type="submit" variant="secondary">Marquer payée</Button>
                </form>
              ) : null}
            </div>
            {canWrite && !settled ? <PaymentForm weddingId={id} invoiceId={invoice.id} /> : null}
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
          <AgreedPriceForm weddingId={id} amount={agreedAmount} />
          <QuoteForm weddingId={id} category={space.session.vendor?.category ?? null} />
          <DepositForm weddingId={id} />
        </>
      ) : null}
    </div>
  );
}
