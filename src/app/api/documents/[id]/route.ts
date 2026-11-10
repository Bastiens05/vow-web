import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: document } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (!document) return new NextResponse("Introuvable", { status: 404 });
  const signed = await supabase.storage.from("wedding-documents").createSignedUrl(document.storage_path, 60);
  if (signed.error || !signed.data) return new NextResponse("Fichier indisponible", { status: 404 });
  return NextResponse.redirect(signed.data.signedUrl);
}
