import { NextResponse } from "next/server";
import { formatLongDate } from "@/lib/domain/format";
import { documentNumber, formatEuros, textPdf } from "@/lib/domain/money";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice) return new NextResponse("Introuvable", { status: 404 });
  const year = new Date(invoice.created_at).getFullYear();
  const pdf = textPdf([
    "VOW",
    `Facture ${documentNumber("F", year, invoice.number)}`,
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
