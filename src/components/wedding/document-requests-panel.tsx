import { DocumentRequestList, type RequestRow } from "@/components/wedding/document-requests";
import { isRequestStatus } from "@/lib/domain/client-documents";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/session";

export async function DocumentRequests({
  weddingId,
  vendorUserId,
  vendorName,
  couple,
}: {
  weddingId: string;
  vendorUserId: string;
  vendorName: string;
  couple: boolean;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("vendor_profiles").select("id").eq("user_id", vendorUserId).maybeSingle();
  const { data } = profile
    ? await supabase
        .from("wedding_document_requests")
        .select("id, title, note, required, due_on, status, file_name, correction_note")
        .eq("wedding_id", weddingId)
        .eq("vendor_id", profile.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };
  const requests: RequestRow[] = (data ?? []).flatMap((row) =>
    isRequestStatus(row.status)
      ? [
          {
            id: row.id,
            title: row.title,
            note: row.note,
            required: row.required,
            dueOn: row.due_on,
            status: row.status,
            fileName: row.file_name,
            correctionNote: row.correction_note,
          },
        ]
      : [],
  );
  const mode = couple ? "couple" : session.userId === vendorUserId ? "vendor" : "read";
  return (
    <DocumentRequestList
      weddingId={weddingId}
      userId={session.userId}
      vendorName={vendorName}
      requests={requests}
      mode={mode}
    />
  );
}
