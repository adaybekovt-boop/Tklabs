"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SiteNav } from "@/components/site/SiteNav";
import { AIAssistantInterface } from "@/components/ui/ai-assistant-interface";

type AccountSummary = {
  name: string;
  email: string;
  image: string | null;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "II";
}

export function AIChatsPage({ account }: { account: AccountSummary }) {
  const { copy } = useLanguage();
  return <main className="ai-chats-page"><SiteNav /><div className="ai-chat-account-bar"><Link className="ai-profile-link" href="/profile" aria-label="Open profile"><span className="ai-profile-avatar" aria-hidden="true">{account.image ? <img src={account.image} alt="" referrerPolicy="no-referrer" /> : initials(account.name)}</span><span className="ai-profile-label"><UserRound size={12} aria-hidden="true" /> Profile</span></Link><SignOutButton label={copy.auth.signOut} /></div><AIAssistantInterface /></main>;
}
