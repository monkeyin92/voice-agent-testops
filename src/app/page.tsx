import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">小红书商家 AI 语音接待员</p>
        <h1>把内容平台来的咨询，接成可跟进的预约线索。</h1>
        <p>客户打开商家链接，直接语音咨询；系统问清需求、生成摘要，并通知老板跟进。</p>
        <Link href="/admin" className="primary-link">
          进入后台
        </Link>
      </section>
    </main>
  );
}
