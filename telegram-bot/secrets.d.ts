/**
 * Runtime secrets are intentionally not represented in wrangler.jsonc.
 * They are uploaded with `wrangler secret put` by the deployment workflow.
 */
interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ALLOWED_USER_IDS: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  CLODEX_API_KEY?: string;
  REPO_GITHUB_TOKEN?: string;
}
