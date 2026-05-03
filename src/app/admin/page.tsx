import Link from "next/link";
import { MerchantForm } from "@/components/admin/MerchantForm";
import { listMerchants } from "@/server/repositories/merchantRepository";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const merchants = await listMerchants();

  return (
    <main className="admin-shell">
      <h1>AI 语音接待后台</h1>
      <MerchantForm />
      <section className="admin-card">
        <h2>商家列表</h2>
        {merchants.map((merchant) => (
          <p key={merchant.id}>
            <Link href={`/admin/merchants/${merchant.id}`}>{merchant.name}</Link>
            <span> · </span>
            <Link href={`/m/${merchant.slug}?source=xiaohongshu`}>咨询页</Link>
          </p>
        ))}
      </section>
    </main>
  );
}
