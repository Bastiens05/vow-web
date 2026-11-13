import { financeSnapshot, type FinanceSnapshot } from "@/lib/domain/finance";
import { createClient } from "@/lib/supabase/server";

export async function loadVendorFinance(vendorId: string): Promise<FinanceSnapshot> {
  const supabase = await createClient();
  const year = String(new Date().getFullYear());
  const [quotes, invoices, payments] = await Promise.all([
    supabase.from("quotes").select("status, amount_cents").eq("vendor_id", vendorId),
    supabase.from("invoices").select("id, status, amount_cents, created_at").eq("vendor_id", vendorId),
    supabase.from("invoice_payments").select("invoice_id, kind, amount_cents, paid_on").eq("vendor_id", vendorId),
  ]);
  const paidByInvoice = new Map<string, number>();
  for (const payment of payments.data ?? []) {
    paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) ?? 0) + payment.amount_cents);
  }
  return financeSnapshot({
    year,
    quotes: (quotes.data ?? []).map((quote) => ({ status: quote.status, amountCents: quote.amount_cents })),
    invoices: (invoices.data ?? []).map((invoice) => ({
      status: invoice.status,
      amountCents: invoice.amount_cents,
      createdOn: invoice.created_at,
      paymentCents: paidByInvoice.get(invoice.id) ?? 0,
    })),
    payments: (payments.data ?? []).map((payment) => ({
      kind: payment.kind,
      amountCents: payment.amount_cents,
      paidOn: payment.paid_on,
    })),
  });
}
