import { NextResponse } from "next/server";
import { documentNumber, formatEuros, textPdf } from "@/lib/domain/money";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!quote) return new NextResponse("Introuvable", { status: 404 });
  const year = new Date(quote.created_at).getFullYear();
  const pdf = textPdf([
    "VOW",
    `Devis ${documentNumber("D", year, quote.number)}`,
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
