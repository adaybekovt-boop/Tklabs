"use client";

import { motion } from "framer-motion";

import { useLanguage } from "@/components/providers/LanguageProvider";

const racks = [
  { id: "A-01", load: "71%", tone: "lime" },
  { id: "A-02", load: "64%", tone: "blue" },
  { id: "B-01", load: "89%", tone: "orange" },
  { id: "B-02", load: "52%", tone: "lime" },
  { id: "C-01", load: "77%", tone: "blue" },
  { id: "C-02", load: "44%", tone: "white" },
];

const rackVariants = { hidden: { opacity: 0, y: 60 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: 0.3 + i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] as const } }) };
const ambientPulse = { animate: { scale: [1, 1.06, 1], opacity: [0.23, 0.32, 0.23], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const } } };

export function FacilityScene() {
  const { copy } = useLanguage();
  return (
    <motion.div className="facility-scene" aria-label={copy.facility.aria} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
      <div className="facility-scanline" aria-hidden="true" />
      <motion.div className="facility-ambient facility-ambient-one" aria-hidden="true" variants={ambientPulse} animate="animate" />
      <motion.div className="facility-ambient facility-ambient-two" aria-hidden="true" variants={ambientPulse} animate="animate" />
      <div className="facility-ceiling" aria-hidden="true"><span /><span /><span /><span /></div>
      <div className="facility-floor" aria-hidden="true" />
      <div className="rack-line">
        {racks.map((rack, index) => (
          <motion.article className={`server-rack rack-${rack.tone}`} key={rack.id} custom={index} variants={rackVariants} whileHover={{ scale: 1.02, borderColor: "rgba(231,255,73,0.55)", transition: { duration: 0.2 } }}>
            <div className="rack-header"><span>{rack.id}</span><span>{copy.facility.live}</span></div>
            <div className="rack-body">{Array.from({ length: 7 }, (_, row) => <div className="server-row" key={row}><span className="server-led" /><span className="server-slot" /><span className="server-slot short" /></div>)}</div>
            <div className="rack-footer"><span>{copy.facility.load}</span><strong>{rack.load}</strong></div>
            <span className="rack-reflection" aria-hidden="true" /><span className="rack-index" aria-hidden="true">0{index + 1}</span>
          </motion.article>
        ))}
      </div>
      <div className="facility-caption"><span>{copy.facility.hall}</span><span>{copy.facility.visualOnly}</span></div>
    </motion.div>
  );
}
