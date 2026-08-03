import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

const documents = {
  terms: {
    title: "Terms of Service",
    intro: "These terms govern your use of the Imaginary Intelligence public website and demo.",
    sections: [
      ["1. The service", "The website is a marketing and demonstration site. Parts of the interface intentionally present fictional infrastructure as theatre. We do not promise that the fictional facility, its telemetry, or its incidents correspond to a real data center."],
      ["2. Demo use", "The public demo is provided for limited evaluation. You may submit short, lawful prompts. We may limit, pause, or disable the demo to protect the service and its cost ceiling."],
      ["3. Acceptable use", "Do not submit personal data, confidential information, unlawful content, malware, credentials, or prompts intended to disrupt the service. Do not attempt to bypass rate limits or access controls."],
      ["4. No warranty", "The website and demo are provided as-is. We make no warranty about availability, accuracy, fitness for a particular purpose, or the usefulness of any generated response."],
      ["5. Changes", "We may change or discontinue any part of the website. The current version of these terms is published at this route."],
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "This policy explains what information may be processed when you visit the website or use the demo.",
    sections: [
      ["1. Information you submit", "If you use the demo, we process the prompt you submit in order to generate and stream a response. Do not submit personal data, sensitive information, or confidential material."],
      ["2. Network information", "The hosting platform may receive standard request information such as IP address, user agent, timestamps, and security headers. This information may be used for rate limiting, abuse prevention, diagnostics, and service security."],
      ["3. Providers and transfers", "If a model provider is connected to the demo, prompts may be processed by that provider in the regions it operates, which may include the United States and China. Provider retention, transfer, and deletion practices apply to that processing. The current fallback route does not send prompts to an external model provider."],
      ["4. Retention", "We do not create user accounts or a message history. Operational logs may be retained for a limited period needed for security, troubleshooting, and legal obligations. Exact retention can vary by hosting and provider configuration."],
      ["5. Your choices", "Do not use the demo if you do not agree to this processing. For privacy questions or requests, contact the operator of the deployment using the contact details supplied with the published site."],
    ],
  },
} as const;

type LegalDocument = keyof typeof documents;

export function generateStaticParams() {
  return [{ doc: "terms" }, { doc: "privacy" }];
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await params;
  const document = documents[doc as LegalDocument] ?? documents.terms;
  return { title: `${document.title} — Imaginary Intelligence`, description: document.intro };
}

export default async function LegalDocumentPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const document = documents[doc as LegalDocument] ?? documents.terms;

  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/" className="status-back"><ArrowLeft size={14} /> back to facility</Link>
        <span className="truth-header-mark">II / legal</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">last revised 2026-01-18</span>
      </header>
      <article className="legal-document">
        <span className="eyebrow text-[#e7ff49]">LEGAL / {doc}</span>
        <h1>{document.title}</h1>
        <p className="legal-intro">{document.intro}</p>
        {document.sections.map(([heading, body]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
      </article>
      <footer className="legal-footer">
        <Link href="/truth">Read the disclosure</Link>
        <Link href="/">Return to facility</Link>
      </footer>
    </main>
  );
}
