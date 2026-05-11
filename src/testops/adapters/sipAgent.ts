import { spawn } from "node:child_process";
import type { VoiceAgentExecutor, VoiceAgentTurnOutput } from "../agents";

export type SipAgentOptions = {
  driverCommand: string;
  sipUri: string;
  sipProxy?: string;
  sipFrom?: string;
  callTimeoutMs?: number;
  driverRetries?: number;
  mediaDir?: string;
  env?: Record<string, string | undefined>;
  runner?: SipDriverRunner;
};

export type SipDriverInput = {
  provider: "voice-agent-testops";
  transport: "sip";
  sip: {
    uri: string;
    proxy?: string;
    from?: string;
    mediaDir?: string;
    callTimeoutMs: number;
  };
  suiteName: string;
  scenarioId: string;
  scenarioTitle: string;
  turnIndex: number;
  customerText: string;
  source: string;
  merchant: Parameters<VoiceAgentExecutor>[0]["merchant"];
  messages: Parameters<VoiceAgentExecutor>[0]["messages"];
  outputContract: {
    spoken: "ASR transcript of the voice agent reply";
    summary: "optional LeadSummary-compatible JSON";
    tools: "optional array of tool calls";
    state: "optional backend state snapshot";
    audio: "optional replay metadata: { url, label, mimeType, durationMs }";
    voiceMetrics: "optional numeric metrics: { timeToFirstWordMs, turnLatencyMs, asrLatencyMs, ttsLatencyMs, silenceMs, interruptionCount, asrConfidence }";
  };
};

export type SipDriverRunnerOptions = {
  timeoutMs: number;
  env: Record<string, string>;
};

export type SipDriverRunner = (
  command: string,
  input: SipDriverInput,
  options: SipDriverRunnerOptions,
) => Promise<unknown>;

const defaultCallTimeoutMs = 120_000;

export function createSipAgent(options: SipAgentOptions): VoiceAgentExecutor {
  const driverCommand = options.driverCommand.trim();
  if (!driverCommand) {
    throw new Error("SIP agent requires a non-empty driverCommand");
  }

  const callTimeoutMs = normalizeTimeout(options.callTimeoutMs);
  const driverRetries = normalizeRetries(options.driverRetries);
  const runner = options.runner ?? runSipDriverCommand;

  return async (input) => {
    const payload = buildSipDriverInput(input, { ...options, driverCommand, callTimeoutMs, driverRetries });
    const body = await runSipDriverWithRetries(
      runner,
      driverCommand,
      payload,
      {
        timeoutMs: callTimeoutMs,
        env: buildDriverEnv(options, callTimeoutMs, driverRetries),
      },
      driverRetries,
    );

    return parseSipDriverOutput(body);
  };
}

async function runSipDriverWithRetries(
  runner: SipDriverRunner,
  command: string,
  input: SipDriverInput,
  options: SipDriverRunnerOptions,
  driverRetries: number,
): Promise<unknown> {
  let lastError: unknown;
  const maxAttempts = driverRetries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await runner(command, input, {
        timeoutMs: options.timeoutMs,
        env: {
          ...options.env,
          VOICE_TESTOPS_SIP_DRIVER_ATTEMPT: String(attempt),
          VOICE_TESTOPS_SIP_DRIVER_MAX_ATTEMPTS: String(maxAttempts),
        },
      });
    } catch (error) {
      lastError = error;
    }
  }

  const suffix = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`SIP driver failed after ${maxAttempts} attempt${maxAttempts === 1 ? "" : "s"}: ${suffix}`);
}

export async function runSipDriverCommand(
  command: string,
  input: SipDriverInput,
  options: SipDriverRunnerOptions,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...options.env },
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, options.timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new Error(`SIP driver timed out after ${options.timeoutMs}ms`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`SIP driver failed with exit code ${code ?? signal}${formatStderr(stderr)}`));
        return;
      }

      const trimmed = stdout.trim();
      if (!trimmed) {
        reject(new Error("SIP driver returned empty stdout; expected a JSON object"));
        return;
      }

      try {
        resolve(JSON.parse(trimmed));
      } catch {
        reject(new Error(`SIP driver stdout must be JSON: ${trimmed.slice(0, 500)}`));
      }
    });

    child.stdin.end(`${JSON.stringify(input)}\n`);
  });
}

function buildSipDriverInput(
  input: Parameters<VoiceAgentExecutor>[0],
  options: SipAgentOptions & { callTimeoutMs: number },
): SipDriverInput {
  return {
    provider: "voice-agent-testops",
    transport: "sip",
    sip: {
      uri: options.sipUri,
      ...(options.sipProxy ? { proxy: options.sipProxy } : {}),
      ...(options.sipFrom ? { from: options.sipFrom } : {}),
      ...(options.mediaDir ? { mediaDir: options.mediaDir } : {}),
      callTimeoutMs: options.callTimeoutMs,
    },
    suiteName: input.suiteName,
    scenarioId: input.scenario.id,
    scenarioTitle: input.scenario.title,
    turnIndex: input.turnIndex,
    customerText: input.customerText,
    source: input.scenario.source,
    merchant: input.merchant,
    messages: input.messages,
    outputContract: {
      spoken: "ASR transcript of the voice agent reply",
      summary: "optional LeadSummary-compatible JSON",
      tools: "optional array of tool calls",
      state: "optional backend state snapshot",
      audio: "optional replay metadata: { url, label, mimeType, durationMs }",
      voiceMetrics:
        "optional numeric metrics: { timeToFirstWordMs, turnLatencyMs, asrLatencyMs, ttsLatencyMs, silenceMs, interruptionCount, asrConfidence }",
    },
  };
}

function parseSipDriverOutput(body: unknown): VoiceAgentTurnOutput {
  if (!isRecord(body)) {
    throw new Error("SIP driver response must be a JSON object");
  }
  if (typeof body.spoken !== "string" || body.spoken.trim().length === 0) {
    throw new Error("SIP driver response must include non-empty spoken");
  }

  const output: VoiceAgentTurnOutput = {
    spoken: body.spoken,
  };

  if (isRecord(body.summary)) {
    output.summary = body.summary as VoiceAgentTurnOutput["summary"];
  }
  if (Array.isArray(body.tools)) {
    output.tools = body.tools as VoiceAgentTurnOutput["tools"];
  }
  if (isRecord(body.state)) {
    output.state = body.state;
  }
  if (body.audio !== undefined) {
    if (!isRecord(body.audio) || typeof body.audio.url !== "string" || body.audio.url.trim().length === 0) {
      throw new Error("SIP driver response audio must include audio.url when provided");
    }
    output.audio = body.audio as VoiceAgentTurnOutput["audio"];
  }
  if (body.voiceMetrics !== undefined) {
    if (!isRecord(body.voiceMetrics)) {
      throw new Error("SIP driver response voiceMetrics must be an object when provided");
    }
    output.voiceMetrics = body.voiceMetrics as VoiceAgentTurnOutput["voiceMetrics"];
  }

  return output;
}

function normalizeTimeout(timeoutMs: number | undefined): number {
  if (timeoutMs === undefined) {
    return defaultCallTimeoutMs;
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("SIP call timeout must be a positive number of milliseconds");
  }

  return Math.floor(timeoutMs);
}

function normalizeRetries(driverRetries: number | undefined): number {
  if (driverRetries === undefined) {
    return 0;
  }
  if (!Number.isInteger(driverRetries) || driverRetries < 0) {
    throw new Error("SIP driver retries must be a non-negative integer");
  }

  return driverRetries;
}

function buildDriverEnv(options: SipAgentOptions, callTimeoutMs: number, driverRetries: number): Record<string, string> {
  const env: Record<string, string> = {};
  assignEnv(env, "VOICE_TESTOPS_SIP_URI", options.sipUri);
  assignEnv(env, "VOICE_TESTOPS_SIP_PROXY", options.sipProxy);
  assignEnv(env, "VOICE_TESTOPS_SIP_FROM", options.sipFrom);
  assignEnv(env, "VOICE_TESTOPS_SIP_MEDIA_DIR", options.mediaDir);
  env.VOICE_TESTOPS_SIP_CALL_TIMEOUT_MS = String(callTimeoutMs);
  env.VOICE_TESTOPS_SIP_DRIVER_RETRIES = String(driverRetries);

  for (const [key, value] of Object.entries(options.env ?? {})) {
    assignEnv(env, key, value);
  }

  return env;
}

function assignEnv(env: Record<string, string>, key: string, value: string | undefined): void {
  if (typeof value === "string" && value.length > 0) {
    env[key] = value;
  }
}

function formatStderr(stderr: string): string {
  const trimmed = stderr.trim();
  return trimmed ? `: ${trimmed.slice(0, 500)}` : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
