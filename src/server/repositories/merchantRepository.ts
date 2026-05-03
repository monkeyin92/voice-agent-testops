import { merchantConfigSchema, type Merchant, type MerchantConfig } from "@/domain/merchant";
import { prisma } from "@/server/db/prisma";

export async function createMerchant(config: MerchantConfig): Promise<Merchant> {
  const parsed = merchantConfigSchema.parse(config);
  const row = await prisma.merchant.create({
    data: {
      name: parsed.name,
      slug: parsed.slug,
      industry: parsed.industry,
      address: parsed.address,
      serviceArea: parsed.serviceArea,
      businessHours: parsed.businessHours,
      contactPhone: parsed.contactPhone,
      feishuWebhookUrl: parsed.feishuWebhookUrl,
      packagesJson: parsed.packages,
      faqsJson: parsed.faqs,
      bookingRulesJson: parsed.bookingRules,
    },
  });

  return mapMerchant(row);
}

export async function listMerchants(): Promise<Merchant[]> {
  const rows = await prisma.merchant.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(mapMerchant);
}

export async function findMerchantBySlug(slug: string): Promise<Merchant | null> {
  const row = await prisma.merchant.findUnique({ where: { slug } });
  return row ? mapMerchant(row) : null;
}

export async function findMerchantById(id: string): Promise<Merchant | null> {
  const row = await prisma.merchant.findUnique({ where: { id } });
  return row ? mapMerchant(row) : null;
}

function mapMerchant(row: {
  id: string;
  name: string;
  slug: string;
  industry: string;
  address: string;
  serviceArea: string;
  businessHours: string;
  contactPhone: string;
  feishuWebhookUrl: string | null;
  packagesJson: unknown;
  faqsJson: unknown;
  bookingRulesJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}): Merchant {
  const config = merchantConfigSchema.parse({
    name: row.name,
    slug: row.slug,
    industry: row.industry,
    address: row.address,
    serviceArea: row.serviceArea,
    businessHours: row.businessHours,
    contactPhone: row.contactPhone,
    feishuWebhookUrl: row.feishuWebhookUrl ?? undefined,
    packages: row.packagesJson,
    faqs: row.faqsJson,
    bookingRules: row.bookingRulesJson,
  });

  return {
    id: row.id,
    ...config,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
