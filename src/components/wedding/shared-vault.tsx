import { vaultFreshness, vendorVaultCategoryLabel } from "@/lib/domain/vendor-vault";
import { createClient } from "@/lib/supabase/server";

export async function SharedVault({
  weddingId,
  vendorUserId,
  today,
}: {
  weddingId: string;
  vendorUserId: string;
  today: string;
}) {
  const supabase = await createClient();
  const shared = await supabase.rpc("shared_vault_files", { p_wedding: weddingId, p_vendor_user: vendorUserId });
  const files = shared.error ? await sharedFromProfile(supabase, weddingId, vendorUserId) : shared.data ?? [];
  if (files.length === 0) return null;
  return (
    <div className="mt-4 border-t border-line pt-4">
      <h4 className="text-sm font-medium">Partagé depuis le coffre-fort</h4>
      <ul className="mt-3 divide-y divide-line">
        {files.map((file) => {
          const freshness = vaultFreshness(file.expires_on ?? null, file.alert_days ?? 30, today);
          return (
            <li key={file.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">{file.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {vendorVaultCategoryLabel(file.category)} · {file.file_name}
                  {freshness === "expired" ? " · expiré" : ""}
                </p>
              </div>
              <a className="inline-flex min-h-11 items-center text-sm underline" href={`/api/vault/${file.id}`}>
                Ouvrir
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type SharedFile = {
  id: string;
  title: string;
  file_name: string;
  category: string;
  expires_on: string | null;
  alert_days: number;
};

async function sharedFromProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  weddingId: string,
  vendorUserId: string,
): Promise<SharedFile[]> {
  const { data: profile } = await supabase.from("vendor_profiles").select("id").eq("user_id", vendorUserId).maybeSingle();
  if (!profile) return [];
  const { data: files } = await supabase
    .from("vendor_vault_files")
    .select("id, title, category, file_name, expires_on, alert_days")
    .eq("vendor_id", profile.id);
  const ids = (files ?? []).map((file) => file.id);
  if (ids.length === 0) return [];
  const { data: shares } = await supabase.from("vendor_vault_shares").select("file_id").eq("wedding_id", weddingId).in("file_id", ids);
  const shared = new Set((shares ?? []).map((row) => row.file_id));
  return (files ?? []).filter((file) => shared.has(file.id));
}
