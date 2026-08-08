import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  Bot,
  DatabaseBackup,
  HardDrive,
  MessageSquareText,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface MobileProfileLabels {
  account: string;
  administrator: string;
  member: string;
  aiAccess: string;
  unlimited: string;
  standard: string;
  clodex: string;
  archive: string;
  openChat: string;
  releases: string;
  localData: string;
  vault: string;
  currentRelease: string;
  profileStatus: string;
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
  releaseVersion,
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
  releaseVersion: string;
  labels: MobileProfileLabels;
}) {
  const role = isAdmin ? labels.administrator : labels.member;
  const aiAccess = unlimitedAi ? labels.unlimited : labels.standard;
  const statusItems = [
    { label: labels.aiAccess, value: aiAccess, icon: Bot },
    { label: labels.clodex, value: clodexLabel, icon: Sparkles },
    { label: labels.archive, value: archiveLabel, icon: Archive },
    { label: labels.profileStatus, value: role, icon: ShieldCheck },
  ];
  const actions = [
    { href: "/playground", label: labels.openChat, icon: MessageSquareText },
    { href: "/vault", label: labels.vault, icon: DatabaseBackup },
    { href: "/patch-notes", label: labels.releases, icon: ScrollText },
    { href: "#local-data", label: labels.localData, icon: HardDrive },
  ];

  return (
    <section className="mb-8 md:hidden" aria-labelledby="mobile-profile-title" data-mobile-profile-summary>
      <article className="relative overflow-hidden rounded-[2rem] border border-outline-variant bg-surface-container-lowest shadow-[0_24px_70px_rgba(15,23,42,.08)]" data-profile-visual-hero>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_15%_20%,rgba(123,97,255,.2),transparent_42%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,.18),transparent_38%)]" />
        <div className="pointer-events-none absolute -right-14 top-7 size-36 rounded-full border border-primary/10" />
        <div className="pointer-events-none absolute -right-7 top-14 size-20 rounded-full border border-primary/10" />

        <div className="relative p-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="relative grid size-[4.75rem] place-items-center overflow-hidden rounded-[1.65rem] border border-white/60 bg-surface-container-low text-xl font-semibold text-primary shadow-[0_14px_35px_rgba(15,23,42,.16)]">
                {avatarSrc ? (
                  <Image src={avatarSrc} alt="" fill sizes="76px" unoptimized className="object-cover" />
                ) : (
                  <span aria-hidden="true">{initials}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-2 border-surface-container-lowest bg-primary text-on-primary" aria-hidden="true">
                <ShieldCheck size={14} />
              </span>
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="label-caps text-secondary">{labels.account}</p>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/8 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-primary">
                  <Sparkles size={11} aria-hidden="true" /> {labels.currentRelease} {releaseVersion}
                </span>
              </div>
              <h1 id="mobile-profile-title" className="mt-2 truncate font-serif text-[30px] leading-[1.05] text-primary">{displayName}</h1>
              <p className="mt-2 truncate text-sm text-on-surface-variant">{email}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface/75 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary backdrop-blur-md">
                <ShieldCheck size={13} aria-hidden="true" /> {role}
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2" data-profile-status-grid>
            {statusItems.map(({ label, value, icon: Icon }) => (
              <div key={label} className="min-w-0 rounded-2xl border border-outline-variant bg-surface/80 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-secondary">
                  <Icon size={14} aria-hidden="true" />
                  <span className="truncate text-[9px] font-semibold uppercase tracking-[0.1em]">{label}</span>
                </div>
                <p className="mt-2 truncate text-sm font-medium text-primary">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </article>

      <div className="mt-3 grid grid-cols-2 gap-2" data-profile-action-grid>
        {actions.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-[5rem] items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 transition-[transform,border-color,box-shadow] duration-200 active:scale-[.98]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-container-low text-primary">
                <Icon size={18} aria-hidden="true" />
              </span>
              <p className="truncate text-sm font-semibold text-primary">{label}</p>
            </div>
            <ArrowUpRight size={16} aria-hidden="true" className="shrink-0 text-secondary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}
