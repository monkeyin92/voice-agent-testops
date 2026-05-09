#!/usr/bin/env node
import http from "node:http";
import { pathToFileURL } from "node:url";

const DEFAULT_PORT = 4318;

export function createTestAgentResponse(input) {
  const customerText = String(input.customerText ?? "");
  const source = input.source ?? "unknown";
  const messages = Array.isArray(input.messages) ? input.messages : [];
  if (input.merchant?.industry === "outbound_leadgen") {
    return createOutboundLeadgenResponse({ customerText, source, messages });
  }

  const firstPackage = input.merchant?.packages?.[0] ?? {
    name: "service",
    priceRange: "configured price",
    includes: "configured service details",
  };
  const phone = customerText.match(/1[3-9]\d{9}/)?.[0];
  const customerName = customerText.match(/我(?:叫|是)\s*([\u4e00-\u9fa5A-Za-z]{1,12})(?:[，,。；;\s]|$)/)?.[1];
  const preferredTime = customerText.match(/(?:这周|下周)?周[一二三四五六日天]|星期[一二三四五六日天]|周末|今天|明天|后天/)?.[0];
  const asksPrice = /price|pricing|how much|cost|多少钱|价格|费用|报价/i.test(customerText);
  const asksHandoff = /human|handoff|operator|人工|真人|客服|老板|转接|联系/i.test(customerText);
  const asksTime = /available|availability|book|booking|time|schedule|档期|时间|预约|想约|周末|周[一二三四五六日天]/i.test(
    customerText,
  );
  const intent = asksHandoff ? "handoff" : asksPrice ? "pricing" : asksTime ? "availability" : "service_info";

  const spoken = asksHandoff
    ? "可以，我会帮你转人工跟进。请留下电话或联系方式，方便真人客服联系你。"
    : asksPrice
      ? `${firstPackage.name} is usually ${firstPackage.priceRange}, including ${firstPackage.includes}. Final availability and discounts need manual confirmation.`
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

function createOutboundLeadgenResponse({ customerText, source, messages }) {
  const asksGift = /赠品|领取|送达|礼品/.test(customerText);
  const refuses = /没时间|不要|别打|不方便|投诉|退订/.test(customerText);
  const noPrivateChannel = /没有微信|不想加|私聊/.test(customerText);
  const asksChildData = /孩子|小朋友|几年级|年龄|多大/.test(customerText);
  const intent = refuses || noPrivateChannel || asksGift || asksChildData ? "handoff" : "other";

  let spoken = "我先记录您的需求，不继续推销；涉及领取或后续沟通的事项会由人工客服确认。";
  if (refuses) {
    spoken = "收到，我会停止推销并记录不再联系；如需处理退订，会转人工客服确认。";
  } else if (asksGift) {
    spoken = "我不能承诺赠品配送结果；领取资格和方式需要人工客服确认。";
  } else if (noPrivateChannel) {
    spoken = "没有微信也可以，我不会要求私聊；我会停止微信引导，并转人工客服确认其他合规渠道。";
  } else if (asksChildData) {
    spoken = "孩子年级或年龄不是必须提供；涉及未成年人信息需要家长同意，并由人工客服确认。";
  }

  return {
    spoken,
    summary: {
      source,
      intent,
      need: customerText || "Outbound lead follow-up",
      questions: customerText ? [customerText] : [],
      level: intent === "handoff" ? "high" : "medium",
      nextAction: "Stop sales pressure and route sensitive confirmation to human follow-up",
      transcript: [...messages, { role: "assistant", text: spoken, at: new Date().toISOString() }],
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
