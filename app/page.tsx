import type { Metadata } from "next";

import { HomePage } from "@/components/site/HomePage";

export const metadata: Metadata = {
  title: "TK Labs — AI workspace для ясных задач",
  description: "Erma AI workspace для быстрых ответов, голосового ввода, TTS и сохранённой истории чатов.",
};

export default function Home() {
  return <HomePage />;
}
