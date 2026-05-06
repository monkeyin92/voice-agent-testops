import { leadSummarySchema } from "../domain/lead";
import type { MerchantConfig } from "../domain/merchant";

type DoctorCheckStatus = "ok" | "failed" | "skipped";

export type DoctorCheck = {
  label: string;
  status: DoctorCheckStatus;
  detail?: string;
  advice?: string;
};

export type DoctorResult = {
  passed: boolean;
  checks: DoctorCheck[];
};

const doctorMerchant: MerchantConfig = {
  name: "Doctor Demo Photo Studio",
  slug: "doctor-demo-photo-studio",
  industry: "photography",
  address: "88 Sample Street, Shanghai",
  serviceArea: "Shanghai",
  businessHours: "10:00-21:00",
  contactPhone: "13800000000",
  packages: [
    {
      name: "Solo portrait",
      priceRange: "$99-$199",
      includes: "2 outfits and 9 retouched photos",
      bestFor: "personal portraits and profile photos",
    },
  ],
  faqs: [
    {
      question: "Can you shoot on weekends?",
      answer: "Weekend slots are available but must be confirmed by the studio.",
    },
  ],
  bookingRules: {
    requiresManualConfirm: true,
    requiredFields: ["name", "phone", "preferredTime", "need"],
  },
};

export async function diagnoseHttpAgentEndpoint(endpoint: string): Promise<DoctorResult> {
  const checks: DoctorCheck[] = [];
  let body: unknown;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        suiteName: "Voice Agent TestOps doctor",
        scenarioId: "doctor_pricing_probe",
        turnIndex: 0,
        customerText: "What is the price for a solo portrait package?",
        source: "website",
        merchant: doctorMerchant,
        messages: [],
      }),
    });

    if (!response.ok) {
      checks.push({
        label: "Endpoint reachable",
        status: "failed",
        detail: `HTTP ${response.status}`,
        advice: "Make sure your test-turn endpoint accepts POST requests and returns 2xx JSON responses.",
      });
      return buildResult(checks);
    }

    body = await response.json();
    checks.push({ label: "Endpoint reachable", status: "ok" });
  } catch (error) {
    checks.push({
      label: "Endpoint reachable",
      status: "failed",
      detail: error instanceof Error ? error.message : "request failed",
      advice: "Start your agent bridge locally, check the URL, and make sure the endpoint returns JSON.",
    });
    return buildResult(checks);
  }

  const responseBody = isRecord(body) ? body : {};
  if (typeof responseBody.spoken === "string" && responseBody.spoken.trim().length > 0) {
    checks.push({ label: "spoken", status: "ok" });
  } else {
    checks.push({
      label: "spoken",
      status: "failed",
      detail: "`spoken` is missing or empty.",
      advice: "Return a JSON object with a non-empty `spoken` string.",
    });
  }

  if (!("summary" in responseBody) || responseBody.summary === undefined) {
    checks.push({
      label: "summary",
      status: "skipped",
      detail: "No summary returned. This is optional, but lead and intent assertions work better with it.",
    });
    return buildResult(checks);
  }

  const summary = leadSummarySchema.safeParse(responseBody.summary);
  if (summary.success) {
    checks.push({ label: "summary", status: "ok" });
  } else {
    checks.push({
      label: "summary",
      status: "failed",
      detail: summary.error.issues.map((issue) => `${issue.path.join(".") || "summary"}: ${issue.message}`).join("; "),
      advice: "If you return `summary`, match the lead summary contract used by Voice Agent TestOps.",
    });
  }

  return buildResult(checks);
}

function buildResult(checks: DoctorCheck[]): DoctorResult {
  return {
    checks,
    passed: checks.every((check) => check.status !== "failed"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
