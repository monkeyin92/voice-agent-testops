import "@/styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "小红书商家 AI 语音接待员",
  description: "把内容平台来的咨询接成可跟进的预约线索。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
