import { createClient } from "@supabase/supabase-js";
import { chooseKeptWedding } from "../src/lib/domain/merge-weddings";

const leftId = "3bc70cb8-4d7a-42f1-aef7-d95f7375133d";
const rightId = "ac7f5c8d-4d7a-42ff-ae97-66f51f135cba";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Définissez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: weddings, error } = await supabase.from("weddings").select("id, created_at").in("id", [leftId, rightId]);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  const found = new Map((weddings ?? []).map((wedding) => [wedding.id, wedding.created_at as string]));
  if (!found.has(leftId) || !found.has(rightId)) {
    console.error("Les deux mariages doivent exister avant la fusion.");
    process.exit(1);
  }
  const { data: members, error: memberError } = await supabase
    .from("wedding_members")
    .select("wedding_id, member_role")
    .in("wedding_id", [leftId, rightId]);
  if (memberError) {
    console.error(memberError.message);
    process.exit(1);
  }
  const couple = new Set((members ?? []).filter((member) => member.member_role === "couple").map((member) => member.wedding_id));
  const decision = chooseKeptWedding(
    { id: leftId, createdAt: found.get(leftId) ?? "", hasCouple: couple.has(leftId) },
    { id: rightId, createdAt: found.get(rightId) ?? "", hasCouple: couple.has(rightId) },
  );
  console.log(`Conserver ${decision.keep}. Fusionner ${decision.drop}.`);
  if (!process.argv.includes("--apply")) {
    console.log("Relancez avec --apply pour écrire.");
    return;
  }
  const { error: mergeError } = await supabase.rpc("merge_weddings", { p_keep: decision.keep, p_drop: decision.drop });
  if (mergeError) {
    console.error(mergeError.message);
    process.exit(1);
  }
  console.log("Fusion enregistrée.");
}

void main();
