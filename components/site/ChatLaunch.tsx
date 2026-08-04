"use client";

import Link from "next/link";
import { ArrowUpRight, MessageSquareText, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

import { useLanguage } from "@/components/providers/LanguageProvider";

export function ChatLaunch() {
  const { copy } = useLanguage();

  return (
    <motion.div className="chat-launch" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }}>
      <div className="chat-launch-copy">
        <span className="eyebrow text-[color:var(--primary)]">{copy.home.chatEyebrow}</span>
        <h2>{copy.home.chatTitleLead}<br /><em>{copy.home.chatTitleAccent}</em></h2>
        <p>{copy.home.chatCopy}</p>
      </div>
      <div className="chat-launch-panel">
        <div className="chat-launch-panel-top"><span><span className="status-dot" /> AI Preview</span><span>01 / 05</span></div>
        <div className="chat-launch-icon"><MessageSquareText size={28} /></div>
        <div className="chat-launch-status"><ShieldCheck size={15} /> {copy.home.chatMeta}</div>
        <Link href="/ai-chats" className="chat-launch-button">{copy.home.chatButton} <ArrowUpRight size={17} /></Link>
      </div>
    </motion.div>
  );
}
