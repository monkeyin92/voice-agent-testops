import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("voice-testops GitHub Actions workflow", () => {
  it("runs unit tests, passing suites, build, audit, and uploads reports", () => {
    const workflow = readFileSync(".github/workflows/voice-testops.yml", "utf8");

    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm test");
    expect(workflow).toContain("examples/voice-testops/xhs-receptionist-suite.json");
    expect(workflow).toContain("examples/voice-testops/chinese-risk-suite.json");
    expect(workflow).toContain("npm run build");
    expect(workflow).toContain("npm audit --audit-level=high");
    expect(workflow).toContain("actions/upload-artifact");
    expect(workflow).toContain("include-hidden-files: true");
    expect(workflow).toContain("continue-on-error: true");
    expect(workflow).toContain("examples/voice-testops/failing-demo-suite.json");
  });
});
