"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { useLanguage } from "@/components/providers/LanguageProvider";

const footerVariants = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } } };
const linkHover = { x: 3, transition: { duration: 0.15, ease: "easeOut" as const } };

export function HonestFooter() {
  const { copy } = useLanguage();
  return (
    <motion.footer className="site-footer" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={footerVariants}>
      <div><span className="eyebrow text-[#e7ff49]">{copy.footer.eyebrow}</span><p className="footer-punchline">{copy.footer.punchlineLead}<br />{copy.footer.punchlineAccent}</p></div>
      <div className="footer-links"><motion.div whileHover={linkHover}><Link href="/truth">{copy.common.truth}</Link></motion.div><motion.div whileHover={linkHover}><Link href="/status">{copy.common.status}</Link></motion.div><motion.div whileHover={linkHover}><Link href="/legal/terms">{copy.common.terms}</Link></motion.div><motion.div whileHover={linkHover}><Link href="/legal/privacy">{copy.common.privacy}</Link></motion.div></div>
      <div className="footer-meta"><span>© 2026 Imaginary Intelligence</span><span>{copy.footer.meta}</span></div>
    </motion.footer>
  );
}
