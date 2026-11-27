import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VendorVaultBoard } from "@/components/account/vendor-vault-board";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { isVendorVaultCategory, shareAudience } from "@/lib/domain/vendor-vault";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Coffre-fort" };

export default async function VendorVaultPage() {
  const session = await requireSession();
  if (session.profile.role !== "vendor" || !session.vendor || session.vendor.user_id !== session.userId) redirect("/espace");
  const supabase = await createClient();
  const { data: vaultFiles } = await supabase
    .from("vendor_vault_files")
    .select("id, title, category, file_name, expires_on, alert_days, auto_share")
    .eq("vendor_id", session.vendor.id)
    .order("created_at", { ascending: false });
  const fileIds = (vaultFiles ?? []).map((file) => file.id);
  const { data: shares } = fileIds.length
    ? await supabase.from("vendor_vault_shares").select("file_id, recipient_user_id").in("file_id", fileIds)
    : { data: [] as { file_id: string; recipient_user_id: string | null }[] };
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-5 py-8 lg:max-w-3xl">
      <PageHeader
        eyebrow="Espace prestataire"
        title="Coffre-fort"
        description="Les pièces que vous fournissez souvent. Vous les partagez ensuite, mariage par mariage."
      />
      <Card className="min-w-0 overflow-hidden">
        <VendorVaultBoard
          userId={session.userId}
          today={new Date().toISOString().slice(0, 10)}
          files={(vaultFiles ?? []).flatMap((file) =>
            isVendorVaultCategory(file.category)
              ? [
                  {
                    id: file.id,
                    title: file.title,
                    category: file.category,
                    fileName: file.file_name,
                    expiresOn: file.expires_on,
                    alertDays: file.alert_days,
                    autoShare: file.auto_share,
                    sharedWith: shareAudience((shares ?? []).filter((row) => row.file_id === file.id).map((row) => row.recipient_user_id)),
                  },
                ]
              : [],
          )}
        />
      </Card>
    </div>
  );
}
