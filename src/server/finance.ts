import { financeSnapshot, type FinanceSnapshot } from "@/lib/domain/finance";
import { createClient } from "@/lib/supabase/server";

export async function loadVendorFinance(vendorId: string): Promise<FinanceSnapshot> {
  const supabase = await createClient();
  const year = String(new Date().getFullYear());
  const [quotes, invoices, payments] = await Promise.all([
    supabase.from("quotes").select("status, amount_cents").eq("vendor_id", vendorId),
    supabase.from("invoices").select("status, amount_cents").eq("vendor_id", vendorId),
    supabase.from("invoice_payments").select("kind, amount_cents, paid_on").eq("vendor_id", vendorId),
  ]);
  return financeSnapshot({
    year,
    quotes: (quotes.data ?? []).map((quote) => ({ status: quote.status, amountCents: quote.amount_cents })),
    invoices: (invoices.data ?? []).map((invoice) => ({ status: invoice.status, amountCents: invoice.amount_cents })),
    payments: (payments.data ?? []).map((payment) => ({
      kind: payment.kind,
      amountCents: payment.amount_cents,
      paidOn: payment.paid_on,
    })),
  });
}
