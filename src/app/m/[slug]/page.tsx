import { notFound } from "next/navigation";
import { ConsultationClient, type ConsultationMerchant } from "@/components/consult/ConsultationClient";
import { findMerchantBySlug } from "@/server/repositories/merchantRepository";

export default async function MerchantConsultPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const merchant = await findMerchantBySlug(slug);

  if (!merchant) {
    notFound();
  }

  const clientMerchant: ConsultationMerchant = {
    ...merchant,
    createdAt: merchant.createdAt.toISOString(),
    updatedAt: merchant.updatedAt.toISOString(),
  };

  return <ConsultationClient merchant={clientMerchant} />;
}
