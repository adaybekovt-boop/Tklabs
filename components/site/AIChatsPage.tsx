"use client";

import { AIAssistantInterface } from "@/components/ui/ai-assistant-interface";

type AccountSummary = {
  name: string;
  email: string;
  image: string | null;
};

export function AIChatsPage({ account }: { account: AccountSummary }) {
  return <main className="ai-chats-page"><AIAssistantInterface account={account} /></main>;
}
