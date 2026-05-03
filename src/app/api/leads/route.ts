import { NextResponse } from "next/server";
import { z } from "zod";
import { leadSourceSchema } from "@/domain/lead";
import { findMerchantById } from "@/server/repositories/merchantRepository";
import { requestReceptionistResponse } from "@/server/services/agentAdapter";
import { processLeadSummary } from "@/server/services/leadWorkflow";

const leadRequestSchema = z.object({
  merchantId: z.string().min(1),
  source: leadSourceSchema.default("unknown"),
  messages: z
    .array(
      z.object({
        role: z.enum(["customer", "assistant"]),
        text: z.string().min(1),
        at: z.string().datetime(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const body = leadRequestSchema.parse(await request.json());
  const merchant = await findMerchantById(body.merchantId);

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const agentResponse = await requestReceptionistResponse({
    merchant,
    source: body.source,
    messages: body.messages,
  });
  const lead = await processLeadSummary({ merchant, summary: agentResponse.summary });

  return NextResponse.json({ spoken: agentResponse.spoken, lead }, { status: 201 });
}
