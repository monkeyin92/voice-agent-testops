import { leadSummarySchema, type Lead, type LeadSummary } from "@/domain/lead";
import { prisma } from "@/server/db/prisma";

export async function createLead(merchantId: string, summary: LeadSummary): Promise<Lead> {
  const parsed = leadSummarySchema.parse(summary);
  const row = await prisma.lead.create({
    data: {
      merchantId,
      source: parsed.source,
      intent: parsed.intent,
      level: parsed.level,
      customerName: parsed.customerName,
      phone: parsed.phone,
      need: parsed.need,
      budget: parsed.budget,
      preferredTime: parsed.preferredTime,
      location: parsed.location,
      questionsJson: parsed.questions,
      transcriptJson: parsed.transcript,
      nextAction: parsed.nextAction,
    },
  });

  return mapLead(row);
}

export async function listLeadsByMerchant(merchantId: string): Promise<Lead[]> {
  const rows = await prisma.lead.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapLead);
}

export async function findLeadById(id: string): Promise<Lead | null> {
  const row = await prisma.lead.findUnique({ where: { id } });
  return row ? mapLead(row) : null;
}

export async function markLeadNotified(id: string, notifiedAt: Date): Promise<void> {
  await prisma.lead.update({
    where: { id },
    data: { notifiedAt, notificationError: null },
  });
}

export async function markLeadNotificationError(id: string, notificationError: string): Promise<void> {
  await prisma.lead.update({
    where: { id },
    data: { notificationError },
  });
}

function mapLead(row: {
  id: string;
  merchantId: string;
  source: string;
  intent: string;
  level: string;
  customerName: string | null;
  phone: string | null;
  need: string;
  budget: string | null;
  preferredTime: string | null;
  location: string | null;
  questionsJson: unknown;
  transcriptJson: unknown;
  nextAction: string;
  notifiedAt: Date | null;
  notificationError: string | null;
  createdAt: Date;
}): Lead {
  const summary = leadSummarySchema.parse({
    source: row.source,
    intent: row.intent,
    level: row.level,
    customerName: row.customerName ?? undefined,
    phone: row.phone ?? undefined,
    need: row.need,
    budget: row.budget ?? undefined,
    preferredTime: row.preferredTime ?? undefined,
    location: row.location ?? undefined,
    questions: row.questionsJson,
    transcript: row.transcriptJson,
    nextAction: row.nextAction,
  });

  return {
    id: row.id,
    merchantId: row.merchantId,
    ...summary,
    createdAt: row.createdAt,
    notifiedAt: row.notifiedAt ?? undefined,
    notificationError: row.notificationError ?? undefined,
  };
}
