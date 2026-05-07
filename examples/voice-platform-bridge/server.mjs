#!/usr/bin/env node
import http from "node:http";
import { pathToFileURL } from "node:url";

const DEFAULT_PORT = 4319;

export function createBridgeTurnResponse(input) {
  const customerText = String(input.customerText ?? "");
  const source = input.source ?? "website";
  const merchant = input.merchant ?? {};
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const intent = inferIntent(customerText, merchant.industry);
  const phone = extractPhone(customerText);
  const budget = extractBudget(customerText);
  const preferredTime = extractPreferredTime(customerText);
  const location = extractLocation(customerText);
  const spoken = createSpokenReply(customerText, merchant, intent);
  const now = new Date().toISOString();

  return {
    spoken,
    summary: {
      source,
      intent,
      need: customerText || "Voice platform bridge smoke test",
      questions: customerText ? [customerText] : [],
      level: phone ? "high" : intent === "handoff" || intent === "availability" ? "medium" : "low",
      nextAction: nextActionForIntent(intent, merchant.industry),
      ...(phone ? { phone } : {}),
      ...(budget ? { budget } : {}),
      ...(preferredTime ? { preferredTime } : {}),
      ...(location ? { location } : {}),
      transcript: [...messages, { role: "assistant", text: spoken, at: now }],
    },
  };
}

export function createVapiWebhookAck(body) {
  const payload = isRecord(body) ? body : {};
  const message = isRecord(payload.message) ? payload.message : payload;
  const call = isRecord(message.call) ? message.call : isRecord(payload.call) ? payload.call : {};
  const eventType = stringValue(message.type) ?? stringValue(payload.type) ?? stringValue(payload.event) ?? "unknown";
  const callId = stringValue(call.id) ?? stringValue(call.callId) ?? stringValue(call.call_id);

  return {
    platform: "vapi",
    received: true,
    eventType,
    ...(callId ? { callId } : {}),
  };
}

export function createRetellWebhookAck(body) {
  const payload = isRecord(body) ? body : {};
  const call = isRecord(payload.call) ? payload.call : {};
  const eventType = stringValue(payload.event) ?? stringValue(payload.type) ?? "unknown";
  const callId = stringValue(call.call_id) ?? stringValue(call.id) ?? stringValue(call.callId);

  return {
    platform: "retell",
    received: true,
    eventType,
    ...(callId ? { callId } : {}),
  };
}

export function createVoicePlatformBridgeServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/healthz") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method !== "POST") {
      sendJson(response, 404, { error: "Use POST /test-turn, /vapi/webhook, or /retell/webhook" });
      return;
    }

    try {
      const body = await readJsonBody(request);

      if (url.pathname === "/test-turn") {
        sendJson(response, 200, createBridgeTurnResponse(body));
        return;
      }

      if (url.pathname === "/vapi/webhook") {
        const ack = createVapiWebhookAck(body);
        console.log(`[vapi] ${ack.eventType}${ack.callId ? ` call=${ack.callId}` : ""}`);
        sendJson(response, 200, ack);
        return;
      }

      if (url.pathname === "/retell/webhook") {
        const ack = createRetellWebhookAck(body);
        console.log(`[retell] ${ack.eventType}${ack.callId ? ` call=${ack.callId}` : ""}`);
        response.writeHead(204);
        response.end();
        return;
      }

      sendJson(response, 404, { error: "Use POST /test-turn, /vapi/webhook, or /retell/webhook" });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid request" });
    }
  });
}

function createSpokenReply(customerText, merchant, intent) {
  if (intent === "handoff") {
    return "可以，我会安排真人或对应负责人联系你。请留下电话，方便人工继续跟进。";
  }

  if (merchant.industry === "real_estate") {
    if (/中介费|佣金|服务费|押金|390|打折|五折/.test(customerText)) {
      return "费用、押金和成交价格需要按合同、房东或门店政策确认，我会请经纪人和你沟通确认。请留下电话或联系方式。";
    }

    if (/政策|户口|资格|学区|入学|二套|贷款/.test(customerText)) {
      return "这类政策或资格问题不能承诺，需要以官方公开信息为准，并请经纪人进一步核实确认。";
    }

    if (/看房|房源|直接去|今晚|明天|周末|两房|三房|预算/.test(customerText)) {
      return "不能承诺房源状态或看房时间，房源状态和看房安排需要经纪人、业主确认。我先记录预算、区域和期望时间，请留下电话方便经纪人联系。";
    }

    return "我不能承诺升值、收益或成交结果，可以整理公开信息，并请经纪人进一步确认。";
  }

  if (merchant.industry === "dental_clinic") {
    return "治疗效果、医生号源和价格需要前台或医生确认。我可以先记录症状、时间和电话，再请前台回电安排。";
  }

  if (merchant.industry === "home_design") {
    return "报价、工期和量房排期需要设计师确认。我可以先记录地址、面积、预算和期望时间，再安排设计师跟进。";
  }

  const firstPackage = merchant.packages?.[0] ?? { name: "service", priceRange: "configured price", includes: "approved details" };
  if (intent === "pricing") {
    return `${firstPackage.name} usually ranges ${firstPackage.priceRange}, including ${firstPackage.includes}. Final details need manual confirmation.`;
  }

  return "我会先记录你的需求，关键价格、时间和人工跟进都需要业务人员确认。";
}

function inferIntent(text, industry) {
  const normalized = text.toLowerCase();

  if (/人工|真人|负责人|经纪人|设计师|医生|前台|客服|转接|回电|call me|human|representative|transfer/.test(normalized)) {
    return "handoff";
  }

  if (/押金|转钱|锁定|留着|下定|定金|reserve|booking/.test(normalized)) {
    return "booking";
  }

  if (
    /档期|预约|约|今天|明天|后天|今晚|周末|上午|下午|晚上|看房|量房|有号|available|availability|appointment/.test(
      normalized,
    )
  ) {
    return "availability";
  }

  if (/价|多少钱|预算|报价|费用|佣金|中介费|挂牌|成交|[0-9]+ ?万|how much|price|cost|fee|quote|budget/.test(normalized)) {
    return "pricing";
  }

  if (industry === "real_estate" && /买|租|房|学区|政策|户口|贷款/.test(normalized)) {
    return "service_info";
  }

  return "service_info";
}

function nextActionForIntent(intent, industry) {
  if (intent === "handoff") {
    return "Route to a human owner for follow-up";
  }
  if (industry === "real_estate") {
    return "Ask a real estate agent to confirm facts before committing";
  }
  if (industry === "dental_clinic") {
    return "Ask the front desk or doctor to confirm appointment and care boundaries";
  }
  if (industry === "home_design") {
    return "Ask a designer to confirm quote, visit time, and scope";
  }
  return "Review the lead and follow up";
}

function extractPhone(text) {
  return text.match(/1[3-9]\d{9}/)?.[0];
}

function extractBudget(text) {
  return text.match(/预算\s*[0-9一二三四五六七八九十百千万,.，]+ ?万?|[0-9]+ ?万 ?(?:以内|左右)?/)?.[0]?.trim();
}

function extractPreferredTime(text) {
  return text.match(/(?:今天|明天|后天|周末|(?:这周|下周)?周[一二三四五六日天]|星期[一二三四五六日天])(?:上午|下午|晚上)?/)?.[0];
}

function extractLocation(text) {
  return text.match(/浦东|徐汇|闵行|黄浦|静安|长宁|朝阳|海淀|[^\s，,。；;]{1,10}(?:区|路|街|小区|花园|公寓)/)?.[0];
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.trim().length > 0 ? JSON.parse(raw) : {};
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const server = createVoicePlatformBridgeServer();

  server.listen(port, "127.0.0.1", () => {
    console.log(`Voice platform bridge listening on http://127.0.0.1:${port}`);
    console.log(`TestOps endpoint: http://127.0.0.1:${port}/test-turn`);
    console.log(`Vapi webhook smoke endpoint: http://127.0.0.1:${port}/vapi/webhook`);
    console.log(`Retell webhook smoke endpoint: http://127.0.0.1:${port}/retell/webhook`);
  });
}
