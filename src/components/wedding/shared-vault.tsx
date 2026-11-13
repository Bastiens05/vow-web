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
  const { data: profile } = await supabase.from("vendor_profiles").select("id").eq("user_id", vendorUserId).maybeSingle();
  if (!profile) return null;
  const { data: files } = await supabase
    .from("vendor_vault_files")
    .select("id, title, category, file_name, expires_on, alert_days")
    .eq("vendor_id", profile.id);
  const ids = (files ?? []).map((file) => file.id);
  if (ids.length === 0) return null;
  const { data: shares } = await supabase.from("vendor_vault_shares").select("file_id").eq("wedding_id", weddingId).in("file_id", ids);
  const shared = new Set((shares ?? []).map((row) => row.file_id));
  const visible = (files ?? []).filter((file) => shared.has(file.id));
  if (visible.length === 0) return null;
  return (
    <div className="mt-4 border-t border-line pt-4">
      <h4 className="text-sm font-medium">Partagé depuis le coffre-fort</h4>
      <ul className="mt-3 divide-y divide-line">
        {visible.map((file) => {
          const freshness = vaultFreshness(file.expires_on, file.alert_days, today);
          return (
            <li key={file.id} className="py-3 text-sm">
              <p className="font-medium">{file.title}</p>
              <p className="mt-1 text-xs text-muted">
                {vendorVaultCategoryLabel(file.category)} · {file.file_name}
                {freshness === "expired" ? " · expiré" : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
