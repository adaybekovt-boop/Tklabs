"use client";

import Image from "next/image";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Cpu, Gem, Infinity as InfinityIcon, Rotate3D, ShieldCheck, Sparkles } from "lucide-react";
import { useId, useState, type PointerEvent } from "react";

import type { ClodexProfileState } from "@/lib/profile-access";
import { cn } from "@/lib/utils";

interface MembershipLabels {
  platinum: string;
  gold: string;
  administrator: string;
  member: string;
  aiAccess: string;
  unlimited: string;
  standard: string;
  clodex: string;
  active: string;
  inactive: string;
  disabled: string;
  unavailable: string;
  foundersEdition: string;
  memberEdition: string;
  founderDuo: string;
  included: string;
  flipCard: string;
  flipHint: string;
}

export function MembershipCard({
  isAdmin,
  displayName,
  email,
  avatarSrc,
  initials,
  unlimitedAi,
  clodexState,
  labels,
}: {
  isAdmin: boolean;
  displayName: string;
  email: string;
  avatarSrc?: string;
  initials: string;
  unlimitedAi: boolean;
  clodexState: ClodexProfileState;
  labels: MembershipLabels;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const hintId = useId();
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(50);
  const pointerY = useMotionValue(50);
  const rotateXSource = useTransform(pointerY, [0, 100], [8, -8]);
  const rotateYSource = useTransform(pointerX, [0, 100], [-10, 10]);
  const rotateX = useSpring(rotateXSource, { stiffness: 180, damping: 24, mass: 0.45 });
  const rotateY = useSpring(rotateYSource, { stiffness: 180, damping: 24, mass: 0.45 });
  const platinumGlare = useMotionTemplate`radial-gradient(circle at ${pointerX}% ${pointerY}%, rgba(229,236,255,.72) 0%, transparent 36%)`;
  const goldGlare = useMotionTemplate`radial-gradient(circle at ${pointerX}% ${pointerY}%, rgba(255,224,139,.68) 0%, transparent 36%)`;
  const glare = isAdmin ? platinumGlare : goldGlare;
  const tier = isAdmin ? labels.platinum : labels.gold;
  const role = isAdmin ? labels.administrator : labels.member;
  const edition = isAdmin ? labels.foundersEdition : labels.memberEdition;
  const clodex = clodexState === "active"
    ? labels.active
    : clodexState === "disabled"
      ? labels.disabled
      : clodexState === "unavailable"
        ? labels.unavailable
        : labels.inactive;

  function resetTilt() {
    pointerX.set(50);
    pointerY.set(50);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reducedMotion || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    pointerX.set(Math.max(0, Math.min(100, x)));
    pointerY.set(Math.max(0, Math.min(100, y)));
  }

  const surface = isAdmin
    ? "membership-card--platinum border-white/35 bg-[linear-gradient(135deg,#090c12_0%,#3f4856_48%,#d2d8e2_100%)] text-white shadow-[0_30px_90px_rgba(111,130,170,.34)]"
    : "membership-card--gold border-[#ffe7a5]/45 bg-[linear-gradient(135deg,#2f1b00_0%,#a66b08_50%,#f1cf77_100%)] text-white shadow-[0_30px_90px_rgba(175,116,15,.3)]";
  const faceClass = cn(
    "absolute inset-0 overflow-hidden rounded-[1.7rem] border p-4 sm:rounded-[2rem] sm:p-7",
    surface,
  );

  return (
    <article className="membership-card relative mx-auto w-full max-w-[760px] [perspective:1400px]" data-tier={isAdmin ? "platinum" : "gold"} data-profile-membership-card>
      <motion.div
        className="relative will-change-transform"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        onPointerCancel={resetTilt}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        <motion.button
          type="button"
          className="relative block aspect-[1.38/1] min-h-[250px] w-full select-none rounded-[1.7rem] text-left outline-none focus-visible:ring-4 focus-visible:ring-primary/35 sm:aspect-[1.586/1] sm:min-h-[330px] sm:rounded-[2rem]"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 150, damping: 21, mass: 0.75 }}
          style={{ transformStyle: "preserve-3d" }}
          onClick={() => setIsFlipped((current) => !current)}
          aria-label={`${labels.flipCard}: ${tier}`}
          aria-describedby={hintId}
          aria-pressed={isFlipped}
          data-testid="membership-card-flip"
        >
          <span className={faceClass} style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
            <motion.span className="pointer-events-none absolute inset-0 opacity-65" style={{ background: glare }} />
            <span className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full border border-white/25 bg-white/10 blur-2xl" />
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_15%,rgba(255,255,255,.22)_42%,transparent_66%)] opacity-60" />

            <span className="relative z-10 flex h-full flex-col justify-between gap-4 sm:gap-5">
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/30 bg-black/15 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] backdrop-blur-md sm:text-[10px] sm:tracking-[0.2em]">
                    {isAdmin ? <Sparkles size={13} /> : <Gem size={13} />}
                    <span className="truncate">{tier}</span>
                  </span>
                  <span className="mt-2 block truncate text-xs text-white/75 sm:mt-3 sm:text-sm">{edition}</span>
                </span>
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/30 bg-black/15 backdrop-blur-md sm:size-12" aria-hidden="true">
                  {isAdmin ? <Sparkles size={19} /> : <Gem size={19} />}
                </span>
              </span>

              <span className="flex items-end justify-between gap-3">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-3">
                    <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/35 bg-black/20 text-sm font-semibold backdrop-blur-md sm:size-14">
                      {avatarSrc ? (
                        <Image src={avatarSrc} alt="" fill sizes="56px" unoptimized className="object-cover" />
                      ) : initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-lg font-medium sm:text-2xl">{displayName}</span>
                      <span className="mt-1 block truncate text-[11px] text-white/70 sm:text-sm">{email}</span>
                    </span>
                  </span>
                  <span className="mt-4 flex flex-wrap gap-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-white/85 sm:mt-5 sm:gap-2 sm:text-[10px] sm:tracking-[0.12em]">
                    <span className="rounded-full border border-white/25 bg-black/10 px-2.5 py-1.5 backdrop-blur-md sm:px-3">{role}</span>
                    <span className="rounded-full border border-white/25 bg-black/10 px-2.5 py-1.5 backdrop-blur-md sm:px-3">{labels.aiAccess}: {unlimitedAi ? labels.unlimited : labels.standard}</span>
                  </span>
                </span>

                {isAdmin ? (
                  <span className="hidden shrink-0 text-right sm:block">
                    <span className="mb-2 flex justify-end -space-x-3" aria-hidden="true">
                      <span className="relative size-10 overflow-hidden rounded-full border-2 border-white/70"><Image src="/images/developers/tk.jpg" alt="" fill sizes="40px" className="object-cover" /></span>
                      <span className="relative size-10 overflow-hidden rounded-full border-2 border-white/70"><Image src="/images/developers/thomas-tm.jpg" alt="" fill sizes="40px" className="object-cover" /></span>
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75">{labels.founderDuo}</span>
                  </span>
                ) : null}
              </span>
            </span>
          </span>

          <span
            className={faceClass}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <motion.span className="pointer-events-none absolute inset-0 opacity-55" style={{ background: glare }} />
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,.22),transparent_28%)]" />

            <span className="relative z-10 flex h-full flex-col justify-between gap-3 sm:gap-5">
              <span className="flex items-center justify-between gap-4">
                <span className="min-w-0">
                  <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-white/65 sm:text-[10px] sm:tracking-[0.2em]">{tier}</span>
                  <span className="mt-1.5 block truncate font-serif text-xl sm:mt-2 sm:text-3xl">{labels.included}</span>
                </span>
                <Rotate3D size={24} aria-hidden="true" />
              </span>

              <span className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                {[
                  { icon: InfinityIcon, label: labels.aiAccess, value: unlimitedAi ? labels.unlimited : labels.standard },
                  { icon: Cpu, label: labels.clodex, value: clodex },
                  { icon: ShieldCheck, label: role, value: edition },
                ].map(({ icon: Icon, label, value }) => (
                  <span key={label} className="min-w-0 rounded-xl border border-white/22 bg-black/12 p-2 backdrop-blur-md sm:rounded-2xl sm:p-3">
                    <Icon size={16} aria-hidden="true" />
                    <span className="mt-2 block truncate text-[8px] uppercase tracking-[0.08em] text-white/65 sm:mt-3 sm:text-[10px] sm:tracking-[0.12em]">{label}</span>
                    <span className="mt-1 block truncate text-[10px] font-medium sm:text-sm">{value}</span>
                  </span>
                ))}
              </span>

              <span className="flex items-center justify-between gap-3 text-[9px] text-white/70 sm:text-[11px]">
                <span className="truncate">{isAdmin ? labels.founderDuo : labels.memberEdition}</span>
                <span className="inline-flex shrink-0 items-center gap-1.5"><Rotate3D size={13} /> {labels.flipHint}</span>
              </span>
            </span>
          </span>
        </motion.button>
      </motion.div>
      <p id={hintId} className="sr-only">{labels.flipHint}</p>
    </article>
  );
}
