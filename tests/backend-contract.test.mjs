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
  assert.doesNotMatch(workflow, /Download validated Worker build/);
  assert.match(workflow, /Normalize Cloudflare deployment credentials/);
  assert.match(workflow, /GITHUB_ENV/);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
  assert.match(workflow, /concurrency:/);
  assert.match(workflow, /AUTH_URL: https:\/\/tklabs\.uk/);
  assert.match(workflow, /AUTH_TRUST_HOST: "true"/);
  assert.match(workflow, /--var "AUTH_URL:\$AUTH_URL" --var "AUTH_TRUST_HOST:\$AUTH_TRUST_HOST"/);
  assert.doesNotMatch(workflow, /--keep-vars/);
  assert.match(viteConfig, /const configuredAuthUrl = process\.env\.AUTH_URL\?\.trim\(\);/);
  assert.match(viteConfig, /const authTrustHost = process\.env\.AUTH_TRUST_HOST\?\.trim\(\) \|\| "true";/);
  assert.match(viteConfig, /AUTH_TRUST_HOST: authTrustHost/);
  assert.match(viteConfig, /\.\.\.\(configuredAuthUrl \? \{ AUTH_URL: configuredAuthUrl \} : \{\}\)/);
  assert.doesNotMatch(viteConfig, /AUTH_URL: process\.env\.AUTH_URL\?\.trim\(\) \|\| "http:\/\/localhost:3000"/);
  assert.equal(securityHeaders.SECURITY_HEADERS.find((header) => header.key === "Permissions-Policy")?.value, "camera=(), microphone=(self), geolocation=(), payment=()");
  assert.doesNotMatch(nextConfig, /microphone=\(\)/);
  assert.match(packageJson.scripts.test, /test:unit/);
  assert.match(packageJson.scripts["test:integration"], /--test/);
  assert.doesNotMatch(tsconfig, /cloudflare:workers/, "native Cloudflare bindings must stay external in production builds");
  assert.match(workerTypes, /declare module "cloudflare:workers"/);
});

test("status page uses live health checks", async () => {
  const route = await text("app/api/status/route.ts");
  const worker = await text("worker/health-status.ts");
  const page = await text("app/status/page.tsx");
  const board = await text("components/status/StatusBoard.tsx");

  assert.match(route, /HEALTH_STATUS/);
  assert.match(worker, /PROVIDER_TIMEOUT_MS = 2_500/);
  assert.match(worker, /integrate\.api\.nvidia\.com\/v1\/models/);
  assert.match(worker, /clodex\.xyz\/v1\/models/);
  assert.match(worker, /clodexEnabled && Boolean\(clodexKey\), false\)/);
  assert.match(worker, /LIVE_TTL_MS = 60_000/);
  assert.match(worker, /STALE_TTL_MS = 5 \* 60_000/);
  assert.match(route, /cache-control/);
  assert.match(page, /StatusBoard/);
  assert.match(board, /fetch\("\/api\/status"/);
  assert.match(board, /text\.status\.refresh/);
});

test("high-quality speech stays server-side and has a browser fallback", async () => {
  const route = await text("app/api/tts/route.ts");
  const playground = await text("components/playground/PlaygroundChat.tsx");
  const speechHook = await text("hooks/use-speech.ts");

  assert.match(route, /ELEVENLABS_API_KEY/);
  assert.match(route, /export async function GET/);
  assert.match(route, /eleven_multilingual_v2/);
  assert.match(route, /xi-api-key/);
  assert.match(route, /audio\/mpeg/);
  assert.match(route, /Authentication required/);
  assert.match(playground, /fetch\("\/api\/tts"/);
  assert.match(playground, /ttsAvailable/);
  assert.match(speechHook, /speakWithBrowser/);
  assert.match(route, /TTS_MAX_TEXT_LENGTH/);
  assert.match(route, /reserveTts/);
  assert.match(route, /export async function GET\(_request: Request\)/);
  assert.match(route, /export async function POST\(request: Request\)/);
  assert.match(route, /handleTtsGet\(auth\)/);
  assert.match(route, /handleTtsPost\(request, auth\)/);
});

test("production hardening keeps quota, entitlement and migration contracts explicit", async () => {
  const tts = await text("app/api/tts/route.ts");
  const demo = await text("app/api/demo/route.ts");
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
  assert.match(demo, /reserveDemoRequest/);
  assert.match(demo, /commitDemo/);
  assert.match(demo, /releaseDemo/);
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
  assert.doesNotMatch(migrationRunner, /d1", "execute"/);
  assert.doesNotMatch(migrationRunner, /INSERT OR IGNORE INTO _tklabs_migrations/);
  assert.match(workflow, /npm run db:migrate/);
  assert.match(workflow, /npm run cloudflare:check-secrets/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID/);
  assert.doesNotMatch(workflow, /Upload runtime secrets/);
  assert.doesNotMatch(workflow, /wrangler secret put/);
  for (const runtimeSecret of ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "RATE_LIMIT_SECRET", "ACCOUNT_ID_SECRET", "TERMS_USER_ID_SECRET", "NVIDIA_API_KEY_PRIMARY", "CLODEX_API_KEY", "CLODEX_ACCESS_CODE", "ELEVENLABS_API_KEY"]) {
    assert.doesNotMatch(workflow, new RegExp(`^\\s+${runtimeSecret}:\\s+\\$\\{\\{`, "m"), `${runtimeSecret} must remain Cloudflare-owned`);
  }
  assert.match(workflow, /Validate and build production Worker/);
  assert.match(admin, /isAdminEmail/);
  assert.doesNotMatch(admin, /isPrivilegedAiEmail/, "admin revoke must use the separate ADMIN_EMAILS allowlist, not UNLIMITED_AI_EMAILS");
  assert.match(admin, /parseJsonBody<RevokeBody>\(request, 8 \* 1024\)/);
  assert.match(admin, /export async function POST\(request: Request\)/);
  assert.match(admin, /handleAdminClodexRevoke\(request, auth\)/);
  assert.doesNotMatch(admin, /isClodexEnabled/);
  assert.match(ttsPolicy, /TTS_REQUEST_LIMIT = 5/);
  assert.match(ttsPolicy, /TTS_DAILY_CHARACTER_QUOTA = 10_000/);
  assert.match(ttsPolicy, /TTS_PRIVILEGED_REQUEST_LIMIT = 30/);
  assert.match(ttsPolicy, /TTS_PRIVILEGED_DAILY_CHARACTER_QUOTA = 100_000/);
});

test("the public Erma catalog exposes one model per working tier", async () => {
  const publicModels = await text("lib/models/public.ts");
  const serverModels = await text("lib/models/server.ts");

  for (const model of ["Erma Lite", "Erma Core", "Erma Pro"]) {
    assert.match(publicModels, new RegExp(`name: "${model}"`));
    assert.match(serverModels, new RegExp(`name: "${model}"`));
  }
  assert.doesNotMatch(publicModels, /erma-instant|erma-polos|erma-dalos|erma-reborn|erma-asimasi/);
  assert.doesNotMatch(serverModels, /erma-instant|erma-polos|erma-dalos|erma-reborn|erma-asimasi/);
  assert.doesNotMatch(publicModels, /nvidiaModel|tools: true|vision: true/);
  assert.match(serverModels, /nvidiaModel:/);
});

test("protected API routes fail safely when Auth.js is unavailable", async () => {
  const clodex = await text("app/api/clodex/route.ts");
  const access = await text("app/api/profile/access/route.ts");

  assert.match(clodex, /Authentication service is temporarily unavailable/);
  assert.match(clodex, /await auth\(\)|Authentication service is temporarily unavailable/);
  assert.match(access, /getAuthenticatedEmail/);
  assert.match(access, /unavailableResponse/);
});

test("terms consent is database-backed, versioned, and admin-reviewable", async () => {
  const schema = await text("db/schema.ts");
  const terms = await text("lib/terms.ts");
  const consent = await text("lib/terms-consent.ts");
  const userId = await text("lib/terms-user-id.ts");
  const route = await text("app/api/account/terms/route.ts");
  const gate = await text("components/legal/TermsGate.tsx");
  const admin = await text("app/admin/terms/page.tsx");
  const workflow = await text(".github/workflows/deploy-cloudflare.yml");
  const viteConfig = await text("vite.config.ts");
  const legalDoc = await text("docs/USER_AGREEMENT.md");
  const implementation = await text("docs/TERMS_CONSENT_IMPLEMENTATION.md");

  assert.match(schema, /termsAccepted: integer\("terms_accepted", \{ mode: "boolean" \}\)/);
  assert.match(schema, /termsAcceptedAt: integer\("terms_accepted_at", \{ mode: "timestamp_ms" \}\)/);
  assert.match(schema, /termsVersion: text\("terms_version"\)/);
  assert.match(schema, /language: text\("language", \{ enum: \["ru", "en"\] \}\)/);
  assert.match(terms, /CURRENT_TERMS_VERSION = "2026-08-05"/);
  assert.match(terms, /satisfies Record<TermsLanguage, TermsContent>/);
  assert.match(consent, /acceptedVersion !== CURRENT_TERMS_VERSION/);
  assert.match(consent, /legacyTermsUserId/);
  assert.match(userId, /HMAC|hmacSha256Hex/);
  assert.match(userId, /legacyTermsUserId/);
  assert.doesNotMatch(consent, /crypto\.subtle\.digest\("SHA-256"/, "userIdForEmail must use HMAC, not bare SHA-256");
  assert.match(route, /POST/);
  assert.match(route, /isTrustedRequestOrigin/);
  assert.doesNotMatch(gate, /localStorage|document\.cookie/si, "the gate must not use browser storage as consent authority");
  assert.match(gate, /response\.status === 503/);
  assert.doesNotMatch(gate, /localFallback|local-terms-consent|localStorage|document\.cookie/si, "consent must fail closed until D1 records it");
  assert.match(admin, /isAdminEmail/);
  assert.doesNotMatch(admin, /isPrivilegedAiEmail/, "admin/terms must use the separate ADMIN_EMAILS allowlist, not UNLIMITED_AI_EMAILS");
  assert.match(admin, /TermsDocument language=\{locale\}/);
  assert.match(viteConfig, /DEFAULT_D1_DATABASE_ID = "c4085a86-0fec-49f2-b2ed-5999190fcc30"/);
  assert.match(workflow, /Apply all D1 migrations/);
  assert.match(legalDoc, /## Русская редакция/);
  assert.match(legalDoc, /## English edition/);
  assert.match(implementation, /D1 storage/);
});

test("local archive is bounded, sanitized, and observable by the archive UI", async () => {
  const archive = await text("lib/local-archive.ts");
  const archiveUi = await text("components/playground/ConversationArchive.tsx");
  const mobileHistory = await text("components/playground/MobileHistory.tsx");
  const playground = await text("app/playground/page.tsx");

  assert.match(archive, /MAX_ARCHIVE_JSON_LENGTH/);
  assert.match(archive, /MAX_MESSAGE_CONTENT_LENGTH/);
  assert.match(archive, /tklab:archive-updated/);
  assert.match(archive, /catch/);
  assert.match(archiveUi, /loadArchive/);
  assert.match(archiveUi, /playground\?session=/);
  assert.match(archiveUi, /onNavigate/);
  assert.match(mobileHistory, /ConversationArchive/);
  assert.match(mobileHistory, /md:hidden/);
  assert.match(playground, /ConversationArchive/);
});

test("developers section is available in both navigation surfaces", async () => {
  const page = await text("app/developers/page.tsx");
  const nav = await text("components/site/GlowNav.tsx");
  const footer = await text("components/site/StitchFooter.tsx");
  const translations = await text("lib/i18n.ts");

  assert.match(page, /text\.developers\.people/);
  assert.match(translations, /name: "THOMAS TM"/);
  assert.match(translations, /name: "TK"/);
  assert.match(translations, /thomas-tm\.jpg/);
  assert.match(translations, /tk\.jpg/);
  await access(new URL("public/images/developers/thomas-tm.jpg", root));
  await access(new URL("public/images/developers/tk.jpg", root));
  assert.match(nav, /href: "\/developers"/);
  assert.match(footer, /href="\/developers"/);
  assert.match(translations, /developers: "Разработчики"/);
  assert.match(translations, /developers: "Developers"/);
});

test("patch notes are linked and written as an English release log", async () => {
  const page = await text("app/patch-notes/page.tsx");
  const nav = await text("components/site/GlowNav.tsx");
  const footer = await text("components/site/StitchFooter.tsx");
  const translations = await text("lib/i18n.ts");

  assert.match(page, /text\.patchNotes\.entries/);
  assert.match(page, /Release history/);
  assert.match(nav, /href: "\/patch-notes"/);
  assert.match(footer, /href="\/patch-notes"/);
  assert.match(translations, /patchNotes: "Patch Notes"/);
  assert.match(translations, /version: "v0\.8\.0"/);
  assert.match(translations, /version: "v0\.7\.1"/);
  assert.match(translations, /version: "v0\.7\.0"/);
  assert.match(translations, /version: "v0\.6\.3"/);
  assert.match(translations, /version: "v0\.6\.2"/);
  assert.match(translations, /version: "v0\.5\.3"/);
  assert.match(translations, /version: "v0\.5\.2"/);
  assert.match(translations, /version: "v0\.5\.1"/);
  assert.match(translations, /Developers & release transparency/);
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
  assert.doesNotMatch(profile, /grayscale/);
  assert.doesNotMatch(await text("app/developers/page.tsx"), /grayscale/);
  assert.match(profile, /adminAccess/);
  assert.match(profile, /adminState/);
  assert.match(translations, /Модельный маршрут Clodex/);
  assert.match(translations, /Clodex model route/);
  assert.match(footer, /grid w-full grid-cols-2/);
  assert.match(css, /--spacing-section-gap: 72px/);
  assert.match(css, /overflow-wrap: anywhere/);
});

test("mobile layouts avoid fixed-width content traps", async () => {
  const home = await text("app/page.tsx");
  const input = await text("components/ui/ai-chat-input.tsx");
  const login = await text("app/login/page.tsx");

  assert.match(home, /md:hidden/);
  assert.match(home, /aspect-\[4\/5\] lg:aspect-auto/);
  assert.doesNotMatch(home, /min-w-\[700px\]/);
  assert.match(input, /max-\[420px\]:fixed/);
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
  assert.match(css, /--color-surface-container-lowest: #171717/);
});

test("privileged workspace access is reflected in the client and profile", async () => {
  const publicModels = await text("lib/models/public.ts");
  const playground = await text("components/playground/PlaygroundChat.tsx");
  const profile = await text("app/profile/page.tsx");
  const accessRoute = await text("app/api/profile/access/route.ts");
  const input = await text("components/ui/ai-chat-input.tsx");

  assert.match(publicModels, /PUBLIC_MAX_PROMPT_LENGTH = 2_000/);
  assert.match(playground, /clodexAccess\?\.unlimited \? PRIVILEGED_MAX_PROMPT_LENGTH/);
  assert.match(playground, /maxLength=\{promptLimit\}/);
  assert.match(profile, /isPrivilegedAiEmail/);
  assert.match(profile, /unlimitedDailyValue/);
  assert.match(input, /try \{\n      recognition\.start\(\);/);
  assert.match(accessRoute, /if \(isPrivilegedAiEmail\(email\)\) return Response\.json\(privilegedAccessStatus\(\)/);
  assert.match(accessRoute, /privilegedAccessStatus\(\)[\s\S]*if \(!isClodexEnabled\(\)\) return disabledResponse\(\)/);
});

test("unlimited access stays in server-only paths", async () => {
  const privileged = await text("lib/privileged-access.ts");
  const chat = await text("components/playground/PlaygroundChat.tsx");
  const toolbar = await text("components/playground/ChatToolbar.tsx");
  const input = await text("components/ui/ai-chat-input.tsx");

  assert.match(privileged, /export function parseUnlimitedEmails/);
  assert.match(privileged, /export function hasUnlimitedAccess/);
  assert.match(privileged, /process\.env\.UNLIMITED_AI_EMAILS/);
  for (const clientSource of [chat, toolbar, input]) {
    assert.doesNotMatch(clientSource, /UNLIMITED_AI_EMAILS|parseUnlimitedEmails|hasUnlimitedAccess/);
  }
});

test("new Playground does not show the duplicated empty-state heading", async () => {
  const playground = await text("components/playground/PlaygroundChat.tsx");
  const heading = "<h2 className=\"mb-3 max-w-2xl font-serif text-[36px] leading-[1.2] text-primary md:text-[48px]\">{text.chat.emptyTitle}</h2>";
  assert.equal(playground.split(heading).length - 1, 1);
});

test("chat uses one JSON response contract and keeps model selection mobile-safe", async () => {
  const playground = await text("components/playground/PlaygroundChat.tsx");
  const chatHook = await text("hooks/use-chat-request.ts");
  const toolbar = await text("components/playground/ChatToolbar.tsx");
  const messageList = await text("components/playground/MessageList.tsx");
  const input = await text("components/ui/ai-chat-input.tsx");
  const css = await text("app/globals.css");

  assert.match(chatHook, /response\.json\(\)/);
  assert.match(chatHook, /actualProvider/);
  assert.match(messageList, /fallbackNotice/);
  assert.match(input, /max-\[420px\]:fixed/);
  assert.match(input, /aria-haspopup="listbox"/);
  assert.match(input, /min-w-0 flex-1/);
  assert.match(input, /maxAttachmentContextLength/);
  assert.doesNotMatch(input, /content: \(await file\.text\(\)\)\.slice/);
  assert.doesNotMatch(input, /role="button"/, "attachment controls must use real buttons, not nested button-like spans");
  assert.doesNotMatch(playground, /text\/event-stream|data:\s*\$\{JSON\.stringify/);
  assert.doesNotMatch(playground, /message\.id === lastMessage\?\.id && message\.content/);
  assert.match(input, /items-center gap-2/);
  assert.match(toolbar, /overflow-x-auto/);
  assert.doesNotMatch(css, /response-meta-enter/);
});
