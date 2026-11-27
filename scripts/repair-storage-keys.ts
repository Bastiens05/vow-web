import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { orphanSource } from "../src/lib/domain/storage-move";

const BUCKETS = ["wedding-documents", "wedding-gallery"] as const;

type Row = { bucket: string; path: string };

/**
 * Re-aligne un objet resté sous l'ancien mariage avec le chemin enregistré.
 * Idempotent : un objet déjà au bon chemin n'est pas touché.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx scripts/repair-storage-keys.ts
 *   … --apply
 *
 * Cas connu : un fichier fleuriste encore sous
 * bdf5149d-…/3b591701-…/805ef713-… alors que la ligne pointe vers le mariage conservé.
 * Le script le retrouve par la fin du chemin. On peut aussi forcer une paire :
 *   --from wedding-documents:ancien/chemin --to nouveau/chemin
 */
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Définissez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const forced = readForced(process.argv.slice(2));
  const objects = await listObjects(supabase);
  const rows = forced.length > 0 ? forced : await recordedPaths(supabase);
  let moved = 0;
  let already = 0;
  let missing = 0;
  for (const row of rows) {
    const names = objects.get(row.bucket) ?? [];
    if (names.includes(row.path)) {
      already += 1;
      continue;
    }
    const source = forced.length > 0 ? forcedSource(row, names) : orphanSource(row.path, names);
    if (!source) {
      missing += 1;
      console.log(`Introuvable · ${row.bucket} · ${row.path}`);
      continue;
    }
    console.log(`${apply ? "Déplace" : "Déplacerait"} · ${row.bucket} · ${source} → ${row.path}`);
    if (!apply) continue;
    const result = await supabase.storage.from(row.bucket).move(source, row.path);
    if (result.error) {
      const copied = await supabase.storage.from(row.bucket).copy(source, row.path);
      if (copied.error) {
        console.log(`Échec · ${row.bucket} · ${result.error.message}`);
        continue;
      }
      await supabase.storage.from(row.bucket).remove([source]);
    }
    names.splice(names.indexOf(source), 1, row.path);
    moved += 1;
  }
  console.log(`${already} déjà en place, ${moved} déplacé${moved > 1 ? "s" : ""}, ${missing} introuvable${missing > 1 ? "s" : ""}.`);
  if (!apply) console.log("Relancez avec --apply pour écrire.");
}

function readForced(args: string[]): Row[] {
  const rows: Row[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "--from") continue;
    const from = args[index + 1] ?? "";
    const toFlag = args[index + 2];
    const to = args[index + 3] ?? "";
    const split = from.indexOf(":");
    if (toFlag !== "--to" || split < 1 || !to) {
      console.error("Utilisez --from bucket:ancien/chemin --to nouveau/chemin");
      process.exit(1);
    }
    rows.push({ bucket: from.slice(0, split), path: to });
    const names = from.slice(split + 1);
    forcedSources.set(`${from.slice(0, split)}:${to}`, names);
  }
  return rows;
}

const forcedSources = new Map<string, string>();

function forcedSource(row: Row, names: string[]): string | null {
  const source = forcedSources.get(`${row.bucket}:${row.path}`) ?? "";
  return names.includes(source) ? source : source || null;
}

async function listObjects(supabase: SupabaseClient): Promise<Map<string, string[]>> {
  const found = new Map<string, string[]>();
  for (const bucket of BUCKETS) found.set(bucket, []);
  const { data, error } = await supabase.schema("storage").from("objects").select("bucket_id, name").in("bucket_id", [...BUCKETS]);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  for (const row of data ?? []) {
    const bucket = String(row.bucket_id);
    const name = String(row.name);
    found.set(bucket, [...(found.get(bucket) ?? []), name]);
  }
  return found;
}

async function recordedPaths(supabase: SupabaseClient): Promise<Row[]> {
  const rows: Row[] = [];
  const documents = await supabase.from("documents").select("storage_path");
  const vault = await supabase.from("vault_items").select("storage_path");
  const intakes = await supabase.from("quote_intakes").select("storage_path");
  const deliveries = await supabase.from("delivery_files").select("storage_path");
  for (const path of pathsOf(documents.data)) rows.push({ bucket: "wedding-documents", path });
  for (const path of pathsOf(vault.data)) rows.push({ bucket: "wedding-documents", path });
  for (const path of pathsOf(intakes.data)) rows.push({ bucket: "wedding-documents", path });
  for (const path of pathsOf(deliveries.data)) rows.push({ bucket: "wedding-gallery", path });
  return rows;
}

function pathsOf(data: { storage_path: string | null }[] | null): string[] {
  return (data ?? []).map((row) => row.storage_path).filter((path): path is string => Boolean(path));
}

void main();
