export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/connexion" ||
    pathname === "/inscription" ||
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

const TOP_LEVEL = new Set(["/espace", "/mariages", "/demandes", "/messages", "/alertes", "/reglages", "/abonnement", "/admin"]);

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
    const rest = wedding[2] ?? "";
    if (!rest || rest === "/") {
      return actingAsCouple || role === "couple"
        ? { label: "Accueil", href: "/espace" }
        : { label: "Mariages", href: "/mariages" };
    }
    return { label: "Aperçu", href: `/mariage/${id}` };
  }
  if (pathname.startsWith("/espace/mariages")) return { label: "Mariages", href: "/mariages" };
  if (pathname.startsWith("/espace/")) return { label: "Accueil", href: "/espace" };
  if (pathname === "/compte") return { label: "Réglages", href: "/reglages" };
  return { label: "Accueil", href: "/espace" };
}
