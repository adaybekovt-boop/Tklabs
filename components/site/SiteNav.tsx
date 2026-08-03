import Link from "next/link";
import { Activity, ArrowUpRight, Eye } from "lucide-react";

export function SiteNav() {
  return (
    <header className="site-nav">
      <Link className="brand-lockup" href="/" aria-label="Imaginary Intelligence home">
        <span className="brand-mark" aria-hidden="true">
          II
        </span>
        <span>
          <strong>IMAGINARY</strong>
          <small>INTELLIGENCE / FACILITY</small>
        </span>
      </Link>
      <nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">
        <Link href="/#facility">facility</Link>
        <Link href="/#telemetry">telemetry</Link>
        <Link href="/#proof">proof</Link>
        <Link href="/status" className="nav-status">
          <Activity size={13} aria-hidden="true" /> status
        </Link>
      </nav>
      <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/50">
        <span className="hidden items-center gap-1.5 sm:flex">
          <Eye size={12} aria-hidden="true" /> public preview
        </span>
        <Link className="nav-truth" href="/truth">
          truth <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
