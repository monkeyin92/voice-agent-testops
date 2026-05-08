import type { Industry } from "../domain/merchant";

export type TranscriptIntakePreset = "insurance";

export type TranscriptIntakeDefaults = {
  industry: Industry;
  merchantName: string;
  suiteName: string;
  scenarioId: string;
  scenarioTitle: string;
};

const transcriptIntakeDefaults: Record<TranscriptIntakePreset, TranscriptIntakeDefaults> = {
  insurance: {
    industry: "insurance",
    merchantName: "Insurance transcript intake",
    suiteName: "Insurance transcript regression intake",
    scenarioId: "insurance_transcript_failure",
    scenarioTitle: "Insurance transcript failure",
  },
};

export function parseTranscriptIntakePreset(value: string): TranscriptIntakePreset {
  if (value === "insurance") {
    return value;
  }

  throw new Error("--intake must be insurance");
}

export function getTranscriptIntakeDefaults(preset: TranscriptIntakePreset): TranscriptIntakeDefaults {
  return transcriptIntakeDefaults[preset];
}
