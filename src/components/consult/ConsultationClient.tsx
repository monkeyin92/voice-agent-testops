"use client";

import { useMemo, useState } from "react";
import type { Merchant } from "@/domain/merchant";
import { VoiceButton } from "./VoiceButton";

export type ConsultationMerchant = Omit<Merchant, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type ChatMessage = {
  role: "customer" | "assistant";
  text: string;
  at: string;
};

type LeadResponse = {
  spoken: string;
  lead: { id: string };
};

export function ConsultationClient({ merchant }: { merchant: ConsultationMerchant }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);

  const source = useMemo(() => {
    if (typeof window === "undefined") return "unknown";
    const value = new URLSearchParams(window.location.search).get("source");
    return value ?? "unknown";
  }, []);

  async function submitCustomerText(value: string) {
    const clean = value.trim();
    if (!clean) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "customer", text: clean, at: new Date().toISOString() }];
    setMessages(nextMessages);
    setText("");
    setLoading(true);

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ merchantId: merchant.id, source, messages: nextMessages }),
    });
    const data = (await response.json()) as Partial<LeadResponse>;

    if (response.ok && data.spoken && data.lead?.id) {
      const assistantMessage: ChatMessage = { role: "assistant", text: data.spoken, at: new Date().toISOString() };
      setMessages([...nextMessages, assistantMessage]);
      setLeadId(data.lead.id);
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance(data.spoken));
    } else {
      setMessages([
        ...nextMessages,
        { role: "assistant", text: "语音接待暂时繁忙，请留下电话，商家会尽快联系你。", at: new Date().toISOString() },
      ]);
    }

    setLoading(false);
  }

  return (
    <main className="consult-page">
      <section className="merchant-header">
        <p className="eyebrow">{merchant.industry === "photography" ? "摄影写真咨询" : "家装设计咨询"}</p>
        <h1>{merchant.name}</h1>
        <p>
          {merchant.address} · {merchant.businessHours}
        </p>
      </section>

      <section className="chat-panel">
        {messages.length === 0 ? (
          <p className="empty-state">点击语音按钮，或直接输入你想咨询的问题。</p>
        ) : (
          messages.map((message, index) => (
            <div className={`bubble ${message.role}`} key={`${message.at}-${index}`}>
              {message.text}
            </div>
          ))
        )}
      </section>

      <form
        className="input-row"
        onSubmit={(event) => {
          event.preventDefault();
          void submitCustomerText(text);
        }}
      >
        <VoiceButton disabled={loading} onTranscript={(transcript) => void submitCustomerText(transcript)} />
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="也可以输入文字咨询" />
        <button disabled={loading} type="submit">
          发送
        </button>
      </form>

      {leadId ? <p className="lead-done">已生成咨询记录，商家会根据摘要跟进。</p> : null}
    </main>
  );
}
