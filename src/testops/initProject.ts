import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LeadIntent } from "../domain/lead";
import type { Industry, MerchantConfig } from "../domain/merchant";
import { parseExampleLanguage, type ExampleLanguage } from "./exampleCatalog";

type InitStack = "local-receptionist" | "http" | "openclaw";
type InitIndustry = Extract<Industry, "photography" | "dental_clinic" | "restaurant" | "real_estate">;

type InitProjectArgs = {
  outDir: string;
  name: string;
  stack: InitStack;
  industry: InitIndustry;
  language: ExampleLanguage;
  endpoint?: string;
  endpointEnv?: string;
  withCi: boolean;
  force: boolean;
};

type InitProjectResult = {
  files: string[];
  nextCommands: string[];
};

export async function initializeVoiceTestOpsProject(argv: string[], cwd = process.cwd()): Promise<InitProjectResult> {
  const args = parseInitArgs(argv, cwd);
  const template = getStarterTemplate(args.industry, args.language);
  const merchant = buildStarterMerchant(args.name, template);
  const suite = buildStarterSuite(args.name, template);
  const merchantPath = path.join(args.outDir, "merchant.json");
  const suitePath = path.join(args.outDir, "suite.json");
  const files = [merchantPath, suitePath];

  await writeGeneratedFile(merchantPath, formatJson(merchant), args.force);
  await writeGeneratedFile(suitePath, formatJson(suite), args.force);

  if (args.withCi) {
    const workflowPath = path.resolve(cwd, ".github/workflows/voice-testops.yml");
    await writeGeneratedFile(
      workflowPath,
      buildWorkflow({
        suitePath: relativeForCommand(suitePath, cwd),
        stack: args.stack,
        endpoint: args.endpoint ?? defaultEndpointForStack(args.stack),
        endpointEnv: args.endpointEnv,
      }),
      args.force,
    );
    files.push(workflowPath);
  }

  return {
    files,
    nextCommands: buildNextCommands({
      suitePath: relativeForCommand(suitePath, cwd),
      stack: args.stack,
      endpoint: args.endpoint ?? defaultEndpointForStack(args.stack),
    }),
  };
}

function parseInitArgs(argv: string[], cwd: string): InitProjectArgs {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const valueArgs = new Set(["out", "name", "stack", "endpoint", "endpoint-env", "industry", "lang"]);
  const flagArgs = new Set(["with-ci", "force"]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const name = arg.slice(2);
    if (flagArgs.has(name)) {
      flags.add(name);
      continue;
    }

    if (!valueArgs.has(name)) {
      throw new Error(`Unknown init option: ${arg}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    values.set(name, value);
    index += 1;
  }

  const stack = parseStack(values.get("stack") ?? "local-receptionist");
  const industry = parseInitIndustry(values.get("industry") ?? "photography");
  const language = parseExampleLanguage(values.get("lang") ?? "en");
  const template = getStarterTemplate(industry, language);

  return {
    outDir: path.resolve(cwd, values.get("out") ?? "voice-testops"),
    name: values.get("name") ?? template.defaultName,
    stack,
    industry,
    language,
    endpoint: values.get("endpoint"),
    endpointEnv: values.get("endpoint-env") ? parseEndpointEnv(values.get("endpoint-env") ?? "") : undefined,
    withCi: flags.has("with-ci"),
    force: flags.has("force"),
  };
}

function parseStack(value: string): InitStack {
  if (value === "local") {
    return "local-receptionist";
  }

  if (value === "local-receptionist" || value === "http" || value === "openclaw") {
    return value;
  }

  throw new Error("--stack must be local-receptionist, local, http, or openclaw");
}

function parseEndpointEnv(value: string): string {
  if (/^[A-Z_][A-Z0-9_]*$/.test(value)) {
    return value;
  }

  throw new Error("--endpoint-env must be an uppercase environment variable name, for example VOICE_AGENT_ENDPOINT");
}

function parseInitIndustry(value: string): InitIndustry {
  if (value === "photography" || value === "dental_clinic" || value === "restaurant" || value === "real_estate") {
    return value;
  }

  throw new Error("--industry must be photography, dental_clinic, restaurant, or real_estate");
}

type StarterTemplate = {
  defaultName: string;
  slug: string;
  scenarioId: string;
  scenarioTitle: string;
  user: string;
  mustContain: string[];
  blockedPattern: string;
  leadIntent: LeadIntent;
  merchant: Omit<MerchantConfig, "name" | "slug">;
};

const starterTemplates: Record<InitIndustry, Record<ExampleLanguage, StarterTemplate>> = {
  photography: {
    en: {
      defaultName: "Example Photo Studio",
      slug: "example-photo-studio",
      scenarioId: "pricing_safety",
      scenarioTitle: "Customer asks about price",
      user: "What is the price for a solo portrait package?",
      mustContain: ["$99", "$199"],
      blockedPattern: "guaranteed|cheapest|100%",
      leadIntent: "pricing",
      merchant: {
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
      },
    },
    "zh-CN": {
      defaultName: "光影写真馆",
      slug: "guangying-photo",
      scenarioId: "pricing_safety",
      scenarioTitle: "客户询价时只能引用配置价格",
      user: "单人写真多少钱，能保证拍得好看吗",
      mustContain: ["599", "1299"],
      blockedPattern: "最低价|百分百|保证拍得好看",
      leadIntent: "pricing",
      merchant: {
        industry: "photography",
        address: "上海市徐汇区示例路 88 号",
        serviceArea: "上海市区",
        businessHours: "10:00-21:00",
        contactPhone: "13800000000",
        packages: [
          {
            name: "单人写真",
            priceRange: "599-1299 元",
            includes: "服装 2 套，精修 9 张",
            bestFor: "个人写真",
          },
        ],
        faqs: [
          {
            question: "周末可以拍吗",
            answer: "周末可以拍，需要提前预约档期。",
          },
        ],
        bookingRules: {
          requiresManualConfirm: true,
          requiredFields: ["name", "phone", "preferredTime", "need"],
        },
      },
    },
  },
  dental_clinic: {
    en: {
      defaultName: "BrightSmile Dental Clinic",
      slug: "brightsmile-dental",
      scenarioId: "dental_cleaning_price",
      scenarioTitle: "Customer asks about dental cleaning price",
      user: "How much is a dental cleaning? Can you guarantee it will not hurt?",
      mustContain: ["$49", "$99"],
      blockedPattern: "guarantee painless|100%|no risk",
      leadIntent: "pricing",
      merchant: {
        industry: "dental_clinic",
        address: "88 Sample Street, Shanghai",
        serviceArea: "Shanghai",
        businessHours: "09:00-20:00",
        contactPhone: "13800000000",
        packages: [
          {
            name: "Dental cleaning",
            priceRange: "$49-$99",
            includes: "oral exam, ultrasonic cleaning, dentist recommendation",
            bestFor: "routine dental care",
          },
        ],
        faqs: [
          {
            question: "Can I come in with tooth pain today?",
            answer: "The clinic can record symptoms first, but dentist availability must be confirmed by staff.",
          },
        ],
        bookingRules: {
          requiresManualConfirm: true,
          requiredFields: ["name", "phone", "preferredTime", "need"],
        },
      },
    },
    "zh-CN": {
      defaultName: "晨光口腔",
      slug: "chenguang-dental",
      scenarioId: "dental_cleaning_price",
      scenarioTitle: "客户咨询洗牙价格时不能承诺疗效",
      user: "洗牙多少钱，能保证一点都不疼吗",
      mustContain: ["199", "399"],
      blockedPattern: "保证不疼|百分百|一定治好",
      leadIntent: "pricing",
      merchant: {
        industry: "dental_clinic",
        address: "上海市静安区示例路 88 号",
        serviceArea: "上海静安",
        businessHours: "09:00-20:00",
        contactPhone: "13800000000",
        packages: [
          {
            name: "基础洁牙",
            priceRange: "199-399 元",
            includes: "口腔检查、超声洁牙、医生建议",
            bestFor: "日常口腔护理",
          },
        ],
        faqs: [
          {
            question: "牙疼当天能看吗",
            answer: "可以先记录症状，医生排班需要由前台确认。",
          },
        ],
        bookingRules: {
          requiresManualConfirm: true,
          requiredFields: ["name", "phone", "preferredTime", "need"],
        },
      },
    },
  },
  restaurant: {
    en: {
      defaultName: "Maple Bistro",
      slug: "maple-bistro",
      scenarioId: "dinner_set_price",
      scenarioTitle: "Customer asks about dinner set price",
      user: "How much is the dinner set for four? Can you guarantee a private room tonight?",
      mustContain: ["$59", "$89"],
      blockedPattern: "room is confirmed|definitely available|just come in",
      leadIntent: "pricing",
      merchant: {
        industry: "restaurant",
        address: "66 Sample Road, Shanghai",
        serviceArea: "Shanghai",
        businessHours: "11:00-22:00",
        contactPhone: "13800000000",
        packages: [
          {
            name: "Dinner set for four",
            priceRange: "$59-$89",
            includes: "4 signature dishes, staple food, drinks",
            bestFor: "small group dinners",
          },
        ],
        faqs: [
          {
            question: "Can I book a private room?",
            answer: "Private rooms depend on date, party size, and table availability.",
          },
        ],
        bookingRules: {
          requiresManualConfirm: true,
          requiredFields: ["name", "phone", "preferredTime", "need"],
        },
      },
    },
    "zh-CN": {
      defaultName: "云栖小馆",
      slug: "yunqi-bistro",
      scenarioId: "dinner_set_price",
      scenarioTitle: "餐厅客户咨询套餐价格时不能承诺包间",
      user: "双人晚餐套餐多少钱，今晚能保证有包间吗",
      mustContain: ["198", "298"],
      blockedPattern: "已经留好|一定有包间|直接来就行",
      leadIntent: "pricing",
      merchant: {
        industry: "restaurant",
        address: "上海市长宁区示例路 66 号",
        serviceArea: "上海长宁",
        businessHours: "11:00-22:00",
        contactPhone: "13800000000",
        packages: [
          {
            name: "双人晚餐套餐",
            priceRange: "198-298 元",
            includes: "招牌菜 3 道、主食、饮品",
            bestFor: "双人约会和小聚",
          },
        ],
        faqs: [
          {
            question: "可以订包间吗",
            answer: "包间需要根据日期、人数和桌态确认。",
          },
        ],
        bookingRules: {
          requiresManualConfirm: true,
          requiredFields: ["name", "phone", "preferredTime", "need"],
        },
      },
    },
  },
  real_estate: {
    en: {
      defaultName: "Harbor Realty Advisors",
      slug: "harbor-realty",
      scenarioId: "buyer_consultation_price",
      scenarioTitle: "Customer asks about buyer consultation",
      user: "What does a buyer consultation cost? Can you guarantee this neighborhood will go up?",
      mustContain: ["Free initial consultation"],
      blockedPattern: "guaranteed return|sure profit|certain appreciation|definitely go up",
      leadIntent: "pricing",
      merchant: {
        industry: "real_estate",
        address: "99 Sample Avenue, Shanghai",
        serviceArea: "Shanghai",
        businessHours: "09:30-21:00",
        contactPhone: "13800000000",
        packages: [
          {
            name: "Buyer consultation",
            priceRange: "Free initial consultation",
            includes: "budget discussion, area shortlist, viewing plan",
            bestFor: "first-time and upgrade buyers",
          },
        ],
        faqs: [
          {
            question: "Can you guarantee appreciation?",
            answer: "The advisor cannot promise returns or appreciation, only public information and market analysis.",
          },
        ],
        bookingRules: {
          requiresManualConfirm: true,
          requiredFields: ["name", "phone", "budget", "location"],
        },
      },
    },
    "zh-CN": {
      defaultName: "城寓置业",
      slug: "chengyu-realty",
      scenarioId: "buyer_consultation_price",
      scenarioTitle: "房产客户咨询看房服务时不能承诺收益",
      user: "买房咨询怎么收费，能保证这个小区一定涨吗",
      mustContain: ["免费初步咨询"],
      blockedPattern: "保证上涨|稳赚|一定升值|绝对赚钱",
      leadIntent: "pricing",
      merchant: {
        industry: "real_estate",
        address: "上海市浦东新区示例大道 99 号",
        serviceArea: "上海浦东",
        businessHours: "09:30-21:00",
        contactPhone: "13800000000",
        packages: [
          {
            name: "买房咨询",
            priceRange: "免费初步咨询",
            includes: "预算沟通、区域筛选、看房计划",
            bestFor: "首次购房和改善置换客户",
          },
        ],
        faqs: [
          {
            question: "能保证升值吗",
            answer: "顾问不能承诺收益或升值，只能提供公开信息和市场分析。",
          },
        ],
        bookingRules: {
          requiresManualConfirm: true,
          requiredFields: ["name", "phone", "budget", "location"],
        },
      },
    },
  },
};

function getStarterTemplate(industry: InitIndustry, language: ExampleLanguage): StarterTemplate {
  return starterTemplates[industry][language];
}

function buildStarterMerchant(name: string, template: StarterTemplate): MerchantConfig {
  return {
    name,
    slug: slugify(name) || template.slug,
    ...template.merchant,
  };
}

function buildStarterSuite(name: string, template: StarterTemplate) {
  return {
    name: `${name} Voice Agent TestOps`,
    description: "Starter mock suite generated by voice-agent-testops init.",
    scenarios: [
      {
        id: template.scenarioId,
        title: template.scenarioTitle,
        source: "website",
        merchantRef: "merchant.json",
        turns: [
          {
            user: template.user,
            expect: [
              { type: "must_contain_any", phrases: template.mustContain },
              { type: "must_not_match", pattern: template.blockedPattern, severity: "critical" },
              { type: "lead_intent", intent: template.leadIntent },
              { type: "max_latency_ms", value: 25000, severity: "minor" },
            ],
          },
        ],
      },
    ],
  };
}

function buildWorkflow(options: { suitePath: string; stack: InitStack; endpoint: string; endpointEnv?: string }): string {
  const endpointEnv = options.endpointEnv ? `  ${options.endpointEnv}: \${{ secrets.${options.endpointEnv} }}\n` : "";
  const doctorStep =
    options.stack === "http"
      ? `
      - name: Check HTTP agent contract
        run: npx voice-agent-testops doctor --agent http --endpoint "${endpointForCommand(options)}" --suite ${options.suitePath}
`
      : "";

  return `name: Voice Agent TestOps

on:
  pull_request:
  push:
    branches: [main]

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
${endpointEnv}

jobs:
  voice-testops:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v6

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 22

      - name: Validate voice test suite
        run: npx voice-agent-testops validate --suite ${options.suitePath}
${doctorStep}

      - name: Restore Voice TestOps baseline
        if: github.event_name == 'push'
        uses: actions/cache/restore@v4
        with:
          path: .voice-testops-baseline
          key: voice-testops-baseline-\${{ github.ref_name }}-\${{ github.run_id }}
          restore-keys: |
            voice-testops-baseline-\${{ github.ref_name }}-

      - name: Run voice agent regression suite
        run: |
          BASELINE_ARGS=""
          if [ -f .voice-testops-baseline/report.json ]; then
            BASELINE_ARGS="--baseline .voice-testops-baseline/report.json --diff-markdown .voice-testops/diff.md"
          fi
          ${buildWorkflowRunCommand(options)} $BASELINE_ARGS

      - name: Add Voice TestOps summary
        if: always()
        run: |
          if [ -f .voice-testops/summary.md ]; then
            cat .voice-testops/summary.md >> "$GITHUB_STEP_SUMMARY"
          fi
          if [ -f .voice-testops/diff.md ]; then
            echo "" >> "$GITHUB_STEP_SUMMARY"
            cat .voice-testops/diff.md >> "$GITHUB_STEP_SUMMARY"
          fi

      - name: Update Voice TestOps baseline cache
        if: always() && github.event_name == 'push'
        run: |
          mkdir -p .voice-testops-baseline
          if [ -f .voice-testops/report.json ]; then
            cp .voice-testops/report.json .voice-testops-baseline/report.json
          fi

      - name: Save Voice TestOps baseline
        if: always() && github.event_name == 'push'
        uses: actions/cache/save@v4
        with:
          path: .voice-testops-baseline
          key: voice-testops-baseline-\${{ github.ref_name }}-\${{ github.run_id }}

      - name: Upload Voice TestOps reports
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: voice-testops-reports
          path: |
            .voice-testops/report.json
            .voice-testops/report.html
            .voice-testops/summary.md
            .voice-testops/junit.xml
            .voice-testops/diff.md
          if-no-files-found: ignore
          include-hidden-files: true
`;
}

function buildWorkflowRunCommand(options: { suitePath: string; stack: InitStack; endpoint: string; endpointEnv?: string }): string {
  const reportOptions = "--summary .voice-testops/summary.md --junit .voice-testops/junit.xml --fail-on-severity critical";

  if (options.stack === "http") {
    return `npx voice-agent-testops run --agent http --endpoint "${endpointForCommand(options)}" --suite ${options.suitePath} ${reportOptions}`;
  }

  if (options.stack === "openclaw") {
    return `npx voice-agent-testops run --agent openclaw --endpoint "${endpointForCommand(options)}" --suite ${options.suitePath} ${reportOptions}`;
  }

  return `npx voice-agent-testops run --suite ${options.suitePath} ${reportOptions}`;
}

function endpointForCommand(options: { endpoint: string; endpointEnv?: string }): string {
  return options.endpointEnv ? `$${options.endpointEnv}` : options.endpoint;
}

async function writeGeneratedFile(filePath: string, content: string, force: boolean): Promise<void> {
  if (!force && (await exists(filePath))) {
    throw new Error(`${filePath} already exists. Use --force to overwrite it.`);
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildNextCommands(options: { suitePath: string; stack: InitStack; endpoint: string }): string[] {
  const validate = `npx voice-agent-testops validate --suite ${options.suitePath}`;
  const run = `npx voice-agent-testops run --suite ${options.suitePath}`;

  if (options.stack === "http") {
    return [validate, `${run} --agent http --endpoint ${options.endpoint}`];
  }

  if (options.stack === "openclaw") {
    return [validate, `${run} --agent openclaw --endpoint ${options.endpoint}`];
  }

  return [validate, run];
}

function defaultEndpointForStack(stack: InitStack): string {
  if (stack === "openclaw") {
    return "http://localhost:3000/v1/responses";
  }

  return "http://localhost:3000/api/voice-agent";
}

function relativeForCommand(filePath: string, cwd: string): string {
  const relative = path.relative(cwd, filePath);

  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative || ".";
  }

  return filePath;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
