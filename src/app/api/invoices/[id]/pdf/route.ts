import { NextResponse } from "next/server";
import { coupleFullNames, formatLongDate } from "@/lib/domain/format";
import { documentNumber, formatEuros, textPdf } from "@/lib/domain/money";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice) return new NextResponse("Introuvable", { status: 404 });
  const year = new Date(invoice.created_at).getFullYear();
  const { data: wedding } = await supabase
    .from("weddings")
    .select("partner_one_name, partner_one_last_name, partner_two_name, partner_two_last_name")
    .eq("id", invoice.wedding_id)
    .maybeSingle();
  const names = wedding
    ? coupleFullNames(wedding.partner_one_name, wedding.partner_one_last_name, wedding.partner_two_name, wedding.partner_two_last_name)
    : "";
  const pdf = textPdf([
    "VOW",
    `Facture ${documentNumber("F", year, invoice.number)}`,
    names,
    invoice.title,
    formatEuros(invoice.amount_cents),
    invoice.status === "paid" ? "Payée" : "En attente",
    invoice.due_on ? `Échéance ${formatLongDate(invoice.due_on)}` : "",
  ]);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${invoice.number}.pdf"`,
    },
  });
}
