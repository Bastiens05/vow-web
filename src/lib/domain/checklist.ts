export type Step = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

export function vendorSteps(input: {
  hasProfile: boolean;
  published: boolean;
  weddingCount: number;
  primaryWeddingId: string | null;
  coupleJoined: boolean;
  hasTimeline: boolean;
  hasDocument: boolean;
}): Step[] {
  const wedding = input.primaryWeddingId;
  return [
    {
      id: "profile",
      label: "Publier la vitrine",
      href: "/espace/profil",
      done: input.hasProfile && input.published,
    },
    {
      id: "wedding",
      label: "Créer le premier mariage",
      href: "/espace/mariages/nouveau",
      done: input.weddingCount > 0,
    },
    {
      id: "couple",
      label: "Inviter le couple",
      href: wedding ? `/mariage/${wedding}/inviter` : "/espace/mariages/nouveau",
      done: input.coupleJoined,
    },
    {
      id: "timeline",
      label: "Poser le programme du jour",
      href: wedding ? `/mariage/${wedding}/jour` : "/espace",
      done: input.hasTimeline,
    },
    {
      id: "document",
      label: "Déposer un document",
      href: wedding ? `/mariage/${wedding}/documents` : "/espace",
      done: input.hasDocument,
    },
  ];
}

export function coupleSteps(input: {
  primaryWeddingId: string | null;
  hasPractical: boolean;
  hasPhotoGroups: boolean;
  hasGuests: boolean;
}): Step[] {
  const wedding = input.primaryWeddingId;
  const pratique = wedding ? `/mariage/${wedding}/pratique` : "/espace";
  return [
    {
      id: "practical",
      label: "Renseigner les infos pratiques",
      href: pratique,
      done: input.hasPractical,
    },
    {
      id: "groups",
      label: "Lister les photos de groupe",
      href: pratique,
      done: input.hasPhotoGroups,
    },
    {
      id: "guests",
      label: "Noter les invités et les régimes",
      href: pratique,
      done: input.hasGuests,
    },
  ];
}

export type ChecklistItem = Step;

export function coupleChecklist(input: {
  weddingId: string;
  hasPractical: boolean;
  needsPhotos: boolean;
  hasPhotos: boolean;
  photoVendorId: string | null;
  needsGuests: boolean;
  hasGuests: boolean;
  guestVendorId: string | null;
  hasTimeline: boolean;
  pendingSignature: boolean;
  hasVault: boolean;
}): ChecklistItem[] {
  const base = `/mariage/${input.weddingId}`;
  const items: ChecklistItem[] = [
    { id: "practical", label: "Infos du lieu", href: `${base}/pratique`, done: input.hasPractical },
  ];
  if (input.needsPhotos) {
    items.push({
      id: "photos",
      label: "Lister les photos de groupe",
      href: input.photoVendorId ? `${base}/documents#${input.photoVendorId}` : `${base}/documents`,
      done: input.hasPhotos,
    });
  }
  if (input.needsGuests) {
    items.push({
      id: "guests",
      label: "Invités et régimes",
      href: input.guestVendorId ? `${base}/documents#${input.guestVendorId}` : `${base}/documents`,
      done: input.hasGuests,
    });
  }
  items.push(
    { id: "timeline", label: "Programme du jour", href: `${base}/jour`, done: input.hasTimeline },
    { id: "vault", label: "Coffre des pièces", href: `${base}/coffre`, done: input.hasVault },
  );
  if (input.pendingSignature) {
    items.unshift({ id: "signature", label: "Signer le contrat", href: `${base}/documents`, done: false });
  }
  const missing = items.filter((item) => !item.done).slice(0, 3);
  const done = items.filter((item) => item.done);
  return [...missing, ...done];
}

const TASK_KEY: Record<string, string> = {
  groups: "photos",
  photos: "photos",
};

export function dedupeTasks<T extends { id: string; href: string }>(items: readonly T[]): T[] {
  const kept = new Map<string, T>();
  for (const item of items) {
    const key = TASK_KEY[item.id] ?? item.id;
    const previous = kept.get(key);
    if (!previous || (item.href.includes("#") && !previous.href.includes("#"))) {
      kept.set(key, { ...item, id: key });
    }
  }
  return [...kept.values()];
}

export function openSteps(steps: readonly Step[]): Step[] {
  return steps.filter((step) => !step.done);
}

export function firstRunSteps(input: {
  profileReady: boolean;
  weddingId: string | null;
  coupleJoined: boolean;
}): Step[] {
  return [
    {
      id: "activity",
      label: "Votre activité",
      href: "/bienvenue",
      done: input.profileReady,
    },
    {
      id: "wedding",
      label: "Créez votre premier mariage",
      href: "/espace/mariages/nouveau",
      done: Boolean(input.weddingId),
    },
    {
      id: "invite",
      label: "Invitez le couple",
      href: input.weddingId ? `/mariage/${input.weddingId}/inviter` : "/espace/mariages/nouveau",
      done: input.coupleJoined,
    },
  ];
}
