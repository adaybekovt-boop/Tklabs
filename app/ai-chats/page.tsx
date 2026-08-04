import type { Metadata } from "next";

import { auth } from "@/auth";

import { AIChatsPage } from "@/components/site/AIChatsPage";

export const metadata: Metadata = {
  title: "AI-чаты — Imaginary Intelligence",
  description: "Отдельное рабочее пространство Imaginary Intelligence для потоковых AI-ответов.",
};

export default async function AIChatsRoute() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  return (
    <AIChatsPage
      account={{
        name: session?.user?.name || email.split("@")[0] || "Guest",
        email: email || "PLAYGROUND ACCESS",
        image: session?.user?.image ?? null,
      }}
    />
  );
}
