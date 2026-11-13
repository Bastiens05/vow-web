import { NextResponse } from "next/server";
import {
  invoiceDocumentLines,
  invoiceSettled,
  paymentKindLabel,
  paymentMethodLabel,
  remainingCents,
} from "@/lib/domain/finance";
import { coupleFullNames, formatLongDate } from "@/lib/domain/format";
import { documentNumber, formatEuros, textPdf } from "@/lib/domain/money";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice) return new NextResponse("Introuvable", { status: 404 });
  const year = new Date(invoice.created_at).getFullYear();
  const [{ data: wedding }, { data: payments }] = await Promise.all([
    supabase
      .from("weddings")
      .select("partner_one_name, partner_one_last_name, partner_two_name, partner_two_last_name")
      .eq("id", invoice.wedding_id)
      .maybeSingle(),
    supabase.from("invoice_payments").select("kind, method, amount_cents, paid_on").eq("invoice_id", invoice.id).order("paid_on"),
  ]);
  const names = wedding
    ? coupleFullNames(wedding.partner_one_name, wedding.partner_one_last_name, wedding.partner_two_name, wedding.partner_two_last_name)
    : "";
  let sellerName = invoice.seller_name;
  let sellerSiret = invoice.seller_siret;
  let sellerAddress = invoice.seller_address;
  let vatExempt = invoice.vat_exempt;
  let paymentTerms = invoice.payment_terms;
  if (!sellerName) {
    const [{ data: vendor }, { data: identity }] = await Promise.all([
      supabase.from("vendor_profiles").select("business_name").eq("id", invoice.vendor_id).maybeSingle(),
      supabase.from("vendor_billing_identity").select("siret, legal_address, vat_exempt, payment_terms").eq("vendor_id", invoice.vendor_id).maybeSingle(),
    ]);
    sellerName = vendor?.business_name ?? "";
    sellerSiret = identity?.siret ?? "";
    sellerAddress = identity?.legal_address ?? "";
    vatExempt = identity?.vat_exempt ?? true;
    paymentTerms = identity?.payment_terms ?? "";
  }
  const paid = (payments ?? []).reduce((sum, payment) => sum + payment.amount_cents, 0);
  const settled = invoice.status === "paid" || invoiceSettled(invoice.amount_cents, paid);
  const pdf = textPdf(invoiceDocumentLines({
    numberLabel: documentNumber("F", year, invoice.number),
    issuedOn: formatLongDate(invoice.created_at),
    sellerName,
    sellerSiret,
    sellerAddress,
    clientName: invoice.client_name || names,
    title: invoice.title,
    amountLabel: formatEuros(invoice.amount_cents),
    vatExempt,
    paymentTerms,
    payments: (payments ?? []).map((payment) => ({
      label: `${formatLongDate(payment.paid_on)} · ${paymentKindLabel(payment.kind)} · ${paymentMethodLabel(payment.method)} · ${formatEuros(payment.amount_cents)}`,
    })),
    remainingLabel: formatEuros(remainingCents(invoice.amount_cents, paid)),
    settled,
  }));
  const filename = settled ? `facture-${invoice.number}-acquittee.pdf` : `facture-${invoice.number}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
