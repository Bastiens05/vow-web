import { Card } from "@/components/ui/card";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";
import { SiteForm } from "./form";

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  if (!couple) {
    return (
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Page des mariés</h2>
        <p className="mt-2 text-sm text-muted">Les mariés décident de la publier.</p>
      </Card>
    );
  }
  const supabase = await createClient();
  const { data: site } = await supabase.from("wedding_sites").select("*").eq("wedding_id", id).maybeSingle();
  return (
    <Card>
      <h2 className="text-3xl font-semibold tracking-tight">Page des mariés</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        Une page : la date, le lieu, le programme et le lien pour répondre.
        {site?.published ? ` En ligne : ${siteUrl()}/m/${site.slug}` : " Brouillon pour l'instant."}
      </p>
      <div className="mt-4">
        <SiteForm
          weddingId={id}
          slug={site?.slug ?? ""}
          place={site?.place ?? ""}
          programme={site?.programme ?? ""}
          note={site?.note ?? ""}
          published={site?.published ?? false}
        />
      </div>
    </Card>
  );
}
