import type { VendorCategory } from "@/lib/domain/categories";
import { pratiqueLabel } from "@/lib/domain/trades";
import type { IconName } from "@/components/ui/line-icon";

export type NavItem = { href: string; label: string; icon: IconName };

function weddingIdFrom(path: string) {
  const match = /^\/mariage\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i.exec(path);
  return match?.[1] ?? null;
}

export function navigationItems(
  path: string,
  role: "vendor" | "couple" | null,
  category: VendorCategory | null,
  signedIn: boolean,
  primaryWeddingId: string | null,
  actingAsCouple: boolean,
  isAdmin: boolean,
): NavItem[] {
  const weddingId = primaryWeddingId;
  if ((role === "couple" || actingAsCouple) && signedIn) {
    const base = weddingId ? `/mariage/${weddingId}` : "";
    const items: NavItem[] = [
      { href: "/espace", label: "Accueil", icon: "home" },
      { href: base ? `${base}/jour` : "/espace", label: "Jour J", icon: "clock" },
      { href: base ? `${base}/messages` : "/messages", label: "Messages", icon: "message" },
      { href: base ? `${base}/documents` : "/espace", label: "Documents", icon: "file" },
      { href: base ? `${base}/pratique` : "/espace", label: "Fiches", icon: "spark" },
      { href: base ? `${base}/equipe` : "/espace", label: "Prestataires", icon: "people" },
      { href: base ? `${base}/budget` : "/espace", label: "Budget", icon: "wallet" },
      { href: "/reglages", label: "Réglages", icon: "gear" },
    ];
    if (isAdmin) items.push({ href: "/admin", label: "Admin", icon: "gear" });
    return items;
  }
  const currentWedding = weddingIdFrom(path);
  if (currentWedding && signedIn && role) {
    const view = actingAsCouple ? "couple" : role;
    const base = `/mariage/${currentWedding}`;
    const sheet = pratiqueLabel(view, actingAsCouple ? null : category);
    const items: NavItem[] = [
      { href: `${base}/messages`, label: "Messages", icon: "message" },
      { href: `${base}/jour`, label: "Jour J", icon: "clock" },
      { href: `${base}/brief`, label: "Brief", icon: "file" },
      { href: `${base}/documents`, label: "Documents", icon: "file" },
    ];
    if (sheet) items.push({ href: `${base}/pratique`, label: sheet, icon: "people" });
    if (view === "vendor") {
      items.push({ href: `${base}/bulles`, label: "Mon dossier", icon: "spark" });
      items.push({ href: `${base}/inviter`, label: "Invitations", icon: "user" });
    }
    if (isAdmin) items.push({ href: "/admin", label: "Admin", icon: "gear" });
    return items;
  }
  if (!signedIn) {
    return [
      { href: "/", label: "Accueil", icon: "home" },
      { href: "/connexion", label: "Connexion", icon: "user" },
      { href: "/inscription", label: "Compte", icon: "spark" },
    ];
  }
  const items: NavItem[] =
    role === "vendor"
      ? [
          { href: "/espace", label: "Accueil", icon: "home" },
          { href: "/mariages", label: "Mariages", icon: "list" },
          { href: "/demandes", label: "Demandes", icon: "mail" },
          { href: "/messages", label: "Messages", icon: "message" },
          { href: "/nouveautes", label: "Nouveautés", icon: "bell" },
          { href: "/abonnement", label: "Abonnement", icon: "spark" },
          { href: "/reglages", label: "Réglages", icon: "gear" },
        ]
      : [
          { href: "/espace", label: "Accueil", icon: "home" },
          { href: primaryWeddingId ? `/mariage/${primaryWeddingId}` : "/mariages", label: "Mariage", icon: "list" },
          { href: "/reglages", label: "Réglages", icon: "gear" },
        ];
  if (isAdmin) items.push({ href: "/admin", label: "Admin", icon: "gear" });
  return items;
}
