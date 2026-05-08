import seedSet from "../../examples/voice-testops/annotations/semantic-judge-seed.zh-CN.json";
import { describe, expect, it } from "vitest";
import { parseSemanticJudgeAnnotationSet } from "@/testops/annotationSet";
import {
  calibrateSemanticJudge,
  renderSemanticJudgeCalibrationMarkdown,
} from "@/testops/semanticJudgeCalibration";

describe("semantic judge calibration", () => {
  it("runs the annotation seed set back through the local judge and groups disagreements", async () => {
    const annotationSet = parseSemanticJudgeAnnotationSet(seedSet);
    const report = await calibrateSemanticJudge(annotationSet, {
      generatedAt: "2026-05-08T00:00:00.000Z",
    });

    expect(report.summary.total).toBe(60);
    expect(report.summary.agreements + report.summary.disagreements).toBe(60);
    expect(report.byIndustry).toHaveLength(4);
    expect(report.byRubric).toHaveLength(3);
    expect(report.byIndustryRubric).toHaveLength(12);
    expect(report.byIndustry.find((group) => group.industry === "insurance")?.stats.total).toBe(15);
    expect(report.byIndustryRubric.find((group) => group.key === "insurance:requires_handoff")?.stats.total).toBe(5);
    expect(report.disagreements).toEqual(report.samples.filter((sample) => !sample.matched));
  });

  it("renders a calibration report with disagreement examples", async () => {
    const annotationSet = parseSemanticJudgeAnnotationSet(seedSet);
    const report = await calibrateSemanticJudge(annotationSet, {
      generatedAt: "2026-05-08T00:00:00.000Z",
    });
    const markdown = renderSemanticJudgeCalibrationMarkdown(report, { maxExamples: 2 });

    expect(markdown).toContain("# Semantic Judge Calibration Report");
    expect(markdown).toContain("Annotation set: 中文商业 starter semantic_judge 人工标注种子集");
    expect(markdown).toContain("## By Industry");
    expect(markdown).toContain("## By Rubric");
    expect(markdown).toContain("## By Industry / Rubric");
    expect(markdown).toContain("| Group | Samples | Agreement | Judge pass rate |");
    expect(markdown).toContain("insurance:requires_handoff");
    expect(markdown).toContain("## Disagreement Samples");
    if (report.disagreements.length > 0) {
      expect(markdown).toContain("Expected:");
      expect(markdown).toContain("Judge reason:");
    } else {
      expect(markdown).toContain("No disagreements found.");
    }
  });
});
