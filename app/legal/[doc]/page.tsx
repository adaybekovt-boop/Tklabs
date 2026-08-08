import { notFound } from "next/navigation";

import { TermsDocument } from "@/components/legal/TermsDocument";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getDictionary } from "@/lib/i18n";
import { getLegalDocument, getPublicOperatorCard, isLegalDocumentSlug } from "@/lib/legal-documents";
import { getLocale } from "@/lib/locale";
import { getAcceptableUseDocument } from "@/lib/policy-registry";
import { getTerms } from "@/lib/terms";

type LegacyDocKey = "api";
export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params; const locale = await getLocale(); const text = getDictionary(locale);
  if (doc === "terms") { const terms = getTerms(locale); return <><StitchHeader /><main className="stitch-container py-section-gap"><header className="mb-section-gap border-b border-primary pb-8"><p className="label-caps mb-7 text-secondary">{terms.label}</p><h1 className="display-title">{terms.title}</h1><p className="mt-6 max-w-2xl text-[18px] leading-[1.6] text-on-surface-variant">{terms.intro}</p></header><TermsDocument language={locale} /></main><StitchFooter /></>; }
  if (doc === "api") { const document = text.legal[doc as LegacyDocKey]; return <><StitchHeader /><main className="stitch-container py-section-gap"><header className="mb-section-gap border-b border-primary pb-8"><p className="label-caps mb-7 text-secondary">{document.label}</p><h1 className="display-title">{document.title}</h1><p className="mt-6 max-w-2xl text-[18px] leading-[1.6] text-on-surface-variant">{document.intro}</p></header><article className="space-y-12">{document.sections.map(([title, paragraph, detail]) => <section key={title} id={title}><h2 className="headline-title mb-5">{title}</h2><div className="space-y-4 leading-[1.8] text-on-surface-variant"><p>{paragraph}</p><p>{detail}</p></div></section>)}</article></main><StitchFooter /></>; }
  if (!isLegalDocumentSlug(doc)) notFound();
  const document = doc === "acceptable-use" ? getAcceptableUseDocument(locale) : getLegalDocument(locale, doc); const operator = getPublicOperatorCard();
  return <><StitchHeader /><main className="stitch-container py-section-gap"><header className="mb-12 border-b border-primary pb-8"><p className="label-caps mb-7 text-secondary">{document.label} / {document.version}</p><h1 className="display-title">{document.title}</h1><p className="mt-6 max-w-3xl text-[18px] leading-[1.6] text-on-surface-variant">{document.intro}</p></header><div className="mb-16 grid gap-4 border border-outline-variant p-5 text-[13px] sm:grid-cols-3"><div><span className="label-caps text-secondary">Operator</span><p className="mt-2">{operator.name}</p></div><div><span className="label-caps text-secondary">Contact</span><p className="mt-2 break-words">{operator.contact}</p></div><div><span className="label-caps text-secondary">Jurisdiction</span><p className="mt-2">{operator.jurisdiction}</p></div></div><article className="grid gap-12 md:grid-cols-12"><aside className="md:col-span-3"><nav className="sticky top-28 flex flex-col gap-4 text-[13px] text-secondary"><span className="label-caps mb-3 text-primary">{text.legal.contents}</span>{document.sections.map((section, index) => <a key={section.title} href={`#section-${index + 1}`}>{section.title}</a>)}</nav></aside><div className="space-y-16 md:col-span-7 md:col-start-5">{document.sections.map((section, index) => <section id={`section-${index + 1}`} key={section.title}><h2 className="headline-title mb-6">{section.title}</h2><div className="space-y-5 leading-[1.8] text-on-surface-variant">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>)}</div></article></main><StitchFooter /></>;
}
