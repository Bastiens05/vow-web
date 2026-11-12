import { isVendorCategory, type VendorCategory } from "./categories";
import { parseEurosToCents } from "./price";
import { slugify } from "./slug";

export type WeddingDraft = {
  partnerOne: string;
  partnerOneLast: string;
  partnerTwo: string;
  partnerTwoLast: string;
  weddingDate: string;
  venueName: string;
  venueCity: string;
};

export function validateWedding(
  input: WeddingDraft,
): { ok: true; value: WeddingDraft } | { ok: false; error: string } {
  const partnerOne = input.partnerOne.trim();
  const partnerOneLast = input.partnerOneLast.trim();
  const partnerTwo = input.partnerTwo.trim();
  const partnerTwoLast = input.partnerTwoLast.trim();
  const venueName = input.venueName.trim();
  const venueCity = input.venueCity.trim();
  const weddingDate = input.weddingDate.trim();

  if (partnerOne.length < 2 || partnerTwo.length < 2 || partnerOneLast.length < 2 || partnerTwoLast.length < 2) {
    return { ok: false, error: "Indiquez le prénom et le nom de chaque partenaire." };
  }
  if ([partnerOne, partnerOneLast, partnerTwo, partnerTwoLast].some((name) => name.length > 80)) {
    return { ok: false, error: "Un nom est trop long." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weddingDate) || Number.isNaN(Date.parse(`${weddingDate}T00:00:00Z`))) {
    return { ok: false, error: "Indiquez la date du mariage." };
  }
  if (venueName.length > 160 || venueCity.length > 120) {
    return { ok: false, error: "Le lieu est trop long." };
  }
  return { ok: true, value: { partnerOne, partnerOneLast, partnerTwo, partnerTwoLast, weddingDate, venueName, venueCity } };
}

export function validateMessage(body: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = body.trim();
  if (!value) return { ok: false, error: "Écrivez un message." };
  if (value.length > 2000) return { ok: false, error: "Le message dépasse 2 000 caractères." };
  return { ok: true, value };
}

export function validateComment(body: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = body.trim();
  if (!value) return { ok: false, error: "Écrivez un commentaire." };
  if (value.length > 1000) return { ok: false, error: "Le commentaire dépasse 1 000 caractères." };
  return { ok: true, value };
}

export type ProfileDraft = {
  businessName: string;
  slug: string;
  category: VendorCategory;
  city: string;
  zone: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  startingPriceCents: number | null;
  published: boolean;
};

export function validateVendorProfile(input: {
  businessName: string;
  slug: string;
  category: string;
  city: string;
  zone: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  startingPrice: string;
  published: boolean;
}): { ok: true; value: ProfileDraft } | { ok: false; error: string } {
  const businessName = input.businessName.trim();
  const city = input.city.trim();
  const zone = input.zone.trim();
  const description = input.description.trim();
  const contactEmail = input.contactEmail.trim().toLowerCase();
  const contactPhone = input.contactPhone.trim();
  const website = input.website.trim();
  const slug = slugify(input.slug.trim() || businessName);

  if (businessName.length < 2 || businessName.length > 120) {
    return { ok: false, error: "Indiquez le nom commercial (2 à 120 caractères)." };
  }
  if (!isVendorCategory(input.category)) {
    return { ok: false, error: "Choisissez une catégorie." };
  }
  if (city.length < 2 || city.length > 120) {
    return { ok: false, error: "Indiquez la ville." };
  }
  if (zone.length > 160) return { ok: false, error: "La zone est trop longue." };
  if (description.length > 4000) return { ok: false, error: "La présentation est trop longue." };
  if (input.published && description.length < 40) {
    return { ok: false, error: "Écrivez une présentation d'au moins 40 caractères avant de publier." };
  }
  if (contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
    return { ok: false, error: "L'e-mail de contact n'est pas valide." };
  }
  if (contactPhone.length > 40) return { ok: false, error: "Le téléphone est trop long." };
  if (website.length > 200) return { ok: false, error: "Le site web est trop long." };
  const price = parseEurosToCents(input.startingPrice);
  if (!price.ok) return price;

  return {
    ok: true,
    value: {
      businessName,
      slug,
      category: input.category,
      city,
      zone,
      description,
      contactEmail,
      contactPhone,
      website,
      startingPriceCents: price.cents,
      published: input.published,
    },
  };
}

export function validateOffer(input: {
  title: string;
  description: string;
  price: string;
}): { ok: true; value: { title: string; description: string; priceCents: number | null } } | { ok: false; error: string } {
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 2 || title.length > 120) {
    return { ok: false, error: "Donnez un titre à l'offre." };
  }
  if (description.length > 1000) return { ok: false, error: "La description de l'offre est trop longue." };
  const price = parseEurosToCents(input.price);
  if (!price.ok) return price;
  return { ok: true, value: { title, description, priceCents: price.cents } };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isInvitationExpired(expiresAtIso: string, now: Date): boolean {
  const expires = new Date(expiresAtIso);
  if (Number.isNaN(expires.getTime())) return true;
  return expires.getTime() <= now.getTime();
}

const SLOT_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateTimelineSlot(input: {
  title: string;
  startsAt: string;
  place: string;
  notes: string;
}):
  | { ok: true; value: { title: string; startsAt: string; place: string; notes: string } }
  | { ok: false; error: string } {
  const title = input.title.trim();
  const startsAt = input.startsAt.trim();
  const place = input.place.trim();
  const notes = input.notes.trim();
  if (!title || title.length > 120) return { ok: false, error: "Indiquez un titre pour ce moment." };
  if (!SLOT_TIME.test(startsAt)) return { ok: false, error: "Indiquez une heure, par exemple 16:00." };
  if (place.length > 160) return { ok: false, error: "Le lieu est trop long." };
  if (notes.length > 1000) return { ok: false, error: "Les notes sont trop longues." };
  return { ok: true, value: { title, startsAt, place, notes } };
}
