export type PracticalDraft = {
  partnerOnePhone: string;
  partnerTwoPhone: string;
  postalAddress: string;
  ceremonyAddress: string;
  receptionAddress: string;
  keyContacts: string;
  notes: string;
};

export function validatePractical(
  input: PracticalDraft,
): { ok: true; value: PracticalDraft } | { ok: false; error: string } {
  const value: PracticalDraft = {
    partnerOnePhone: input.partnerOnePhone.trim(),
    partnerTwoPhone: input.partnerTwoPhone.trim(),
    postalAddress: input.postalAddress.trim(),
    ceremonyAddress: input.ceremonyAddress.trim(),
    receptionAddress: input.receptionAddress.trim(),
    keyContacts: input.keyContacts.trim(),
    notes: input.notes.trim(),
  };
  if (value.partnerOnePhone.length > 40 || value.partnerTwoPhone.length > 40) {
    return { ok: false, error: "Un numéro de téléphone est trop long." };
  }
  if (
    value.postalAddress.length > 500 ||
    value.ceremonyAddress.length > 500 ||
    value.receptionAddress.length > 500
  ) {
    return { ok: false, error: "Une adresse est trop longue." };
  }
  if (value.keyContacts.length > 2000 || value.notes.length > 2000) {
    return { ok: false, error: "Le texte est trop long." };
  }
  return { ok: true, value };
}

export function validatePhotoGroup(input: { title: string; people: string; notes: string }) {
  const title = input.title.trim();
  const people = input.people.trim();
  const notes = input.notes.trim();
  if (!title || title.length > 120) return { ok: false as const, error: "Donnez un nom au groupe." };
  if (people.length > 1000) return { ok: false as const, error: "La liste des personnes est trop longue." };
  if (notes.length > 500) return { ok: false as const, error: "La note est trop longue." };
  return { ok: true as const, value: { title, people, notes } };
}

export function validateGuest(input: { fullName: string; tableLabel: string; dietary: string; notes: string }) {
  const fullName = input.fullName.trim();
  const tableLabel = input.tableLabel.trim();
  const dietary = input.dietary.trim();
  const notes = input.notes.trim();
  if (!fullName || fullName.length > 120) return { ok: false as const, error: "Indiquez le nom de l'invité." };
  if (tableLabel.length > 40) return { ok: false as const, error: "Le nom de table est trop long." };
  if (dietary.length > 200) return { ok: false as const, error: "Le régime est trop long." };
  if (notes.length > 300) return { ok: false as const, error: "La note est trop longue." };
  return { ok: true as const, value: { fullName, tableLabel, dietary, notes } };
}

export function hasPracticalContent(value: PracticalDraft): boolean {
  return Object.values(value).some((part) => part.trim().length > 0);
}
