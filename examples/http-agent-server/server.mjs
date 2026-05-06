#!/usr/bin/env node
import http from "node:http";
import { pathToFileURL } from "node:url";

const DEFAULT_PORT = 4318;

export function createTestAgentResponse(input) {
  const customerText = String(input.customerText ?? "");
  const source = input.source ?? "unknown";
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const firstPackage = input.merchant?.packages?.[0] ?? {
    name: "service",
    priceRange: "configured price",
    includes: "configured service details",
  };
  const phone = customerText.match(/1[3-9]\d{9}/)?.[0];
  const customerName = customerText.match(/我(?:叫|是)\s*([\u4e00-\u9fa5A-Za-z]{1,12})(?:[，,。；;\s]|$)/)?.[1];
  const preferredTime = customerText.match(/(?:这周|下周)?周[一二三四五六日天]|星期[一二三四五六日天]|周末|今天|明天|后天/)?.[0];
  const asksPrice = /price|pricing|多少钱|价格|费用|报价/i.test(customerText);
  const asksHandoff = /human|handoff|operator|人工|真人|客服|老板|转接|联系/i.test(customerText);
  const asksTime = /available|availability|book|booking|time|schedule|档期|时间|预约|想约|周末|周[一二三四五六日天]/i.test(
    customerText,
  );
  const intent = asksHandoff ? "handoff" : asksPrice ? "pricing" : asksTime ? "availability" : "service_info";

  const spoken = asksHandoff
    ? "可以，我会帮你转人工跟进。请留下电话或联系方式，方便真人客服联系你。"
    : asksPrice
      ? `${firstPackage.name}一般是 ${firstPackage.priceRange}，包含${firstPackage.includes}。档期和最终优惠需要人工确认。`
      : asksTime
        ? "档期需要人工确认。我先记录你的期望时间，请留下电话，方便客服尽快跟进。"
        : "我先帮你记录需求。请告诉我你想咨询的服务、预算或期望时间。";
  const now = new Date().toISOString();

  return {
    spoken,
    summary: {
      ...(customerName ? { customerName } : {}),
      ...(phone ? { phone } : {}),
      ...(preferredTime ? { preferredTime } : {}),
      source,
      intent,
      need: customerText || "Customer started a test conversation",
      questions: customerText ? [customerText] : [],
      level: phone ? "high" : asksHandoff || asksPrice || asksTime ? "medium" : "low",
      nextAction: asksHandoff ? "Route to a human operator" : "Review the lead and follow up",
      transcript: [...messages, { role: "assistant", text: spoken, at: now }],
    },
  };
}

export function createHttpAgentExampleServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/healthz") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method !== "POST" || url.pathname !== "/test-turn") {
      sendJson(response, 404, { error: "Use POST /test-turn" });
      return;
    }

    try {
      const input = await readJsonBody(request);
      sendJson(response, 200, createTestAgentResponse(input));
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid request" });
    }
  });
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const server = createHttpAgentExampleServer();

  server.listen(port, "127.0.0.1", () => {
    console.log(`Voice Agent TestOps HTTP example listening on http://127.0.0.1:${port}/test-turn`);
  });
}
