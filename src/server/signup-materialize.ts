import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { slugify } from "@/lib/domain/slug";
import { messageFromError } from "@/lib/errors";
import { coupleIntentReady, vendorIntentReady, vendorInviteReady, type SignupIntent } from "@/lib/domain/signup-intent";

type Client = SupabaseClient<Database>;

export async function materializeSignup(supabase: Client, userId: string, intent: SignupIntent): Promise<string | null> {
  if (intent.role === "vendor" && intent.category && (vendorIntentReady(intent) || vendorInviteReady(intent))) {
    const { data: existing } = await supabase.from("vendor_profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!existing) {
      const slug = `${slugify(intent.businessName)}-${userId.slice(0, 4)}`;
      const { error } = await supabase.from("vendor_profiles").insert({
        user_id: userId,
        business_name: intent.businessName,
        slug,
        category: intent.category,
        city: intent.city,
        contact_phone: intent.phone,
        website: intent.website,
        instagram: intent.instagram,
        weddings_per_year: intent.weddingsPerYear,
      });
      if (error) return messageFromError(error);
    }
    if (intent.plan) {
      await supabase.rpc("choose_vendor_plan", { p_plan: intent.plan });
    }
  }

  if (intent.role === "couple" && coupleIntentReady(intent)) {
    await supabase.rpc("create_couple_wedding", {
      p_partner_one: intent.partnerOne,
      p_partner_two: intent.partnerTwo,
      p_wedding_date: intent.weddingDate,
      p_city: intent.city,
      p_partner_one_last: intent.partnerOneLast,
      p_partner_two_last: intent.partnerTwoLast,
    });
  }
  return null;
}
