import { notFound } from "next/navigation";
import { LeadTable } from "@/components/admin/LeadTable";
import { listLeadsByMerchant } from "@/server/repositories/leadRepository";
import { findMerchantById } from "@/server/repositories/merchantRepository";

export const dynamic = "force-dynamic";

export default async function MerchantAdminPage({ params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  const merchant = await findMerchantById(merchantId);

  if (!merchant) {
    notFound();
  }

  const leads = await listLeadsByMerchant(merchant.id);

  return (
    <main className="admin-shell">
      <h1>{merchant.name}</h1>
      <p>咨询页：/m/{merchant.slug}?source=xiaohongshu</p>
      <LeadTable leads={leads} />
    </main>
  );
}
