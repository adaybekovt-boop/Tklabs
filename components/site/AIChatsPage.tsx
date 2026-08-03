"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SiteNav } from "@/components/site/SiteNav";
import { AIAssistantInterface } from "@/components/ui/ai-assistant-interface";

export function AIChatsPage() {
  const { copy } = useLanguage();
  return <main className="ai-chats-page"><SiteNav /><div className="ai-chat-account-bar"><SignOutButton label={copy.auth.signOut} /></div><AIAssistantInterface /></main>;
}
