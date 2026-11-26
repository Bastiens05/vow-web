import { isVendorCategory, type VendorCategory } from "@/lib/domain/categories";
import { frenchDateToIso } from "@/lib/domain/french-date";
import { isVendorPlan, type VendorPlan } from "@/lib/domain/plans";
import { isWeddingVolume, type WeddingVolume } from "@/lib/domain/volume";

export type SignupIntent = {
  role: "vendor" | "couple" | null;
  fullName: string;
  businessName: string;
  category: VendorCategory | null;
  city: string;
  phone: string;
  website: string;
  instagram: string;
  weddingsPerYear: WeddingVolume | "";
  partnerOne: string;
  partnerOneLast: string;
  partnerTwo: string;
  partnerTwoLast: string;
  weddingDate: string;
  plan: VendorPlan | null;
};

function planFrom(value: string): VendorPlan | null {
  return isVendorPlan(value) ? value : null;
}

function text(form: FormData, key: string, max: number): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

export function readSignupIntent(form: FormData, role: "vendor" | "couple" | null): SignupIntent {
  const categoryRaw = text(form, "category", 40);
  const volumeRaw = text(form, "weddings_per_year", 8);
  return {
    role,
    fullName: text(form, "full_name", 120),
    businessName: text(form, "business_name", 120),
    category: isVendorCategory(categoryRaw) ? categoryRaw : null,
    city: text(form, "city", 120),
    phone: text(form, "phone", 40),
    website: text(form, "website", 200),
    instagram: text(form, "instagram", 80).replace(/^@/, ""),
    weddingsPerYear: isWeddingVolume(volumeRaw) ? volumeRaw : "",
    partnerOne: text(form, "partner_one", 80),
    partnerOneLast: text(form, "partner_one_last", 80),
    partnerTwo: text(form, "partner_two", 80),
    partnerTwoLast: text(form, "partner_two_last", 80),
    weddingDate: frenchDateToIso(text(form, "wedding_date", 10)) ?? "",
    plan: planFrom(text(form, "plan", 20)),
  };
}

export function vendorIntentReady(intent: SignupIntent): boolean {
  return Boolean(intent.category && intent.businessName.length >= 2 && intent.city.length >= 2);
}

/** An invited vendor can open the trial without a city. The trade and the business name are enough. */
export function vendorInviteReady(intent: SignupIntent): boolean {
  return Boolean(intent.category && intent.businessName.length >= 2);
}

export function coupleProfileName(intent: Pick<SignupIntent, "partnerOne" | "partnerOneLast">): string {
  return [intent.partnerOne, intent.partnerOneLast].map((part) => part.trim()).filter(Boolean).join(" ").slice(0, 120);
}

export function signupMissing(input: {
  email: string;
  password: string;
  intent: SignupIntent;
  kind: "vendor" | "couple" | "invite-vendor" | "account";
  emailValid: boolean;
}): string[] {
  const missing: string[] = [];
  if (!input.emailValid) missing.push("un e-mail valide");
  if (input.password.length < 8) missing.push("un mot de passe d'au moins 8 caractères");
  if (input.kind === "vendor" || input.kind === "invite-vendor") {
    if (!input.intent.category) missing.push("le métier");
    if (input.intent.businessName.trim().length < 2) missing.push("le nom de l'activité");
    if (input.kind === "vendor" && input.intent.city.trim().length < 2) missing.push("la ville");
  }
  if (input.kind === "couple") {
    if (input.intent.partnerOne.trim().length < 2) missing.push("le prénom du premier partenaire");
    if (input.intent.partnerOneLast.trim().length < 2) missing.push("le nom du premier partenaire");
    if (input.intent.partnerTwo.trim().length < 2) missing.push("le prénom du second partenaire");
    if (input.intent.partnerTwoLast.trim().length < 2) missing.push("le nom du second partenaire");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.intent.weddingDate) && !/^\d{2}\/\d{2}\/\d{4}$/.test(input.intent.weddingDate)) {
      missing.push("la date du mariage");
    }
  }
  return missing;
}

export function coupleIntentReady(intent: SignupIntent): boolean {
  return Boolean(
    intent.partnerOne.length >= 2 &&
      intent.partnerOneLast.length >= 2 &&
      intent.partnerTwo.length >= 2 &&
      intent.partnerTwoLast.length >= 2 &&
      /^\d{4}-\d{2}-\d{2}$/.test(intent.weddingDate),
  );
}

export function intentMetadata(intent: SignupIntent): Record<string, string> {
  const data: Record<string, string> = {};
  if (intent.role) data.role = intent.role;
  if (intent.fullName) data.full_name = intent.fullName;
  if (vendorIntentReady(intent) && intent.category) {
    data.business_name = intent.businessName;
    data.category = intent.category;
    data.city = intent.city;
    data.phone = intent.phone;
    data.website = intent.website;
    data.instagram = intent.instagram;
    if (intent.weddingsPerYear) data.weddings_per_year = intent.weddingsPerYear;
    if (!data.full_name) data.full_name = intent.businessName;
  }
  if (coupleIntentReady(intent)) {
    data.partner_one = intent.partnerOne;
    data.partner_one_last = intent.partnerOneLast;
    data.partner_two = intent.partnerTwo;
    data.partner_two_last = intent.partnerTwoLast;
    data.wedding_date = intent.weddingDate;
    data.city = intent.city;
    if (!data.full_name) data.full_name = coupleProfileName(intent);
  }
  if (intent.plan) data.plan = intent.plan;
  return data;
}

export function intentFromMetadata(metadata: Record<string, unknown> | null | undefined): SignupIntent {
  const form = new FormData();
  const source = metadata ?? {};
  for (const key of [
    "full_name",
    "business_name",
    "category",
    "city",
    "phone",
    "website",
    "instagram",
    "weddings_per_year",
    "partner_one",
    "partner_one_last",
    "partner_two",
    "partner_two_last",
    "wedding_date",
    "plan",
  ]) {
    const value = source[key];
    if (typeof value === "string") form.set(key, value);
  }
  const role = source.role === "vendor" || source.role === "couple" ? source.role : null;
  return readSignupIntent(form, role);
}
