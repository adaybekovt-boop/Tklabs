import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("production deployment and browser capabilities match the current app", async () => {
  const workflow = await text(".github/workflows/deploy-cloudflare.yml");
  const nextConfig = await text("next.config.ts");
  const viteConfig = await text("vite.config.ts");
  const packageJson = JSON.parse(await text("package.json"));
  const tsconfig = await text("tsconfig.json");
  const workerTypes = await text("types/cloudflare-workers-runtime.d.ts");
  const securityHeaders = await import(new URL("lib/security-headers.mjs", root));

  assert.match(workflow, /push:/);
  assert.match(workflow, /- main/);
  assert.doesNotMatch(workflow, /workflow_run/);
  assert.match(workflow, /Normalize Cloudflare deployment credentials/);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
  assert.match(workflow, /concurrency:/);
  assert.match(workflow, /AUTH_URL: https:\/\/tklabs\.uk/);
  assert.match(workflow, /AUTH_TRUST_HOST: "true"/);
  assert.doesNotMatch(workflow, /TKLABS_LOCAL_PREVIEW|NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW/);
  assert.match(viteConfig, /configuredAuthUrl/);
  assert.match(viteConfig, /AUTH_TRUST_HOST/);
  assert.equal(securityHeaders.SECURITY_HEADERS.find((header) => header.key === "Permissions-Policy")?.value, "camera=(), microphone=(self), geolocation=(), payment=()");
  assert.doesNotMatch(nextConfig, /microphone=\(\)/);
  assert.match(packageJson.scripts.test, /test:unit/);
  assert.match(packageJson.scripts["test:integration"], /--test/);
  assert.doesNotMatch(tsconfig, /cloudflare:workers/);
  assert.match(workerTypes, /declare module "cloudflare:workers"/);
});

test("status page uses live health checks", async () => {
  const route = await text("app/api/status/route.ts");
  const worker = await text("worker/health-status.ts");
  const page = await text("app/status/page.tsx");
  const board = await text("components/status/StatusBoard.tsx");

  assert.match(route, /HEALTH_STATUS/);
  assert.match(worker, /PROVIDER_TIMEOUT_MS = 2_500/);
  assert.match(worker, /PROVIDER_PROBE_ATTEMPTS = 2/);
  assert.match(worker, /integrate\.api\.nvidia\.com\/v1\/models/);
  assert.match(worker, /clodex\.xyz\/v1\/models/);
  assert.match(worker, /LIVE_TTL_MS = 60_000/);
  assert.match(worker, /STALE_TTL_MS = 15 \* 60_000/);
  assert.match(worker, /parseStoredHealth/);
  assert.match(worker, /source: "stale", stale: true/);
  assert.match(route, /cache-control/);
  assert.match(page, /StatusBoard/);
  assert.match(board, /fetch\("\/api\/status"/);
});

test("high-quality speech stays server-side and has a browser fallback", async () => {
  const route = await text("app/api/tts/route.ts");
  const playground = await text("components/playground/PlaygroundChat.tsx");
  const speechHook = await text("hooks/use-speech.ts");

  assert.match(route, /ELEVENLABS_API_KEY/);
  assert.match(route, /eleven_multilingual_v2/);
  assert.match(route, /xi-api-key/);
  assert.match(route, /audio\/mpeg/);
  assert.match(route, /Authentication required/);
  assert.match(playground, /fetch\("\/api\/tts"/);
  assert.match(playground, /ttsAvailable/);
  assert.match(speechHook, /speakWithBrowser/);
  assert.match(route, /reserveTts/);
  assert.match(route, /handleTtsGet\(auth\)/);
  assert.match(route, /handleTtsPost\(request, auth\)/);
});

test("production hardening keeps quota, entitlement and migration contracts explicit", async () => {
  const tts = await text("app/api/tts/route.ts");
  const demo = await text("app/api/demo/route.ts");
  const quota = await text("app/api/demo/quota.ts");
  const account = await text("lib/account-access.ts");
  const accountId = await text("lib/account-id.ts");
  const durableObject = await text("worker/clodex-access.ts");
  const migrationRunner = await text("scripts/migrate-d1.mjs");
  const workflow = await text(".github/workflows/deploy-cloudflare.yml");
  const admin = await text("app/api/admin/clodex/revoke/route.ts");
  const ttsPolicy = await text("lib/tts-rate-limit.ts");

  assert.match(tts, /TTS_MAX_TEXT_LENGTH/);
  assert.match(tts, /reserveTts/);
  assert.match(tts, /releaseReservation/);
  assert.doesNotMatch(tts, /speechText\.slice\(/);
  assert.match(demo, /createDemoQuota/);
  assert.match(demo, /quota\.commit\(\)/);
  assert.match(demo, /quota\.release\(\)/);
  assert.match(quota, /reserveDemo/);
  assert.match(accountId, /HMAC/);
  assert.match(accountId, /legacyAccountObjectName/);
  assert.match(account, /legacyAccountObjectName/);
  assert.match(durableObject, /expires_at/);
  assert.match(durableObject, /revoked_at/);
  assert.match(durableObject, /grant_version/);
  assert.match(durableObject, /hasGrant/);
  assert.match(durableObject, /TTS_RESERVATION_TTL_MS/);
  assert.match(durableObject, /state = 'expired'/);
  assert.match(durableObject, /reserveTts/);
  assert.match(durableObject, /reserveDemo/);
  assert.match(migrationRunner, /d1.*migrations.*apply/s);
  assert.match(migrationRunner, /--remote/);
  assert.match(migrationRunner, /d1_migrations/);
  assert.match(workflow, /npm run db:migrate/);
  assert.match(workflow, /npm run cloudflare:check-secrets/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID/);
  assert.doesNotMatch(workflow, /wrangler secret put/);
  assert.match(workflow, /Validate and build production Worker/);
  assert.match(admin, /isAdminEmail/);
  assert.doesNotMatch(admin, /isPrivilegedAiEmail/);
  assert.match(admin, /handleAdminClodexRevoke\(request, auth\)/);
  assert.match(ttsPolicy, /TTS_REQUEST_LIMIT = 5/);
  assert.match(ttsPolicy, /TTS_DAILY_CHARACTER_QUOTA = 10_000/);
  assert.match(ttsPolicy, /TTS_PRIVILEGED_REQUEST_LIMIT = 30/);
});

test("the public Erma catalog exposes one model per working tier", async () => {
  const publicModels = await text("lib/models/public.ts");
  const serverModels = await text("lib/models/server.ts");

  for (const model of ["Erma Celer", "Erma Nova", "Erma Optima"]) {
    assert.match(publicModels, new RegExp(`name: "${model}"`));
    assert.match(serverModels, new RegExp(`name: "${model}"`));
  }
  assert.doesNotMatch(publicModels, /nvidiaModel|tools: true|vision: true/);
  assert.match(publicModels, /READ_ONLY_TOOLS_ENABLED = true/);
  assert.match(publicModels, /toolMode: "read-only"/);
  assert.match(serverModels, /nvidiaModel:/);
});

test("protected API routes fail safely when Auth.js is unavailable", async () => {
  const clodex = await text("app/api/clodex/route.ts");
  const accessRoute = await text("app/api/profile/access/route.ts");

  assert.match(clodex, /Authentication service is temporarily unavailable/);
  assert.match(accessRoute, /getAuthenticatedEmail/);
  assert.match(accessRoute, /unavailableResponse/);
});

test("terms consent is database-backed, versioned, and admin-reviewable", async () => {
  const schema = await text("db/schema.ts");
  const terms = await text("lib/terms.ts");
  const legal = await text("lib/legal-documents.ts");
  const consent = await text("lib/terms-consent.ts");
  const userId = await text("lib/terms-user-id.ts");
  const route = await text("app/api/account/terms/route.ts");
  const gate = await text("components/legal/TermsGate.tsx");
  const admin = await text("app/admin/terms/page.tsx");
  const workflow = await text(".github/workflows/deploy-cloudflare.yml");
  const legalDoc = await text("docs/USER_AGREEMENT.md");

  assert.match(schema, /termsAccepted/);
  assert.match(schema, /termsAcceptedAt/);
  assert.match(schema, /termsVersion/);
  assert.match(terms, /CURRENT_TERMS_VERSION/);
  assert.match(legal, /CURRENT_LEGAL_BUNDLE_VERSION/);
  assert.match(schema, /legalAcceptances/);
  assert.match(consent, /acceptedVersion !== CURRENT_LEGAL_BUNDLE_VERSION/);
  assert.match(consent, /db\.insert\(legalAcceptances\)/);
  assert.match(userId, /HMAC|hmacSha256Hex/);
  assert.doesNotMatch(consent, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(route, /isTrustedRequestOrigin/);
  assert.doesNotMatch(gate, /localStorage|document\.cookie/si);
  assert.match(gate, /response\.status === 503/);
  assert.match(admin, /isAdminEmail/);
  assert.match(admin, /TermsDocument language=\{locale\}/);
  assert.match(workflow, /Apply all D1 migrations/);
  assert.match(legalDoc, /## Русская редакция/);
  assert.match(legalDoc, /## English edition/);
});

test("local archive is bounded, sanitized, and observable by current archive surfaces", async () => {
  const archive = await text("lib/local-archive.ts");
  const archiveUi = await text("components/playground/ConversationArchive.tsx");
  const mobileDrawer = await text("components/playground/MobileChatDrawer.tsx");
  const workspace = await text("components/playground/ErmaNovaWorkspace.tsx");
  const playground = await text("app/playground/page.tsx");

  assert.match(archive, /MAX_ARCHIVE_JSON_LENGTH/);
  assert.match(archive, /MAX_MESSAGE_CONTENT_LENGTH/);
  assert.match(archive, /tklab:archive-updated/);
  assert.match(archiveUi, /loadArchive/);
  assert.match(archiveUi, /playground\?session=/);
  assert.match(archiveUi, /onNavigate/);
  assert.match(mobileDrawer, /ConversationArchive/);
  assert.match(mobileDrawer, /data-mobile-chat-drawer/);
  assert.match(workspace, /PlaygroundChat/);
  assert.match(playground, /ErmaNovaWorkspace/);
  assert.match(archive, /removedLegacyReasoning/);
  assert.doesNotMatch(archive, /message\.thinking/);
});

test("developers section is available in navigation and footer surfaces", async () => {
  const page = await text("app/developers/page.tsx");
  const nav = await text("components/site/GlowNav.tsx");
  const footer = await text("components/site/StitchFooter.tsx");

  assert.match(page, /<StitchHeader active="developers" \/>/);
  assert.match(page, /<StitchFooter \/>/);
  assert.match(page, /data-developer-ownership/);
  assert.match(page, /data-engineering-system-map/);
  assert.match(page, /tkRole: "Backend, качество и отказоустойчивость"/);
  assert.match(page, /thomasRole: "Product architecture and AI systems"/);
  await access(new URL("public/images/developers/thomas-tm.jpg", root));
  await access(new URL("public/images/developers/tk.jpg", root));
  assert.match(nav, /href: "\/developers"/);
  assert.match(footer, /href="\/developers"/);
});

test("patch notes combine the current preview with persistent release history", async () => {
  const page = await text("app/patch-notes/page.tsx");
  const nav = await text("components/site/GlowNav.tsx");
  const footer = await text("components/site/StitchFooter.tsx");
  const translations = await text("lib/i18n.ts");

  assert.match(page, /getPreviewRelease/);
  assert.match(page, /getReleaseHistory/);
  assert.match(page, /MobileReleaseBrowser/);
  assert.match(page, /PatchNotesBrowser/);
  assert.match(page, /text\.patchNotes\.historyTitle/);
  assert.match(page, /text\.patchNotes\.workspaceTitle/);
  assert.match(nav, /href: "\/patch-notes"/);
  assert.match(footer, /href="\/patch-notes"/);
  assert.match(translations, /patchNotes: "Patch Notes"/);
  assert.match(translations, /version: "v0\.8\.0"/);
  assert.match(translations, /version: "v0\.5\.1"/);
});

test("the header reflects the authenticated session", async () => {
  const header = await text("components/site/StitchHeader.tsx");

  assert.match(header, /await auth\(\)/);
  assert.match(header, /href=\{signedIn \? "\/profile" : "\/login"\}/);
  assert.match(header, /signedIn \? text\.nav\.profile : text\.nav\.login/);
});

test("profile uses the provider avatar and exposes admin state", async () => {
  const profile = await text("app/profile/page.tsx");
  const translations = await text("lib/i18n.ts");
  const footer = await text("components/site/StitchFooter.tsx");
  const css = await text("app/globals.css");

  assert.match(profile, /session\?\.user\?\.image/);
  assert.doesNotMatch(profile, /aida-public/);
  assert.match(profile, /adminAccess/);
  assert.match(profile, /adminState/);
  assert.match(translations, /Clodex model route/);
  assert.match(footer, /grid w-full grid-cols-2/);
  assert.match(css, /--spacing-section-gap: 72px/);
  assert.match(css, /overflow-wrap: anywhere/);
});

test("mobile layouts avoid fixed-width content traps", async () => {
  const home = await text("app/page.tsx");
  const input = await text("components/ui/ai-chat-input.tsx");
  const login = await text("app/login/page.tsx");

  assert.match(home, /lg:hidden/);
  assert.match(home, /aspect-\[4\/5\]/);
  assert.doesNotMatch(home, /min-w-\[700px\]/);
  assert.match(input, /w-full max-w-\[780px\]/);
  assert.match(input, /ChatOverlay/);
  assert.match(login, /grid-cols-1.*sm:grid-cols-2/);
});

test("theme switching is persistent and available from the global shell", async () => {
  const layout = await text("app/layout.tsx");
  const header = await text("components/site/StitchHeader.tsx");
  const toggle = await text("components/site/ThemeToggle.tsx");
  const css = await text("app/globals.css");

  assert.match(layout, /tklabs-theme/);
  assert.match(layout, /suppressHydrationWarning/);
  assert.match(header, /ThemeToggle/);
  assert.match(toggle, /localStorage\.setItem\(THEME_STORAGE_KEY, nextTheme\)/);
  assert.match(css, /html\[data-theme="dark"\]/);
});

test("privileged workspace access is reflected in the client and profile", async () => {
  const publicModels = await text("lib/models/public.ts");
  const playground = await text("components/playground/PlaygroundChat.tsx");
  const profile = await text("app/profile/page.tsx");
  const accessRoute = await text("app/api/profile/access/route.ts");

  assert.match(publicModels, /PUBLIC_MAX_PROMPT_LENGTH = 2_000/);
  assert.match(playground, /access\?\.unlimited \|\| localPreview/);
  assert.match(playground, /PRIVILEGED_MAX_PROMPT_LENGTH/);
  assert.match(playground, /maxLength=\{promptLimit\}/);
  assert.match(profile, /getProfileAccess/);
  assert.match(profile, /unlimitedAi/);
  assert.match(accessRoute, /profileAccessResponse/);
  assert.match(accessRoute, /clodexState/);
});

test("preview authorization is development-only", async () => {
  const preview = await text("lib/local-preview.ts");
  const serverPage = await text("app/playground/page.tsx");
  const clientPage = await text("components/playground/PlaygroundChat.tsx");
  const vite = await text("vite.config.ts");

  assert.match(preview, /NODE_ENV === "development"/);
  assert.match(serverPage, /isLocalPreviewEnabled/);
  assert.match(clientPage, /isClientLocalPreviewEnabled/);
  assert.match(vite, /assertProductionPreviewDisabled/);
});

test("profile membership separates role, AI entitlement and Clodex state", async () => {
  const profile = await text("app/profile/page.tsx");
  const card = await text("components/profile/MembershipCard.tsx");
  const access = await text("lib/profile-access.ts");

  assert.match(profile, /MembershipCard/);
  assert.match(card, /membership-card--platinum/);
  assert.match(card, /membership-card--gold/);
  assert.match(access, /isAdmin/);
  assert.match(access, /unlimitedAi/);
  assert.match(access, /clodexState/);
});

test("unlimited access stays in server-only paths", async () => {
  const privileged = await text("lib/privileged-access.ts");
  const chat = await text("components/playground/PlaygroundChat.tsx");
  const input = await text("components/ui/ai-chat-input.tsx");

  assert.match(privileged, /export function parseUnlimitedEmails/);
  assert.match(privileged, /process\.env\.UNLIMITED_AI_EMAILS/);
  for (const clientSource of [chat, input]) {
    assert.doesNotMatch(clientSource, /UNLIMITED_AI_EMAILS|parseUnlimitedEmails|hasUnlimitedAccess/);
  }
});

test("Playground renders the empty-state heading exactly once", async () => {
  const playground = await text("components/playground/PlaygroundChat.tsx");
  assert.equal((playground.match(/<h2 className=/g) ?? []).length, 1);
  assert.match(playground, /Erma сама решит|Erma decides/);
});

test("chat uses one response contract and keeps the One Erma composer mobile-safe", async () => {
  const playground = await text("components/playground/PlaygroundChat.tsx");
  const chatHook = await text("hooks/use-chat-request.ts");
  const messageList = await text("components/playground/MessageList.tsx");
  const markdown = await text("components/playground/MarkdownMessage.tsx");
  const overlay = await text("components/playground/ChatOverlay.tsx");
  const input = await text("components/ui/ai-chat-input.tsx");

  assert.match(chatHook, /response\.json\(\)/);
  assert.match(chatHook, /actualProvider/);
  assert.match(messageList, /fallbackNotice/);
  assert.match(messageList, /lazy\(\(\) => import/);
  assert.doesNotMatch(markdown, /rehype-raw|dangerouslySetInnerHTML/);
  assert.match(markdown, /remarkGfm/);
  assert.match(overlay, /aria-modal="true"/);
  assert.match(overlay, /Escape/);
  assert.match(input, /data-testid="prompt-input"/);
  assert.doesNotMatch(input, /aria-haspopup="listbox"|SlidersHorizontal/);
  assert.match(input, /maxAttachmentContextLength/);
  assert.doesNotMatch(playground, /text\/event-stream|data:\s*\$\{JSON\.stringify/);
});

test("aborted requests cannot clear a newer generation", async () => {
  const hook = await text("hooks/use-chat-request.ts");
  assert.match(hook, /activeRequestRef\.current === controller/);
  assert.match(hook, /activeRequestRef\.current\?\.abort\(\);/);
});

test("raw provider reasoning never enters public or client contracts", async () => {
  const nvidia = await text("lib/ai/providers/nvidia.ts");
  const clodex = await text("lib/ai/providers/clodex.ts");
  const demo = await text("app/api/demo/route.ts");
  const clodexRoute = await text("app/api/clodex/route.ts");
  const hook = await text("hooks/use-chat-request.ts");
  const messageList = await text("components/playground/MessageList.tsx");
  const logging = await text("lib/ai/logging.ts");

  assert.match(nvidia, /reasoning_content/);
  assert.match(clodex, /thinking/);
  for (const source of [demo, clodexRoute, hook, messageList, logging]) {
    assert.doesNotMatch(source, /payload\.thinking|message\.thinking|\bthinking:/);
  }
  assert.doesNotMatch(messageList, /ReasoningTrace|reasoning-trace/);
  assert.doesNotMatch(logging, /thinking|reasoning_content/);
});
