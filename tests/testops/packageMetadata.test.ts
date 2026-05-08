import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type PackageJson = {
  private?: boolean;
  bin?: Record<string, string>;
  dependencies?: Record<string, string>;
  files?: string[];
  keywords?: string[];
  license?: string;
  repository?: { type: string; url: string };
  scripts?: Record<string, string>;
};

describe("package metadata", () => {
  it("is ready for npm/npx CLI distribution", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as PackageJson;
    const lockRoot = JSON.parse(readFileSync("package-lock.json", "utf8")) as {
      packages: { "": { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } };
    };

    expect(packageJson.private).toBeUndefined();
    expect(packageJson.bin).toEqual({
      "voice-agent-testops": "bin/voice-agent-testops.mjs",
    });
    expect(packageJson.files).toEqual(
      expect.arrayContaining([
        "bin",
        "src/domain",
        "src/testops",
        "src/server/services/localReceptionist.ts",
        "examples/voice-testops",
        "examples/http-agent-server",
        "examples/voice-platform-bridge",
        "docs/guides",
        "docs/integrations",
      ]),
    );
    expect(packageJson.dependencies).toHaveProperty("tsx");
    expect(packageJson.dependencies).toHaveProperty("zod");
    expect(packageJson.dependencies).not.toHaveProperty("next");
    expect(packageJson.dependencies).not.toHaveProperty("react");
    expect(packageJson.dependencies).not.toHaveProperty("@prisma/client");
    expect(packageJson.scripts?.["judge:calibrate"]).toContain("calibrate-judge");
    expect(lockRoot.packages[""].dependencies).toHaveProperty("tsx");
    expect(lockRoot.packages[""].dependencies).toHaveProperty("zod");
    expect(lockRoot.packages[""].dependencies).not.toHaveProperty("next");
    expect(lockRoot.packages[""].dependencies).not.toHaveProperty("react");
    expect(lockRoot.packages[""].dependencies).not.toHaveProperty("@prisma/client");
    expect(lockRoot.packages[""].devDependencies).not.toHaveProperty("tsx");
    expect(packageJson.keywords).toEqual(expect.arrayContaining(["voice-agent", "testops", "llm-eval"]));
    expect(packageJson.license).toBe("MIT");
    expect(packageJson.repository).toMatchObject({
      type: "git",
      url: "git+https://github.com/monkeyin92/voice-agent-testops.git",
    });
  });
});
