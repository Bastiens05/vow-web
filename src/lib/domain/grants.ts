import type { VendorPlan } from "@/lib/domain/plans";

export type GrantType = "tester" | "lifetime";

export type SignupBilling = {
  plan: VendorPlan;
  comped: boolean;
};

/** What a new vendor billing row becomes. No invitation and no listed email stays unpaid. */
export function resolveSignupBilling(input: {
  grant: { grantType: GrantType; plan: VendorPlan } | null;
  compPlan: VendorPlan | null;
}): SignupBilling {
  if (input.grant?.grantType === "lifetime") return { plan: input.grant.plan, comped: true };
  if (input.grant?.grantType === "tester") return { plan: input.grant.plan, comped: false };
  if (input.compPlan) return { plan: input.compPlan, comped: true };
  return { plan: "essentiel", comped: false };
}
