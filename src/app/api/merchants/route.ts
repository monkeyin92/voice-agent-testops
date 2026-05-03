import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { merchantConfigSchema } from "@/domain/merchant";
import { createMerchant, listMerchants } from "@/server/repositories/merchantRepository";

export async function GET() {
  const merchants = await listMerchants();
  return NextResponse.json({ merchants });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = merchantConfigSchema.parse(body);
    const merchant = await createMerchant(parsed);
    return NextResponse.json({ merchant }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid merchant config", issues: error.issues }, { status: 400 });
    }

    throw error;
  }
}
