import { describe, expect, it } from "vitest";
import { VENDOR_CATEGORIES } from "./categories";
import { questionTemplate } from "./questions";

describe("questionTemplate", () => {
  it("has a few questions for every trade", () => {
    for (const category of VENDOR_CATEGORIES) {
      const prompts = questionTemplate(category);
      expect(prompts.length).toBeGreaterThanOrEqual(3);
      expect(new Set(prompts).size).toBe(prompts.length);
    }
  });
});
