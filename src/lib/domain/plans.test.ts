import { describe, expect, it } from "vitest";
import { PUBLIC_PLAN, coupleIsFree, planAllows } from "./plans";

describe("plans", () => {
  it("keeps couples free and hides future prices", () => {
    expect(coupleIsFree()).toBe(true);
    expect(PUBLIC_PLAN.cents).toBe(2999);
    expect(JSON.stringify(PUBLIC_PLAN)).not.toMatch(/pro|studio/i);
  });

  it("gates a feature without removing the current plan", () => {
    expect(planAllows("essentiel", "core")).toBe(true);
    expect(planAllows("essentiel", "reports")).toBe(false);
    expect(planAllows("studio", "multi_site")).toBe(true);
  });
});
