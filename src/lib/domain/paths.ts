export function safeNextPath(value: unknown, fallback = "/espace"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  if (value.includes("\\") || value.includes("://") || value.includes("\n") || value.includes("\r")) {
    return fallback;
  }
  return value;
}

export function invitationPath(token: string): string {
  return `/invitation/${token}`;
}

export function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/espace" ||
    pathname.startsWith("/espace/") ||
    pathname === "/mariage" ||
    pathname.startsWith("/mariage/") ||
    pathname === "/mariages" ||
    pathname === "/messages" ||
    pathname === "/reglages" ||
    pathname === "/alertes" ||
    pathname === "/compte"
  );
}
