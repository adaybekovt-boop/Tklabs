"use client";

import { ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";
import { cn } from "@/lib/utils";

const teamAvatars = [
  { initials: "JD", src: "https://res.cloudinary.com/doonkheo8/image/upload/v1770279333/a1.jpg" },
  { initials: "HJ", src: "https://res.cloudinary.com/doonkheo8/image/upload/v1770279333/a2.jpg" },
  { initials: "PI", src: "https://res.cloudinary.com/doonkheo8/image/upload/v1770279333/a3.jpg" },
  { initials: "KD", src: "https://res.cloudinary.com/doonkheo8/image/upload/v1770279333/a4.jpg" },
  { initials: "LD", src: "https://res.cloudinary.com/doonkheo8/image/upload/v1770279333/a5.jpg" },
];

function AvatarStack({ label }: { label: string }) {
  return (
    <div className="flex -space-x-3" aria-label={label}>
      {teamAvatars.map((member, index) => (
        <motion.div key={member.initials} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.08 + index * 0.06, ease: "easeOut" }} style={{ zIndex: teamAvatars.length - index }}>
          <Avatar className="size-11 border-2 border-[#e7ff49] bg-neutral-800">
            <AvatarImage alt={`${label} ${index + 1}`} src={member.src} />
            <AvatarFallback className="bg-neutral-700 font-mono text-[10px] text-white">{member.initials}</AvatarFallback>
          </Avatar>
        </motion.div>
      ))}
    </div>
  );
}

export type HeroProps = { className?: string };

export function Hero({ className }: HeroProps) {
  const { copy } = useLanguage();
  const stats = [
    { emoji: "+", label: copy.hero.statRacks, value: "4,096" },
    { emoji: "~", label: copy.hero.statUptime, value: "99.97%" },
    { emoji: "$", label: copy.hero.statCost, value: "$0.00019" },
  ];

  return (
    <section id="home" className={cn("relative flex min-h-[100dvh] w-full flex-col items-start justify-end overflow-hidden bg-[#0a0b0d] pt-24", className)}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?auto=format&fit=crop&w=2400&q=85)" }} aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(8,10,12,.96)_0%,rgba(8,10,12,.64)_45%,rgba(8,10,12,.48)_100%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(231,255,73,.11)_1px,transparent_1px),linear-gradient(90deg,rgba(231,255,73,.11)_1px,transparent_1px)] [background-size:5rem_5rem] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl px-4 text-white sm:px-8 lg:px-16">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}>
          <AvatarStack label={copy.hero.operators} />
          <Marquee aria-label={copy.hero.metrics} className="border-y border-white/15 bg-black/35 py-2 backdrop-blur-sm [--duration:32s] [--gap:2rem]" pauseOnHover repeat={4}>
            {stats.map((stat) => <div className="flex items-center gap-3 whitespace-nowrap" key={stat.label}><span className="font-mono text-sm font-bold tracking-wide text-[#e7ff49]">{stat.value}</span><span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-white/70">{stat.label}</span><span className="text-base text-[#ff6a3d]">{stat.emoji}</span></div>)}
          </Marquee>
        </motion.div>
      </div>

      <div className="relative z-10 w-full px-4 pb-14 pt-16 sm:px-8 sm:pb-20 lg:px-16 lg:pb-28">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
          <div className="w-full space-y-6 sm:w-[58%]">
            <motion.p className="eyebrow text-[#e7ff49]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}>{copy.hero.eyebrow}</motion.p>
            <motion.h1 className="max-w-4xl font-display text-5xl leading-[0.92] tracking-[-0.06em] text-white sm:text-6xl md:text-7xl lg:text-[7.5rem]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.25, ease: "easeOut" }}>
              {copy.hero.titleLead}<br /><span className="text-[#e7ff49]">{copy.hero.titleAccent}</span> {copy.hero.titleEnd}
            </motion.h1>
            <motion.div className="flex flex-wrap items-center gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}>
              <motion.span whileTap={{ scale: 0.97 }} className="inline-flex"><Button className="rounded-none py-0 pr-0 font-normal text-sm" onClick={() => document.getElementById("proof")?.scrollIntoView({ behavior: "smooth" })}>{copy.hero.action}<span className="border-l border-neutral-500 p-3"><ArrowDownRight aria-hidden="true" /></span></Button></motion.span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">{copy.hero.note}</span>
            </motion.div>
          </div>
          <motion.div className="w-full sm:w-[42%]" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.6, ease: "easeOut" }}><p className="max-w-md text-base italic text-[#e7ff49] sm:ml-auto sm:text-right md:text-2xl">{copy.hero.quote}</p></motion.div>
        </div>
      </div>
      <motion.div className="absolute bottom-6 right-5 z-10 hidden items-center gap-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/50 md:flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1, ease: "easeOut" }}><span className="status-dot" /> {copy.hero.scroll}</motion.div>
    </section>
  );
}

export const Component = Hero;
export default Hero;
