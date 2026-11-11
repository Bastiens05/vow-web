import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RecommendationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: slug } = await supabase.rpc("record_reco_click", { p_token: token });
  if (!slug) redirect("/");
  redirect(`/demande/${slug}?reco=${token}`);
}
