export async function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") {
    return {
      shortCircuit: true,
      url: "data:text/javascript,export%20const%20env%3DglobalThis.__tklabsCloudflareEnv%20%7C%7C%20%7B%7D%3B",
    };
  }
  return nextResolve(specifier, context);
}
