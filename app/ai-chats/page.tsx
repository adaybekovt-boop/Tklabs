import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { AIChatsPage } from "@/components/site/AIChatsPage";

export const metadata: Metadata = {
  title: "AI-чаты — Imaginary Intelligence",
  description: "Отдельное рабочее пространство Imaginary Intelligence для потоковых AI-ответов.",
};

export default async function AIChatsRoute() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/ai-chats");
  return <AIChatsPage />;
}
