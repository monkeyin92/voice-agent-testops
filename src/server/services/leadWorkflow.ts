import { leadSummarySchema, type Lead, type LeadSummary } from "@/domain/lead";
import type { Merchant } from "@/domain/merchant";
import { createLead, markLeadNotificationError, markLeadNotified } from "@/server/repositories/leadRepository";
import { notifyFeishuLead } from "@/server/services/notification";

type LeadRepositories = {
  createLead: typeof createLead;
  markLeadNotified: typeof markLeadNotified;
  markLeadNotificationError: typeof markLeadNotificationError;
};

export type ProcessLeadSummaryInput = {
  merchant: Merchant;
  summary: LeadSummary;
  repositories?: LeadRepositories;
  notify?: (input: { merchant: Merchant; lead: Lead }) => Promise<void>;
};

export async function processLeadSummary({
  merchant,
  summary,
  repositories = { createLead, markLeadNotified, markLeadNotificationError },
  notify = notifyFeishuLead,
}: ProcessLeadSummaryInput): Promise<Lead> {
  const parsed = leadSummarySchema.parse(summary);
  const lead = await repositories.createLead(merchant.id, parsed);

  try {
    await notify({ merchant, lead });
    await repositories.markLeadNotified(lead.id, new Date());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown notification error";
    await repositories.markLeadNotificationError(lead.id, message);
  }

  return lead;
}
