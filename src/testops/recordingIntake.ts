export type RecordingIntakeIssueSeverity = "error" | "warning";

export type RecordingIntakeIssue = {
  severity: RecordingIntakeIssueSeverity;
  line: number;
  recordingId?: string;
  field: string;
  message: string;
};

export type RecordingIntakeRow = {
  line: number;
  values: Record<string, string>;
};

export type RecordingIntakeCandidate = {
  line: number;
  recordingId: string;
  businessType: string;
  riskTags: string[];
  quality: string;
  consentStatus: string;
  transcriptStatus: string;
  turnRoleHint: string;
  nextAction: string;
};

export type RecordingIntakeReport = {
  generatedAt: string;
  sourcePath?: string;
  total: number;
  rows: RecordingIntakeRow[];
  usefulnessCounts: Array<{ value: string; count: number }>;
  businessTypeCounts: Array<{ value: string; count: number }>;
  riskTagCounts: Array<{ value: string; count: number }>;
  qualityCounts: Array<{ value: string; count: number }>;
  turnRoleHintCounts: Array<{ value: string; count: number }>;
  readyRegressionCandidates: RecordingIntakeCandidate[];
  issues: RecordingIntakeIssue[];
  errorCount: number;
  warningCount: number;
};

const requiredColumns = [
  "recording_id",
  "audio_url_private",
  "call_date",
  "business_type",
  "direction",
  "quality",
  "has_pii",
  "consent_status",
  "main_pattern",
  "risk_tag",
  "usefulness",
  "turn_role_hint",
  "transcript_status",
  "regression_candidate",
] as const;

const expectedColumns = [
  "recording_id",
  "audio_url_private",
  "call_date",
  "business_type",
  "direction",
  "duration_sec",
  "language",
  "quality",
  "has_pii",
  "consent_status",
  "main_pattern",
  "risk_tag",
  "usefulness",
  "turn_role_hint",
  "transcript_status",
  "regression_candidate",
  "notes",
] as const;

const enumValues = {
  business_type: [
    "insurance",
    "outbound_leadgen",
    "real_estate",
    "dental_clinic",
    "home_design",
    "restaurant",
    "ecommerce",
    "unknown",
  ],
  direction: ["inbound", "outbound", "unknown"],
  language: ["zh-CN", "en", "mixed"],
  quality: ["clear", "noisy", "unusable"],
  has_pii: ["yes", "no", "unknown"],
  consent_status: ["authorized", "internal_sample", "public_sample", "synthetic", "unknown"],
  main_pattern: [
    "wechat_followup",
    "project_cooperation",
    "claim_status",
    "pricing",
    "handoff",
    "unsupported_promise",
    "complaint",
    "no_answer",
    "low_signal",
    "other",
  ],
  risk_tag: [
    "handoff",
    "unsupported_promise",
    "pricing",
    "pii",
    "low_signal",
    "asr_failure",
    "compliance",
    "human_confirmation",
    "other",
  ],
  usefulness: ["keep", "maybe", "discard"],
  turn_role_hint: ["customer", "assistant", "both", "unknown"],
  transcript_status: ["none", "draft", "sanitized", "reviewed"],
  regression_candidate: ["yes", "maybe", "no"],
} as const;

const urlLikePattern = /\b(?:https?:\/\/|s3:\/\/|gs:\/\/|www\.)[^\s<>"')]+/i;
const urlLikeGlobalPattern = /\b(?:https?:\/\/|s3:\/\/|gs:\/\/|www\.)[^\s<>"')]+/gi;

export function analyzeRecordingIntake(content: string, options: { sourcePath?: string } = {}): RecordingIntakeReport {
  const parsed = parseCsv(normalizeRecordingIntakeContent(content));
  const issues: RecordingIntakeIssue[] = [...parsed.issues];
  const rows = parsed.rows;

  validateHeader(parsed.headers, issues);
  validateRows(rows, issues);

  const readyRegressionCandidates = selectReadyRegressionCandidates(rows, issues);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  return {
    generatedAt: new Date().toISOString(),
    sourcePath: options.sourcePath,
    total: rows.length,
    rows,
    usefulnessCounts: countSingleValue(rows, "usefulness"),
    businessTypeCounts: countSingleValue(rows, "business_type"),
    riskTagCounts: countRiskTags(rows),
    qualityCounts: countSingleValue(rows, "quality"),
    turnRoleHintCounts: countSingleValue(rows, "turn_role_hint"),
    readyRegressionCandidates,
    issues: issues.sort(compareIssues),
    errorCount,
    warningCount,
  };
}

export function normalizeRecordingIntakeContent(content: string): string {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0 || !lines.every((line) => looksLikeUrl(line))) {
    return content;
  }

  const rows: string[][] = [[...expectedColumns]];
  lines.forEach((url, index) => {
    rows.push([
      `recording_${String(index + 1).padStart(3, "0")}`,
      url,
      extractDateFromUrl(url) ?? "unknown",
      "unknown",
      "unknown",
      "",
      "zh-CN",
      "noisy",
      "yes",
      "unknown",
      "other",
      "pii",
      "maybe",
      "unknown",
      "none",
      "no",
      "Imported from a raw private URL list; keep private and sanitize before transcript review.",
    ]);
  });

  return `${rows.map((row) => row.map(formatCsvField).join(",")).join("\n")}\n`;
}

export function renderRecordingIntakeMarkdown(report: RecordingIntakeReport): string {
  const lines = [
    "# Voice Agent TestOps Recording Intake Triage",
    "",
    `Generated: ${report.generatedAt}`,
  ];

  if (report.sourcePath) {
    lines.push(`Source: \`${markdownCell(report.sourcePath)}\``);
  }

  lines.push(
    `Total recordings: ${report.total}`,
    `Ready regression candidates: ${report.readyRegressionCandidates.length}`,
    `Issues: ${report.errorCount} errors, ${report.warningCount} warnings`,
    "",
    "## Usefulness",
    "",
    renderCountTable("usefulness", report.usefulnessCounts),
    "",
    "## Business Type",
    "",
    renderCountTable("business_type", report.businessTypeCounts),
    "",
    "## Risk Tag",
    "",
    renderCountTable("risk_tag", report.riskTagCounts),
    "",
    "## Quality",
    "",
    renderCountTable("quality", report.qualityCounts),
    "",
    "## Turn Role Hint",
    "",
    renderCountTable("turn_role_hint", report.turnRoleHintCounts),
    "",
    "## Ready Regression Candidates",
    "",
  );

  if (report.readyRegressionCandidates.length === 0) {
    lines.push("No `regression_candidate=yes` rows are ready for the next step.", "");
  } else {
    lines.push(
      "| row | recording_id | business_type | risk_tag | quality | consent_status | transcript_status | turn_role_hint | next_action |",
      "|---:|---|---|---|---|---|---|---|---|",
    );
    for (const candidate of report.readyRegressionCandidates) {
      lines.push(
        [
          candidate.line,
          markdownCell(candidate.recordingId),
          markdownCell(candidate.businessType),
          markdownCell(candidate.riskTags.join(", ")),
          markdownCell(candidate.quality),
          markdownCell(candidate.consentStatus),
          markdownCell(candidate.transcriptStatus),
          markdownCell(candidate.turnRoleHint),
          markdownCell(candidate.nextAction),
        ].join(" | ").replace(/^/, "| ").replace(/$/, " |"),
      );
    }
    lines.push("");
  }

  lines.push("## Issues", "");
  if (report.issues.length === 0) {
    lines.push("No intake issues found.", "");
  } else {
    lines.push("| row | recording_id | severity | field | problem |", "|---:|---|---|---|---|");
    for (const issue of report.issues) {
      lines.push(
        [
          issue.line,
          markdownCell(issue.recordingId ?? ""),
          issue.severity,
          markdownCell(issue.field),
          markdownCell(issue.message),
        ].join(" | ").replace(/^/, "| ").replace(/$/, " |"),
      );
    }
    lines.push("");
  }

  lines.push(
    "## Privacy",
    "",
    "`audio_url_private` values are intentionally omitted from this report. URL-like values are only reported as redacted issues.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

type ParsedCsv = {
  headers: string[];
  rows: RecordingIntakeRow[];
  issues: RecordingIntakeIssue[];
};

type CsvRecord = {
  line: number;
  fields: string[];
};

function parseCsv(content: string): ParsedCsv {
  const records = parseCsvRecords(content);
  if (records.length === 0) {
    throw new Error("Recording intake CSV is empty");
  }

  const headers = records[0].fields.map((header) => header.trim());
  if (headers.length === 0 || headers.every((header) => header.length === 0)) {
    throw new Error("Recording intake CSV must include a header row");
  }

  const issues: RecordingIntakeIssue[] = [];
  const rows: RecordingIntakeRow[] = [];
  for (const record of records.slice(1)) {
    if (record.fields.every((field) => field.trim().length === 0)) {
      continue;
    }

    if (record.fields.length !== headers.length) {
      issues.push({
        severity: "error",
        line: record.line,
        field: "csv",
        message: `Expected ${headers.length} fields from the header, found ${record.fields.length}`,
      });
    }

    const values: Record<string, string> = {};
    headers.forEach((header, index) => {
      values[header] = record.fields[index] ?? "";
    });
    rows.push({ line: record.line, values });
  }

  return { headers, rows, issues };
}

function parseCsvRecords(content: string): CsvRecord[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;
  let hasAnyCharacter = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    hasAnyCharacter = true;

    if (inQuotes) {
      if (char === "\"" && normalized[index + 1] === "\"") {
        field += "\"";
        index += 1;
        continue;
      }
      if (char === "\"") {
        inQuotes = false;
        continue;
      }
      if (char === "\n") {
        line += 1;
      }
      field += char;
      continue;
    }

    if (char === "\"" && field.length === 0) {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      fields.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      fields.push(field);
      records.push({ line: recordLine, fields });
      fields = [];
      field = "";
      line += 1;
      recordLine = line;
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new Error("Recording intake CSV has an unterminated quoted field");
  }

  if (field.length > 0 || fields.length > 0 || hasAnyCharacter) {
    fields.push(field);
    if (!records.length || fields.some((value) => value.length > 0)) {
      records.push({ line: recordLine, fields });
    }
  }

  return records.filter((record, index) => index === 0 || record.fields.some((fieldValue) => fieldValue.trim()));
}

function validateHeader(headers: string[], issues: RecordingIntakeIssue[]): void {
  const headerSet = new Set(headers);
  for (const column of requiredColumns) {
    if (!headerSet.has(column)) {
      issues.push({
        severity: "error",
        line: 1,
        field: column,
        message: "Missing required column",
      });
    }
  }

  const seen = new Set<string>();
  for (const header of headers) {
    if (seen.has(header)) {
      issues.push({
        severity: "error",
        line: 1,
        field: header,
        message: "Duplicate column in header",
      });
    }
    seen.add(header);
  }

  const expectedSet = new Set<string>(expectedColumns);
  for (const header of headers) {
    if (header && !expectedSet.has(header)) {
      issues.push({
        severity: "warning",
        line: 1,
        field: header,
        message: "Unknown column; it will be ignored by the triage rules",
      });
    }
  }
}

function validateRows(rows: RecordingIntakeRow[], issues: RecordingIntakeIssue[]): void {
  const seenIds = new Map<string, number>();

  for (const row of rows) {
    for (const column of requiredColumns) {
      if (!value(row, column)) {
        addRowIssue(issues, row, "error", column, "Missing required field");
      }
    }

    const recordingId = value(row, "recording_id");
    if (recordingId) {
      const duplicateLine = seenIds.get(recordingId);
      if (duplicateLine !== undefined) {
        addRowIssue(issues, row, "error", "recording_id", `Duplicate recording_id also used on row ${duplicateLine}`);
      } else {
        seenIds.set(recordingId, row.line);
      }
    }

    validateDate(row, issues);
    validateDuration(row, issues);
    validateEnum(row, issues, "business_type", enumValues.business_type);
    validateEnum(row, issues, "direction", enumValues.direction);
    validateEnum(row, issues, "language", enumValues.language, { optional: true });
    validateEnum(row, issues, "quality", enumValues.quality);
    validateEnum(row, issues, "has_pii", enumValues.has_pii);
    validateEnum(row, issues, "consent_status", enumValues.consent_status);
    validateEnum(row, issues, "main_pattern", enumValues.main_pattern);
    validateRiskTags(row, issues);
    validateEnum(row, issues, "usefulness", enumValues.usefulness);
    validateEnum(row, issues, "turn_role_hint", enumValues.turn_role_hint);
    validateEnum(row, issues, "transcript_status", enumValues.transcript_status);
    validateEnum(row, issues, "regression_candidate", enumValues.regression_candidate);
    validatePrivacy(row, issues);
    validateCrossFieldRules(row, issues);
  }
}

function validateDate(row: RecordingIntakeRow, issues: RecordingIntakeIssue[]): void {
  const callDate = value(row, "call_date");
  if (!callDate) {
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(callDate)) {
    addRowIssue(issues, row, "error", "call_date", "call_date must use YYYY-MM-DD");
    return;
  }

  const parsed = new Date(`${callDate}T00:00:00.000Z`);
  const [year, month, day] = callDate.split("-").map((part) => Number.parseInt(part, 10));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    addRowIssue(issues, row, "error", "call_date", "call_date is not a valid calendar date");
  }
}

function validateDuration(row: RecordingIntakeRow, issues: RecordingIntakeIssue[]): void {
  const duration = value(row, "duration_sec");
  if (!duration) {
    return;
  }
  if (!/^\d+$/.test(duration) || Number.parseInt(duration, 10) <= 0) {
    addRowIssue(issues, row, "error", "duration_sec", "duration_sec must be a positive integer when provided");
  }
}

function validateEnum(
  row: RecordingIntakeRow,
  issues: RecordingIntakeIssue[],
  field: keyof typeof enumValues,
  allowed: readonly string[],
  options: { optional?: boolean } = {},
): void {
  const fieldValue = value(row, field);
  if (!fieldValue && options.optional) {
    return;
  }
  if (!fieldValue) {
    return;
  }
  if (!allowed.includes(fieldValue)) {
    addRowIssue(issues, row, "error", field, `Invalid value "${safeValue(fieldValue)}"; expected one of: ${allowed.join(", ")}`);
  }
}

function validateRiskTags(row: RecordingIntakeRow, issues: RecordingIntakeIssue[]): void {
  const tags = splitRiskTags(value(row, "risk_tag"));
  if (tags.length === 0) {
    return;
  }
  const allowedRiskTags: readonly string[] = enumValues.risk_tag;
  for (const tag of tags) {
    if (!allowedRiskTags.includes(tag)) {
      addRowIssue(
        issues,
        row,
        "error",
        "risk_tag",
        `Invalid value "${safeValue(tag)}"; expected one of: ${enumValues.risk_tag.join(", ")}`,
      );
    }
  }
}

function validatePrivacy(row: RecordingIntakeRow, issues: RecordingIntakeIssue[]): void {
  const privateUrl = value(row, "audio_url_private");
  if (privateUrl && looksLikeUrl(privateUrl)) {
    addRowIssue(
      issues,
      row,
      "warning",
      "audio_url_private",
      "Contains [REDACTED_URL] in a private value; the triage report redacts it and should not be used to publish raw audio links",
    );
  }

  for (const [field, rawValue] of Object.entries(row.values)) {
    if (field === "audio_url_private") {
      continue;
    }
    if (looksLikeUrl(rawValue)) {
      addRowIssue(
        issues,
        row,
        "warning",
        field,
        "Contains [REDACTED_URL] outside audio_url_private; remove or replace it before sharing any report",
      );
    }
  }
}

function validateCrossFieldRules(row: RecordingIntakeRow, issues: RecordingIntakeIssue[]): void {
  if (value(row, "consent_status") === "unknown" && value(row, "usefulness") === "keep") {
    addRowIssue(issues, row, "error", "consent_status", "consent_status=unknown cannot be marked usefulness=keep");
  }

  if (value(row, "quality") === "unusable" && ["yes", "maybe"].includes(value(row, "regression_candidate"))) {
    addRowIssue(
      issues,
      row,
      "error",
      "quality",
      "quality=unusable cannot be marked as a regression candidate",
    );
  }

  if (value(row, "usefulness") === "discard" && value(row, "regression_candidate") === "yes") {
    addRowIssue(issues, row, "error", "regression_candidate", "discarded rows cannot be regression_candidate=yes");
  }
}

function selectReadyRegressionCandidates(rows: RecordingIntakeRow[], issues: RecordingIntakeIssue[]): RecordingIntakeCandidate[] {
  const errorLines = new Set(issues.filter((issue) => issue.severity === "error").map((issue) => issue.line));

  return rows
    .filter((row) => {
      if (errorLines.has(row.line)) {
        return false;
      }
      return (
        value(row, "regression_candidate") === "yes" &&
        value(row, "usefulness") === "keep" &&
        value(row, "quality") !== "unusable" &&
        value(row, "consent_status") !== "unknown"
      );
    })
    .map((row) => ({
      line: row.line,
      recordingId: value(row, "recording_id") || "(missing)",
      businessType: value(row, "business_type") || "(missing)",
      riskTags: splitRiskTags(value(row, "risk_tag")),
      quality: value(row, "quality") || "(missing)",
      consentStatus: value(row, "consent_status") || "(missing)",
      transcriptStatus: value(row, "transcript_status") || "(missing)",
      turnRoleHint: value(row, "turn_role_hint") || "(missing)",
      nextAction: nextActionForTranscriptStatus(value(row, "transcript_status")),
    }));
}

function nextActionForTranscriptStatus(transcriptStatus: string): string {
  if (transcriptStatus === "reviewed") {
    return "draft regression";
  }
  if (transcriptStatus === "sanitized") {
    return "review transcript";
  }
  if (transcriptStatus === "draft") {
    return "sanitize transcript";
  }
  return "transcribe and sanitize";
}

function countSingleValue(rows: RecordingIntakeRow[], field: string): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const fieldValue = value(row, field) || "(blank)";
    counts.set(fieldValue, (counts.get(fieldValue) ?? 0) + 1);
  }
  return sortCounts(counts);
}

function countRiskTags(rows: RecordingIntakeRow[]): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const tags = splitRiskTags(value(row, "risk_tag"));
    if (tags.length === 0) {
      counts.set("(blank)", (counts.get("(blank)") ?? 0) + 1);
      continue;
    }
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return sortCounts(counts);
}

function sortCounts(counts: Map<string, number>): Array<{ value: string; count: number }> {
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function extractDateFromUrl(rawUrl: string): string | undefined {
  const match = rawUrl.match(/\/(\d{4}-\d{2}-\d{2})\//);
  return match?.[1];
}

function formatCsvField(valueToFormat: string): string {
  if (!/[",\n]/.test(valueToFormat)) {
    return valueToFormat;
  }

  return `"${valueToFormat.replace(/"/g, "\"\"")}"`;
}

function renderCountTable(label: string, counts: Array<{ value: string; count: number }>): string {
  if (counts.length === 0) {
    return `No ${label} values found.`;
  }

  return [
    `| ${label} | count |`,
    "|---|---:|",
    ...counts.map((item) => `| ${markdownCell(item.value)} | ${item.count} |`),
  ].join("\n");
}

function addRowIssue(
  issues: RecordingIntakeIssue[],
  row: RecordingIntakeRow,
  severity: RecordingIntakeIssueSeverity,
  field: string,
  message: string,
): void {
  issues.push({
    severity,
    line: row.line,
    recordingId: value(row, "recording_id") || undefined,
    field,
    message,
  });
}

function splitRiskTags(rawValue: string): string[] {
  return rawValue
    .split(/[|;,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function value(row: RecordingIntakeRow, field: string): string {
  return (row.values[field] ?? "").trim();
}

function looksLikeUrl(rawValue: string): boolean {
  return urlLikePattern.test(rawValue);
}

function safeValue(rawValue: string): string {
  return rawValue.replace(urlLikeGlobalPattern, "[REDACTED_URL]");
}

function markdownCell(valueToRender: string | number): string {
  return safeValue(String(valueToRender))
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function compareIssues(left: RecordingIntakeIssue, right: RecordingIntakeIssue): number {
  const severityRank: Record<RecordingIntakeIssueSeverity, number> = { error: 0, warning: 1 };
  return severityRank[left.severity] - severityRank[right.severity] || left.line - right.line || left.field.localeCompare(right.field);
}
