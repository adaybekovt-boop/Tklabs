import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, HardDrive, MessageSquareText, ScrollText, ShieldCheck } from "lucide-react";

interface MobileProfileLabels {
  account: string;
  administrator: string;
  member: string;
  aiAccess: string;
  unlimited: string;
  standard: string;
  clodex: string;
  archive: string;
  details: string;
  openChat: string;
  releases: string;
  localData: string;
}

export function MobileProfileSummary({
  displayName,
  email,
  avatarSrc,
  initials,
  isAdmin,
  unlimitedAi,
  clodexLabel,
  archiveLabel,
  labels,
}: {
  displayName: string;
  email: string;
  avatarSrc?: string;
  initials: string;
  isAdmin: boolean;
  unlimitedAi: boolean;
  clodexLabel: string;
  archiveLabel: string;
  labels: MobileProfileLabels;
}) {
  const role = isAdmin ? labels.administrator : labels.member;
  const aiAccess = unlimitedAi ? labels.unlimited : labels.standard;

  return (
    <section className="mb-8 md:hidden" aria-labelledby="mobile-profile-title" data-mobile-profile-summary>
      <article className="overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center gap-4 p-5">
          <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low text-lg font-semibold text-primary">
            {avatarSrc ? (
              <Image src={avatarSrc} alt="" fill sizes="64px" unoptimized className="object-cover" />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="label-caps text-secondary">{labels.account}</p>
            <h1 id="mobile-profile-title" className="mt-1 truncate font-serif text-[28px] leading-tight text-primary">{displayName}</h1>
            <p className="mt-1 truncate text-sm text-on-surface-variant">{email}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-low px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
            <ShieldCheck size={13} aria-hidden="true" /> {role}
          </span>
        </div>

        <div className="grid grid-cols-3 border-t border-outline-variant">
          <Link href="/playground" className="flex min-h-20 flex-col items-center justify-center gap-2 border-r border-outline-variant px-2 text-center text-[11px] font-medium text-primary">
            <MessageSquareText size={18} aria-hidden="true" />
            <span>{labels.openChat}</span>
          </Link>
          <Link href="/patch-notes" className="flex min-h-20 flex-col items-center justify-center gap-2 border-r border-outline-variant px-2 text-center text-[11px] font-medium text-primary">
            <ScrollText size={18} aria-hidden="true" />
            <span>{labels.releases}</span>
          </Link>
          <Link href="#local-data" className="flex min-h-20 flex-col items-center justify-center gap-2 px-2 text-center text-[11px] font-medium text-primary">
            <HardDrive size={18} aria-hidden="true" />
            <span>{labels.localData}</span>
          </Link>
        </div>
      </article>

      <details className="group mt-3 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-medium text-primary">
          <span>{labels.details}</span>
          <ChevronDown size={17} aria-hidden="true" className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-outline-variant px-4 py-2">
          {[
            [labels.aiAccess, aiAccess],
            [labels.clodex, clodexLabel],
            [labels.archive, archiveLabel],
          ].map(([label, value]) => (
            <div key={label} className="flex min-h-12 items-center justify-between gap-4 border-b border-outline-variant/70 py-3 last:border-b-0">
              <span className="text-sm text-on-surface-variant">{label}</span>
              <span className="max-w-[55%] text-right text-xs font-medium text-primary">{value}</span>
            </div>
          ))}
        </div>
      </details>

      <Link href="/patch-notes#release-v0-11-1" className="mt-3 flex min-h-12 items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-low px-4 text-sm text-primary">
        <span>v0.11.1 · Mobile Profile and Releases</span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
