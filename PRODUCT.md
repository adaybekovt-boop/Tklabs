# TK Labs workspace

One active request, its observed actions, sources and editable output belong to the same work surface. Typing into the conversation remains the default; tasks and revisions use that executor. The history rail is quiet, while the contextual canvas opens the evidence or file needed for the current task. RU/EN and light/dark use the existing visual system. The interface never labels inferred stages as real tool execution and never exposes hidden reasoning.

---

## Public homepage contract

# Erma homepage product contract

Erma is TK Labs' local-first AI workspace for conversations, tools, attached documents, projects, and versioned artifacts. This is a product entrance, not a studio services page.

## Audience and job
A person comparing information and turning an AI conversation into material they can revisit. They need to understand where the answer came from and retain earlier work. The homepage's job is to demonstrate one task, then open Erma.

The first viewport says Erma is an AI workspace, shows a concrete comparison request, and offers **Open Erma**. The link is `/playground`: its existing server auth boundary redirects unauthenticated visitors to `/login`; Google OAuth returns to the workspace. No new auth flow.

## Verified product material
- `lib/models/public.ts`: Auto and three current public names: **Erma Celer, Erma Nova, Erma Optima**. Older copy says Lite/Core/Pro; use current catalog names and fast/balanced/deeper roles. Auto selection is routing, not three models debating.
- `lib/models/server.ts`: server selection considers task complexity and the cognitive router. The current selector intentionally excludes client effort toggles. Provider routes remain server-side. The example's selected catalog key comes from this actual server selector, not the older public helper.
- `lib/ai/tools/registry.ts` and `executor.ts`: documentation, release notes, model capabilities, and bounded read operations. The film uses `search_documentation`; no invented shell, arbitrary URL fetch, or hidden reasoning.
- `components/playground/ErmaNovaWorkspace.tsx` opens the shared PlaygroundChat: conversation, history rail and contextual Activity, Context, Task and Files canvas. Mobile context uses a sheet.
- `lib/local-archive.ts`: local conversations, project labels, branches with parent/message references, answer versions.
- `lib/artifacts/types.ts` / `local-store.ts`: local documents, plans, tables, code, JSON/CSV and version snapshots.
- `lib/product-facts.ts`: local archive is default, not an automatic server backup. Optional Sync creates a server-held snapshot encrypted at rest, not end-to-end encryption. Prompts and sent attachments leave the device for model processing.
- `getCurrentRelease(locale)`: version, date, release title and changes are live repository content, not marketing inventions.

## Demonstration
One illustrative walkthrough: compare local archive with Workspace Sync, consult documentation, produce a checklist, then revise it. It makes no model request and never presents scripted content as a live generated response. Actual tools and storage rules provide the substance. Version controls in the walkthrough change the displayed example locally; they do not write to the user's real archive.

## Language and anti-references
Preserve the existing Russian default and English cookie choice. Both scripts receive native font subsets and deliberate line breaks. No invented city, audience metrics, prices, clients, testimonials or benchmarks.

Reject the generic chatbot landing (orb + centered promise), agency portfolio (services + sales CTA), and cream/serif AI clone (editorial mood in place of product behavior). No pricing grid, logos strip, fake reasoning transcript, or generic feature cards. The distinctive domain artifact is this product's documented local/archive/Sync comparison, carried through its actual workspace terminology.
