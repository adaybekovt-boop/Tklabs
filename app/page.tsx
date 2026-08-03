import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, ScanLine } from "lucide-react";

import { Demo } from "@/components/ui/demo";
import { FacilityScene } from "@/components/site/FacilityScene";
import { HonestFooter } from "@/components/site/HonestFooter";
import Hero from "@/components/site/Hero";
import { SiteNav } from "@/components/site/SiteNav";
import { TelemetryWall } from "@/components/site/TelemetryWall";

export const metadata: Metadata = {
  title: "Imaginary Intelligence — the facility is mostly real",
  description:
    "A satirical AI facility with fictional telemetry, a real disclosure, and one guarded prompt.",
};

export default function Home() {
  return (
    <main className="brand-site">
      <SiteNav />
      <Hero />

      <section className="facility-section site-section" id="facility">
        <div className="section-heading page-grid">
          <div>
            <span className="eyebrow text-[#e7ff49]">02 / FACILITY</span>
            <h2>Welcome to the<br /><em>infrastructure.</em></h2>
          </div>
          <div className="section-heading-copy">
            <p>
              A convincing room is half the pitch. Walk the north wall, count
              the lights, and try not to ask what any of it is actually doing.
            </p>
            <div className="section-note"><ScanLine size={15} /> theatre layer / visual only</div>
          </div>
        </div>
        <FacilityScene />
        <div className="facility-scroll-note">
          <ArrowDown size={14} aria-hidden="true" /> pinned facility pass / 128 racks
        </div>
      </section>

      <section className="telemetry-section site-section" id="telemetry">
        <TelemetryWall />
      </section>

      <section className="proof-section site-section" id="proof">
        <Demo />
      </section>

      <section className="reveal-section site-section" id="reveal">
        <div className="reveal-mark" aria-hidden="true">TRUTH</div>
        <div className="reveal-copy page-grid">
          <div>
            <span className="eyebrow text-[#e7ff49]">05 / REVEAL</span>
            <h2>The trick is<br /><em>in the footnote.</em></h2>
          </div>
          <div className="reveal-copy-body">
            <p>
              The server hall is theatre: a seeded visual system designed to
              make a fake data center feel internally consistent. The prompt
              route is proof: small, rate-limited, and labeled at the moment
              you use it.
            </p>
            <a className="text-link" href="/truth">
              Read the complete disclosure <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <HonestFooter />
    </main>
  );
}
