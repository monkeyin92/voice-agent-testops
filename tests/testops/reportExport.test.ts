import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Voice TestOps report export", () => {
  it("provides Playwright-based PDF and PNG export commands", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const script = readFileSync("scripts/export-testops-report.mjs", "utf8");
    const docs = readFileSync("docs/ops/openclaw-docker.md", "utf8");

    expect(packageJson.devDependencies.playwright).toBeDefined();
    expect(packageJson.scripts["report:export"]).toBe("node scripts/export-testops-report.mjs");
    expect(packageJson.scripts["voice-test:photo-demo:export"]).toBe(
      "npm run voice-test:photo-demo && npm run report:export",
    );
    expect(packageJson.scripts["sales:demo"]).toBe("npm run voice-test:photo-demo:export");
    expect(script).toContain(".voice-testops/report.html");
    expect(script).toContain(".voice-testops/report.pdf");
    expect(script).toContain(".voice-testops/report.png");
    expect(script).toContain("page.pdf");
    expect(script).toContain("page.screenshot");
    expect(docs).toContain("npm run voice-test:photo-demo:export");
    expect(docs).toContain("npm run sales:demo");
    expect(docs).toContain(".voice-testops/report.pdf");
    expect(docs).toContain(".voice-testops/report.png");
  });
});
