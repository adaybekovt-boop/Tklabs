import type { Context } from "grammy";

export function parseAllowedUserIds(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^-?\d+$/.test(value)),
  );
}

export function isAuthorized(userId: number | undefined, env: Env): boolean {
  if (userId === undefined) return false;
  return parseAllowedUserIds(env.TELEGRAM_ALLOWED_USER_IDS).has(String(userId));
}

export function userLabel(ctx: Context): string {
  const user = ctx.from;
  if (!user) return "unknown";
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return `${name || "unknown"}${user.username ? ` (@${user.username})` : ""} [id:${user.id}]`;
}
