import type { ClodexProfileState } from "@/lib/profile-access";
import { cn } from "@/lib/utils";

export function MembershipCard({
  isAdmin,
  displayName,
  email,
  unlimitedAi,
  clodexState,
  labels,
}: {
  isAdmin: boolean;
  displayName: string;
  email: string;
  unlimitedAi: boolean;
  clodexState: ClodexProfileState;
  labels: {
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
  };
}) {
  const tier = isAdmin ? labels.platinum : labels.gold;
  const role = isAdmin ? labels.administrator : labels.member;
  const clodex = clodexState === "active" ? labels.active : clodexState === "disabled" ? labels.disabled : clodexState === "unavailable" ? labels.unavailable : labels.inactive;
  return (
    <article className={cn("membership-card relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_24px_70px_color-mix(in_srgb,var(--color-primary)_8%,transparent)] sm:p-8", isAdmin ? "membership-card--platinum" : "membership-card--gold")}>
      <div className="relative z-10 flex min-h-48 flex-col justify-between gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-caps opacity-70">TK LABS · {tier}</p>
            <p className="mt-3 font-serif text-2xl">{role}</p>
          </div>
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl border border-current/20 font-serif text-sm">TK</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-medium">{displayName}</p>
          <p className="mt-1 truncate text-sm opacity-75">{email}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
            <span className="rounded-full border border-current/20 px-3 py-1.5">{labels.aiAccess}: {unlimitedAi ? labels.unlimited : labels.standard}</span>
            <span className="rounded-full border border-current/20 px-3 py-1.5">{labels.clodex}: {clodex}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
