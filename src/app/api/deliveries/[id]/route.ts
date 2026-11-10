import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: file } = await supabase.from("delivery_files").select("*").eq("id", id).maybeSingle();
  if (!file) return new NextResponse("Introuvable", { status: 404 });
  const { data: delivery } = await supabase.from("deliveries").select("expires_at").eq("id", file.delivery_id).maybeSingle();
  if (delivery?.expires_at && new Date(delivery.expires_at).getTime() < Date.now()) {
    return new NextResponse("Ce lien a expiré.", { status: 410 });
  }
  const signed = await supabase.storage.from("wedding-gallery").createSignedUrl(file.storage_path, 120, {
    download: file.file_name,
  });
  if (signed.error || !signed.data?.signedUrl) return new NextResponse("Introuvable", { status: 404 });
  return NextResponse.redirect(signed.data.signedUrl);
}
