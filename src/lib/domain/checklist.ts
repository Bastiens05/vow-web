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
      label: "Poser le déroulé du jour",
      href: wedding ? `/mariage/${wedding}/deroulement` : "/espace",
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

export function openSteps(steps: readonly Step[]): Step[] {
  return steps.filter((step) => !step.done);
}
