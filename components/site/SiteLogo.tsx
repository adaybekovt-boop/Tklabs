import Image from "next/image";

import { cn } from "@/lib/utils";

export function SiteLogo({ showWordmark = true, className }: { showWordmark?: boolean; className?: string }) {
  return (
    <span className={cn("site-logo inline-flex items-center gap-3", className)}>
      <span className="site-logo-mark grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 bg-black p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.14)]">
        <Image src="/images/brand/tk-logo.png" alt="" width={44} height={38} className="size-full object-contain" priority />
      </span>
      {showWordmark && <span className="font-serif text-[26px] leading-none tracking-[-0.04em]">TK LAB</span>}
    </span>
  );
}
