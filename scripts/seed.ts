import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";
import { demo, demoPassword } from "./demo";
import { renderPortfolioPng } from "./png";

loadEnv(resolve(process.cwd(), ".env.local"));
loadEnv(resolve(process.cwd(), ".env"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  await ensureUser(demo.vendorUserId, demo.vendorEmail, "vendor", demo.vendorName);
  await ensureUser(demo.coupleUserId, demo.coupleEmail, "couple", demo.coupleName);

  const { error: profileError } = await admin.from("profiles").upsert([
    { id: demo.vendorUserId, role: "vendor", full_name: demo.vendorName, email: demo.vendorEmail },
    { id: demo.coupleUserId, role: "couple", full_name: demo.coupleName, email: demo.coupleEmail },
  ]);
  if (profileError) throw profileError;

  const { error: vendorError } = await admin.from("vendor_profiles").upsert({
    id: demo.vendorProfileId,
    user_id: demo.vendorUserId,
    business_name: "Atelier Lumière",
    slug: demo.slug,
    category: "photographer",
    city: "Bordeaux",
    zone: "Bordeaux, Bassin d'Arcachon et vignoble",
    description:
      "Reportage de mariage en lumière naturelle, du premier préparatif jusqu'à la dernière danse. Basée à Bordeaux, je suis les couples dans le vignoble, sur le bassin et partout où la journée les emmène.",
    contact_email: "bonjour@atelier-lumiere.fr",
    contact_phone: "06 12 34 56 78",
    website: "https://atelier-lumiere.example",
    starting_price_cents: 35000,
    currency: "EUR",
    published: true,
  });
  if (vendorError) throw vendorError;

  await admin.from("vendor_offers").delete().eq("vendor_id", demo.vendorProfileId);
  const { error: offersError } = await admin.from("vendor_offers").insert([
    {
      vendor_id: demo.vendorProfileId,
      title: "Reportage journée",
      description: "De la préparation jusqu'à l'ouverture du bal, 10 heures de présence.",
      price_cents: 240000,
      sort_order: 1,
    },
    {
      vendor_id: demo.vendorProfileId,
      title: "Cérémonie laïque",
      description: "Deux heures autour de la cérémonie, retouches comprises.",
      price_cents: 90000,
      sort_order: 2,
    },
    {
      vendor_id: demo.vendorProfileId,
      title: "Séance couple",
      description: "Une heure dans le vignoble ou en ville, une vingtaine de photos.",
      price_cents: 35000,
      sort_order: 3,
    },
  ]);
  if (offersError) throw offersError;

  const photoPaths = await uploadPhotos();
  await admin.from("vendor_photos").delete().eq("vendor_id", demo.vendorProfileId);
  const { error: photosError } = await admin.from("vendor_photos").insert(
    photoPaths.map((storagePath, index) => ({
      vendor_id: demo.vendorProfileId,
      storage_path: storagePath,
      caption: ["Préparation", "Cérémonie", "Soirée"][index] ?? "",
      sort_order: index,
    })),
  );
  if (photosError) throw photosError;

  const { error: weddingsError } = await admin.from("weddings").upsert([
    {
      id: demo.weddingId,
      created_by: demo.vendorUserId,
      partner_one_name: "Léa",
      partner_two_name: "Hugo",
      wedding_date: "2027-06-19",
      venue_name: "Château de la Louvière",
      venue_city: "Léognan",
    },
    {
      id: demo.pastWeddingId,
      created_by: demo.vendorUserId,
      partner_one_name: "Chloé",
      partner_two_name: "Adrien",
      wedding_date: "2026-09-05",
      venue_name: "Domaine de Malagar",
      venue_city: "Saint-André-du-Bois",
    },
  ]);
  if (weddingsError) throw weddingsError;

  const { error: membersError } = await admin.from("wedding_members").upsert(
    [
      { wedding_id: demo.weddingId, user_id: demo.vendorUserId, member_role: "vendor" as const },
      { wedding_id: demo.weddingId, user_id: demo.coupleUserId, member_role: "couple" as const },
      { wedding_id: demo.pastWeddingId, user_id: demo.vendorUserId, member_role: "vendor" as const },
    ],
    { onConflict: "wedding_id,user_id" },
  );
  if (membersError) throw membersError;

  await admin.from("messages").delete().eq("wedding_id", demo.weddingId);
  const { error: messagesError } = await admin.from("messages").insert([
    {
      wedding_id: demo.weddingId,
      author_id: demo.vendorUserId,
      body: "Bienvenue dans votre espace. On y dépose le déroulé, les documents, et tout ce qui se décide ensemble.",
    },
    {
      wedding_id: demo.weddingId,
      author_id: demo.coupleUserId,
      body: "Merci Camille. On a hâte de voir la proposition de timing pour le 19 juin.",
    },
  ]);
  if (messagesError) throw messagesError;

  const existingSlots = await admin.from("timeline_slots").select("id").eq("wedding_id", demo.weddingId);
  const existingSlotIds = existingSlots.data?.map((slot) => slot.id) ?? [];
  if (existingSlotIds.length > 0) {
    await admin.from("timeline_comments").delete().in("slot_id", existingSlotIds);
    await admin.from("timeline_slots").delete().in("id", existingSlotIds);
  }
  const { data: slots, error: slotsError } = await admin
    .from("timeline_slots")
    .insert([
      { wedding_id: demo.weddingId, title: "Préparatifs", starts_at: "14:00", place: "Suite parentale", notes: "Lumière côté jardin.", created_by: demo.vendorUserId, sort_order: 1 },
      { wedding_id: demo.weddingId, title: "Cérémonie", starts_at: "16:00", place: "Jardin des tilleuls", notes: "Entrée par l'allée centrale.", created_by: demo.vendorUserId, sort_order: 2 },
      { wedding_id: demo.weddingId, title: "Vin d'honneur", starts_at: "17:30", place: "Orangerie", notes: "", created_by: demo.vendorUserId, sort_order: 3 },
      { wedding_id: demo.weddingId, title: "Dîner", starts_at: "20:00", place: "Salle des chênes", notes: "", created_by: demo.vendorUserId, sort_order: 4 },
      { wedding_id: demo.weddingId, title: "Ouverture du bal", starts_at: "23:30", place: "Salle des chênes", notes: "", created_by: demo.vendorUserId, sort_order: 5 },
    ])
    .select("id, title");
  if (slotsError) throw slotsError;
  const ceremony = slots?.find((slot) => slot.title === "Cérémonie");
  if (ceremony) {
    const { error: commentError } = await admin.from("timeline_comments").insert({
      slot_id: ceremony.id,
      author_id: demo.coupleUserId,
      body: "On prévoit une lecture juste avant les vœux.",
    });
    if (commentError) throw commentError;
  }

  const documentPath = `${demo.weddingId}/${demo.vendorUserId}/deroule-lea-hugo.txt`;
  const documentBody = [
    "Déroulé de la journée — Léa & Hugo",
    "19 juin 2027, Château de la Louvière, Léognan.",
    "",
    "14:00 Préparatifs",
    "16:00 Cérémonie",
    "17:30 Vin d'honneur",
    "20:00 Dîner",
    "23:30 Ouverture du bal",
  ].join("\n");
  const uploaded = await admin.storage.from("wedding-documents").upload(documentPath, Buffer.from(documentBody), {
    contentType: "text/plain",
    upsert: true,
  });
  if (uploaded.error) throw uploaded.error;
  await admin.from("documents").delete().eq("wedding_id", demo.weddingId);
  const { error: documentError } = await admin.from("documents").insert({
    wedding_id: demo.weddingId,
    uploaded_by: demo.vendorUserId,
    storage_path: documentPath,
    file_name: "deroule-lea-hugo.txt",
    mime_type: "text/plain",
    size_bytes: Buffer.byteLength(documentBody),
  });
  if (documentError) throw documentError;

  await admin.from("invitations").delete().eq("wedding_id", demo.weddingId);
  const { error: invitationError } = await admin.from("invitations").insert([
    {
      id: "77777777-7777-4777-8777-777777777777",
      wedding_id: demo.weddingId,
      email: demo.coupleEmail,
      token: "cd".repeat(32),
      invited_role: "couple",
      invited_by: demo.vendorUserId,
      expires_at: "2027-06-01T00:00:00.000Z",
      accepted_at: "2026-11-01T10:00:00.000Z",
      accepted_by: demo.coupleUserId,
    },
    {
      id: demo.pendingInvitationId,
      wedding_id: demo.weddingId,
      email: "hugo@demo.vow.test",
      token: demo.pendingToken,
      invited_role: "couple",
      invited_by: demo.vendorUserId,
      expires_at: "2027-06-01T00:00:00.000Z",
    },
  ]);
  if (invitationError) throw invitationError;

  const { error: practicalError } = await admin.from("wedding_practical").upsert({
    wedding_id: demo.weddingId,
    partner_one_phone: "06 11 22 33 44",
    partner_two_phone: "06 55 66 77 88",
    postal_address: "12 rue Sainte-Catherine, 33000 Bordeaux",
    ceremony_address: "Jardin des tilleuls, Château de la Louvière, Léognan",
    reception_address: "Salle des chênes, même domaine",
    key_contacts: "Témoin de Léa : Emma Martin, 06 01 02 03 04\nTémoin de Hugo : Paul Bernard",
    notes: "Prévoir un coin à l'ombre pour les préparatifs.",
  });
  if (practicalError) throw practicalError;

  await admin.from("photo_groups").delete().eq("wedding_id", demo.weddingId);
  const { error: groupsError } = await admin.from("photo_groups").insert([
    { wedding_id: demo.weddingId, title: "Les mariés", people: "Léa et Hugo", notes: "Sous les tilleuls", sort_order: 1 },
    { wedding_id: demo.weddingId, title: "Famille de Léa", people: "Parents, frère, grands-parents", notes: "", sort_order: 2 },
    { wedding_id: demo.weddingId, title: "Témoins", people: "Emma, Paul, Chloé, Adam", notes: "Juste après la cérémonie", sort_order: 3 },
  ]);
  if (groupsError) throw groupsError;

  await admin.from("guests").delete().eq("wedding_id", demo.weddingId);
  const { error: guestsError } = await admin.from("guests").insert([
    { wedding_id: demo.weddingId, full_name: "Emma Martin", table_label: "Table 1", dietary: "", notes: "Témoin" },
    { wedding_id: demo.weddingId, full_name: "Paul Bernard", table_label: "Table 1", dietary: "Végétarien", notes: "" },
    { wedding_id: demo.weddingId, full_name: "Claire Dupont", table_label: "Table 4", dietary: "Sans gluten", notes: "" },
  ]);
  if (guestsError) throw guestsError;

  await admin.from("wedding_notifications").delete().eq("wedding_id", demo.weddingId);
  const { error: noteError } = await admin.from("wedding_notifications").insert({
    wedding_id: demo.weddingId,
    author_id: demo.coupleUserId,
    kind: "shift",
    body: "Léa Martin a décalé l'entrée en salle de 30 minutes, c'est désormais à 20h30.",
  });
  if (noteError) throw noteError;

  console.log("Données de démonstration prêtes.");
  console.log(`Prestataire : ${demo.vendorEmail} / ${demoPassword}`);
  console.log(`Couple : ${demo.coupleEmail} / ${demoPassword}`);
  console.log(`Vitrine : /p/${demo.slug}`);
  console.log(`Mariage : /mariage/${demo.weddingId}`);
}

async function ensureUser(id: string, email: string, role: "vendor" | "couple", fullName: string) {
  const created = await admin.auth.admin.createUser({
    id,
    email,
    password: demoPassword,
    email_confirm: true,
    user_metadata: { role, full_name: fullName },
  });
  if (!created.error) return;
  const updated = await admin.auth.admin.updateUserById(id, {
    email,
    password: demoPassword,
    email_confirm: true,
    user_metadata: { role, full_name: fullName },
  });
  if (updated.error) {
    throw new Error(`${email}: ${created.error.message} / ${updated.error.message}`);
  }
}

async function uploadPhotos(): Promise<string[]> {
  const paths: string[] = [];
  for (let variant = 0; variant < 3; variant += 1) {
    const path = `${demo.vendorUserId}/portfolio-${variant + 1}.png`;
    const body = renderPortfolioPng(960, 640, variant);
    const uploaded = await admin.storage.from("vendor-media").upload(path, body, {
      contentType: "image/png",
      upsert: true,
    });
    if (uploaded.error) throw uploaded.error;
    paths.push(path);
  }
  return paths;
}

function loadEnv(path: string) {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
