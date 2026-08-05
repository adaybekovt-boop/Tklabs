export function isClodexEnabled() {
  return process.env.CLODEX_ENABLED?.trim().toLowerCase() === "true";
}
