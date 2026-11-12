import { describe, expect, it } from "vitest";
import { resolveSignupBilling } from "./grants";

describe("signup billing", () => {
  it("does not gift a signup without an invitation or a listed email", () => {
    expect(resolveSignupBilling({ grant: null, compPlan: null })).toEqual({
      plan: "essentiel",
      comped: false,
    });
  });

  it("applies a tester invite without marking it free forever", () => {
    expect(resolveSignupBilling({ grant: { grantType: "tester", plan: "pro" }, compPlan: null })).toEqual({
      plan: "pro",
      comped: false,
    });
  });

  it("gives the chosen plan for life when the invitation says so", () => {
    expect(resolveSignupBilling({ grant: { grantType: "lifetime", plan: "studio" }, compPlan: null })).toEqual({
      plan: "studio",
      comped: true,
    });
  });

  it("keeps a listed email gifted when there is no invitation", () => {
    expect(resolveSignupBilling({ grant: null, compPlan: "studio" })).toEqual({
      plan: "studio",
      comped: true,
    });
  });
});
