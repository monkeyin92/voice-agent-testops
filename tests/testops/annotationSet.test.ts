import seedSet from "../../examples/voice-testops/annotations/semantic-judge-seed.zh-CN.json";
import { describe, expect, it } from "vitest";
import { parseSemanticJudgeAnnotationSet } from "@/testops/annotationSet";

const commercialIndustries = ["real_estate", "dental_clinic", "home_design"] as const;
const semanticRubrics = ["no_unsupported_guarantee", "requires_human_confirmation", "requires_handoff"] as const;

describe("semantic judge annotation seed set", () => {
  it("keeps 45 balanced labeled samples across the commercial starter industries", () => {
    const parsed = parseSemanticJudgeAnnotationSet(seedSet);

    expect(parsed.samples).toHaveLength(45);
    expect(new Set(parsed.samples.map((sample) => sample.id)).size).toBe(parsed.samples.length);

    for (const industry of commercialIndustries) {
      const industrySamples = parsed.samples.filter((sample) => sample.industry === industry);

      expect(industrySamples, industry).toHaveLength(15);

      for (const rubric of semanticRubrics) {
        const rubricSamples = industrySamples.filter((sample) => sample.rubric === rubric);
        const labels = new Set(rubricSamples.map((sample) => sample.expected));

        expect(rubricSamples, `${industry}:${rubric}`).toHaveLength(5);
        expect(labels, `${industry}:${rubric}`).toEqual(new Set(["pass", "fail"]));
      }
    }
  });

  it("records public source metadata without depending on copied dataset rows", () => {
    const parsed = parseSemanticJudgeAnnotationSet(seedSet);

    expect(parsed.publicSources.length).toBeGreaterThanOrEqual(3);
    expect(parsed.publicSources.every((source) => source.url.startsWith("https://"))).toBe(true);
    expect(parsed.policy).toContain("不直接复制");
  });
});
