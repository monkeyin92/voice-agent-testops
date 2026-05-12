import { describe, expect, it } from "vitest";
import { createTranscriptReplayAgent } from "@/testops/adapters/transcriptReplay";
import type { VoiceTestScenario } from "@/testops/schema";

const scenario: VoiceTestScenario = {
  id: "transcript_replay",
  title: "Transcript replay",
  source: "phone",
  merchant: {
    name: "Siphon dental demo",
    slug: "siphon-dental-demo",
    industry: "dental_clinic",
    address: "Public synthetic demo",
    serviceArea: "Public synthetic demo",
    businessHours: "Manual confirmation required",
    contactPhone: "0000000000",
    packages: [
      {
        name: "Dental cleaning",
        priceRange: "Manual confirmation required",
        includes: "Routine cleaning",
        bestFor: "Transcript replay",
      },
    ],
    faqs: [],
    bookingRules: { requiresManualConfirm: true, requiredFields: ["phone", "preferredTime"] },
  },
  turns: [{ user: "Use [PHONE]. Tomorrow at 2 PM works.", expect: [] }],
};

describe("createTranscriptReplayAgent", () => {
  it("extracts sanitized placeholders and English appointment times into the replay summary", async () => {
    const agent = createTranscriptReplayAgent({
      transcript: [
        "Customer: Use [PHONE]. Tomorrow at 2 PM works.",
        "Assistant: I have your callback number as [PHONE] and will check tomorrow at 2 PM before scheduling.",
      ].join("\n"),
    });

    const output = await agent({
      suiteName: "Transcript replay",
      scenario,
      merchant: { ...scenario.merchant, id: "merchant_1", createdAt: new Date(), updatedAt: new Date() },
      messages: [{ role: "customer", text: "Use [PHONE]. Tomorrow at 2 PM works.", at: "2026-05-12T02:00:00.000Z" }],
      turnIndex: 0,
      customerText: "Use [PHONE]. Tomorrow at 2 PM works.",
    });

    expect(output.summary?.phone).toBe("[PHONE]");
    expect(output.summary?.preferredTime?.toLowerCase()).toContain("tomorrow");
  });
});
