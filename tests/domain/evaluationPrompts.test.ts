import { describe, expect, it } from "vitest";
import { evaluationPromptsByIndustry } from "@/domain/evaluationPrompts";

describe("evaluation prompt fixtures", () => {
  it("keeps at least 50 prompts for each first-stage industry", () => {
    expect(evaluationPromptsByIndustry.photography).toHaveLength(50);
    expect(evaluationPromptsByIndustry.home_design).toHaveLength(50);
    expect(evaluationPromptsByIndustry.insurance).toHaveLength(50);
  });
});
