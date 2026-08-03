"use client";

import { ArrowDownRight } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";

const teamAvatars = [
  {
    initials: "JD",
    src: "https://res.cloudinary.com/doonkheo8/image/upload/v1770279333/a1.jpg",
  },
  {
    initials: "HJ",
    src: "https://res.cloudinary.com/doonkheo8/image/upload/v1770279333/a2.jpg",
  },
  {
    initials: "PI",
    src: "https://res.cloudinary.com/doonkheo8/image/upload/v1770279333/a3.jpg",
  },
  {
    initials: "KD",
    src: "https://res.cloudinary.com/doonkheo8/image/upload/v1770279333/a4.jpg",
  },
  {
    initials: "LD",
    src: "https://res.cloudinary.com/doonkheo8/image/upload/v1770279333/a5.jpg",
  },
];

const stats = [
  { emoji: "◌", label: "RACKS SIMULATED", value: "4,096" },
  { emoji: "⌁", label: "UPTIME (ALLEGED)", value: "99.97%" },
  { emoji: "¢", label: "COST PER DELUSION", value: "$0.00019" },
];

function AvatarStack() {
  return (
    <div className="flex -space-x-3" aria-label="Facility operators on call">
      {teamAvatars.map((member, index) => (
        <Avatar
          className="size-11 border-2 border-[#e7ff49] bg-neutral-800"
          key={member.initials}
          style={{ zIndex: teamAvatars.length - index }}
        >
          <AvatarImage alt={`Facility operator ${index + 1}`} src={member.src} />
          <AvatarFallback className="bg-neutral-700 font-mono text-[10px] text-white">
            {member.initials}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}

function StatsMarquee() {
  return (
    <Marquee
      aria-label="Facility metrics"
      className="border-y border-white/15 bg-black/35 py-2 backdrop-blur-sm [--duration:32s] [--gap:2rem]"
      pauseOnHover
      repeat={4}
    >
      {stats.map((stat) => (
        <div className="flex items-center gap-3 whitespace-nowrap" key={stat.label}>
          <span className="font-mono text-sm font-bold tracking-wide text-[#e7ff49]">
            {stat.value}
          </span>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-white/70">
            {stat.label}
          </span>
          <span className="text-base text-[#ff6a3d]">{stat.emoji}</span>
        </div>
      ))}
    </Marquee>
  );
}

export default function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] w-full flex-col items-start justify-end overflow-hidden bg-[#0a0b0d] pt-24">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?auto=format&fit=crop&w=2400&q=85)",
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(8,10,12,.96)_0%,rgba(8,10,12,.64)_45%,rgba(8,10,12,.48)_100%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(231,255,73,.11)_1px,transparent_1px),linear-gradient(90deg,rgba(231,255,73,.11)_1px,transparent_1px)] [background-size:5rem_5rem] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl px-4 text-white sm:px-8 lg:px-16">
        <div className="space-y-4">
          <AvatarStack />
          <StatsMarquee />
        </div>
      </div>

      <div className="relative z-10 w-full px-4 pb-14 pt-16 sm:px-8 sm:pb-20 lg:px-16 lg:pb-28">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
          <div className="w-full space-y-6 sm:w-[58%]">
            <p className="eyebrow text-[#e7ff49]">01 / IMAGINARY INTELLIGENCE FACILITY</p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.92] tracking-[-0.06em] text-white sm:text-6xl md:text-7xl lg:text-[7.5rem]">
              The future is
              <br />
              <span className="text-[#e7ff49]">running</span> on vibes.
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="rounded-none py-0 pr-0 font-normal text-sm"
                onClick={() => document.getElementById("proof")?.scrollIntoView({ behavior: "smooth" })}
              >
                Test the promise
                <span className="border-l border-neutral-500 p-3">
                  <ArrowDownRight aria-hidden="true" />
                </span>
              </Button>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                no login · one prompt · no promises
              </span>
            </div>
          </div>
          <div className="w-full sm:w-[42%]">
            <p className="max-w-md text-base italic text-[#e7ff49] sm:ml-auto sm:text-right md:text-2xl">
              We built a data center for the part of your roadmap that is still
              just a moodboard. Come for the spectacle. Stay for the honest
              footnote.
            </p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 right-5 z-10 hidden items-center gap-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/50 md:flex">
        <span className="status-dot" /> scroll to inspect the machinery
      </div>
    </section>
  );
}
