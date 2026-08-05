import { getTerms, type TermsLanguage } from "@/lib/terms";

export function TermsDocument({ language }: { language: TermsLanguage }) {
  const document = getTerms(language);

  return (
    <div className="space-y-16">
      {document.sections.map((section, index) => (
        <section id={`terms-${language}-${index + 1}`} key={section.title}>
          <h2 className="headline-title mb-6">{section.title}</h2>
          <div className="space-y-5 leading-[1.8] text-on-surface-variant">
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </section>
      ))}
    </div>
  );
}
