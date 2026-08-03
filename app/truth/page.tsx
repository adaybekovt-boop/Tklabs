"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, X } from "lucide-react";
import { motion } from "framer-motion";

import { useLanguage } from "@/components/providers/LanguageProvider";

const rowVariants = { hidden: { opacity: 0, y: 20 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.1, ease: "easeOut" as const } }) };

export default function TruthPage() {
  const { copy } = useLanguage();
  const [detailsLead, detailsAccent] = copy.truth.detailsTitle.split("<br />");

  return (
    <main className="truth-page">
      <motion.header className="truth-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: "easeOut" as const }}>
        <Link href="/" className="status-back"><ArrowLeft size={14} /> {copy.common.backToFacility}</Link>
        <span className="truth-header-mark">{copy.truth.mark}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">{copy.truth.readBefore}</span>
      </motion.header>

      <section className="truth-hero"><motion.span className="eyebrow text-[#e7ff49]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" as const }}>{copy.truth.eyebrow}</motion.span><motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" as const }}>{copy.truth.titleLead}<br /><em>{copy.truth.titleAccent}</em></motion.h1><motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" as const }}>{copy.truth.intro}</motion.p></section>

      <section className="truth-table-wrap"><motion.div className="truth-table-heading" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.3 }}><span>{copy.truth.tableLayer}</span><span>{copy.truth.tableIs}</span><span>{copy.truth.tableIsNot}</span></motion.div>{copy.truth.layers.map((layer, index) => <motion.article className={`truth-row truth-row-${index === 0 ? "fiction" : index === 1 ? "proof" : "reveal"}`} key={layer.name} custom={index} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={rowVariants}><div className="truth-row-title"><span>0{index + 1}</span><strong>{layer.name}</strong></div><p><Check size={15} /> {layer.yes}</p><p><X size={15} /> {layer.no}</p></motion.article>)}</section>

      <motion.section className="truth-details" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } } }}>
        <div><span className="eyebrow">{copy.truth.practical}</span><h2>{detailsLead}<br />{detailsAccent}</h2></div>
        <div className="truth-details-copy"><p>{copy.truth.detailOne}</p><p>{copy.truth.detailTwo}</p><Link className="text-link" href="/legal/privacy">{copy.common.privacy} <ArrowUpRight size={15} /></Link></div>
      </motion.section>

      <motion.footer className="truth-footer" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.4 }}><span>{copy.truth.noFinePrint}</span><Link href="/">{copy.common.returnToTheatre} <ArrowUpRight size={14} /></Link></motion.footer>
    </main>
  );
}
