export const TRIAL_DAYS = 7;
export const PLAN_CENTS = 2900;
export const PLAN_LABEL = "29 € TTC / mois";

export type BillingStatus = "trialing" | "active" | "expired" | "tester";

export type AccessInput = {
  role: "vendor" | "couple";
  isAdmin: boolean;
  status: BillingStatus | null;
  trialEndsAt: string | null;
  testerUntil: string | null;
  now?: Date;
};

export type AccessDecision = {
  allowed: boolean;
  reason: "couple" | "admin" | "trial" | "active" | "tester" | "expired";
  daysLeft: number | null;
};

function daysUntil(iso: string, now: Date): number {
  const end = new Date(iso).getTime();
  const left = end - now.getTime();
  if (left <= 0) return 0;
  return Math.ceil(left / 86_400_000);
}

export function vendorAccess(input: AccessInput): AccessDecision {
  if (input.role === "couple") return { allowed: true, reason: "couple", daysLeft: null };
  if (input.isAdmin) return { allowed: true, reason: "admin", daysLeft: null };

  const now = input.now ?? new Date();
  if (input.status === "active") return { allowed: true, reason: "active", daysLeft: null };
  if (input.status === "tester") {
    if (!input.testerUntil || new Date(input.testerUntil).getTime() > now.getTime()) {
      return { allowed: true, reason: "tester", daysLeft: null };
    }
    return { allowed: false, reason: "expired", daysLeft: 0 };
  }
  if (input.status === "trialing" && input.trialEndsAt) {
    const daysLeft = daysUntil(input.trialEndsAt, now);
    if (daysLeft > 0) return { allowed: true, reason: "trial", daysLeft };
  }
  return { allowed: false, reason: "expired", daysLeft: 0 };
}

const OPEN = [
  "/abonnement",
  "/reglages",
  "/admin",
  "/connexion",
  "/inscription",
  "/bienvenue",
  "/cgu",
  "/confidentialite",
];

export function subscriptionGate(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;
  if (OPEN.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return false;
  if (pathname.startsWith("/auth/")) return false;
  if (pathname.startsWith("/invitation/")) return false;
  if (pathname.startsWith("/demande/")) return false;
  if (pathname.startsWith("/p/")) return false;
  if (pathname.startsWith("/rsvp/")) return false;
  if (pathname.startsWith("/m/")) return false;
  if (pathname.startsWith("/desabonnement/")) return false;
  if (pathname.startsWith("/equipe/")) return false;
  if (pathname.startsWith("/r/")) return false;
  return true;
}
