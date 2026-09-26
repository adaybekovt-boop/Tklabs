export async function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") {
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent("export const env = globalThis.__tklabsCloudflareEnv || {}; export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }")}`,
    };
  }
  if (specifier === "@/auth") {
    return {
      shortCircuit: true,
      url: "data:text/javascript,export%20const%20auth%3Dasync()%3D%3EglobalThis.__tklabsAuth%3Fawait%20globalThis.__tklabsAuth()%3Anull%3B",
    };
  }
  if (specifier.endsWith("/auth.ts")) {
    return {
      shortCircuit: true,
      url: "data:text/javascript,export%20const%20auth%3Dasync()%3D%3EglobalThis.__tklabsAuth%3Fawait%20globalThis.__tklabsAuth()%3Anull%3B",
    };
  }
  return nextResolve(specifier, context);
}
