import { NextResponse } from "next/server";
import { certificatePdf } from "@/lib/domain/certificate-pdf";
import { formatDateTime } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: request } = await supabase
    .from("signature_requests")
    .select("status, signer_name, signed_at, signer_ip, signer_user_agent, document_sha256, document_id, documents(file_name)")
    .eq("document_id", id)
    .maybeSingle();
  if (!request || request.status !== "signed") return new NextResponse("Pas encore signé", { status: 404 });
  const document = Array.isArray(request.documents) ? request.documents[0] : request.documents;
  const pdf = certificatePdf({
    documentName: document?.file_name ?? "contrat.pdf",
    sha256: request.document_sha256,
    signerName: request.signer_name,
    signedAt: request.signed_at ? formatDateTime(request.signed_at) : "",
    ip: request.signer_ip,
    userAgent: request.signer_user_agent,
  });
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificat-signature.pdf"`,
    },
  });
}
