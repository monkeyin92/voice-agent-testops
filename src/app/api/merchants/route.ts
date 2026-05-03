import { NextResponse } from "next/server";
import { merchantConfigSchema } from "@/domain/merchant";
import { createMerchant, listMerchants } from "@/server/repositories/merchantRepository";

export async function GET() {
  const merchants = await listMerchants();
  return NextResponse.json({ merchants });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = merchantConfigSchema.parse(body);
  const merchant = await createMerchant(parsed);
  return NextResponse.json({ merchant }, { status: 201 });
}
