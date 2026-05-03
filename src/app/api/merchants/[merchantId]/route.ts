import { NextResponse } from "next/server";
import { findMerchantById } from "@/server/repositories/merchantRepository";

export async function GET(_request: Request, context: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await context.params;
  const merchant = await findMerchantById(merchantId);

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  return NextResponse.json({ merchant });
}
