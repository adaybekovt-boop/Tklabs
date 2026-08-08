import { getLegalDocument, type LegalDocumentSlug, CURRENT_LEGAL_BUNDLE_VERSION } from "@/lib/legal-documents";
import { getReleaseHistory } from "@/lib/latest-release";
import { PRODUCT_DATA_ROUTES, PRODUCT_FACTS, PRODUCT_FACTS_VERSION, PRODUCT_POSITIONING } from "@/lib/product-facts";
import { CURRENT_TERMS_VERSION, terms } from "@/lib/terms";

type Locale = "ru" | "en";
export type TkLabKnowledgeKind = "terms" | "legal" | "product" | "release";
export type TkLabKnowledgeEntry = {
  id: string;
  kind: TkLabKnowledgeKind;
  title: string;
  text: string;
  href: string;
  version: string;
};

const LEGAL_SLUGS: readonly LegalDocumentSlug[] = ["privacy", "acceptable-use", "ai-transparency", "subprocessors", "security"];

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}.+-]+/gu, " ").replace(/\s+/g, " ").trim();
}

function queryTerms(query: string) {
  return normalize(query).split(" ").filter((value) => value.length > 1).slice(0, 20);
}

function score(entry: TkLabKnowledgeEntry, query: string) {
  const terms = queryTerms(query);
  if (!terms.length) return 1;
  const haystack = normalize(`${entry.id} ${entry.kind} ${entry.title} ${entry.text}`);
  return terms.reduce((total, term) => total + (haystack.includes(term) ? (entry.title.toLocaleLowerCase().includes(term) ? 5 : 2) : 0), 0);
}

function termsEntries(locale: Locale): TkLabKnowledgeEntry[] {
  const content = terms[locale];
  return content.sections.map((section, index) => ({
    id: `terms:${index + 1}`,
    kind: "terms",
    title: section.title,
    text: section.paragraphs.join("\n"),
    href: "/legal/terms",
    version: CURRENT_TERMS_VERSION,
  }));
}

function legalEntries(locale: Locale): TkLabKnowledgeEntry[] {
  return LEGAL_SLUGS.flatMap((slug) => {
    const document = getLegalDocument(locale, slug);
    return document.sections.map((section, index) => ({
      id: `legal:${slug}:${index + 1}`,
      kind: "legal" as const,
      title: `${document.title} — ${section.title}`,
      text: section.paragraphs.join("\n"),
      href: `/legal/${slug}`,
      version: document.version,
    }));
  });
}

function productEntries(locale: Locale): TkLabKnowledgeEntry[] {
  const productSummary = locale === "ru"
    ? `Позиционирование: ${PRODUCT_POSITIONING.ru}. Режимы хранения: ${PRODUCT_FACTS.storageModes.join(", ")}. Local archive по умолчанию: ${PRODUCT_FACTS.localArchive.default}; server backup: ${PRODUCT_FACTS.localArchive.serverBackup}. Workspace Sync optional=${PRODUCT_FACTS.workspaceSync.optional}, automatic=${PRODUCT_FACTS.workspaceSync.automatic}, encryption=${PRODUCT_FACTS.workspaceSync.encryption}, end-to-end=${PRODUCT_FACTS.workspaceSync.endToEndEncrypted}. Для AI generation требуется внешний provider; prompt leaves device=${PRODUCT_FACTS.providerProcessing.promptLeavesDevice}. Файлы: ${PRODUCT_FACTS.files.accepted.join(", ")}.`
    : `Positioning: ${PRODUCT_POSITIONING.en}. Storage modes: ${PRODUCT_FACTS.storageModes.join(", ")}. Local archive default: ${PRODUCT_FACTS.localArchive.default}; server backup: ${PRODUCT_FACTS.localArchive.serverBackup}. Workspace Sync optional=${PRODUCT_FACTS.workspaceSync.optional}, automatic=${PRODUCT_FACTS.workspaceSync.automatic}, encryption=${PRODUCT_FACTS.workspaceSync.encryption}, end-to-end=${PRODUCT_FACTS.workspaceSync.endToEndEncrypted}. AI generation requires an external provider; prompt leaves device=${PRODUCT_FACTS.providerProcessing.promptLeavesDevice}. Files: ${PRODUCT_FACTS.files.accepted.join(", ")}.`;
  const routes = PRODUCT_DATA_ROUTES.map((route) => `${route.id}: ${route.route.join(" → ")} — ${route.note[locale]}`).join("\n");
  return [
    { id: "product:facts", kind: "product", title: locale === "ru" ? "Факты о продукте TK LAB" : "TK LAB product facts", text: productSummary, href: "/truth", version: PRODUCT_FACTS_VERSION },
    { id: "product:data-routes", kind: "product", title: locale === "ru" ? "Маршруты данных TK LAB" : "TK LAB data routes", text: routes, href: "/truth", version: PRODUCT_FACTS_VERSION },
  ];
}

function releaseEntries(locale: Locale): TkLabKnowledgeEntry[] {
  return getReleaseHistory(locale).map((release) => ({
    id: `release:${release.version.toLowerCase()}`,
    kind: "release",
    title: `${release.version} — ${release.title}`,
    text: `${release.summary}\n${release.changes.join("\n")}`,
    href: `/patch-notes#${release.version}`,
    version: release.version,
  }));
}

export function getTkLabKnowledgeIndex(locale: Locale) {
  return [...termsEntries(locale), ...legalEntries(locale), ...productEntries(locale), ...releaseEntries(locale)];
}

export function searchTkLabKnowledge(locale: Locale, query: string, kinds: readonly TkLabKnowledgeKind[] = [], limit = 5) {
  const allowedKinds = new Set(kinds);
  return getTkLabKnowledgeIndex(locale)
    .filter((entry) => allowedKinds.size === 0 || allowedKinds.has(entry.kind))
    .map((entry) => ({ entry, score: score(entry, query) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Math.min(8, limit)))
    .map(({ entry }) => entry);
}

export function tkLabKnowledgeVersions() {
  return {
    terms: CURRENT_TERMS_VERSION,
    legalBundle: CURRENT_LEGAL_BUNDLE_VERSION,
    productFacts: PRODUCT_FACTS_VERSION,
  } as const;
}
