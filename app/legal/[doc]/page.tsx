import type { Metadata } from "next";

import { LegalDocumentPage, type LegalDocument } from "@/components/site/LegalDocumentPage";

const metadataCopy = {
  terms: { title: "Условия использования", description: "Условия использования публичного сайта и демо Imaginary Intelligence." },
  privacy: { title: "Политика конфиденциальности", description: "Как обрабатываются данные на сайте и в публичном демо Imaginary Intelligence." },
} as const;

export function generateStaticParams() {
  return [{ doc: "terms" }, { doc: "privacy" }];
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await params;
  const metadata = metadataCopy[doc as LegalDocument] ?? metadataCopy.terms;
  return { title: `${metadata.title} — Imaginary Intelligence`, description: metadata.description };
}

export default async function LegalDocumentRoute({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  return <LegalDocumentPage doc={doc === "privacy" ? "privacy" : "terms"} />;
}
