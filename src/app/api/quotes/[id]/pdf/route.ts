import { NextResponse } from "next/server";
import { coupleFullNames } from "@/lib/domain/format";
import { documentNumber, formatEuros, textPdf } from "@/lib/domain/money";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!quote) return new NextResponse("Introuvable", { status: 404 });
  const year = new Date(quote.created_at).getFullYear();
  const { data: wedding } = await supabase
    .from("weddings")
    .select("partner_one_name, partner_one_last_name, partner_two_name, partner_two_last_name")
    .eq("id", quote.wedding_id)
    .maybeSingle();
  const names = wedding
    ? coupleFullNames(wedding.partner_one_name, wedding.partner_one_last_name, wedding.partner_two_name, wedding.partner_two_last_name)
    : "";
  const pdf = textPdf([
    "VOW",
    `Devis ${documentNumber("D", year, quote.number)}`,
    names,
    quote.title,
    formatEuros(quote.amount_cents),
    quote.status === "draft" ? "Brouillon" : quote.status === "sent" ? "Envoyé" : quote.status === "accepted" ? "Accepté" : "Facturé",
  ]);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="devis-${quote.number}.pdf"`,
    },
  });
}
