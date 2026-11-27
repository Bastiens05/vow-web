import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return new NextResponse("Authentification requise", { status: 401 });
  const { data: file } = await supabase.from("vendor_vault_files").select("storage_path, file_name").eq("id", id).maybeSingle();
  if (!file) return new NextResponse("Introuvable", { status: 404 });
  const signed = await supabase.storage.from("wedding-documents").createSignedUrl(file.storage_path, 60);
  if (signed.error || !signed.data) return new NextResponse("Fichier indisponible", { status: 404 });
  return NextResponse.redirect(signed.data.signedUrl);
}
