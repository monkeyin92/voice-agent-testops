import { describe, expect, it } from "vitest";
import { analyzeRecordingIntake, renderRecordingIntakeMarkdown } from "@/testops/recordingIntake";

describe("recording intake triage", () => {
  it("summarizes intake rows, selects ready candidates, and redacts private URLs", () => {
    const report = analyzeRecordingIntake(recordingIntakeCsv(), { sourcePath: ".voice-testops/recordings/recording-intake.csv" });
    const markdown = renderRecordingIntakeMarkdown(report);

    expect(report.total).toBe(4);
    expect(report.usefulnessCounts).toEqual(
      expect.arrayContaining([
        { value: "keep", count: 3 },
        { value: "maybe", count: 1 },
      ]),
    );
    expect(report.businessTypeCounts).toEqual(
      expect.arrayContaining([
        { value: "insurance", count: 1 },
        { value: "outbound_leadgen", count: 1 },
      ]),
    );
    expect(report.riskTagCounts).toEqual(expect.arrayContaining([{ value: "handoff", count: 1 }]));
    expect(report.qualityCounts).toEqual(expect.arrayContaining([{ value: "unusable", count: 1 }]));
    expect(report.turnRoleHintCounts).toEqual(expect.arrayContaining([{ value: "assistant", count: 1 }]));
    expect(report.readyRegressionCandidates.map((candidate) => candidate.recordingId)).toEqual([
      "outbound_001",
      "insurance_001",
    ]);
    expect(report.errorCount).toBe(2);
    expect(report.warningCount).toBe(1);
    expect(markdown).toContain("# Voice Agent TestOps Recording Intake Triage");
    expect(markdown).toContain("Ready regression candidates: 2");
    expect(markdown).toContain("consent_status=unknown cannot be marked usefulness=keep");
    expect(markdown).toContain("quality=unusable cannot be marked as a regression candidate");
    expect(markdown).toContain("audio_url_private");
    expect(markdown).toContain("[REDACTED_URL]");
    expect(markdown).not.toContain("https://signed.example.test/audio/outbound_001");
  });

  it("flags malformed CSV rows and illegal enum values", () => {
    const report = analyzeRecordingIntake(
      [
        "recording_id,audio_url_private,call_date,business_type,direction,quality,has_pii,consent_status,main_pattern,risk_tag,usefulness,turn_role_hint,transcript_status,regression_candidate",
        "bad_001,<PRIVATE>,2026-02-30,insurance,sideways,clear,no,authorized,claim_status,forbidden,keep,customer,none,no",
        "bad_002,<PRIVATE>,2026-05-07,insurance,inbound,clear,no,authorized,claim_status,compliance,keep,customer,none",
      ].join("\n"),
    );

    expect(report.errorCount).toBeGreaterThanOrEqual(4);
    expect(report.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(["call_date", "direction", "risk_tag", "csv"]),
    );
  });
});

function recordingIntakeCsv(): string {
  return [
    "recording_id,audio_url_private,call_date,business_type,direction,duration_sec,language,quality,has_pii,consent_status,main_pattern,risk_tag,usefulness,turn_role_hint,transcript_status,regression_candidate,notes",
    "outbound_001,https://signed.example.test/audio/outbound_001,2026-05-07,outbound_leadgen,outbound,43,zh-CN,clear,yes,internal_sample,wechat_followup,handoff,keep,assistant,sanitized,yes,\"Agent-side lead-gen call; URL must stay private.\"",
    "insurance_001,<PRIVATE_AUDIO_URL_2>,2026-05-07,insurance,inbound,180,en,clear,no,authorized,claim_status,compliance,keep,customer,reviewed,yes,\"Claim or coverage boundary sample.\"",
    "unknown_keep,<PRIVATE_AUDIO_URL_3>,2026-05-07,unknown,inbound,35,zh-CN,noisy,unknown,unknown,low_signal,low_signal,keep,customer,none,no,\"Needs consent follow-up.\"",
    "unusable_candidate,<PRIVATE_AUDIO_URL_4>,2026-05-07,unknown,unknown,18,zh-CN,unusable,unknown,authorized,low_signal,asr_failure,maybe,unknown,none,yes,\"ASR robustness only.\"",
  ].join("\n");
}
