import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Truth — Imaginary Intelligence",
  description: "What is theatre, what is proof, and what happens to your prompt.",
};

const layers = [
  {
    name: "Theatre",
    tone: "fiction",
    yes: "Seeded sensors, racks, uptime, incidents, and the data-center visual language.",
    no: "It is not a production facility, a capacity claim, or a measurement of model quality.",
  },
  {
    name: "Proof",
    tone: "proof",
    yes: "A guarded prompt route with a stream and a route badge shown while you use it.",
    no: "It is not an account, an assistant history, or an open-ended free inference service.",
  },
  {
    name: "Reveal",
    tone: "reveal",
    yes: "The disclosure, legal language, and limitations are part of the product surface.",
    no: "There is no hidden dashboard, login wall, or claim that the fiction is infrastructure.",
  },
];

export default function TruthPage() {
  return (
    <main className="truth-page">
      <header className="truth-header">
        <Link href="/" className="status-back"><ArrowLeft size={14} /> back to facility</Link>
        <span className="truth-header-mark">II / disclosure</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">read before believing</span>
      </header>
      <section className="truth-hero">
        <span className="eyebrow text-[#e7ff49]">THE TRUTH LAYER</span>
        <h1>It looks like<br /><em>infrastructure.</em></h1>
        <p>
          That is the joke. This page is where the joke stops being coy.
        </p>
      </section>
      <section className="truth-table-wrap">
        <div className="truth-table-heading">
          <span>layer</span>
          <span>what it is</span>
          <span>what it is not</span>
        </div>
        {layers.map((layer, index) => (
          <article className={`truth-row truth-row-${layer.tone}`} key={layer.name}>
            <div className="truth-row-title"><span>0{index + 1}</span><strong>{layer.name}</strong></div>
            <p><Check size={15} /> {layer.yes}</p>
            <p><X size={15} /> {layer.no}</p>
          </article>
        ))}
      </section>
      <section className="truth-details">
        <div>
          <span className="eyebrow">the practical bit</span>
          <h2>Your prompt takes<br />the shortest route.</h2>
        </div>
        <div className="truth-details-copy">
          <p>
            The public demo accepts one short prompt, enforces a small daily
            limit, and returns a streamed response. In this build the default
            route is an edge fallback, so the badge says so. If a model provider
            is connected later, the server owns the key and the badge must tell
            the truth about that route too.
          </p>
          <p>
            We do not keep an account, message history, or user profile. Server
            logs and provider retention are controlled by the deployment and
            described in the privacy policy.
          </p>
          <Link className="text-link" href="/legal/privacy">Read the privacy policy <ArrowUpRight size={15} /></Link>
        </div>
      </section>
      <footer className="truth-footer">
        <span>no fine print behind a modal</span>
        <Link href="/">return to the theatre <ArrowUpRight size={14} /></Link>
      </footer>
    </main>
  );
}
