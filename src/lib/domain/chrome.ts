export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/connexion" ||
    pathname === "/inscription" ||
    pathname === "/mot-de-passe" ||
    pathname === "/mot-de-passe-oublie" ||
    pathname === "/bienvenue" ||
    pathname === "/cgu" ||
    pathname === "/confidentialite" ||
    pathname.startsWith("/demande/") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/invitation/") ||
    pathname.startsWith("/desabonnement/") ||
    pathname.startsWith("/rsvp/") ||
    pathname.startsWith("/m/") ||
    pathname.startsWith("/equipe/") ||
    pathname.startsWith("/r/")
  );
}

const TOP_LEVEL = new Set(["/espace", "/mariages", "/demandes", "/messages", "/nouveautes", "/alertes", "/reglages", "/abonnement", "/admin", "/coffre-fort"]);

export function isTopLevelPath(pathname: string): boolean {
  return TOP_LEVEL.has(pathname);
}

export function backTarget(
  pathname: string,
  role: "vendor" | "couple" | null,
  actingAsCouple: boolean,
): { label: string; href: string } | null {
  if (!pathname || isPublicPath(pathname) || isTopLevelPath(pathname)) return null;
  const wedding = /^\/mariage\/([^/]+)(\/[^?]*)?$/.exec(pathname);
  if (wedding && wedding[1] !== "s") {
    const id = wedding[1];
    const section = (wedding[2] ?? "").replace(/^\//, "").split("/")[0] ?? "";
    const couple = actingAsCouple || role === "couple";
    if (couple) {
      if (section === "bulle") return { label: "Documents", href: `/mariage/${id}/bulles` };
      if (["jour", "pratique", "equipe", "documents", "budget", "messages", "bulles", "coffre"].includes(section)) return null;
      if (!section) return { label: "Accueil", href: "/espace" };
      return { label: "Mariage", href: `/mariage/${id}` };
    }
    return { label: "Mariages", href: "/mariages" };
  }
  if (pathname.startsWith("/espace/mariages")) return { label: "Mariages", href: "/mariages" };
  if (pathname.startsWith("/espace/")) return { label: "Accueil", href: "/espace" };
  if (pathname === "/compte") return { label: "Réglages", href: "/reglages" };
  return { label: "Accueil", href: "/espace" };
}
