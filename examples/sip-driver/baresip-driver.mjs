#!/usr/bin/env node
import { spawn } from "node:child_process";
import { chmod, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const requiredEnv = ["VOICE_TESTOPS_SIP_USERNAME", "VOICE_TESTOPS_SIP_PASSWORD", "VOICE_TESTOPS_SIP_SERVER"];
const sensitiveEnv = ["VOICE_TESTOPS_SIP_PASSWORD"];

try {
  const input = JSON.parse(await readStdin());
  const output = await runTurn(input);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${redactSecrets(error instanceof Error ? error.message : String(error))}\n`);
  process.exitCode = 1;
}

async function runTurn(input) {
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`${key} is required`);
    }
  }

  const turnIndex = Number.isInteger(input.turnIndex) ? input.turnIndex : 0;
  const mediaRoot = path.resolve(input.sip?.mediaDir ?? process.env.VOICE_TESTOPS_SIP_MEDIA_DIR ?? ".voice-testops/sip-media");
  const runDir = path.join(mediaRoot, sanitize(`${input.scenarioId ?? "scenario"}-turn-${turnIndex + 1}`));
  await mkdir(runDir, { recursive: true });
  await chmod(runDir, 0o700);

  const promptAiff = path.join(runDir, "customer-prompt.aiff");
  const promptWav = path.join(runDir, "customer-prompt.wav");
  const replyWav = path.join(runDir, "agent-reply.wav");
  const configDir = path.join(runDir, "baresip");
  const transcriptPath = path.join(runDir, "agent-reply.transcript.txt");

  await synthesizePrompt(input.customerText ?? "", promptAiff, promptWav);
  await writeBaresipConfig({ input, configDir, promptWav, replyWav });

  const startedAt = Date.now();
  const driverTimeoutMs = normalizePositiveInteger(input.sip?.callTimeoutMs, 120_000);
  const callSeconds = normalizePositiveInteger(process.env.VOICE_TESTOPS_BARESIP_CALL_SECONDS, 35);
  const dialTarget = input.sip?.uri;
  if (typeof dialTarget !== "string" || dialTarget.trim().length === 0) {
    throw new Error("SIP driver input must include sip.uri");
  }

  const call = await runCommand("baresip", ["-f", configDir, "-t", String(callSeconds), "-c", "-e", `/dial ${dialTarget}`], {
    timeoutMs: Math.max(5_000, Math.min(Math.floor(driverTimeoutMs * 0.75), callSeconds * 1000 + 45_000)),
  });
  const callLog = `${call.stdout}\n${call.stderr}`;
  if (!/Call established/i.test(callLog)) {
    throw new Error(`SIP call did not establish. Baresip log: ${redactSecrets(tail(callLog, 2400))}`);
  }

  const replyStat = await stat(replyWav).catch(() => undefined);
  if (!replyStat || replyStat.size === 0) {
    throw new Error("SIP call completed but no agent reply audio was recorded");
  }

  const spoken = await transcribeReply(replyWav, transcriptPath);
  const durationMs = await getAudioDurationMs(replyWav);
  const timeToFirstWordMs = await detectFirstSpeechMs(replyWav);

  return {
    spoken,
    summary: buildSummary(input, spoken),
    audio: {
      url: pathToFileURL(replyWav).href,
      label: `SIP replay ${input.scenarioId ?? "scenario"} turn ${turnIndex + 1}`,
      mimeType: "audio/wav",
      ...(durationMs ? { durationMs } : {}),
    },
    voiceMetrics: compactMetrics({
      turnLatencyMs: Date.now() - startedAt,
      ...(timeToFirstWordMs !== undefined ? { timeToFirstWordMs } : {}),
    }),
  };
}

async function synthesizePrompt(text, promptAiff, promptWav) {
  const prompt = text.trim() || "你好。";
  await runCommand("say", ["-o", promptAiff, prompt], { timeoutMs: 30_000 });
  await runCommand(
    "ffmpeg",
    ["-y", "-hide_banner", "-loglevel", "error", "-i", promptAiff, "-ar", "8000", "-ac", "1", "-sample_fmt", "s16", promptWav],
    { timeoutMs: 30_000 },
  );
}

async function writeBaresipConfig({ input, configDir, promptWav, replyWav }) {
  await mkdir(configDir, { recursive: true });
  await chmod(configDir, 0o700);

  const username = process.env.VOICE_TESTOPS_SIP_USERNAME;
  const password = process.env.VOICE_TESTOPS_SIP_PASSWORD;
  const server = process.env.VOICE_TESTOPS_SIP_SERVER;
  const transport = process.env.VOICE_TESTOPS_SIP_TRANSPORT?.trim().toLowerCase();
  const accountUri =
    transport && transport !== "auto" ? `<sip:${username}@${server};transport=${transport}>` : `<sip:${username}@${server}>`;
  const audioCodecs = process.env.VOICE_TESTOPS_SIP_AUDIO_CODECS ?? "PCMU/8000/1,PCMA/8000/1";

  const modulePath =
    process.env.VOICE_TESTOPS_BARESIP_MODULE_PATH ?? "/opt/homebrew/Cellar/baresip/3.22.0_1/lib/baresip/modules";
  const config = [
    "sip_cafile /etc/ssl/cert.pem",
    "sip_transports udp,tcp",
    "sip_tos 160",
    "call_local_timeout 90",
    "call_max_calls 1",
    "call_hold_other_calls yes",
    "call_accept no",
    "audio_path /opt/homebrew/Cellar/baresip/3.22.0_1/share/baresip",
    `audio_player aufile,${replyWav}`,
    `audio_source aufile,${promptWav}`,
    "audio_alert coreaudio,default",
    "audio_level no",
    "ausrc_format s16",
    "auplay_format s16",
    "auenc_format s16",
    "audec_format s16",
    "audio_buffer 20-160",
    "audio_buffer_mode fixed",
    "audio_silence -35.0",
    "audio_telev_pt 101",
    "rtp_tos 184",
    process.env.VOICE_TESTOPS_RTP_PORTS ? `rtp_ports ${process.env.VOICE_TESTOPS_RTP_PORTS}` : "rtp_ports 10000-20000",
    "audio_jitter_buffer_type fixed",
    "audio_jitter_buffer_delay 5-10",
    `module_path ${modulePath}`,
    "module g711.so",
    "module auconv.so",
    "module auresamp.so",
    "module aufile.so",
    "module uuid.so",
    "module_app account.so",
    "module_app menu.so",
    "module_app netroam.so",
    "",
  ].join("\n");
  const account = `${accountUri};auth_user=${username};auth_pass=${password};audio_codecs=${audioCodecs};regint=120\n`;

  await writeFile(path.join(configDir, "config"), config, { mode: 0o600 });
  await writeFile(path.join(configDir, "accounts"), account, { mode: 0o600 });
  await writeFile(path.join(configDir, "contacts"), "", { mode: 0o600 });
  if (input.sip?.proxy) {
    await writeFile(path.join(configDir, "README.private.txt"), `Proxy configured by TestOps input: ${input.sip.proxy}\n`, {
      mode: 0o600,
    });
  }
}

async function transcribeReply(replyWav, transcriptPath) {
  if (process.env.VOICE_TESTOPS_ASR_COMMAND) {
    const command = process.env.VOICE_TESTOPS_ASR_COMMAND.replaceAll("{audio}", shellQuote(replyWav));
    const result = await runCommand(command, [], { shell: true, timeoutMs: normalizePositiveInteger(process.env.VOICE_TESTOPS_ASR_TIMEOUT_MS, 120_000) });
    return persistTranscript(transcriptPath, result.stdout.trim() || "SIP call established; ASR command returned empty text.");
  }

  const model = process.env.VOICE_TESTOPS_WHISPER_MODEL;
  if (model) {
    const language = process.env.VOICE_TESTOPS_WHISPER_LANGUAGE ?? "zh";
    const result = await runCommand("whisper-cli", ["-m", model, "-l", language, "-nt", "-np", "-f", replyWav], {
      timeoutMs: normalizePositiveInteger(process.env.VOICE_TESTOPS_ASR_TIMEOUT_MS, 120_000),
    });
    return persistTranscript(transcriptPath, result.stdout.trim() || "SIP call established; Whisper returned empty text.");
  }

  return persistTranscript(transcriptPath, "SIP call established; ASR is not configured. Listen to the audio replay.");
}

async function persistTranscript(transcriptPath, transcript) {
  const normalized = transcript.replace(/\s+/g, " ").trim();
  await writeFile(transcriptPath, `${normalized}\n`, { mode: 0o600 });
  return normalized;
}

function buildSummary(input, spoken) {
  const text = `${input.customerText ?? ""} ${spoken}`.toLowerCase();
  const intent = /人工|真人|客服|human|agent|transfer/.test(text)
    ? "handoff"
    : /价格|多少钱|费用|报价|price|cost/.test(text)
      ? "pricing"
      : "other";

  return {
    source: input.source ?? "phone",
    intent,
    level: intent === "handoff" ? "high" : intent === "pricing" ? "medium" : "low",
    need: input.customerText || "SIP voice-agent test turn",
    questions: input.customerText ? [input.customerText] : [],
    nextAction: intent === "handoff" ? "Review handoff behavior from the SIP replay" : "Review the SIP replay and transcript",
    transcript: [{ role: "assistant", text: spoken, at: new Date().toISOString() }],
  };
}

async function getAudioDurationMs(filePath) {
  const result = await runCommand(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", filePath],
    { timeoutMs: 10_000 },
  ).catch(() => undefined);
  const seconds = Number(result?.stdout.trim());
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : undefined;
}

async function detectFirstSpeechMs(filePath) {
  const result = await runCommand(
    "ffmpeg",
    ["-hide_banner", "-i", filePath, "-af", "silencedetect=noise=-35dB:d=0.5", "-f", "null", "-"],
    { timeoutMs: 20_000 },
  ).catch(() => undefined);
  const output = `${result?.stdout ?? ""}\n${result?.stderr ?? ""}`;
  const silenceFromStart = output.match(/silence_start:\s*0(?:\.0+)?[\s\S]*?silence_end:\s*([0-9.]+)/);
  if (!silenceFromStart) {
    return undefined;
  }

  const seconds = Number(silenceFromStart[1]);
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : undefined;
}

function compactMetrics(metrics) {
  return Object.fromEntries(Object.entries(metrics).filter(([, value]) => typeof value === "number" && Number.isFinite(value)));
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitize(value) {
  return String(value)
    .replace(/[^a-z0-9_.-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function tail(value, maxLength) {
  return value.length > maxLength ? value.slice(value.length - maxLength) : value;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function redactSecrets(value) {
  let redacted = String(value);
  for (const key of sensitiveEnv) {
    const secret = process.env[key];
    if (secret) {
      redacted = redacted.replaceAll(secret, "[REDACTED]");
    }
  }
  redacted = redacted.replace(/(auth_pass=)[^;,\s]+/g, "$1[REDACTED]");
  return redacted;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("error", reject);
    process.stdin.on("end", () => resolve(input));
  });
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: options.shell ?? false,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, options.timeoutMs ?? 60_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new Error(`${command} timed out after ${options.timeoutMs ?? 60_000}ms`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} failed with ${code ?? signal}: ${redactSecrets(tail(stderr || stdout, 1600))}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}
