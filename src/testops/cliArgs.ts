export type VoiceTestCliArgs = {
  suitePath: string;
  agent: "local-receptionist" | "http" | "openclaw";
  endpoint?: string;
  apiKey?: string;
  openClawMode: "custom" | "responses";
  jsonPath: string;
  htmlPath: string;
};

export function parseCliArgs(argv: string[]): VoiceTestCliArgs {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    values.set(arg.slice(2), value);
    index += 1;
  }

  const suitePath = values.get("suite");
  if (!suitePath) {
    throw new Error("--suite is required");
  }

  const agent = values.get("agent") ?? "local-receptionist";
  if (agent !== "local-receptionist" && agent !== "http" && agent !== "openclaw") {
    throw new Error("--agent must be local-receptionist, http, or openclaw");
  }

  const endpoint = values.get("endpoint");
  if ((agent === "http" || agent === "openclaw") && !endpoint) {
    throw new Error(`--endpoint is required for --agent ${agent}`);
  }
  const openClawMode = values.get("openclaw-mode") ?? "custom";
  if (openClawMode !== "custom" && openClawMode !== "responses") {
    throw new Error("--openclaw-mode must be custom or responses");
  }

  return {
    suitePath,
    agent,
    endpoint,
    apiKey: values.get("api-key") ?? process.env.OPENCLAW_API_KEY,
    openClawMode,
    jsonPath: values.get("json") ?? ".voice-testops/report.json",
    htmlPath: values.get("html") ?? ".voice-testops/report.html",
  };
}
